import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./database/timetable.db');

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // 1. Create Semester
    const semesterResult = await runAsync(`
      INSERT INTO semesters (name, type, start_date, end_date, is_active)
      VALUES ('Even Semester 2025', 'even', '2025-01-01', '2025-05-15', 1)
    `);
    const semesterId = semesterResult.lastID;
    console.log(`✓ Created semester with ID: ${semesterId}`);

    // 2. Create Classes (Program + Year + Section + Classroom)
    const classes = [
      { program: 'B.Tech', year: 2, section: 'S1', classroom: 'LHC-CR2' },
      { program: 'B.Tech', year: 2, section: 'S2', classroom: 'LHC-CR2' },
      { program: 'B.Tech', year: 3, section: 'S1', classroom: 'LHC-CR7' },
      { program: 'B.Tech', year: 3, section: 'S2', classroom: 'LHC-CR7' },
      { program: 'B.Tech', year: 4, section: 'S1', classroom: 'LHC-CR10' },
      { program: 'B.Tech', year: 4, section: 'S2', classroom: 'LHC-CR10' },
    ];

    for (const cls of classes) {
      await runAsync(`
        INSERT INTO classes (semester_id, program, year, section, classroom)
        VALUES (?, ?, ?, ?, ?)
      `, [semesterId, cls.program, cls.year, cls.section, cls.classroom]);
    }
    console.log(`✓ Created ${classes.length} classes`);

    // 3. Create Courses
    const courses = [
      // 3rd Semester (Year 2)
      {
        course_code: 'CS200',
        course_name: 'Theory of Computation',
        instructor: 'Shashidhar G.K',
        lecture_hours: 3,
        tutorial_hours: 1,
        practical_hours: 0,
        is_elective: 0,
        program: 'B.Tech',
        year: 2,
        sections: 'S1,S2',
        room_lab: null,
        classroom: 'LHC-CR2',
        is_common: 1,
        course_type: 'regular',
        semester_id: semesterId
      },
      {
        course_code: 'CS201',
        course_name: 'Design of Digital Systems',
        instructor: 'B.R.Chandavarkar',
        lecture_hours: 3,
        tutorial_hours: 1,
        practical_hours: 0,
        is_elective: 0,
        program: 'B.Tech',
        year: 2,
        sections: 'S1,S2',
        room_lab: null,
        classroom: 'LHC-CR2',
        is_common: 1,
        course_type: 'regular',
        semester_id: semesterId
      },
      {
        course_code: 'CS202',
        course_name: 'Data Struct. and Algo.',
        instructor: 'Manjanna B',
        lecture_hours: 3,
        tutorial_hours: 1,
        practical_hours: 0,
        is_elective: 0,
        program: 'B.Tech',
        year: 2,
        sections: 'S1,S2',
        room_lab: null,
        classroom: 'LHC-CR2',
        is_common: 1,
        course_type: 'regular',
        semester_id: semesterId
      },
      {
        course_code: 'CS203',
        course_name: 'Data Struct. And Algo Lab',
        instructor: 'Manjanna B',
        lecture_hours: 0,
        tutorial_hours: 0,
        practical_hours: 3,
        is_elective: 0,
        program: 'B.Tech',
        year: 2,
        sections: 'S1,S2',
        room_lab: 'Lab',
        classroom: 'LHC-CR2',
        is_common: 1,
        course_type: 'lab',
        semester_id: semesterId
      },
      {
        course_code: 'CS204',
        course_name: 'Design of Digital Sys Lab',
        instructor: 'B.R.Chandavarkar',
        lecture_hours: 0,
        tutorial_hours: 0,
        practical_hours: 3,
        is_elective: 0,
        program: 'B.Tech',
        year: 2,
        sections: 'S1,S2',
        room_lab: 'Lab',
        classroom: 'LHC-CR2',
        is_common: 1,
        course_type: 'lab',
        semester_id: semesterId
      },
      {
        course_code: 'MA204',
        course_name: 'Linear Algebra and Matrices',
        instructor: 'MATHS',
        lecture_hours: 3,
        tutorial_hours: 0,
        practical_hours: 0,
        is_elective: 0,
        program: 'B.Tech',
        year: 2,
        sections: 'S1,S2',
        room_lab: null,
        classroom: 'LHC-CR2',
        is_common: 1,
        course_type: 'regular',
        semester_id: semesterId,
        is_combined: 1
      },
      {
        course_code: 'CS202M',
        course_name: 'Data Struct. and Algo. (Minor)',
        instructor: 'Biswajit R. Bhowmik',
        lecture_hours: 4,
        tutorial_hours: 0,
        practical_hours: 0,
        is_elective: 0,
        program: 'B.Tech',
        year: 2,
        sections: 'S1,S2',
        room_lab: null,
        classroom: 'LHC-CR2',
        is_common: 1,
        course_type: 'regular',
        semester_id: semesterId,
        is_combined: 1,
        is_minor: 1
      },
      // 5th Semester (Year 3)
      {
        course_code: 'CS301',
        course_name: 'Computer Networks',
        instructor: 'Saumya Hegde',
        lecture_hours: 3,
        tutorial_hours: 1,
        practical_hours: 0,
        is_elective: 0,
        program: 'B.Tech',
        year: 3,
        sections: 'S1,S2',
        room_lab: null,
        classroom: 'LHC-CR7',
        is_common: 1,
        course_type: 'regular',
        semester_id: semesterId
      },
      {
        course_code: 'CS302',
        course_name: 'Computer Networks Lab',
        instructor: 'Saumya Hegde',
        lecture_hours: 0,
        tutorial_hours: 0,
        practical_hours: 3,
        is_elective: 0,
        program: 'B.Tech',
        year: 3,
        sections: 'S1,S2',
        room_lab: 'Lab',
        classroom: 'LHC-CR7',
        is_common: 1,
        course_type: 'lab',
        semester_id: semesterId
      },
      {
        course_code: 'CS303',
        course_name: 'Compiler Design',
        instructor: 'Abhilash M',
        lecture_hours: 3,
        tutorial_hours: 1,
        practical_hours: 0,
        is_elective: 0,
        program: 'B.Tech',
        year: 3,
        sections: 'S1,S2',
        room_lab: null,
        classroom: 'LHC-CR7',
        is_common: 1,
        course_type: 'regular',
        semester_id: semesterId
      },
      {
        course_code: 'CS304',
        course_name: 'Compiler Design Lab',
        instructor: 'Abhilash M',
        lecture_hours: 0,
        tutorial_hours: 0,
        practical_hours: 3,
        is_elective: 0,
        program: 'B.Tech',
        year: 3,
        sections: 'S1,S2',
        room_lab: 'Lab',
        classroom: 'LHC-CR7',
        is_common: 1,
        course_type: 'lab',
        semester_id: semesterId
      },
      {
        course_code: 'CS305',
        course_name: 'Software Engineering',
        instructor: 'K Chandrasekaran',
        lecture_hours: 3,
        tutorial_hours: 1,
        practical_hours: 0,
        is_elective: 0,
        program: 'B.Tech',
        year: 3,
        sections: 'S1,S2',
        room_lab: null,
        classroom: 'LHC-CR7',
        is_common: 1,
        course_type: 'regular',
        semester_id: semesterId
      },
      {
        course_code: 'SM300',
        course_name: 'Engineering Economics',
        instructor: 'SOM',
        lecture_hours: 3,
        tutorial_hours: 0,
        practical_hours: 0,
        is_elective: 0,
        program: 'B.Tech',
        year: 3,
        sections: 'S1,S2',
        room_lab: null,
        classroom: 'LHC-CR7',
        is_common: 1,
        course_type: 'regular',
        semester_id: semesterId,
        is_combined: 1
      },
      {
        course_code: 'CS252M',
        course_name: 'Operating System (Minor)',
        instructor: 'Radhika B.S',
        lecture_hours: 4,
        tutorial_hours: 0,
        practical_hours: 0,
        is_elective: 0,
        program: 'B.Tech',
        year: 3,
        sections: 'S1,S2',
        room_lab: null,
        classroom: 'LHC-CR7',
        is_common: 1,
        course_type: 'regular',
        semester_id: semesterId,
        is_combined: 1,
        is_minor: 1
      },
      // 5th Semester Electives
      {
        course_code: 'CS363',
        course_name: 'Cloud Computing',
        instructor: 'Sourav Kanthi Addya',
        lecture_hours: 3,
        tutorial_hours: 1,
        practical_hours: 0,
        is_elective: 1,
        program: 'B.Tech',
        year: 3,
        sections: 'S1,S2',
        room_lab: null,
        classroom: 'LHC-CR7',
        is_common: 1,
        course_type: 'regular',
        semester_id: semesterId
      },
      {
        course_code: 'CS435',
        course_name: 'Open Source Networking Technologies',
        instructor: 'Mohit P. Tahiliani',
        lecture_hours: 3,
        tutorial_hours: 1,
        practical_hours: 0,
        is_elective: 1,
        program: 'B.Tech',
        year: 3,
        sections: 'S1,S2',
        room_lab: null,
        classroom: 'LHC-CR7',
        is_common: 1,
        course_type: 'regular',
        semester_id: semesterId
      },

      // 7th Semester (Year 4) - Section S1
      {
        course_code: 'CS402',
        course_name: 'Major Project',
        instructor: 'Mohit P. Tahiliani',
        lecture_hours: 0,
        tutorial_hours: 0,
        practical_hours: 9,
        is_elective: 0,
        program: 'B.Tech',
        year: 4,
        sections: 'S1',
        room_lab: 'Lab',
        classroom: 'LHC-CR10',
        is_common: 0,
        course_type: 'major_project',
        semester_id: semesterId
      },
      {
        course_code: 'CS399',
        course_name: 'Practical Training',
        instructor: 'Mohit P. Tahiliani',
        lecture_hours: 0,
        tutorial_hours: 0,
        practical_hours: 2,
        is_elective: 0,
        program: 'B.Tech',
        year: 4,
        sections: 'S1',
        room_lab: null,
        classroom: 'LHC-CR10',
        is_common: 0,
        course_type: 'regular',
        semester_id: semesterId
      },

      // 7th Semester (Year 4) - Section S2
      {
        course_code: 'CS402',
        course_name: 'Major Project',
        instructor: 'Annappa',
        lecture_hours: 0,
        tutorial_hours: 0,
        practical_hours: 9,
        is_elective: 0,
        program: 'B.Tech',
        year: 4,
        sections: 'S2',
        room_lab: 'Lab',
        classroom: 'LHC-CR10',
        is_common: 0,
        course_type: 'major_project',
        semester_id: semesterId
      },
      {
        course_code: 'CS399',
        course_name: 'Practical Training',
        instructor: 'Annappa',
        lecture_hours: 0,
        tutorial_hours: 0,
        practical_hours: 2,
        is_elective: 0,
        program: 'B.Tech',
        year: 4,
        sections: 'S2',
        room_lab: null,
        classroom: 'LHC-CR10',
        is_common: 0,
        course_type: 'regular',
        semester_id: semesterId
      },

      // 7th Semester Common Courses
      {
        course_code: 'CS305M',
        course_name: 'Software Engineering (Minor)',
        instructor: 'M.P Singh',
        lecture_hours: 4,
        tutorial_hours: 0,
        practical_hours: 0,
        is_elective: 0,
        program: 'B.Tech',
        year: 4,
        sections: 'S1,S2',
        room_lab: null,
        classroom: 'LHC-CR10',
        is_common: 1,
        course_type: 'regular',
        semester_id: semesterId,
        is_combined: 1,
        is_minor: 1
      },
      // 7th Semester Electives
      {
        course_code: 'CS357',
        course_name: 'Digital Image Processing',
        instructor: 'Jeny Rajan',
        lecture_hours: 3,
        tutorial_hours: 1,
        practical_hours: 0,
        is_elective: 1,
        program: 'B.Tech',
        year: 4,
        sections: 'S1,S2',
        room_lab: null,
        classroom: 'LHC-CR10',
        is_common: 1,
        course_type: 'regular',
        semester_id: semesterId
      },
      {
        course_code: 'CS433',
        course_name: 'Wireless Networks',
        instructor: 'Mohit P. Tahiliani',
        lecture_hours: 3,
        tutorial_hours: 1,
        practical_hours: 0,
        is_elective: 1,
        program: 'B.Tech',
        year: 4,
        sections: 'S1,S2',
        room_lab: null,
        classroom: 'LHC-CR10',
        is_common: 1,
        course_type: 'regular',
        semester_id: semesterId
      },
      {
        course_code: 'CS465',
        course_name: 'Distributed Database Systems',
        instructor: 'P.Santhi Thilagam',
        lecture_hours: 3,
        tutorial_hours: 1,
        practical_hours: 0,
        is_elective: 1,
        program: 'B.Tech',
        year: 4,
        sections: 'S1,S2',
        room_lab: null,
        classroom: 'LHC-CR10',
        is_common: 1,
        course_type: 'regular',
        semester_id: semesterId
      },
      {
        course_code: 'CS366',
        course_name: 'Internet of Things',
        instructor: 'Shridhar Sanshi',
        lecture_hours: 3,
        tutorial_hours: 1,
        practical_hours: 0,
        is_elective: 1,
        program: 'B.Tech',
        year: 4,
        sections: 'S1,S2',
        room_lab: null,
        classroom: 'LHC-CR10',
        is_common: 1,
        course_type: 'regular',
        semester_id: semesterId
      },
      {
        course_code: 'CS419',
        course_name: 'Algorithmic Graph Theory',
        instructor: 'Manu B',
        lecture_hours: 3,
        tutorial_hours: 1,
        practical_hours: 0,
        is_elective: 1,
        program: 'B.Tech',
        year: 4,
        sections: 'S1,S2',
        room_lab: null,
        classroom: 'LHC-CR10',
        is_common: 1,
        course_type: 'regular',
        semester_id: semesterId
      }
    ];

    for (const course of courses) {
      await runAsync(`
        INSERT INTO courses (
          course_code, course_name, instructor, lecture_hours, tutorial_hours, 
          practical_hours, is_elective, program, year, sections, room_lab, 
          classroom, is_common, course_type, semester_id, is_combined, is_minor
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        course.course_code,
        course.course_name,
        course.instructor,
        course.lecture_hours,
        course.tutorial_hours,
        course.practical_hours,
        course.is_elective,
        course.program,
        course.year,
        course.sections,
        course.room_lab,
        course.classroom,
        course.is_common,
        course.course_type,
        course.semester_id,
        course.is_combined || 0,
        course.is_minor || 0
      ]);
    }
    console.log(`✓ Created ${courses.length} courses`);

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\nSummary:');
    console.log(`- Semester: Even Semester 2025 (Jan 1 - May 15, 2025)`);
    console.log(`- Classes: 6 (3rd, 5th, 7th semester sections)`);
    console.log(`- Courses: ${courses.length}`);
    console.log(`  - 3rd Semester: 7 courses (LHC-CR2)`);
    console.log(`  - 5th Semester: 9 courses (LHC-CR7)`);
    console.log(`  - 7th Semester: ${courses.length - 16} courses (LHC-CR10)`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    db.close();
  }
}

seedDatabase();
