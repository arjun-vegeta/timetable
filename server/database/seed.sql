-- Seed data for timetable system

-- Sample Courses for III Semester
INSERT OR IGNORE INTO courses (course_code, course_name, instructor, lecture_hours, tutorial_hours, practical_hours, is_elective, semester, sections, room_lab) VALUES
('CS201', 'Design and Analysis of Algorithms', 'Dr. B.R Chandavarkar', 3, 1, 0, 0, 'III', '["S1", "S2"]', 'LHC-CR2'),
('CS202', 'Data Structures and Algorithms Lab', 'Manjanna B', 0, 0, 3, 0, 'III', '["S1", "S2"]', 'Lab No. 311'),
('CS203', 'Data Structures and Algo Lab', 'Manjanna B', 0, 0, 3, 0, 'III', '["S1", "S2"]', 'Lab No. 302'),
('CS204', 'Computer Design Lab', 'Abhilash M', 0, 0, 3, 0, 'III', '["S1", "S2"]', 'Lab No. 302'),
('MA204', 'Linear Algebra and Matrices', 'MATHS', 3, 0, 0, 0, 'III', '["S1", "S2"]', 'LHC-CR2'),
('SM300', 'Engineering Economics', 'SOM', 3, 0, 0, 0, 'III', '["S1", "S2"]', NULL);

-- Sample Courses for V Semester
INSERT OR IGNORE INTO courses (course_code, course_name, instructor, lecture_hours, tutorial_hours, practical_hours, is_elective, semester, sections, room_lab) VALUES
('CS301', 'Computer Networks', 'Saumya Hegde', 3, 1, 0, 0, 'V', '["S1", "S2"]', 'LHC-CR7'),
('CS302', 'Computer Networks Lab', 'Saumya Hegde', 0, 0, 3, 0, 'V', '["S1", "S2"]', 'Lab No. 302'),
('CS303', 'Compiler Design', 'Abhilash M', 3, 1, 0, 0, 'V', '["S1", "S2"]', 'LHC-CR7'),
('CS304', 'Compiler Design Lab', 'Abhilash M', 0, 0, 3, 0, 'V', '["S1", "S2"]', 'Lab No. 302'),
('CS305', 'Software Engineering', 'K Chandrasekaran', 3, 1, 0, 0, 'V', '["S1", "S2"]', 'LHC-CR7'),
('CS252M', 'Operating System', 'Radhika B.S', 3, 1, 0, 1, 'V', '["S1", "S2"]', 'LHC-CR7');

-- Sample Courses for M.Tech
INSERT OR IGNORE INTO courses (course_code, course_name, instructor, lecture_hours, tutorial_hours, practical_hours, is_elective, semester, sections, room_lab) VALUES
('CS700', 'Algorithms and Complexity', 'Vani M', 3, 0, 2, 0, 'I M.Tech', '["CSE", "CSE-IS"]', 'LHC-C-LH3'),
('CS701', 'High Performance Computing', 'Biswajit R. Bhowmik', 3, 0, 2, 0, 'I M.Tech', '["CSE"]', 'LHC-C-LH3'),
('CS702', 'Computing Lab', 'Assilent Lecturer', 0, 0, 3, 0, 'I M.Tech', '["CSE", "CSE-IS"]', 'Lab No. 401'),
('CS800', 'Number Theory & Cryptography', 'M.P.Singh', 3, 0, 2, 0, 'I M.Tech', '["CSE-IS"]', 'LHC-C-LH4'),
('MA714', 'Math. Foundations of Comp. Sci.', 'MACS Department', 3, 0, 0, 0, 'I M.Tech', '["CSE", "CSE-IS"]', 'LHC-C-LH3');

-- Sample CRs (password is 'cr123' for all)
-- Password hash for 'cr123': $2b$10$YourHashHere (you'll need to generate this)
INSERT OR IGNORE INTO users (username, password, name, role, semester, section) VALUES
('cr_iii_s1', '$2b$10$rQZ5YJKvX8vN5YJKvX8vN5YJKvX8vN5YJKvX8vN5YJKvX8vN5YJKv', 'Rahul Kumar', 'cr', 'III', 'S1'),
('cr_v_s1', '$2b$10$rQZ5YJKvX8vN5YJKvX8vN5YJKvX8vN5YJKvX8vN5YJKvX8vN5YJKv', 'Priya Sharma', 'cr', 'V', 'S1'),
('cr_mtech_cse', '$2b$10$rQZ5YJKvX8vN5YJKvX8vN5YJKvX8vN5YJKvX8vN5YJKvX8vN5YJKv', 'Amit Patel', 'cr', 'I M.Tech', 'CSE');

-- Sample timetable for III Semester S1 (Monday)
INSERT OR IGNORE INTO timetable_slots (semester, section, day, slot_number, time_start, time_end, course_id, slot_type, is_published) VALUES
('III', 'S1', 'Monday', 2, '09:00', '09:45', (SELECT id FROM courses WHERE course_code = 'CS201' LIMIT 1), 'class', 1),
('III', 'S1', 'Monday', 3, '10:00', '10:45', (SELECT id FROM courses WHERE course_code = 'SM300' LIMIT 1), 'class', 1),
('III', 'S1', 'Monday', 5, '12:00', '12:45', (SELECT id FROM courses WHERE course_code = 'CS202' LIMIT 1), 'class', 1),
('III', 'S1', 'Monday', 6, '13:00', '13:45', (SELECT id FROM courses WHERE course_code = 'CS202' LIMIT 1), 'class', 1),
('III', 'S1', 'Monday', 7, '14:00', '14:45', (SELECT id FROM courses WHERE course_code = 'CS202' LIMIT 1), 'class', 1);

-- Sample timetable for V Semester S1 (Monday)
INSERT OR IGNORE INTO timetable_slots (semester, section, day, slot_number, time_start, time_end, course_id, slot_type, is_published) VALUES
('V', 'S1', 'Monday', 1, '08:00', '08:45', (SELECT id FROM courses WHERE course_code = 'CS301' LIMIT 1), 'class', 1),
('V', 'S1', 'Monday', 2, '09:00', '09:45', (SELECT id FROM courses WHERE course_code = 'CS303' LIMIT 1), 'class', 1),
('V', 'S1', 'Monday', 3, '10:00', '10:45', (SELECT id FROM courses WHERE course_code = 'CS305' LIMIT 1), 'class', 1),
('V', 'S1', 'Monday', 5, '12:00', '12:45', (SELECT id FROM courses WHERE course_code = 'CS304' LIMIT 1), 'class', 1),
('V', 'S1', 'Monday', 6, '13:00', '13:45', (SELECT id FROM courses WHERE course_code = 'CS304' LIMIT 1), 'class', 1);
