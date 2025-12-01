import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { getAsync } from '../database/db.js';

dotenv.config();

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    const result = await getAsync('SELECT value FROM settings WHERE key = ?', ['incharge_password']);
    
    if (result && result.value === password) {
      const token = jwt.sign(
        { role: 'incharge' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      res.json({ success: true, token });
    } else {
      res.status(401).json({ success: false, message: 'Invalid password' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify token endpoint
router.get('/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ valid: false });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ valid: false });
    }
    res.json({ valid: true, user });
  });
});

export default router;
