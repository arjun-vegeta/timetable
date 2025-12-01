import express from 'express';
import { allAsync } from '../database/db.js';

const router = express.Router();

// Get original timetable (by incharge)
router.get('/timetable/original', async (req, res) => {
  try {
    const { semester_id, program, year, section } = req.query;
    
    const slots = await allAsync(`
      SELECT ts.*, c.course_code, c.course_name, c.instructor, c.room_lab, c.lecture_hours, c.tutorial_hours, c.practical_hours
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

// Get CR modified timetable
router.get('/timetable/cr', async (req, res) => {
  try {
    const { semester_id, program, year, section } = req.query;
    
    const slots = await allAsync(`
      SELECT ts.*, c.course_code, c.course_name, c.instructor, c.room_lab, c.lecture_hours, c.tutorial_hours, c.practical_hours
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
    `, [semester_id, program, year, section]);
    
    res.json(slots);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
