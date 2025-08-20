const { StatusCodes } = require('http-status-codes');
const db = require('../utils/db');
const ApiError = require('../utils/apiError');
const { calculateQuestionScore, updateUserReputation } = require('../utils/scoring');

const createQuestion = async (req, res, next) => {
  try {
    const { content, options, correctAnswers, categories = [] } = req.body;
    const userId = req.user.id;
    const companyId = req.user.companyId;

    // Validate input
    if (!content || !options || !correctAnswers) {
      throw ApiError.badRequest('Content, options, and correctAnswers are required');
    }

    if (!Array.isArray(options) || options.length < 2) {
      throw ApiError.badRequest('At least two options are required');
    }

    if (!Array.isArray(correctAnswers) || correctAnswers.length === 0) {
      throw ApiError.badRequest('At least one correct answer is required');
    }

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Create question
      const question = await db.run(
        `INSERT INTO questions 
         (content, options, correct_answers, created_by, company_id, status) 
         VALUES (?, ?, ?, ?, ?, 'pending_review') 
         RETURNING *`,
        [content, JSON.stringify(options), JSON.stringify(correctAnswers), userId, companyId]
      );

      // Add categories
      if (categories.length > 0) {
        const categoryValues = categories.map(catId => `(${question.id}, ${catId}, NULL)`).join(',');
        await db.run(
          `INSERT INTO question_categories (question_id, category_id, subcategory_id) 
           VALUES ${categoryValues}`
        );
      }

      // Log the creation
      await db.run(
        `INSERT INTO question_history 
         (question_id, changed_by, change_type, change_details) 
         VALUES (?, ?, 'created', 'Question created')`,
        [question.id, userId]
      );

      await db.run('COMMIT');

      res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: {
          question: {
            ...question,
            options: JSON.parse(question.options),
            correct_answers: JSON.parse(question.correct_answers)
          }
        }
      });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

