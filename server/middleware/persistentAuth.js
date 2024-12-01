const jwt = require('jsonwebtoken');

const persistentAuthMiddleware = (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is about to expire (less than 5 minutes remaining)
    const tokenExp = decoded.exp * 1000; // Convert to milliseconds
    const fiveMinutes = 5 * 60 * 1000;
    
    if (tokenExp - Date.now() < fiveMinutes) {
      // Generate new token
      const newToken = jwt.sign(
        { userId: decoded.userId },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      // Set new cookie
      res.cookie('token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
    }
    
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = persistentAuthMiddleware; 