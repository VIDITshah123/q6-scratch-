const express = require('express');
const { body, param, query } = require('express-validator');
const companyController = require('../controllers/companyController');
const { auth, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Protect all routes with authentication
router.use(auth);

// Only admin can access these routes
router.use(restrictTo('admin'));

// Validation rules
const createCompanyRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ max: 100 })
    .withMessage('Company name must be less than 100 characters')
];

const updateCompanyRules = [
  param('id').isInt().withMessage('Invalid company ID'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ max: 100 })
    .withMessage('Company name must be less than 100 characters')
];

const getCompanyRules = [
  param('id').isInt().withMessage('Invalid company ID')
];

const deleteCompanyRules = [
  param('id').isInt().withMessage('Invalid company ID')
];

const getCompaniesRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

// Routes
router.post('/', validate(createCompanyRules), companyController.createCompany);
router.get('/', validate(getCompaniesRules), companyController.getAllCompanies);
router.get('/:id', validate(getCompanyRules), companyController.getCompany);
router.put('/:id', validate(updateCompanyRules), companyController.updateCompany);
router.delete('/:id', validate(deleteCompanyRules), companyController.deleteCompany);

module.exports = router;
