const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('./config');

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

function createAccessToken(data) {
  const payload = {
    sub: data.sub,
    ...data
  };
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: '7d',
    algorithm: 'HS256'
  });
}

function decodeToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256']
    });
  } catch (err) {
    throw new Error('Invalid authentication credentials');
  }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ detail: 'Invalid authentication credentials' });
  }

  try {
    const payload = decodeToken(token);
    if (!payload.sub) {
      return res.status(401).json({ detail: 'Invalid authentication credentials' });
    }
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ detail: 'Invalid authentication credentials' });
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  createAccessToken,
  decodeToken,
  authenticateToken
};
