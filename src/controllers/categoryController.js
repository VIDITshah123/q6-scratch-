const { StatusCodes } = require('http-status-codes');
const db = require('../utils/db');
const ApiError = require('../utils/apiError');

const createCategory = async (req, res, next) => {
  try {
    const { name, description, parentId = null } = req.body;
    const companyId = req.user.companyId;

    // Validate input
    if (!name) {
      throw ApiError.badRequest('Name is required');
    }

    // Check if category with same name exists for the company
    const existingCategory = await db.get(
      'SELECT id FROM categories WHERE name = ? AND company_id = ? AND parent_id IS NOT DISTINCT FROM ?',
      [name, companyId, parentId]
    );

    if (existingCategory) {
      throw ApiError.conflict('Category with this name already exists');
    }

    // If parentId is provided, verify it exists and belongs to the company
    if (parentId) {
      const parentCategory = await db.get(
        'SELECT id FROM categories WHERE id = ? AND company_id = ?',
        [parentId, companyId]
      );
      
      if (!parentCategory) {
        throw ApiError.badRequest('Parent category not found');
      }
    }

    // Create category
    const result = await db.run(
      `INSERT INTO categories 
       (name, description, company_id, parent_id) 
       VALUES (?, ?, ?, ?) 
       RETURNING *`,
      [name, description, companyId, parentId]
    );

    res.status(StatusCodes.CREATED).json({
      status: 'success',
      data: {
        category: result
      }
    });
  } catch (error) {
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { parentOnly = 'false' } = req.query;
    
    let query = `
      WITH RECURSIVE category_tree AS (
        -- Base case: top-level categories
        SELECT id, name, description, parent_id, 1 as level
        FROM categories 
        WHERE company_id = ? AND parent_id IS NULL
        
        UNION ALL
        
        -- Recursive case: subcategories
        SELECT c.id, c.name, c.description, c.parent_id, ct.level + 1
        FROM categories c
        JOIN category_tree ct ON c.parent_id = ct.id
        WHERE c.company_id = ?
      )
      SELECT id, name, description, parent_id, level
      FROM category_tree
      WHERE 1=1
    `;

    const params = [companyId, companyId];
    
    // If only top-level categories are requested
    if (parentOnly === 'true') {
      query += ' AND parent_id IS NULL';
    }
    
    query += ' ORDER BY name';
    
    const categories = await db.all(query, params);

    // Build hierarchical structure
    const buildTree = (items, parentId = null) => {
      return items
        .filter(item => item.parent_id === parentId)
        .map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          level: item.level,
          subcategories: buildTree(items, item.id)
        }));
    };

    const tree = parentOnly === 'true' 
      ? categories 
      : buildTree(categories);

    res.status(StatusCodes.OK).json({
      status: 'success',
      results: categories.length,
      data: {
        categories: tree
      }
    });
  } catch (error) {
    next(error);
  }
};

const getCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    // Get category with subcategories count and question count
    const category = await db.get(
      `SELECT 
         c.*,
         (SELECT COUNT(*) FROM categories sc WHERE sc.parent_id = c.id) as subcategory_count,
         (SELECT COUNT(*) FROM question_categories qc WHERE qc.category_id = c.id) as question_count
       FROM categories c 
       WHERE c.id = ? AND c.company_id = ?`,
      [id, companyId]
    );

    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    // Get parent category if exists
    if (category.parent_id) {
      const parent = await db.get(
        'SELECT id, name FROM categories WHERE id = ?',
        [category.parent_id]
      );
      category.parent = parent;
    }

    // Get immediate subcategories
    const subcategories = await db.all(
      'SELECT id, name, description FROM categories WHERE parent_id = ? ORDER BY name',
      [id]
    );
    
    category.subcategories = subcategories;

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: {
        category
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const companyId = req.user.companyId;

    // Check if category exists and belongs to company
    const category = await db.get(
      'SELECT * FROM categories WHERE id = ? AND company_id = ?',
      [id, companyId]
    );

    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    // Check if name is being updated and if it already exists
    if (name && name !== category.name) {
      const existingCategory = await db.get(
        'SELECT id FROM categories WHERE name = ? AND company_id = ? AND parent_id IS NOT DISTINCT FROM ? AND id != ?',
        [name, companyId, category.parent_id, id]
      );

      if (existingCategory) {
        throw ApiError.conflict('Category with this name already exists at this level');
      }
    }

    // Update category
    const result = await db.run(
      `UPDATE categories 
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
       RETURNING *`,
      [name, description, id]
    );

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: {
        category: result
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    // Check if category exists and belongs to company
    const category = await db.get(
      'SELECT * FROM categories WHERE id = ? AND company_id = ?',
      [id, companyId]
    );

    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    // Check if category has subcategories
    const hasSubcategories = await db.get(
      'SELECT 1 FROM categories WHERE parent_id = ? LIMIT 1',
      [id]
    );

    if (hasSubcategories) {
      throw ApiError.badRequest('Cannot delete category with subcategories');
    }

    // Check if category is used in questions
    const usedInQuestions = await db.get(
      'SELECT 1 FROM question_categories WHERE category_id = ? LIMIT 1',
      [id]
    );

    if (usedInQuestions) {
      throw ApiError.badRequest('Cannot delete category that is being used in questions');
    }

    // Delete category
    await db.run('DELETE FROM categories WHERE id = ?', [id]);

    res.status(StatusCodes.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
};

const moveQuestions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { targetCategoryId } = req.body;
    const companyId = req.user.companyId;

    // Validate input
    if (!targetCategoryId) {
      throw ApiError.badRequest('Target category ID is required');
    }

    if (id === targetCategoryId) {
      throw ApiError.badRequest('Source and target categories cannot be the same');
    }

    // Check if both categories exist and belong to company
    const [sourceCategory, targetCategory] = await Promise.all([
      db.get('SELECT id FROM categories WHERE id = ? AND company_id = ?', [id, companyId]),
      db.get('SELECT id FROM categories WHERE id = ? AND company_id = ?', [targetCategoryId, companyId])
    ]);

    if (!sourceCategory) {
      throw ApiError.notFound('Source category not found');
    }

    if (!targetCategory) {
      throw ApiError.notFound('Target category not found');
    }

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Move questions to target category
      await db.run(
        `UPDATE question_categories 
         SET category_id = ?
         WHERE category_id = ?`,
        [targetCategoryId, id]
      );

      await db.run('COMMIT');

      res.status(StatusCodes.OK).json({
        status: 'success',
        message: 'Questions moved successfully'
      });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
  moveQuestions
};
