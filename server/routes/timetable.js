import express from 'express';
import { runAsync, getAsync, allAsync } from '../database/db.js';

const router = express.Router();

// Get timetable for semester/section
router.get('/', async (req, res) => {
  try {
    const { semester_id, program, year, section } = req.query;
    
    const slots = await allAsync(`
      SELECT ts.*, c.course_code, c.course_name, c.instructor, c.room_lab, c.lecture_hours, c.tutorial_hours, c.practical_hours, c.is_elective, c.is_minor, c.course_type
      FROM timetable_slots ts
      LEFT JOIN courses c ON ts.course_id = c.id
      WHERE ts.semester_id = ? AND ts.program = ? AND ts.year = ? AND ts.section = ? AND ts.is_published = 1
      ORDER BY 
        CASE ts.day 
          WHEN 'Monday' THEN 1 
          WHEN 'Tuesday' THEN 2 
          WHEN 'Wednesday' THEN 3 
          WHEN 'Thursday' THEN 4 
          WHEN 'Friday' THEN 5 
        END,
        ts.slot_number
    `, [semester_id, program, year, section]);
    
    res.json(slots);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all slots for incharge (including unpublished)
router.get('/all', async (req, res) => {
  try {
    const { semester_id, program, year, section } = req.query;
    
    const slots = await allAsync(`
      SELECT ts.*, c.course_code, c.course_name, c.instructor, c.room_lab, c.practical_hours, c.lecture_hours, c.tutorial_hours, c.is_elective, c.is_minor, c.course_type
      FROM timetable_slots ts
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
    `, [semester_id, program, year, section]);
    
    res.json(slots);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add/Update slot
router.post('/slot', async (req, res) => {
  const { semester_id, program, year, section, day, slot_number, course_id, slot_type, time_start, time_end } = req.body;
  
  try {
    await runAsync(`
      INSERT INTO timetable_slots (semester_id, program, year, section, day, slot_number, course_id, slot_type, time_start, time_end)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(semester_id, program, year, section, day, slot_number) 
      DO UPDATE SET course_id = ?, slot_type = ?
    `, [semester_id, program, year, section, day, slot_number, course_id, slot_type || 'class', time_start, time_end, course_id, slot_type || 'class']);
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete slot
router.delete('/slot', async (req, res) => {
  try {
    const { semester_id, program, year, section, day, slot_number } = req.body;
    await runAsync('DELETE FROM timetable_slots WHERE semester_id = ? AND program = ? AND year = ? AND section = ? AND day = ? AND slot_number = ?', 
      [semester_id, program, year, section, day, slot_number]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Publish timetable
router.post('/publish', async (req, res) => {
  try {
    const { semester_id, program, year, section } = req.body;
    await runAsync('UPDATE timetable_slots SET is_published = 1 WHERE semester_id = ? AND program = ? AND year = ? AND section = ?', 
      [semester_id, program, year, section]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get time slots configuration
router.get('/config', async (req, res) => {
  try {
    const result = await getAsync('SELECT value FROM settings WHERE key = ?', ['time_slots']);
    res.json(JSON.parse(result.value));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
