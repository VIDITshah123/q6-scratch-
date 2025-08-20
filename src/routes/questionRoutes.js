const express = require('express');
const { body, param, query } = require('express-validator');
const questionController = require('../controllers/questionController');
const { auth, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Protect all routes with authentication
router.use(auth);

// Validation rules
const createQuestionRules = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Content must be between 10 and 1000 characters'),
  body('options')
    .isArray({ min: 2, max: 10 })
    .withMessage('At least 2 and at most 10 options are required'),
  body('options.*')
    .trim()
    .notEmpty()
    .withMessage('Option cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Option must be less than 200 characters'),
  body('correctAnswers')
    .isArray({ min: 1 })
    .withMessage('At least one correct answer is required'),
  body('correctAnswers.*')
    .isInt({ min: 0 })
    .withMessage('Correct answer must be a valid option index'),
  body('categories')
    .optional()
    .isArray()
    .withMessage('Categories must be an array')
];

const getQuestionsRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'pending_review'])
    .withMessage('Invalid status value'),
  query('category')
    .optional()
    .isInt()
    .withMessage('Category ID must be an integer'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Search query is too long'),
  query('sortBy')
    .optional()
    .isIn(['created_at', 'score', 'status'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Invalid sort order')
];

const questionIdRules = [
  param('id')
    .isInt()
    .withMessage('Invalid question ID')
];

const voteRules = [
  body('voteType')
    .isIn(['up', 'down'])
    .withMessage('Vote type must be either "up" or "down"')
];

const invalidateRules = [
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Reason is required')
    .isLength({ max: 500 })
    .withMessage('Reason must be less than 500 characters')
];

// Routes
router.post(
  '/',
  restrictTo('question_writer', 'company_admin'),
  validate(createQuestionRules),
  questionController.createQuestion
);

router.get(
  '/',
  validate(getQuestionsRules),
  questionController.getQuestions
);

router.get(
  '/:id',
  validate(questionIdRules),
  questionController.getQuestion
);

router.put(
  '/:id',
  validate([...questionIdRules, ...createQuestionRules.filter(r => r.field !== 'options' && r.field !== 'correctAnswers')]),
  questionController.updateQuestion
);

router.delete(
  '/:id',
  validate(questionIdRules),
  questionController.deleteQuestion
);

router.post(
  '/:id/vote',
  validate([...questionIdRules, ...voteRules]),
  questionController.voteOnQuestion
);

router.post(
  '/:id/invalidate',
  restrictTo('reviewer', 'company_admin'),
  validate([...questionIdRules, ...invalidateRules]),
  questionController.invalidateQuestion
);

module.exports = router;
