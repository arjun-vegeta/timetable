import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

export const authenticateCR = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (req.user.role !== 'cr') {
      return res.status(403).json({ success: false, message: 'CR access required' });
    }
    next();
  });
};

export const authenticateIncharge = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (req.user.role !== 'incharge') {
      return res.status(403).json({ success: false, message: 'Incharge access required' });
    }
    next();
  });
};
