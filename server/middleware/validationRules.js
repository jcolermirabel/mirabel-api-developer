const { body, param, query } = require('express-validator');

// Common validation rules that can be reused across routes
const validationRules = {
  // User validation rules
  user: {
    create: [
      body('email')
        .isEmail().withMessage('Must be a valid email address')
        .normalizeEmail({ gmail_remove_dots: false })
        .trim(),
      body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
        .matches(/\d/).withMessage('Password must contain at least one number')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter'),
      body('firstName')
        .isString().withMessage('First name must be a string')
        .trim()
        .notEmpty().withMessage('First name is required'),
      body('lastName')
        .isString().withMessage('Last name must be a string')
        .trim()
        .notEmpty().withMessage('Last name is required'),
      body('roles')
        .optional()
        .isArray().withMessage('Roles must be an array')
    ],
    update: [
      param('id')
        .isMongoId().withMessage('Invalid user ID format'),
      body('email')
        .optional()
        .isEmail().withMessage('Must be a valid email address')
        .normalizeEmail({ gmail_remove_dots: false })
        .trim(),
      body('firstName')
        .optional()
        .isString().withMessage('First name must be a string')
        .trim(),
      body('lastName')
        .optional()
        .isString().withMessage('Last name must be a string')
        .trim(),
      body('roles')
        .optional()
        .isArray().withMessage('Roles must be an array'),
      body('isActive')
        .optional()
        .isBoolean().withMessage('isActive must be a boolean')
    ],
    getById: [
      param('id')
        .isMongoId().withMessage('Invalid user ID format')
    ]
  },
  
  // Authentication validation rules
  auth: {
    login: [
      body('email')
        .isEmail().withMessage('Must be a valid email address')
        .normalizeEmail({ gmail_remove_dots: false })
        .trim(),
      body('password')
        .notEmpty().withMessage('Password is required')
    ]
  },
  
  // Pagination validation rules for any paginated route
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
      .toInt()
  ],
  
  // SQL Injection prevention for any user input that might go into a SQL query
  sqlSafeString: (fieldName) => {
    return body(fieldName)
      .custom(value => {
        // Check for common SQL injection patterns
        const sqlPattern = /('|"|;|--|\/\*|\*\/|@@|@|char|nchar|varchar|nvarchar|alter|begin|cast|create|cursor|declare|delete|drop|end|exec|execute|fetch|insert|kill|open|select|sys|sysobjects|syscolumns|table|update|xp_)/i;
        if (value && sqlPattern.test(value)) {
          throw new Error('Input contains potentially malicious SQL characters');
        }
        return true;
      })
  }
};

module.exports = validationRules; 