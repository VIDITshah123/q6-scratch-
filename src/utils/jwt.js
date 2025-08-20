const jwt = require('jsonwebtoken');
const { StatusCodes } = require('http-status-codes');
const ApiError = require('./apiError');

const generateToken = (payload, expiresIn = process.env.JWT_EXPIRES_IN) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired token');
  }
};

const createAuthResponse = (user) => {
  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    companyId: user.company_id
  };

  const accessToken = generateToken(tokenPayload);
  const refreshToken = generateToken(tokenPayload, process.env.JWT_REFRESH_EXPIRES_IN);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.company_id
    },
    tokens: {
      access: {
        token: accessToken,
        expires: new Date(Date.now() + parseInt(process.env.JWT_EXPIRES_IN) * 1000)
      },
      refresh: {
        token: refreshToken,
        expires: new Date(Date.now() + parseInt(process.env.JWT_REFRESH_EXPIRES_IN) * 1000)
      }
    }
  };
};

module.exports = {
  generateToken,
  verifyToken,
  createAuthResponse
};
