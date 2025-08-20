const express = require('express');
const { body, param, query } = require('express-validator');
const employeeController = require('../controllers/employeeController');
const { auth, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Protect all routes with authentication
router.use(auth);

// Only company admins can access these routes
router.use(restrictTo('company_admin'));

// Validation rules
const createEmployeeRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name must be less than 100 characters'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .isLength({ max: 100 })
    .withMessage('Email must be less than 100 characters'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .isLength({ max: 100 })
    .withMessage('Password must be less than 100 characters'),
  body('role')
    .optional()
    .isIn(['company_admin', 'question_writer', 'reviewer'])
    .withMessage('Invalid role')
];

const getEmployeeRules = [
  param('id').isInt().withMessage('Invalid employee ID')
];

const updateEmployeeRules = [
  param('id').isInt().withMessage('Invalid employee ID'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Name must be less than 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    .isLength({ max: 100 })
    .withMessage('Email must be less than 100 characters')
];

const updateEmployeeRoleRules = [
  param('id').isInt().withMessage('Invalid employee ID'),
  body('role')
    .isIn(['company_admin', 'question_writer', 'reviewer'])
    .withMessage('Invalid role')
];

const getEmployeesRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('role')
    .optional()
    .isIn(['company_admin', 'question_writer', 'reviewer'])
    .withMessage('Invalid role')
];

// Routes
router.post('/', validate(createEmployeeRules), employeeController.createEmployee);
router.get('/', validate(getEmployeesRules), employeeController.getAllEmployees);
router.get('/:id', validate(getEmployeeRules), employeeController.getEmployee);
router.put('/:id', validate(updateEmployeeRules), employeeController.updateEmployee);
router.put('/:id/role', validate(updateEmployeeRoleRules), employeeController.updateEmployeeRole);
router.delete('/:id', validate(getEmployeeRules), employeeController.deleteEmployee);

module.exports = router;
