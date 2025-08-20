const express = require('express');
const { body, param, query } = require('express-validator');
const categoryController = require('../controllers/categoryController');
const { auth, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Protect all routes with authentication
router.use(auth);

// Validation rules
const createCategoryRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('parentId')
    .optional()
    .isInt()
    .withMessage('Parent ID must be an integer')
];

const updateCategoryRules = [
  param('id')
    .isInt()
    .withMessage('Invalid category ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
];

const idParamRules = [
  param('id')
    .isInt()
    .withMessage('Invalid category ID')
];

const moveQuestionsRules = [
  param('id')
    .isInt()
    .withMessage('Invalid source category ID'),
  body('targetCategoryId')
    .isInt()
    .withMessage('Target category ID must be an integer')
];

// Routes
router.post(
  '/',
  restrictTo('company_admin', 'question_writer'),
  validate(createCategoryRules),
  categoryController.createCategory
);

router.get(
  '/',
  [
    query('parentOnly')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('parentOnly must be either "true" or "false"')
  ],
  validate(),
  categoryController.getCategories
);

router.get(
  '/:id',
  validate(idParamRules),
  categoryController.getCategory
);

router.put(
  '/:id',
  restrictTo('company_admin', 'question_writer'),
  validate(updateCategoryRules),
  categoryController.updateCategory
);

router.delete(
  '/:id',
  restrictTo('company_admin'),
  validate(idParamRules),
  categoryController.deleteCategory
);

router.post(
  '/:id/move-questions',
  restrictTo('company_admin'),
  validate(moveQuestionsRules),
  categoryController.moveQuestions
);

// Subcategory routes
router.get(
  '/:id/subcategories',
  validate(idParamRules),
  (req, res, next) => {
    // Forward to getCategories with parentOnly=false and parent_id=id
    req.query.parentOnly = 'false';
    req.query.parentId = req.params.id;
    return categoryController.getCategories(req, res, next);
  }
);

module.exports = router;
