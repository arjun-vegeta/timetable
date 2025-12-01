-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code TEXT NOT NULL,
    course_name TEXT NOT NULL,
    instructor TEXT NOT NULL,
    lecture_hours INTEGER DEFAULT 0,
    tutorial_hours INTEGER DEFAULT 0,
    practical_hours INTEGER DEFAULT 0,
    total_hours INTEGER GENERATED ALWAYS AS (lecture_hours + tutorial_hours + practical_hours) STORED,
    is_elective BOOLEAN DEFAULT 0,
    is_combined BOOLEAN DEFAULT 0,
    is_minor BOOLEAN DEFAULT 0,
    program TEXT NOT NULL,
    year INTEGER NOT NULL,
    sections TEXT NOT NULL,
    room_lab TEXT,
    classroom TEXT,
    is_common BOOLEAN DEFAULT 0,
    course_type TEXT DEFAULT 'regular' CHECK(course_type IN ('regular', 'lab', 'major_project')),
    semester_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
);

-- Timetable slots table
CREATE TABLE IF NOT EXISTS timetable_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    semester_id INTEGER NOT NULL,
    program TEXT NOT NULL,
    year INTEGER NOT NULL,
    section TEXT NOT NULL,
    day TEXT NOT NULL,
    slot_number INTEGER NOT NULL,
    time_start TEXT NOT NULL,
    time_end TEXT NOT NULL,
    course_id INTEGER,
    slot_type TEXT DEFAULT 'class',
    is_published BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE(semester_id, program, year, section, day, slot_number)
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL
);

-- Semesters table (for semester configuration)
CREATE TABLE IF NOT EXISTS semesters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('odd', 'even')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Classes table (for class/section configuration)
-- Each class (program + year) has ONE classroom shared by all sections
CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    semester_id INTEGER NOT NULL,
    program TEXT NOT NULL CHECK(program IN ('B.Tech', 'M.Tech', 'PhD')),
    year INTEGER NOT NULL,
    section TEXT NOT NULL,
    classroom TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
    UNIQUE(semester_id, program, year, section)
);

-- Users table for CR authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL,
    program TEXT,
    year INTEGER,
    section TEXT,
    google_calendar_token TEXT,
    google_refresh_token TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CR modified timetable slots
CREATE TABLE IF NOT EXISTS cr_timetable_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    semester_id INTEGER NOT NULL,
    program TEXT NOT NULL,
    year INTEGER NOT NULL,
    section TEXT NOT NULL,
    day TEXT NOT NULL,
    slot_number INTEGER NOT NULL,
    time_start TEXT NOT NULL,
    time_end TEXT NOT NULL,
    course_id INTEGER,
    slot_type TEXT DEFAULT 'class',
    modified_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (modified_by) REFERENCES users(id),
    UNIQUE(semester_id, program, year, section, day, slot_number)
);

-- Insert default password
INSERT OR IGNORE INTO settings (key, value) VALUES ('incharge_password', 'admin123');

-- Insert default time slots
INSERT OR IGNORE INTO settings (key, value) VALUES ('time_slots', 
'[
  {"slot": 1, "start": "08:00", "end": "08:45"},
  {"slot": 2, "start": "09:00", "end": "09:45"},
  {"slot": 3, "start": "10:00", "end": "10:45"},
  {"slot": 4, "start": "11:00", "end": "11:45"},
  {"slot": 5, "start": "12:00", "end": "12:45"},
  {"slot": 6, "start": "13:00", "end": "13:45"},
  {"slot": 7, "start": "14:00", "end": "14:45"},
  {"slot": 8, "start": "15:00", "end": "15:45"},
  {"slot": 9, "start": "16:00", "end": "16:45"}
]');
