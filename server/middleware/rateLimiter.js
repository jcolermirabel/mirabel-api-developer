const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  trustProxy: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log('Rate limit exceeded:', {
      ip: req.ip,
      path: req.path,
      headers: req.headers
    });
    res.status(429).json({
      message: 'Too many requests, please try again later.'
    });
  }
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  trustProxy: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log('Auth rate limit exceeded:', {
      ip: req.ip,
      path: req.path,
      headers: req.headers
    });
    res.status(429).json({
      message: 'Too many authentication attempts, please try again later.'
    });
  }
});

module.exports = {
  apiLimiter,
  authLimiter
}; 