const getQuestions = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      category, 
      search,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const companyId = req.user.companyId;
    const userId = req.user.id;

    // Build query
    let query = `
      SELECT q.*, 
             u.name as author_name,
             GROUP_CONCAT(DISTINCT c.name) as categories
      FROM questions q
      LEFT JOIN users u ON q.created_by = u.id
      LEFT JOIN question_categories qc ON q.id = qc.question_id
      LEFT JOIN categories c ON qc.category_id = c.id
      WHERE q.company_id = ?
    `;

    const params = [companyId];

    // Apply filters
    if (status) {
      query += ' AND q.status = ?';
      params.push(status);
    }

    if (category) {
      query += ' AND qc.category_id = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND q.content LIKE ?';
      params.push(`%${search}%`);
    }

    // Group by question
    query += ' GROUP BY q.id';

    // Apply sorting
    const validSortFields = ['created_at', 'score', 'status'];
    const validSortOrders = ['ASC', 'DESC'];
    
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder : 'DESC';
    
    query += ` ORDER BY q.${sortField} ${order}`;

    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Get questions
    const questions = await db.all(query, params);

    // Parse JSON fields
    const parsedQuestions = questions.map(q => ({
      ...q,
      options: JSON.parse(q.options),
      correct_answers: JSON.parse(q.correct_answers),
      categories: q.categories ? q.categories.split(',') : []
    }));

    // Get total count
    let countQuery = 'SELECT COUNT(DISTINCT q.id) as total FROM questions q';
    const countParams = [companyId];
    
    if (status || category || search) {
      countQuery += ' WHERE q.company_id = ?';
      if (status) {
        countQuery += ' AND q.status = ?';
        countParams.push(status);
      }
      if (category) {
        countQuery += ' AND EXISTS (SELECT 1 FROM question_categories qc WHERE qc.question_id = q.id AND qc.category_id = ?)';
        countParams.push(category);
      }
      if (search) {
        countQuery += ' AND q.content LIKE ?';
        countParams.push(`%${search}%`);
      }
    } else {
      countQuery += ' WHERE q.company_id = ?';
    }

    const countResult = await db.get(countQuery, countParams);
    const total = countResult.total;

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: {
        questions: parsedQuestions,
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

const getQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    // Get question with categories and author info
    const question = await db.get(
      `SELECT q.*, u.name as author_name,
              GROUP_CONCAT(DISTINCT c.name) as categories
       FROM questions q
       LEFT JOIN users u ON q.created_by = u.id
       LEFT JOIN question_categories qc ON q.id = qc.question_id
       LEFT JOIN categories c ON qc.category_id = c.id
       WHERE q.id = ? AND q.company_id = ?
       GROUP BY q.id`,
      [id, companyId]
    );

    if (!question) {
      throw ApiError.notFound('Question not found');
    }

    // Get vote count
    const voteCount = await db.get(
      `SELECT 
         SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) as upvotes,
         SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) as downvotes
       FROM votes
       WHERE question_id = ?`,
      [id]
    );

    // Parse JSON fields
    const parsedQuestion = {
      ...question,
      options: JSON.parse(question.options),
      correct_answers: JSON.parse(question.correct_answers),
      categories: question.categories ? question.categories.split(',') : [],
      votes: {
        up: voteCount.upvotes || 0,
        down: voteCount.downvotes || 0
      }
    };

    // Get user's vote if exists
    if (req.user) {
      const userVote = await db.get(
        'SELECT vote_type FROM votes WHERE question_id = ? AND user_id = ?',
        [id, req.user.id]
      );
      if (userVote) {
        parsedQuestion.userVote = userVote.vote_type;
      }
    }

    // Get question history
    const history = await db.all(
      `SELECT h.*, u.name as changed_by_name
       FROM question_history h
       LEFT JOIN users u ON h.changed_by = u.id
       WHERE h.question_id = ?
       ORDER BY h.created_at DESC`,
      [id]
    );

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: {
        question: parsedQuestion,
        history
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, options, correctAnswers, categories, status } = req.body;
    const userId = req.user.id;
    const companyId = req.user.companyId;

    // Check if question exists and belongs to company
    const question = await db.get(
      'SELECT * FROM questions WHERE id = ? AND company_id = ?',
      [id, companyId]
    );

    if (!question) {
      throw ApiError.notFound('Question not found');
    }

    // Check permissions (only author or admin can update)
    if (question.created_by !== userId && req.user.role !== 'admin') {
      throw ApiError.forbidden('Not authorized to update this question');
    }

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Update question
      const updates = [];
      const params = [];
      
      if (content !== undefined) {
        updates.push('content = ?');
        params.push(content);
      }
      
      if (options !== undefined) {
        updates.push('options = ?');
        params.push(JSON.stringify(options));
      }
      
      if (correctAnswers !== undefined) {
        updates.push('correct_answers = ?');
        params.push(JSON.stringify(correctAnswers));
      }
      
      if (status && ['active', 'inactive', 'pending_review'].includes(status)) {
        // Only admins can change status
        if (req.user.role === 'admin') {
          updates.push('status = ?');
          params.push(status);
        }
      }

      if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        
        await db.run(
          `UPDATE questions 
           SET ${updates.join(', ')} 
           WHERE id = ?`,
          [...params, id]
        );

        // Log the update
        await db.run(
          `INSERT INTO question_history 
           (question_id, changed_by, change_type, change_details) 
           VALUES (?, ?, 'updated', 'Question updated')`,
          [id, userId]
        );
      }

      // Update categories if provided
      if (Array.isArray(categories)) {
        // Remove existing categories
        await db.run('DELETE FROM question_categories WHERE question_id = ?', [id]);

        // Add new categories
        if (categories.length > 0) {
          const categoryValues = categories.map(catId => `(${id}, ${catId}, NULL)`).join(',');
          await db.run(
            `INSERT INTO question_categories (question_id, category_id, subcategory_id) 
             VALUES ${categoryValues}`
          );
        }
      }

      await db.run('COMMIT');

      // Get updated question
      const updatedQuestion = await db.get(
        'SELECT * FROM questions WHERE id = ?',
        [id]
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: {
          question: {
            ...updatedQuestion,
            options: JSON.parse(updatedQuestion.options),
            correct_answers: JSON.parse(updatedQuestion.correct_answers)
          }
        }
      });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

const deleteQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const companyId = req.user.companyId;

    // Check if question exists and belongs to company
    const question = await db.get(
      'SELECT * FROM questions WHERE id = ? AND company_id = ?',
      [id, companyId]
    );

    if (!question) {
      throw ApiError.notFound('Question not found');
    }

    // Check permissions (only author or admin can delete)
    if (question.created_by !== userId && req.user.role !== 'admin') {
      throw ApiError.forbidden('Not authorized to delete this question');
    }

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Log the deletion
      await db.run(
        `INSERT INTO question_history 
         (question_id, changed_by, change_type, change_details) 
         VALUES (?, ?, 'deleted', 'Question deleted')`,
        [id, userId]
      );

      // Delete related records
      await db.run('DELETE FROM votes WHERE question_id = ?', [id]);
      await db.run('DELETE FROM question_categories WHERE question_id = ?', [id]);
      
      // Delete question
      await db.run('DELETE FROM questions WHERE id = ?', [id]);

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

const voteOnQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { voteType } = req.body;
    const userId = req.user.id;
    const companyId = req.user.companyId;

    if (!['up', 'down'].includes(voteType)) {
      throw ApiError.badRequest('Invalid vote type. Must be "up" or "down"');
    }

    // Check if question exists and belongs to company
    const question = await db.get(
      'SELECT id, created_by FROM questions WHERE id = ? AND company_id = ?',
      [id, companyId]
    );

    if (!question) {
      throw ApiError.notFound('Question not found');
    }

    // Prevent voting on own question
    if (question.created_by === userId) {
      throw ApiError.badRequest('You cannot vote on your own question');
    }

    // Check if user already voted
    const existingVote = await db.get(
      'SELECT id, vote_type FROM votes WHERE question_id = ? AND user_id = ?',
      [id, userId]
    );

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    try {
      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Remove vote if clicking the same vote type again
          await db.run(
            'DELETE FROM votes WHERE id = ?',
            [existingVote.id]
          );
        } else {
          // Update vote if changing vote type
          await db.run(
            'UPDATE votes SET vote_type = ? WHERE id = ?',
            [voteType, existingVote.id]
          );
        }
      } else {
        // Add new vote
        await db.run(
          'INSERT INTO votes (question_id, user_id, vote_type) VALUES (?, ?, ?)',
          [id, userId, voteType]
        );
      }

      // Log the vote
      await db.run(
        `INSERT INTO question_history 
         (question_id, changed_by, change_type, change_details) 
         VALUES (?, ?, 'vote', ?)`,
        [id, userId, `User ${voteType}voted on question`]
      );

      await db.run('COMMIT');

      // Get updated vote count
      const voteCount = await db.get(
        `SELECT 
           SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) as upvotes,
           SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) as downvotes
         FROM votes
         WHERE question_id = ?`,
        [id]
      );

      // Update question score and user reputation
      await Promise.all([
        calculateQuestionScore(id),
        updateUserReputation(question.created_by)
      ]);

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: {
          votes: {
            up: voteCount.upvotes || 0,
            down: voteCount.downvotes || 0
          },
          userVote: existingVote?.vote_type === voteType ? null : voteType
        }
      });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

const invalidateQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    const companyId = req.user.companyId;

    if (!reason) {
      throw ApiError.badRequest('Reason is required for invalidation');
    }

    // Check if question exists and belongs to company
    const question = await db.get(
      'SELECT * FROM questions WHERE id = ? AND company_id = ?',
      [id, companyId]
    );

    if (!question) {
      throw ApiError.notFound('Question not found');
    }

    // Only admins or reviewers can invalidate questions
    if (!['admin', 'reviewer'].includes(req.user.role)) {
      throw ApiError.forbidden('Not authorized to invalidate questions');
    }

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Update question status
      await db.run(
        'UPDATE questions SET status = ? WHERE id = ?',
        ['inactive', id]
      );

      // Log the invalidation
      await db.run(
        `INSERT INTO question_history 
         (question_id, changed_by, change_type, change_details) 
         VALUES (?, ?, 'status_changed', ?)`,
        [id, userId, `Question marked as invalid. Reason: ${reason}`]
      );

      await db.run('COMMIT');

      res.status(StatusCodes.OK).json({
        status: 'success',
        message: 'Question marked as invalid',
        data: {
          questionId: id,
          status: 'inactive'
        }
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
  createQuestion,
  getQuestions,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  voteOnQuestion,
  invalidateQuestion
};
