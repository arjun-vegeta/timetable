import express from 'express';
import { runAsync, getAsync, allAsync } from '../database/db.js';

const router = express.Router();

// Get all semesters
router.get('/', async (req, res) => {
  try {
    const semesters = await allAsync('SELECT * FROM semesters ORDER BY created_at DESC');
    res.json(semesters);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get active semester
router.get('/active', async (req, res) => {
  try {
    const semester = await getAsync('SELECT * FROM semesters WHERE is_active = 1 LIMIT 1');
    res.json(semester || null);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create semester
router.post('/', async (req, res) => {
  const { name, type, start_date, end_date } = req.body;
  
  try {
    // Deactivate all other semesters
    await runAsync('UPDATE semesters SET is_active = 0');
    
    const result = await runAsync(
      'INSERT INTO semesters (name, type, start_date, end_date, is_active) VALUES (?, ?, ?, ?, 1)',
      [name, type, start_date, end_date]
    );
    
    res.json({ id: result.lastID, success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update semester
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, type, start_date, end_date, is_active } = req.body;
  
  try {
    if (is_active) {
      await runAsync('UPDATE semesters SET is_active = 0');
    }
    
    await runAsync(
      'UPDATE semesters SET name = ?, type = ?, start_date = ?, end_date = ?, is_active = ? WHERE id = ?',
      [name, type, start_date, end_date, is_active ? 1 : 0, id]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete semester
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync('DELETE FROM semesters WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get classes for a semester
router.get('/:id/classes', async (req, res) => {
  try {
    const { id } = req.params;
    const classes = await allAsync('SELECT * FROM classes WHERE semester_id = ? ORDER BY program, year, section', [id]);
    res.json(classes);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create class
router.post('/:id/classes', async (req, res) => {
  const { id } = req.params;
  const { program, year, section, classroom } = req.body;
  
  try {
    const result = await runAsync(
      'INSERT INTO classes (semester_id, program, year, section, classroom) VALUES (?, ?, ?, ?, ?)',
      [id, program, year, section, classroom]
    );
    
    res.json({ id: result.lastID, success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete class
router.delete('/classes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync('DELETE FROM classes WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});



export default router;
