const { validationResult } = require('express-validator');
const { StatusCodes } = require('http-status-codes');
const ApiError = require('../utils/apiError');

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors = errors.array().map(err => ({
      field: err.param,
      message: err.msg,
      value: err.value
    }));

    next(
      new ApiError(
        StatusCodes.BAD_REQUEST,
        'Validation failed',
        extractedErrors
      )
    );
  };
};

module.exports = validate;
