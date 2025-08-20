const { StatusCodes } = require('http-status-codes');
const { verifyToken } = require('../utils/jwt');
const ApiError = require('../utils/apiError');
const db = require('../utils/db');

const auth = (roles = []) => {
  return async (req, res, next) => {
    try {
      // Get token from header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Authentication required');
      }

      const token = authHeader.split(' ')[1];
      
      // Verify token
      const decoded = verifyToken(token);
      
      // Get user from database
      const user = await db.get('SELECT * FROM users WHERE id = ?', [decoded.id]);
      if (!user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not found');
      }

      // Check if user role is authorized
      if (roles.length && !roles.includes(user.role)) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Insufficient permissions');
      }

      // Attach user to request object
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.company_id
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Role-based access control middleware
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to perform this action')
      );
    }
    next();
  };
};

module.exports = {
  auth,
  restrictTo
};
