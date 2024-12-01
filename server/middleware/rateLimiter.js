const rateLimit = require('express-rate-limit');

const config = {
  trustProxy: true,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Log every request for debugging
    console.log('Rate limit request:', {
      ip: req.ip,
      ips: req.ips,
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
      trustProxy: req.app.get('trust proxy')
    });
    return false;
  }
};

const apiLimiter = rateLimit({
  ...config,
  windowMs: 15 * 60 * 1000,
  max: 100
});

const authLimiter = rateLimit({
  ...config,
  windowMs: 60 * 60 * 1000,
  max: 5
});

module.exports = {
  apiLimiter,
  authLimiter
}; 