const { validationResult, matchedData } = require('express-validator');

// Middleware to validate requests and handle validation errors
const validate = validations => {
  return async (req, res, next) => {
    // Execute all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Check if there are validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Return validation errors as a response
      return res.status(400).json({ 
        status: 'error',
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    // Add sanitized data to the request object
    req.validatedData = matchedData(req);
    
    // Continue to the next middleware/route handler
    next();
  };
};

module.exports = {
  validate
}; 