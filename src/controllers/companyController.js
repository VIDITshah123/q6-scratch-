const { StatusCodes } = require('http-status-codes');
const db = require('../utils/db');
const ApiError = require('../utils/apiError');

const createCompany = async (req, res, next) => {
  try {
    const { name } = req.body;

    // Check if company already exists
    const existingCompany = await db.get('SELECT id FROM companies WHERE name = ?', [name]);
    if (existingCompany) {
      throw ApiError.conflict('Company with this name already exists');
    }

    // Create company
    const result = await db.run(
      'INSERT INTO companies (name) VALUES (?) RETURNING id, name, created_at',
      [name]
    );

    res.status(StatusCodes.CREATED).json({
      status: 'success',
      data: {
        company: result
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAllCompanies = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Get companies with pagination
    const companies = await db.all(
      'SELECT id, name, created_at FROM companies LIMIT ? OFFSET ?',
      [limit, offset]
    );

    // Get total count for pagination
    const countResult = await db.get('SELECT COUNT(*) as total FROM companies');
    const total = countResult.total;

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: {
        companies,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const getCompany = async (req, res, next) => {
  try {
    const { id } = req.params;

    const company = await db.get(
      'SELECT id, name, created_at, updated_at FROM companies WHERE id = ?',
      [id]
    );

    if (!company) {
      throw ApiError.notFound('Company not found');
    }

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: {
        company
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Check if company exists
    const existingCompany = await db.get('SELECT id FROM companies WHERE id = ?', [id]);
    if (!existingCompany) {
      throw ApiError.notFound('Company not found');
    }

    // Check if name is already taken
    const nameTaken = await db.get(
      'SELECT id FROM companies WHERE name = ? AND id != ?',
      [name, id]
    );
    
    if (nameTaken) {
      throw ApiError.conflict('Company with this name already exists');
    }

    // Update company
    const result = await db.run(
      'UPDATE companies SET name = ? WHERE id = ? RETURNING id, name, updated_at',
      [name, id]
    );

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: {
        company: result
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteCompany = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if company exists
    const company = await db.get('SELECT id FROM companies WHERE id = ?', [id]);
    if (!company) {
      throw ApiError.notFound('Company not found');
    }

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Delete related users
      await db.run('DELETE FROM users WHERE company_id = ?', [id]);
      
      // Delete company
      await db.run('DELETE FROM companies WHERE id = ?', [id]);
      
      await db.run('COMMIT');
      
      res.status(StatusCodes.NO_CONTENT).send();
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCompany,
  getAllCompanies,
  getCompany,
  updateCompany,
  deleteCompany
};
