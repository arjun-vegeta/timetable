import express from 'express';
import { runAsync, getAsync, allAsync } from '../database/db.js';

const router = express.Router();

// Get all courses
router.get('/', async (req, res) => {
  try {
    const { semester_id, section, program, year } = req.query;
    let query = 'SELECT * FROM courses';
    const params = [];
    const conditions = [];
    
    if (semester_id) {
      conditions.push('semester_id = ?');
      params.push(semester_id);
    }
    
    if (program) {
      conditions.push('program = ?');
      params.push(program);
    }
    
    if (year) {
      conditions.push('year = ?');
      params.push(year);
    }
    
    if (section) {
      conditions.push('sections LIKE ?');
      params.push(`%${section}%`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    const courses = await allAsync(query, params);
    res.json(courses);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create course
router.post('/', async (req, res) => {
  const { course_code, course_name, instructor, lecture_hours, tutorial_hours, practical_hours, is_elective, is_combined, is_minor, program, year, sections, room_lab, classroom, is_common, course_type, semester_id } = req.body;
  
  // Convert sections array to comma-separated string if needed
  const sectionsStr = Array.isArray(sections) ? sections.join(',') : sections;
  
  try {
    const result = await runAsync(`
      INSERT INTO courses (course_code, course_name, instructor, lecture_hours, tutorial_hours, practical_hours, is_elective, is_combined, is_minor, program, year, sections, room_lab, classroom, is_common, course_type, semester_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [course_code, course_name, instructor, lecture_hours || 0, tutorial_hours || 0, practical_hours || 0, is_elective ? 1 : 0, is_combined ? 1 : 0, is_minor ? 1 : 0, program, year, sectionsStr, room_lab, classroom, is_common ? 1 : 0, course_type || 'regular', semester_id]);
    
    res.json({ id: result.lastID, success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update course
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { course_code, course_name, instructor, lecture_hours, tutorial_hours, practical_hours, is_elective, is_combined, is_minor, program, year, sections, room_lab, classroom, is_common, course_type, semester_id } = req.body;
  
  // Convert sections array to comma-separated string if needed
  const sectionsStr = Array.isArray(sections) ? sections.join(',') : sections;
  
  try {
    await runAsync(`
      UPDATE courses SET course_code = ?, course_name = ?, instructor = ?, lecture_hours = ?, tutorial_hours = ?, practical_hours = ?, is_elective = ?, is_combined = ?, is_minor = ?, program = ?, year = ?, sections = ?, room_lab = ?, classroom = ?, is_common = ?, course_type = ?, semester_id = ?
      WHERE id = ?
    `, [course_code, course_name, instructor, lecture_hours || 0, tutorial_hours || 0, practical_hours || 0, is_elective ? 1 : 0, is_combined ? 1 : 0, is_minor ? 1 : 0, program, year, sectionsStr, room_lab, classroom, is_common ? 1 : 0, course_type || 'regular', semester_id, id]);
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete course
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync('DELETE FROM courses WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
