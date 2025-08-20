const bcrypt = require('bcryptjs');
const { StatusCodes } = require('http-status-codes');
const db = require('../utils/db');
const { createAuthResponse } = require('../utils/jwt');
const ApiError = require('../utils/apiError');

const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'question_writer', companyName } = req.body;

    // Check if user already exists
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already in use');
    }

    // Start a transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Create company if it doesn't exist
      let companyId = null;
      if (companyName) {
        const company = await db.get('INSERT INTO companies (name) VALUES (?) RETURNING id', [companyName]);
        companyId = company.id;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await db.get(
        'INSERT INTO users (name, email, password_hash, role, company_id) VALUES (?, ?, ?, ?, ?) RETURNING *',
        [name, email, hashedPassword, role, companyId]
      );

      // Commit transaction
      await db.run('COMMIT');

      // Generate tokens
      const authData = createAuthResponse(user);

      res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: authData
      });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');
    }

    // Generate tokens
    const authData = createAuthResponse(user);

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: authData
    });
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Refresh token is required');
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    // Get user
    const user = await db.get('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (!user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not found');
    }

    // Generate new tokens
    const authData = createAuthResponse(user);

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: authData
    });
  } catch (error) {
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid refresh token'));
  }
};

module.exports = {
  register,
  login,
  refreshToken
};
