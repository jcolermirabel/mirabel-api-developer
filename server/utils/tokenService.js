const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Redis integration with fallback to in-memory
let redisSecurityService = null;

// Initialize Redis service
const initializeRedis = async () => {
  try {
    const { getRedisSecurityService } = require('../services/redisSecurityService');
    redisSecurityService = await getRedisSecurityService();
  } catch (error) {
    console.warn('Redis not available, using in-memory token management');
    redisSecurityService = null;
  }
};

// In-memory fallback for development
const tokenBlacklist = new Set();

// Enhanced JWT token generation with shorter expiration
const generateTokens = (payload) => {
  const accessTokenId = crypto.randomBytes(16).toString('hex');
  const refreshTokenId = crypto.randomBytes(16).toString('hex');
  
  const accessToken = jwt.sign(
    { ...payload, type: 'access' },
    process.env.JWT_SECRET,
    { 
      expiresIn: '15m', // Short-lived access token
      jwtid: accessTokenId,
      issuer: 'mirabel-api',
      audience: 'mirabel-client'
    }
  );
  
  const refreshToken = jwt.sign(
    { ...payload, type: 'refresh' },
    process.env.JWT_SECRET,
    { 
      expiresIn: '7d', // Longer-lived refresh token
      jwtid: refreshTokenId,
      issuer: 'mirabel-api',
      audience: 'mirabel-client'
    }
  );
  
  return { 
    accessToken, 
    refreshToken,
    accessTokenId,
    refreshTokenId,
    expiresIn: 900, // 15 minutes in seconds
    refreshExpiresIn: 604800 // 7 days in seconds
  };
};

// Enhanced token validation with Redis blacklist check
const validateToken = async (token) => {
  try {
    // First decode to check basic format
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is blacklisted (Redis or in-memory)
    const isBlacklisted = await checkTokenBlacklist(token);
    if (isBlacklisted) {
      throw new Error('Token has been revoked');
    }
    
    // Validate issuer and audience for enhanced security
    if (decoded.iss !== 'mirabel-api' || decoded.aud !== 'mirabel-client') {
      throw new Error('Invalid token issuer or audience');
    }
    
    return decoded;
  } catch (error) {
    throw error;
  }
};

// Check token blacklist with Redis/fallback
const checkTokenBlacklist = async (token) => {
  try {
    if (redisSecurityService && redisSecurityService.isConnected) {
      return await redisSecurityService.isTokenBlacklisted(token);
    } else {
      // Fallback to in-memory
      const decoded = jwt.decode(token);
      return decoded?.jti ? tokenBlacklist.has(decoded.jti) : false;
    }
  } catch (error) {
    console.error('Error checking token blacklist:', error);
    return false; // Fail open for availability
  }
};

// Blacklist a token with Redis/fallback
const blacklistToken = async (token) => {
  try {
    if (redisSecurityService && redisSecurityService.isConnected) {
      return await redisSecurityService.blacklistToken(token);
    } else {
      // Fallback to in-memory
      const decoded = jwt.decode(token);
      if (decoded && decoded.jti) {
        tokenBlacklist.add(decoded.jti);
        return true;
      }
      return false;
    }
  } catch (error) {
    console.error('Error blacklisting token:', error);
    return false;
  }
};

// Refresh token functionality
const refreshAccessToken = async (refreshToken) => {
  try {
    // Validate the refresh token
    const decoded = await validateToken(refreshToken);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type for refresh');
    }
    
    // Generate new access token with same payload (excluding refresh-specific fields)
    const { type, jti, iat, exp, iss, aud, ...userPayload } = decoded;
    const newTokens = generateTokens(userPayload);
    
    // Optionally blacklist old refresh token for security
    if (process.env.REFRESH_TOKEN_ROTATION === 'true') {
      await blacklistToken(refreshToken);
    }
    
    return newTokens;
    
  } catch (error) {
    throw new Error('Invalid refresh token: ' + error.message);
  }
};

// Clean expired tokens from blacklist (Redis handles this automatically with TTL)
const cleanExpiredTokens = async () => {
  try {
    if (!redisSecurityService || !redisSecurityService.isConnected) {
      // For in-memory fallback, we need manual cleanup
      const now = Math.floor(Date.now() / 1000);
      const expiredTokens = [];
      
      // This is simplified - in production with in-memory, 
      // you'd need to store token metadata for proper cleanup
      for (const jti of tokenBlacklist) {
        try {
          // This is a basic check - would need better logic in production
          expiredTokens.push(jti);
        } catch (error) {
          expiredTokens.push(jti);
        }
      }
      
      // Remove expired tokens
      expiredTokens.forEach(jti => tokenBlacklist.delete(jti));
      
      return { cleaned: expiredTokens.length, method: 'in-memory' };
    } else {
      // Redis handles expiration automatically via TTL
      return { cleaned: 0, method: 'redis-ttl' };
    }
  } catch (error) {
    console.error('Error cleaning expired tokens:', error);
    return { cleaned: 0, error: error.message };
  }
};

// Get blacklist size for monitoring
const getBlacklistSize = async () => {
  try {
    if (redisSecurityService && redisSecurityService.isConnected) {
      // For Redis, this would require a separate tracking mechanism
      // as Redis keys with patterns are expensive to count
      return { size: 'redis-based', note: 'Use Redis monitoring tools' };
    } else {
      return { size: tokenBlacklist.size, method: 'in-memory' };
    }
  } catch (error) {
    return { size: 0, error: error.message };
  }
};

// Token security analysis
const analyzeToken = (token) => {
  try {
    const decoded = jwt.decode(token, { complete: true });
    
    return {
      header: decoded.header,
      payload: {
        ...decoded.payload,
        // Remove sensitive data from analysis
        jti: decoded.payload.jti ? decoded.payload.jti.substring(0, 8) + '...' : null
      },
      isExpired: decoded.payload.exp ? Date.now() >= decoded.payload.exp * 1000 : false,
      timeToExpiry: decoded.payload.exp ? decoded.payload.exp - Math.floor(Date.now() / 1000) : null,
      algorithm: decoded.header.alg,
      tokenType: decoded.payload.type || 'legacy'
    };
  } catch (error) {
    return { error: 'Invalid token format' };
  }
};

// Logout functionality - blacklist both tokens
const logout = async (accessToken, refreshToken = null) => {
  try {
    const results = {
      accessTokenBlacklisted: false,
      refreshTokenBlacklisted: false
    };
    
    // Blacklist access token
    if (accessToken) {
      results.accessTokenBlacklisted = await blacklistToken(accessToken);
    }
    
    // Blacklist refresh token if provided
    if (refreshToken) {
      results.refreshTokenBlacklisted = await blacklistToken(refreshToken);
    }
    
    return results;
  } catch (error) {
    console.error('Error during logout:', error);
    return { error: error.message };
  }
};

// Initialize Redis on module load
initializeRedis().catch(console.error);

module.exports = {
  generateTokens,
  validateToken,
  blacklistToken,
  refreshAccessToken,
  cleanExpiredTokens,
  getBlacklistSize,
  analyzeToken,
  logout,
  checkTokenBlacklist
}; 