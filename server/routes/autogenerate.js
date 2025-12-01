import express from 'express';
import { runAsync, allAsync } from '../database/db.js';

const router = express.Router();

// Generate draft timetable
router.post('/generate', async (req, res) => {
  console.log('Received generate request:', JSON.stringify(req.body, null, 2));
  try {
    const { semester_id, classes, minorSlots } = req.body; // semester_id, Array of {program, year, section}, and minorSlots [{day, slot}]

    // 1. Cleanup existing slots for these classes
    console.log('Cleaning up existing slots...');
    for (const cls of classes) {
      await runAsync(
        'DELETE FROM timetable_slots WHERE semester_id = ? AND program = ? AND year = ? AND section = ?',
        [semester_id, cls.program, cls.year, cls.section]
      );
    }
    console.log('Cleanup complete.');

    // Fetch time slots configuration
    const timeSlotsSetting = await allAsync('SELECT value FROM settings WHERE key = ?', ['time_slots']);
    const timeSlots = JSON.parse(timeSlotsSetting[0].value);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // Lab Slots: 9am-12pm (slots 2,3,4) and 2pm-5pm (slots 7,8,9)
    const labSlotGroups = [
      [2, 3, 4],  // 9:00-11:45
      [7, 8, 9]   // 14:00-16:45
    ];

    const LUNCH_SLOT = 5; // 12:00-12:45 - no classes

    // ============ TRACKERS ============
    // Professor schedule: {instructor: {day: Set of slots}} - GLOBAL across all batches
    const professorSchedule = {};
    // Lab room schedule: {labRoom: {day: Set of slots}} - GLOBAL across all batches
    const labRoomSchedule = {};
    // Classroom schedule: {classroom: {day: Set of slots}}
    const classroomSchedule = {};
    // Section schedule: {sectionKey: {day: Set of slots}}
    const sectionSlots = {};
    // Track which days a course is scheduled for a section: {courseId-section: Set of days}
    const courseScheduledDays = {};
    // Daily load per section for balancing: {sectionKey: {day: count}}
    const sectionDailyLoad = {};

    // Helper to initialize tracker objects (defined early for use in global init)
    const initDayTracker = (tracker, key) => {
      if (!tracker[key]) {
        tracker[key] = {};
        days.forEach(day => tracker[key][day] = new Set());
      }
    };

    const initDayLoadTracker = (tracker, key) => {
      if (!tracker[key]) {
        tracker[key] = {};
        days.forEach(day => tracker[key][day] = 0);
      }
    };

    // Pre-initialize professor and lab room trackers for ALL courses across ALL batches
    // This ensures global collision detection
    const allCoursesForSemester = await allAsync(
      'SELECT DISTINCT instructor, room_lab FROM courses WHERE semester_id = ?',
      [semester_id]
    );
    for (const course of allCoursesForSemester) {
      if (course.instructor) {
        initDayTracker(professorSchedule, course.instructor);
      }
      if (course.room_lab) {
        initDayTracker(labRoomSchedule, course.room_lab);
      }
    }
    console.log('Initialized global professor and lab room trackers');

    // Fetch full class details (including classroom)
    const fullClasses = [];
    for (const cls of classes) {
      const classDetails = await allAsync(
        'SELECT * FROM classes WHERE semester_id = ? AND program = ? AND year = ? AND section = ?',
        [semester_id, cls.program, cls.year, cls.section]
      );
      if (classDetails.length > 0) {
        fullClasses.push(classDetails[0]);
      }
    }
    console.log('Full class details fetched:', fullClasses.length);

    // Initialize section trackers
    for (const cls of fullClasses) {
      const sectionKey = `${cls.program}-${cls.year}-${cls.section}`;
      initDayTracker(sectionSlots, sectionKey);
      initDayLoadTracker(sectionDailyLoad, sectionKey);
    }

    const generatedSlots = [];
    const warnings = []; // Track scheduling warnings

    // Group classes by program and year (batch)
    // Each batch shares ONE classroom between sections
    const batchGroups = {};
    for (const cls of fullClasses) {
      const batchKey = `${cls.program}-${cls.year}`;
      if (!batchGroups[batchKey]) {
        batchGroups[batchKey] = {
          sections: [],
          classroom: cls.classroom // All sections in batch share this classroom
        };
      }
      batchGroups[batchKey].sections.push(cls);
    }

    // Helper: Get days sorted by load (least loaded first) for even distribution
    const getDaysSortedByLoad = (sectionKey) => {
      return [...days].sort((a, b) => sectionDailyLoad[sectionKey][a] - sectionDailyLoad[sectionKey][b]);
    };

    // Helper: Check if a slot range is free for a section
    const isSectionFree = (sectionKey, day, slots) => {
      return slots.every(slot => !sectionSlots[sectionKey][day].has(slot));
    };

    // Helper: Check if professor is free
    const isProfessorFree = (instructor, day, slots) => {
      initDayTracker(professorSchedule, instructor);
      return slots.every(slot => !professorSchedule[instructor][day].has(slot));
    };

    // Helper: Check if classroom is free
    const isClassroomFree = (classroom, day, slots) => {
      initDayTracker(classroomSchedule, classroom);
      return slots.every(slot => !classroomSchedule[classroom][day].has(slot));
    };

    // Helper: Check if lab room is free
    const isLabRoomFree = (labRoom, day, slots) => {
      if (!labRoom) return true;
      initDayTracker(labRoomSchedule, labRoom);
      return slots.every(slot => !labRoomSchedule[labRoom][day].has(slot));
    };

    // Helper: Mark slots as occupied
    const bookSlots = (sectionKey, instructor, classroom, labRoom, day, slots) => {
      slots.forEach(slot => {
        sectionSlots[sectionKey][day].add(slot);
        professorSchedule[instructor][day].add(slot);
        if (classroom) classroomSchedule[classroom][day].add(slot);
        if (labRoom) labRoomSchedule[labRoom][day].add(slot);
      });
      sectionDailyLoad[sectionKey][day] += slots.length;
    };

    // Helper: Check if course already scheduled on this day for section
    const isCourseScheduledOnDay = (courseId, section, day) => {
      const key = `${courseId}-${section}`;
      return courseScheduledDays[key]?.has(day) || false;
    };

    // Helper: Mark course as scheduled on day
    const markCourseScheduledOnDay = (courseId, section, day) => {
      const key = `${courseId}-${section}`;
      if (!courseScheduledDays[key]) courseScheduledDays[key] = new Set();
      courseScheduledDays[key].add(day);
    };

    // Helper: Add slot to generated list
    const addGeneratedSlot = (cls, day, slotNum, courseId) => {
      const slot = timeSlots.find(s => s.slot === slotNum);
      generatedSlots.push({
        program: cls.program,
        year: cls.year,
        section: cls.section,
        day,
        slot_number: slotNum,
        time_start: slot.start,
        time_end: slot.end,
        course_id: courseId,
        slot_type: 'class'
      });
    };

    // Process each batch (program-year)
    for (const [batchKey, batch] of Object.entries(batchGroups)) {
      console.log(`\nProcessing batch: ${batchKey}`);
      const [program, year] = batchKey.split('-');
      const sharedClassroom = batch.classroom;

      // Initialize classroom tracker
      initDayTracker(classroomSchedule, sharedClassroom);

      // Fetch all courses for this batch
      const allCourses = await allAsync(
        `SELECT * FROM courses 
         WHERE semester_id = ? 
         AND program = ? 
         AND year = ?`,
        [semester_id, program, parseInt(year)]
      );
      console.log(`Found ${allCourses.length} courses for ${batchKey}`);

      // Categorize courses
      const electiveCourses = allCourses.filter(c => c.is_elective);
      const majorProjectCourses = allCourses.filter(c => c.course_type === 'major_project');
      const labCourses = allCourses.filter(c => !c.is_elective && c.practical_hours > 0 && c.course_type !== 'major_project');
      const minorCourses = allCourses.filter(c => c.is_minor && !c.is_elective && c.practical_hours === 0);
      const combinedCourses = allCourses.filter(c => !c.is_elective && c.practical_hours === 0 && c.is_combined && !c.is_minor);
      const regularCourses = allCourses.filter(c => !c.is_elective && c.practical_hours === 0 && !c.is_combined && !c.is_minor);

      console.log(`  Electives: ${electiveCourses.length}, Major Projects: ${majorProjectCourses.length}, Labs: ${labCourses.length}, Minor: ${minorCourses.length}, Combined: ${combinedCourses.length}, Regular: ${regularCourses.length}`);

      // ============ PHASE 0: Schedule Minor Courses (Pre-given slots) ============
      // Minor courses are scheduled at institute-given slots (same for all batches)
      // They are combined classes (both sections together)
      console.log('  Phase 0: Scheduling minor courses at pre-given slots...');

      if (minorSlots && minorSlots.length > 0 && minorCourses.length > 0) {
        for (const course of minorCourses) {
          const targetSections = course.sections.split(',').map(s => s.trim());
          const relevantSections = batch.sections.filter(cls => targetSections.includes(cls.section));
          
          if (relevantSections.length === 0) continue;

          initDayTracker(professorSchedule, course.instructor);

          const totalHours = course.lecture_hours + course.tutorial_hours;
          let hoursScheduled = 0;

          // Use the pre-given minor slots
          for (const minorSlot of minorSlots) {
            if (hoursScheduled >= totalHours) break;

            const { day, slot: slotNum } = minorSlot;

            // Check if already scheduled on this day for any section
            const alreadyScheduledToday = relevantSections.some(cls => 
              isCourseScheduledOnDay(course.id, cls.section, day)
            );
            if (alreadyScheduledToday) continue;

            // Check all constraints for combined class
            const allSectionsFree = relevantSections.every(cls => {
              const sKey = `${cls.program}-${cls.year}-${cls.section}`;
              return isSectionFree(sKey, day, [slotNum]);
            });

            const canSchedule = 
              allSectionsFree &&
              isProfessorFree(course.instructor, day, [slotNum]) &&
              isClassroomFree(sharedClassroom, day, [slotNum]);

            if (canSchedule) {
              // Book for all sections (combined class)
              for (const cls of relevantSections) {
                const sKey = `${cls.program}-${cls.year}-${cls.section}`;
                bookSlots(sKey, course.instructor, sharedClassroom, null, day, [slotNum]);
                markCourseScheduledOnDay(course.id, cls.section, day);
                addGeneratedSlot(cls, day, slotNum, course.id);
              }

              hoursScheduled++;
              console.log(`    Scheduled minor ${course.course_code} (combined) on ${day} slot ${slotNum}`);
            }
          }

          if (hoursScheduled < totalHours) {
            const msg = `Minor course ${course.course_code}: Only ${hoursScheduled}/${totalHours} hours scheduled`;
            console.log(`    WARNING: ${msg}`);
            warnings.push({ course: course.course_code, type: 'minor', scheduled: hoursScheduled, required: totalHours, message: msg });
          }
        }
      }

      // ============ PHASE 0.5: Schedule Major Projects (Combined, 2-5pm only) ============
      // Major projects: 6 hours = two 3-hour blocks, ONLY in 2-5pm (slots 7,8,9)
      // Both sections have major project at the same time (combined)
      console.log('  Phase 0.5: Scheduling major projects (combined, 2-5pm only)...');

      const afternoonLabSlot = [7, 8, 9]; // 2pm-5pm only for major projects

      for (const course of majorProjectCourses) {
        const targetSections = course.sections.split(',').map(s => s.trim());
        const relevantSections = batch.sections.filter(cls => targetSections.includes(cls.section));
        
        if (relevantSections.length === 0) continue;

        // Major project needs 2 sessions of 3 hours each (6 hours total)
        const sessionsNeeded = Math.ceil(course.practical_hours / 3);
        let sessionsScheduled = 0;

        // Get days sorted by combined load of all relevant sections
        const getCombinedSortedDays = () => {
          return [...days].sort((a, b) => {
            const loadA = relevantSections.reduce((sum, cls) => 
              sum + sectionDailyLoad[`${cls.program}-${cls.year}-${cls.section}`][a], 0);
            const loadB = relevantSections.reduce((sum, cls) => 
              sum + sectionDailyLoad[`${cls.program}-${cls.year}-${cls.section}`][b], 0);
            return loadA - loadB;
          });
        };

        const sortedDays = getCombinedSortedDays();

        for (const day of sortedDays) {
          if (sessionsScheduled >= sessionsNeeded) break;

          // Check if already scheduled on this day for any section
          const alreadyScheduledToday = relevantSections.some(cls => 
            isCourseScheduledOnDay(course.id, cls.section, day)
          );
          if (alreadyScheduledToday) continue;

          // Check all constraints for combined major project (2-5pm slot only)
          const allSectionsFree = relevantSections.every(cls => {
            const sKey = `${cls.program}-${cls.year}-${cls.section}`;
            return isSectionFree(sKey, day, afternoonLabSlot);
          });

          const canSchedule = 
            allSectionsFree &&
            isProfessorFree(course.instructor, day, afternoonLabSlot) &&
            isClassroomFree(sharedClassroom, day, afternoonLabSlot);

          if (canSchedule) {
            // Book for all sections (combined major project)
            for (const cls of relevantSections) {
              const sKey = `${cls.program}-${cls.year}-${cls.section}`;
              bookSlots(sKey, course.instructor, sharedClassroom, null, day, afternoonLabSlot);
              markCourseScheduledOnDay(course.id, cls.section, day);
              
              // Add each slot to generated slots
              for (const slotNum of afternoonLabSlot) {
                addGeneratedSlot(cls, day, slotNum, course.id);
              }
            }

            sessionsScheduled++;
            console.log(`    Scheduled major project ${course.course_code} (combined) on ${day} slots 7,8,9 (2-5pm)`);
          }
        }

        if (sessionsScheduled < sessionsNeeded) {
          const msg = `Major project ${course.course_code}: Only ${sessionsScheduled}/${sessionsNeeded} sessions scheduled`;
          console.log(`    WARNING: ${msg}`);
          warnings.push({ course: course.course_code, type: 'major_project', scheduled: sessionsScheduled * 3, required: sessionsNeeded * 3, message: msg });
        }
      }

      // ============ PHASE 1: Schedule Labs ============
      // Labs are 3 hours continuous, need dedicated lab room
      // Each section does lab separately (unless it's a combined lab)
      console.log('  Phase 1: Scheduling labs...');

      for (const course of labCourses) {
        const targetSections = course.sections.split(',').map(s => s.trim());
        const relevantSections = batch.sections.filter(cls => targetSections.includes(cls.section));
        
        if (relevantSections.length === 0) continue;

        // Calculate how many 3-hour lab sessions needed
        const labSessionsNeeded = Math.ceil(course.practical_hours / 3);

        // Schedule lab for each section separately
        for (const cls of relevantSections) {
          const sectionKey = `${cls.program}-${cls.year}-${cls.section}`;
          let sessionsScheduled = 0;

          // Get days sorted by load for even distribution
          const sortedDays = getDaysSortedByLoad(sectionKey);

          for (const day of sortedDays) {
            if (sessionsScheduled >= labSessionsNeeded) break;

            // Check if course already scheduled on this day
            if (isCourseScheduledOnDay(course.id, cls.section, day)) continue;

            // Try each lab slot group
            for (const labSlotGroup of labSlotGroups) {
              if (sessionsScheduled >= labSessionsNeeded) break;

              // Check all constraints for lab:
              // - Section must be free
              // - Professor must be free (globally)
              // - Lab room must be free (globally)
              // NOTE: We do NOT check/block the shared classroom - labs happen in lab rooms
              // This allows the other section to have regular classes while one section has lab
              const canSchedule = 
                isSectionFree(sectionKey, day, labSlotGroup) &&
                isProfessorFree(course.instructor, day, labSlotGroup) &&
                isLabRoomFree(course.room_lab, day, labSlotGroup);

              if (canSchedule) {
                // Book the slots - but NOT the shared classroom for labs
                // Labs only block: section, professor, and lab room
                labSlotGroup.forEach(slot => {
                  sectionSlots[sectionKey][day].add(slot);
                  professorSchedule[course.instructor][day].add(slot);
                  if (course.room_lab) labRoomSchedule[course.room_lab][day].add(slot);
                });
                sectionDailyLoad[sectionKey][day] += labSlotGroup.length;
                
                markCourseScheduledOnDay(course.id, cls.section, day);

                // Add to generated slots
                for (const slotNum of labSlotGroup) {
                  addGeneratedSlot(cls, day, slotNum, course.id);
                }

                sessionsScheduled++;
                console.log(`    Scheduled lab ${course.course_code} for ${cls.section} on ${day} slots ${labSlotGroup.join(',')} in ${course.room_lab || 'Lab'}`);
              }
            }
          }

          if (sessionsScheduled < labSessionsNeeded) {
            const msg = `Lab ${course.course_code} (${cls.section}): Only ${sessionsScheduled}/${labSessionsNeeded} sessions scheduled`;
            console.log(`    WARNING: ${msg}`);
            warnings.push({ course: course.course_code, section: cls.section, type: 'lab', scheduled: sessionsScheduled * 3, required: labSessionsNeeded * 3, message: msg });
          }
        }
      }

      // ============ PHASE 2: Schedule Electives (Combined) ============
      // Electives: Both sections attend together at the same timeslot
      console.log('  Phase 2: Scheduling electives (combined)...');

      for (const course of electiveCourses) {
        const targetSections = course.sections.split(',').map(s => s.trim());
        const relevantSections = batch.sections.filter(cls => targetSections.includes(cls.section));
        
        if (relevantSections.length === 0) continue;

        initDayTracker(professorSchedule, course.instructor);

        const totalHours = course.lecture_hours + course.tutorial_hours;
        let hoursScheduled = 0;

        // Get days sorted by combined load of all relevant sections
        const getCombinedSortedDays = () => {
          return [...days].sort((a, b) => {
            const loadA = relevantSections.reduce((sum, cls) => 
              sum + sectionDailyLoad[`${cls.program}-${cls.year}-${cls.section}`][a], 0);
            const loadB = relevantSections.reduce((sum, cls) => 
              sum + sectionDailyLoad[`${cls.program}-${cls.year}-${cls.section}`][b], 0);
            return loadA - loadB;
          });
        };

        const sortedDays = getCombinedSortedDays();

        for (const day of sortedDays) {
          if (hoursScheduled >= totalHours) break;

          // Check if already scheduled on this day for any section
          const alreadyScheduledToday = relevantSections.some(cls => 
            isCourseScheduledOnDay(course.id, cls.section, day)
          );
          if (alreadyScheduledToday) continue;

          // Find a free slot (avoiding lunch and lab slots if in use)
          for (let slotNum = 1; slotNum <= 9; slotNum++) {
            if (hoursScheduled >= totalHours) break;
            if (slotNum === LUNCH_SLOT) continue;

            // Check all constraints for combined class
            const allSectionsFree = relevantSections.every(cls => {
              const sKey = `${cls.program}-${cls.year}-${cls.section}`;
              return isSectionFree(sKey, day, [slotNum]);
            });

            const canSchedule = 
              allSectionsFree &&
              isProfessorFree(course.instructor, day, [slotNum]) &&
              isClassroomFree(sharedClassroom, day, [slotNum]);

            if (canSchedule) {
              // Book for all sections (combined class)
              for (const cls of relevantSections) {
                const sKey = `${cls.program}-${cls.year}-${cls.section}`;
                bookSlots(sKey, course.instructor, sharedClassroom, null, day, [slotNum]);
                markCourseScheduledOnDay(course.id, cls.section, day);
                addGeneratedSlot(cls, day, slotNum, course.id);
              }

              hoursScheduled++;
              console.log(`    Scheduled elective ${course.course_code} (combined) on ${day} slot ${slotNum}`);
              break; // Move to next day (max 1 slot per day)
            }
          }
        }

        if (hoursScheduled < totalHours) {
          const msg = `Elective ${course.course_code}: Only ${hoursScheduled}/${totalHours} hours scheduled`;
          console.log(`    WARNING: ${msg}`);
          warnings.push({ course: course.course_code, type: 'elective', scheduled: hoursScheduled, required: totalHours, message: msg });
        }
      }

      // ============ PHASE 2.5: Schedule Combined Courses ============
      // Combined courses: Both sections attend together (like electives but not elective)
      console.log('  Phase 2.5: Scheduling combined courses...');

      for (const course of combinedCourses) {
        const targetSections = course.sections.split(',').map(s => s.trim());
        const relevantSections = batch.sections.filter(cls => targetSections.includes(cls.section));
        
        if (relevantSections.length === 0) continue;

        initDayTracker(professorSchedule, course.instructor);

        const totalHours = course.lecture_hours + course.tutorial_hours;
        let hoursScheduled = 0;

        // Get days sorted by combined load of all relevant sections
        const getCombinedSortedDays = () => {
          return [...days].sort((a, b) => {
            const loadA = relevantSections.reduce((sum, cls) => 
              sum + sectionDailyLoad[`${cls.program}-${cls.year}-${cls.section}`][a], 0);
            const loadB = relevantSections.reduce((sum, cls) => 
              sum + sectionDailyLoad[`${cls.program}-${cls.year}-${cls.section}`][b], 0);
            return loadA - loadB;
          });
        };

        const sortedDays = getCombinedSortedDays();

        for (const day of sortedDays) {
          if (hoursScheduled >= totalHours) break;

          // Check if already scheduled on this day for any section
          const alreadyScheduledToday = relevantSections.some(cls => 
            isCourseScheduledOnDay(course.id, cls.section, day)
          );
          if (alreadyScheduledToday) continue;

          // Find a free slot (avoiding lunch)
          for (let slotNum = 1; slotNum <= 9; slotNum++) {
            if (hoursScheduled >= totalHours) break;
            if (slotNum === LUNCH_SLOT) continue;

            // Check all constraints for combined class
            const allSectionsFree = relevantSections.every(cls => {
              const sKey = `${cls.program}-${cls.year}-${cls.section}`;
              return isSectionFree(sKey, day, [slotNum]);
            });

            const canSchedule = 
              allSectionsFree &&
              isProfessorFree(course.instructor, day, [slotNum]) &&
              isClassroomFree(sharedClassroom, day, [slotNum]);

            if (canSchedule) {
              // Book for all sections (combined class)
              for (const cls of relevantSections) {
                const sKey = `${cls.program}-${cls.year}-${cls.section}`;
                bookSlots(sKey, course.instructor, sharedClassroom, null, day, [slotNum]);
                markCourseScheduledOnDay(course.id, cls.section, day);
                addGeneratedSlot(cls, day, slotNum, course.id);
              }

              hoursScheduled++;
              console.log(`    Scheduled combined ${course.course_code} on ${day} slot ${slotNum}`);
              break; // Move to next day (max 1 slot per day)
            }
          }
        }

        if (hoursScheduled < totalHours) {
          const msg = `Combined course ${course.course_code}: Only ${hoursScheduled}/${totalHours} hours scheduled`;
          console.log(`    WARNING: ${msg}`);
          warnings.push({ course: course.course_code, type: 'combined', scheduled: hoursScheduled, required: totalHours, message: msg });
        }
      }

      // ============ PHASE 3: Schedule Regular Courses (Section Specific) ============
      // Regular courses: Same professor teaches S1 and S2 separately
      // They share the same classroom, so must be at different times
      console.log('  Phase 3: Scheduling regular courses (separate sections)...');

      for (const course of regularCourses) {
        const targetSections = course.sections.split(',').map(s => s.trim());
        const relevantSections = batch.sections.filter(cls => targetSections.includes(cls.section));
        
        if (relevantSections.length === 0) continue;

        initDayTracker(professorSchedule, course.instructor);

        const totalHours = course.lecture_hours + course.tutorial_hours;

        // Schedule for each section separately
        for (const cls of relevantSections) {
          const sectionKey = `${cls.program}-${cls.year}-${cls.section}`;
          let hoursScheduled = 0;

          // Get days sorted by load for even distribution
          const sortedDays = getDaysSortedByLoad(sectionKey);

          for (const day of sortedDays) {
            if (hoursScheduled >= totalHours) break;

            // Check if already scheduled on this day
            if (isCourseScheduledOnDay(course.id, cls.section, day)) continue;

            // Find a free slot
            for (let slotNum = 1; slotNum <= 9; slotNum++) {
              if (hoursScheduled >= totalHours) break;
              if (slotNum === LUNCH_SLOT) continue;

              const canSchedule = 
                isSectionFree(sectionKey, day, [slotNum]) &&
                isProfessorFree(course.instructor, day, [slotNum]) &&
                isClassroomFree(sharedClassroom, day, [slotNum]);

              if (canSchedule) {
                bookSlots(sectionKey, course.instructor, sharedClassroom, null, day, [slotNum]);
                markCourseScheduledOnDay(course.id, cls.section, day);
                addGeneratedSlot(cls, day, slotNum, course.id);

                hoursScheduled++;
                console.log(`    Scheduled ${course.course_code} for ${cls.section} on ${day} slot ${slotNum}`);
                break; // Move to next day (max 1 slot per day per course)
              }
            }
          }

          if (hoursScheduled < totalHours) {
            const msg = `${course.course_code} (${cls.section}): Only ${hoursScheduled}/${totalHours} hours scheduled`;
            console.log(`    WARNING: ${msg}`);
            warnings.push({ course: course.course_code, section: cls.section, type: 'regular', scheduled: hoursScheduled, required: totalHours, message: msg });
          }
        }
      }
    }

    console.log(`\nTotal generated slots: ${generatedSlots.length}`);
    if (warnings.length > 0) {
      console.log(`Warnings: ${warnings.length} courses not fully scheduled`);
    }

    // Save generated slots to database
    for (const slot of generatedSlots) {
      await runAsync(`
        INSERT OR REPLACE INTO timetable_slots 
        (semester_id, program, year, section, day, slot_number, time_start, time_end, course_id, slot_type, is_published)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `, [
        semester_id, slot.program, slot.year, slot.section, slot.day, slot.slot_number,
        slot.time_start, slot.time_end, slot.course_id, slot.slot_type
      ]);
    }

    res.json({
      success: true,
      message: `Generated ${generatedSlots.length} slots`,
      slots: generatedSlots.length,
      warnings: warnings
    });

  } catch (error) {
    console.error('Auto-generation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
