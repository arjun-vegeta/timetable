import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { runAsync, getAsync, allAsync } from '../database/db.js';
import { authenticateCR } from '../middleware/auth.js';

dotenv.config();

const router = express.Router();

// Admin creates CR account
router.post('/create', async (req, res) => {
  try {
    const { username, password, program, year, section, name } = req.body;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await runAsync(
      'INSERT INTO users (username, password, role, program, year, section, name) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, 'cr', program, year, section, name]
    );
    
    res.json({ success: true, message: 'CR created successfully', id: result.lastID });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get all CRs
router.get('/list', async (req, res) => {
  try {
    const crs = await allAsync('SELECT id, username, name, program, year, section, created_at FROM users WHERE role = ?', ['cr']);
    res.json(crs);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete CR
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync('DELETE FROM users WHERE id = ? AND role = ?', [id, 'cr']);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// CR Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await getAsync('SELECT * FROM users WHERE username = ? AND role = ?', [username, 'cr']);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, program: user.program, year: user.year, section: user.section },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        program: user.program,
        year: user.year,
        section: user.section
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get CR's timetable (modified version)
router.get('/timetable', authenticateCR, async (req, res) => {
  try {
    const { program, year, section } = req.user;
    
    // Get active semester
    const semester = await getAsync('SELECT id FROM semesters WHERE is_active = 1');
    if (!semester) {
      return res.json([]);
    }
    
    const slots = await allAsync(`
      SELECT ts.*, c.course_code, c.course_name, c.instructor, c.room_lab
      FROM cr_timetable_slots ts
      LEFT JOIN courses c ON ts.course_id = c.id
      WHERE ts.semester_id = ? AND ts.program = ? AND ts.year = ? AND ts.section = ?
      ORDER BY 
        CASE ts.day 
          WHEN 'Monday' THEN 1 
          WHEN 'Tuesday' THEN 2 
          WHEN 'Wednesday' THEN 3 
          WHEN 'Thursday' THEN 4 
          WHEN 'Friday' THEN 5 
        END,
        ts.slot_number
    `, [semester.id, program, year, section]);
    
    res.json(slots);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Copy original timetable to CR timetable (first time setup)
router.post('/copy-original', authenticateCR, async (req, res) => {
  try {
    const { program, year, section } = req.user;
    
    // Get active semester
    const semester = await getAsync('SELECT id FROM semesters WHERE is_active = 1');
    if (!semester) {
      return res.status(400).json({ success: false, message: 'No active semester' });
    }
    
    // Delete existing CR timetable
    await runAsync('DELETE FROM cr_timetable_slots WHERE semester_id = ? AND program = ? AND year = ? AND section = ?', 
      [semester.id, program, year, section]);
    
    // Copy from original
    await runAsync(`
      INSERT INTO cr_timetable_slots (semester_id, program, year, section, day, slot_number, time_start, time_end, course_id, slot_type, modified_by)
      SELECT semester_id, program, year, section, day, slot_number, time_start, time_end, course_id, slot_type, ?
      FROM timetable_slots
      WHERE semester_id = ? AND program = ? AND year = ? AND section = ? AND is_published = 1
    `, [req.user.id, semester.id, program, year, section]);
    
    res.json({ success: true, message: 'Timetable copied successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update CR timetable slot
router.post('/timetable/slot', authenticateCR, async (req, res) => {
  try {
    const { day, slot_number, course_id, slot_type, time_start, time_end } = req.body;
    const { program, year, section, id: userId } = req.user;
    
    // Get active semester
    const semester = await getAsync('SELECT id FROM semesters WHERE is_active = 1');
    if (!semester) {
      return res.status(400).json({ success: false, message: 'No active semester' });
    }
    
    await runAsync(`
      INSERT INTO cr_timetable_slots (semester_id, program, year, section, day, slot_number, course_id, slot_type, time_start, time_end, modified_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(semester_id, program, year, section, day, slot_number) 
      DO UPDATE SET course_id = ?, slot_type = ?, modified_by = ?
    `, [semester.id, program, year, section, day, slot_number, course_id, slot_type || 'class', time_start, time_end, userId, course_id, slot_type || 'class', userId]);
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete CR timetable slot
router.delete('/timetable/slot', authenticateCR, async (req, res) => {
  try {
    const { day, slot_number } = req.body;
    const { program, year, section } = req.user;
    
    // Get active semester
    const semester = await getAsync('SELECT id FROM semesters WHERE is_active = 1');
    if (!semester) {
      return res.status(400).json({ success: false, message: 'No active semester' });
    }
    
    await runAsync('DELETE FROM cr_timetable_slots WHERE semester_id = ? AND program = ? AND year = ? AND section = ? AND day = ? AND slot_number = ?',
      [semester.id, program, year, section, day, slot_number]);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Save Google Calendar tokens
router.post('/google-calendar/token', authenticateCR, async (req, res) => {
  try {
    const { access_token, refresh_token } = req.body;
    
    await runAsync(
      'UPDATE users SET google_calendar_token = ?, google_refresh_token = ? WHERE id = ?',
      [access_token, refresh_token, req.user.id]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
