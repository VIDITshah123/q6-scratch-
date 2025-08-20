const { StatusCodes } = require('http-status-codes');
const bcrypt = require('bcryptjs');
const db = require('../utils/db');
const ApiError = require('../utils/apiError');

const createEmployee = async (req, res, next) => {
  try {
    const { name, email, password, role = 'question_writer' } = req.body;
    const companyId = req.user.companyId;

    // Check if user already exists
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      throw ApiError.conflict('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create employee
    const result = await db.run(
      'INSERT INTO users (name, email, password_hash, role, company_id) VALUES (?, ?, ?, ?, ?) RETURNING id, name, email, role, company_id, created_at',
      [name, email, hashedPassword, role, companyId]
    );

    // Remove sensitive data
    const { password_hash, ...userWithoutPassword } = result;

    res.status(StatusCodes.CREATED).json({
      status: 'success',
      data: {
        user: userWithoutPassword
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAllEmployees = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role } = req.query;
    const offset = (page - 1) * limit;
    const companyId = req.user.companyId;

    let query = 'SELECT id, name, email, role, created_at FROM users WHERE company_id = ?';
    const params = [companyId];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const employees = await db.all(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE company_id = ?';
    const countParams = [companyId];

    if (role) {
      countQuery += ' AND role = ?';
      countParams.push(role);
    }

    const countResult = await db.get(countQuery, countParams);
    const total = countResult.total;

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: {
        employees,
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

const getEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const employee = await db.get(
      'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ? AND company_id = ?',
      [id, companyId]
    );

    if (!employee) {
      throw ApiError.notFound('Employee not found');
    }

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: {
        employee
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    const companyId = req.user.companyId;

    // Check if employee exists and belongs to the company
    const employee = await db.get(
      'SELECT id FROM users WHERE id = ? AND company_id = ?',
      [id, companyId]
    );

    if (!employee) {
      throw ApiError.notFound('Employee not found');
    }

    // Check if email is already taken by another user
    if (email) {
      const emailTaken = await db.get(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, id]
      );
      
      if (emailTaken) {
        throw ApiError.conflict('Email already in use');
      }
    }

    // Build update query dynamically based on provided fields
    const updates = [];
    const params = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }

    if (email) {
      updates.push('email = ?');
      params.push(email);
    }

    if (updates.length === 0) {
      throw ApiError.badRequest('No valid fields to update');
    }

    params.push(id, companyId);

    const result = await db.run(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND company_id = ? 
       RETURNING id, name, email, role, updated_at`,
      params
    );

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: {
        employee: result
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateEmployeeRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const companyId = req.user.companyId;

    // Validate role
    const validRoles = ['company_admin', 'question_writer', 'reviewer'];
    if (!validRoles.includes(role)) {
      throw ApiError.badRequest('Invalid role');
    }

    // Check if employee exists and belongs to the company
    const employee = await db.get(
      'SELECT id, role FROM users WHERE id = ? AND company_id = ?',
      [id, companyId]
    );

    if (!employee) {
      throw ApiError.notFound('Employee not found');
    }

    // Prevent changing own role
    if (req.user.id === id) {
      throw ApiError.badRequest('Cannot change your own role');
    }

    // Update role
    const result = await db.run(
      'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING id, name, email, role, updated_at',
      [role, id]
    );

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: {
        employee: result
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    // Check if employee exists and belongs to the company
    const employee = await db.get(
      'SELECT id, role FROM users WHERE id = ? AND company_id = ?',
      [id, companyId]
    );

    if (!employee) {
      throw ApiError.notFound('Employee not found');
    }

    // Prevent deleting yourself
    if (req.user.id === id) {
      throw ApiError.badRequest('Cannot delete your own account');
    }

    // Delete employee
    await db.run('DELETE FROM users WHERE id = ?', [id]);

    res.status(StatusCodes.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEmployee,
  getAllEmployees,
  getEmployee,
  updateEmployee,
  updateEmployeeRole,
  deleteEmployee
};
