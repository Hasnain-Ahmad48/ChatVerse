import { body, validationResult } from 'express-validator';

/**
 * Validation Middleware
 * Validates request data using express-validator
 * Returns formatted error messages
 */
export const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  };
};

/**
 * Validation Rules
 * Reusable validation rules for different endpoints
 */
export const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

export const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const messageValidation = [
  body('text')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Message text cannot exceed 1000 characters'),
  body('receiverId')
    .notEmpty()
    .withMessage('Receiver ID is required')
    .isMongoId()
    .withMessage('Invalid receiver ID'),
];




