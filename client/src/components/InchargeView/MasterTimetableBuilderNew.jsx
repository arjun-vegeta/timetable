import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DndContext, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sparkles, Calendar, BookOpen, Loader2, ChevronLeft, ChevronRight, GripVertical, LogOut, Search, X, Settings, Users } from 'lucide-react';
import ExportButtons from '../Common/ExportButtons';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function MasterTimetableBuilderNew() {
  const navigate = useNavigate();
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [timetables, setTimetables] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [courseColors, setCourseColors] = useState({});
  const [classes, setClasses] = useState([]);
  const [activeSemester, setActiveSemester] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [courseFilter, setCourseFilter] = useState('all'); // 'all', 'regular', 'lab', 'elective'
  const [courseSearch, setCourseSearch] = useState('');
  const [showMinorModal, setShowMinorModal] = useState(false);
  const [selectedMinorSlots, setSelectedMinorSlots] = useState([]);
  const [generationWarnings, setGenerationWarnings] = useState([]);
  const [showWarningsModal, setShowWarningsModal] = useState(false);
  const [pendingDrop, setPendingDrop] = useState(null); // {courseId, targetClass, day, slot, conflicts}
  const [showConflictModal, setShowConflictModal] = useState(false);

  // Configure drag sensor with activation constraint (must move 8px before drag starts)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start dragging
      },
    })
  );

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const colorPalette = [
    'bg-blue-50 border-blue-200 text-blue-700',
    'bg-emerald-50 border-emerald-200 text-emerald-700',
    'bg-violet-50 border-violet-200 text-violet-700',
    'bg-rose-50 border-rose-200 text-rose-700',
    'bg-amber-50 border-amber-200 text-amber-700',
    'bg-indigo-50 border-indigo-200 text-indigo-700',
    'bg-red-50 border-red-200 text-red-700',
    'bg-orange-50 border-orange-200 text-orange-700',
    'bg-teal-50 border-teal-200 text-teal-700',
    'bg-cyan-50 border-cyan-200 text-cyan-700',
    'bg-pink-50 border-pink-200 text-pink-700',
    'bg-lime-50 border-lime-200 text-lime-700',
  ];

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('incharge_token');
      if (!token) {
        navigate('/incharge/login');
        return;
      }
      try {
        const response = await axios.get(`${API_URL}/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.data.valid || response.data.user?.role !== 'incharge') {
          localStorage.removeItem('incharge_token');
          navigate('/incharge/login');
          return;
        }
      } catch (error) {
        localStorage.removeItem('incharge_token');
        navigate('/incharge/login');
        return;
      }
      fetchActiveSemester();
      fetchTimeSlots();
    };
    verifyAuth();
  }, []);

  useEffect(() => {
    if (activeSemester) {
      fetchClasses();
    }
  }, [activeSemester]);

  useEffect(() => {
    if (selectedClasses.length > 0) {
      fetchCoursesForClasses();
      fetchTimetablesForClasses();
    }
  }, [selectedClasses]);

  const fetchActiveSemester = async () => {
    try {
      const response = await axios.get(`${API_URL}/semester/active`);
      setActiveSemester(response.data);
    } catch (error) {
      console.error('Error fetching semester:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await axios.get(`${API_URL}/semester/${activeSemester.id}/classes`);
      setClasses(response.data);
      // Select all classes by default
      const allOptions = response.data.map(cls => ({
        ...cls,
        key: `${cls.program}-Y${cls.year}-${cls.section}`,
        displayName: `${cls.program} Year ${cls.year}`
      }));
      setSelectedClasses(allOptions);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchTimeSlots = async () => {
    const response = await axios.get(`${API_URL}/timetable/config`);
    setTimeSlots(response.data);
  };

  const fetchCoursesForClasses = async () => {
    if (!activeSemester) return;
    
    const allCourses = await Promise.all(
      selectedClasses.map(cls => 
        axios.get(`${API_URL}/courses`, {
          params: { semester_id: activeSemester.id }
        })
      )
    );
    
    const uniqueCourses = new Map();
    allCourses.forEach(res => {
      res.data.forEach(course => {
        uniqueCourses.set(course.id, course);
      });
    });
    
    const coursesArray = Array.from(uniqueCourses.values());
    setCourses(coursesArray);
    
    const colors = {};
    coursesArray.forEach((course, index) => {
      colors[course.id] = colorPalette[index % colorPalette.length];
    });
    setCourseColors(colors);
  };

  const fetchTimetablesForClasses = async () => {
    if (!activeSemester) return;
    
    const allTimetables = await Promise.all(
      selectedClasses.map(cls =>
        axios.get(`${API_URL}/timetable/all`, {
          params: { 
            semester_id: activeSemester.id,
            program: cls.program,
            year: cls.year,
            section: cls.section
          }
        }).then(res => ({ key: cls.key, data: res.data }))
      )
    );
    
    const timetableMap = {};
    allTimetables.forEach(({ key, data }) => {
      timetableMap[key] = data;
    });
    
    setTimetables(timetableMap);
  };

  // Count how many slots each course has been scheduled for
  const getScheduledCount = (courseId) => {
    let count = 0;
    // For each class's timetable
    Object.values(timetables).forEach(slots => {
      if (Array.isArray(slots)) {
        slots.forEach(slot => {
          if (slot.course_id === courseId) {
            count++;
          }
        });
      }
    });
    // Divide by number of sections if course is for multiple sections (to avoid double counting)
    const course = courses.find(c => c.id === courseId);
    if (course) {
      const sectionCount = course.sections?.split(',').length || 1;
      // Only divide if it's a combined/elective course (both sections share same slot)
      if (course.is_combined || course.is_elective) {
        count = Math.ceil(count / sectionCount);
      }
    }
    return count;
  };

  const toggleClass = (cls) => {
    setSelectedClasses(prev => {
      const exists = prev.find(c => c.key === cls.key);
      if (exists) {
        return prev.filter(c => c.key !== cls.key);
      } else {
        return [...prev, cls];
      }
    });
  };

  const handleGenerateDraft = async () => {
    if (selectedClasses.length === 0) {
      alert('Please select at least one class');
      return;
    }

    if (!activeSemester) {
      alert('No active semester found');
      return;
    }

    // Show minor slots selection modal
    setSelectedMinorSlots([]);
    setShowMinorModal(true);
  };

  const handleConfirmGenerate = async () => {
    if (selectedMinorSlots.length !== 4) {
      alert('Please select exactly 4 minor slots');
      return;
    }

    setShowMinorModal(false);
    setGenerating(true);
    
    try {
      const response = await axios.post(`${API_URL}/autogenerate/generate`, {
        semester_id: activeSemester.id,
        classes: selectedClasses.map(cls => ({
          program: cls.program,
          year: cls.year,
          section: cls.section
        })),
        minorSlots: selectedMinorSlots
      });
      
      fetchTimetablesForClasses();
      
      // Check for warnings
      if (response.data.warnings && response.data.warnings.length > 0) {
        setGenerationWarnings(response.data.warnings);
        setShowWarningsModal(true);
      } else {
        alert(`Success! Generated ${response.data.slots} time slots - all courses scheduled completely.`);
      }
    } catch (error) {
      alert('Error generating timetable: ' + error.response?.data?.message);
    } finally {
      setGenerating(false);
    }
  };

  const toggleMinorSlot = (day, slot) => {
    const slotKey = `${day}-${slot}`;
    const existingIndex = selectedMinorSlots.findIndex(s => s.day === day && s.slot === slot);
    
    if (existingIndex >= 0) {
      setSelectedMinorSlots(prev => prev.filter((_, i) => i !== existingIndex));
    } else if (selectedMinorSlots.length < 4) {
      setSelectedMinorSlots(prev => [...prev, { day, slot }]);
    }
  };

  const isMinorSlotSelected = (day, slot) => {
    return selectedMinorSlots.some(s => s.day === day && s.slot === slot);
  };

  // Validate if a drop would create conflicts (based on autogenerate.js rules)
  const validateDrop = (courseId, targetClassKey, targetDay, targetSlot, sourceSlot = null) => {
    const conflicts = [];
    const course = courses.find(c => c.id === courseId);
    if (!course) return conflicts;

    // Build a flat list of all scheduled slots with their class info
    // This includes ALL sections' timetables for global checks
    const allSlots = [];
    Object.entries(timetables).forEach(([classKey, slots]) => {
      if (Array.isArray(slots)) {
        slots.forEach(s => {
          // Skip the source slot if we're moving it
          if (sourceSlot && 
              classKey === sourceSlot.classKey && 
              s.day === sourceSlot.day && 
              s.slot_number === sourceSlot.slotNumber) {
            return;
          }
          allSlots.push({ ...s, classKey });
        });
      }
    });

    console.log('Validating drop:', { courseId, targetClassKey, targetDay, targetSlot, course: course.course_code });
    console.log('All slots to check:', allSlots.length);

    // RULE 1: Check if target slot is already occupied in target section
    const targetSlotOccupied = allSlots.find(s => 
      s.classKey === targetClassKey && 
      s.day === targetDay && 
      s.slot_number === targetSlot
    );
    
    if (targetSlotOccupied) {
      conflicts.push(`⚠️ Target slot already has "${targetSlotOccupied.course_code}" scheduled`);
    }

    // RULE 2: Professor conflicts - same instructor at same time in ANY other section (global)
    // This is critical - professors can't teach two sections at the same time
    if (course.instructor) {
      const profConflict = allSlots.find(s => 
        s.day === targetDay && 
        s.slot_number === targetSlot &&
        s.instructor === course.instructor &&
        s.classKey !== targetClassKey // Different section
      );
      
      if (profConflict) {
        conflicts.push(`👤 Professor "${course.instructor}" is already teaching "${profConflict.course_code}" at this time in ${profConflict.classKey}`);
      }
    }

    // RULE 3: Lab room conflicts - same lab at same time (global)
    // Labs are a shared resource - can't have two sections using same lab
    if (course.practical_hours > 0 && course.room_lab) {
      const labConflict = allSlots.find(s => 
        s.day === targetDay && 
        s.slot_number === targetSlot &&
        s.room_lab === course.room_lab &&
        s.classKey !== targetClassKey // Different section
      );
      
      if (labConflict) {
        conflicts.push(`🏠 Lab room "${course.room_lab}" is already in use for "${labConflict.course_code}" in ${labConflict.classKey}`);
      }
    }

    // RULE 4: Shared classroom conflicts - for non-lab courses
    // Sections in the same batch (program-year) share ONE classroom
    // So if S1 has a regular class, S2 can't have a regular class at the same time
    // BUT: Labs happen in lab rooms, so labs don't block the shared classroom
    const [targetProgram, targetYearStr, targetSection] = targetClassKey.split('-');
    
    if (course.practical_hours === 0) {
      // This is a regular/lecture course that uses the shared classroom
      // Check if any OTHER section in same batch has a NON-LAB class at this time
      const classroomConflict = allSlots.find(s => {
        const [sProgram, sYearStr, sSection] = s.classKey.split('-');
        const isLab = (s.practical_hours || 0) > 0;
        
        return s.day === targetDay && 
               s.slot_number === targetSlot &&
               sProgram === targetProgram &&
               sYearStr === targetYearStr &&
               s.classKey !== targetClassKey && // Different section
               !isLab; // Only non-lab courses use shared classroom
      });
      
      if (classroomConflict) {
        conflicts.push(`🏫 Shared classroom conflict: ${classroomConflict.classKey} already has "${classroomConflict.course_code}" (regular class) at this time`);
      }
    }

    // RULE 5: Same course same day rule
    // From autogenerate: max 1 slot per course per day per section (for distribution)
    const sameCourseSameDay = allSlots.find(s =>
      s.classKey === targetClassKey &&
      s.day === targetDay &&
      s.course_id === courseId &&
      s.slot_number !== targetSlot // Not the same slot (in case we're somehow checking against target)
    );
    
    if (sameCourseSameDay) {
      conflicts.push(`📅 This course "${course.course_code}" is already scheduled on ${targetDay} in slot ${sameCourseSameDay.slot_number}`);
    }

    // RULE 6: Lunch slot warning
    if (targetSlot === 5) {
      conflicts.push(`🍽️ Slot 5 (12:00-12:45) is the lunch break - classes should not be scheduled here`);
    }

    console.log('Conflicts found:', conflicts);
    return conflicts;
  };

  // Execute a drop operation
  const executeDrop = async (courseId, targetClassKey, targetDay, targetSlot, sourceSlot = null) => {
    const cls = selectedClasses.find(c => c.key === targetClassKey);
    if (!cls) return;
    
    const slot = timeSlots.find(s => s.slot === targetSlot);
    const course = courses.find(c => c.id === courseId);
    
    try {
      // If moving from another slot, delete the source first
      if (sourceSlot) {
        const sourceCls = selectedClasses.find(c => c.key === sourceSlot.classKey);
        if (sourceCls) {
          await axios.delete(`${API_URL}/timetable/slot`, {
            data: { 
              semester_id: activeSemester.id,
              program: sourceCls.program,
              year: sourceCls.year,
              section: sourceCls.section, 
              day: sourceSlot.day, 
              slot_number: sourceSlot.slotNumber 
            }
          });
        }
      }
      
      // Add to new slot
      await axios.post(`${API_URL}/timetable/slot`, {
        semester_id: activeSemester.id,
        program: cls.program,
        year: cls.year,
        section: cls.section,
        day: targetDay,
        slot_number: targetSlot,
        course_id: courseId,
        slot_type: course?.practical_hours > 0 ? 'lab' : 'class',
        time_start: slot.start,
        time_end: slot.end
      });
      
      fetchTimetablesForClasses();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    let courseId, sourceSlot = null;
    
    // Determine if dragging from sidebar course or existing slot
    if (active.id.startsWith('course-')) {
      courseId = parseInt(active.id.replace('course-', ''));
    } else if (active.id.startsWith('slot-')) {
      // Dragging an existing slot
      const slotId = active.id.replace('slot-', '');
      const [sourceClassKey, sourceDay, sourceSlotNum] = slotId.split('|');
      const sourceTimetable = timetables[sourceClassKey] || [];
      const sourceData = sourceTimetable.find(s => s.day === sourceDay && s.slot_number === parseInt(sourceSlotNum));
      
      if (!sourceData) {
        setActiveId(null);
        return;
      }
      
      courseId = sourceData.course_id;
      sourceSlot = {
        classKey: sourceClassKey,
        day: sourceDay,
        slotNumber: parseInt(sourceSlotNum)
      };
    } else {
      setActiveId(null);
      return;
    }

    const [targetClassKey, targetDay, targetSlotNum] = over.id.split('|');
    const targetSlot = parseInt(targetSlotNum);
    
    // Don't do anything if dropping on same slot
    if (sourceSlot && 
        sourceSlot.classKey === targetClassKey && 
        sourceSlot.day === targetDay && 
        sourceSlot.slotNumber === targetSlot) {
      setActiveId(null);
      return;
    }

    // Validate the drop
    const conflicts = validateDrop(courseId, targetClassKey, targetDay, targetSlot, sourceSlot);
    
    if (conflicts.length > 0) {
      // Show conflict dialog
      setPendingDrop({ courseId, targetClassKey, targetDay, targetSlot, sourceSlot, conflicts });
      setShowConflictModal(true);
    } else {
      // No conflicts, execute immediately
      await executeDrop(courseId, targetClassKey, targetDay, targetSlot, sourceSlot);
    }
    
    setActiveId(null);
  };

  const handleForceDropConfirm = async () => {
    if (pendingDrop) {
      await executeDrop(
        pendingDrop.courseId, 
        pendingDrop.targetClassKey, 
        pendingDrop.targetDay, 
        pendingDrop.targetSlot,
        pendingDrop.sourceSlot
      );
    }
    setShowConflictModal(false);
    setPendingDrop(null);
  };

  const handleDropCancel = () => {
    setShowConflictModal(false);
    setPendingDrop(null);
  };

  const handleSlotDelete = async (cls, day, slotNumber) => {
    try {
      await axios.delete(`${API_URL}/timetable/slot`, {
        data: { 
          semester_id: activeSemester.id,
          program: cls.program,
          year: cls.year,
          section: cls.section, 
          day, 
          slot_number: slotNumber 
        }
      });
      fetchTimetablesForClasses();
    } catch (error) {
      alert('Error deleting slot: ' + (error.response?.data?.message || error.message));
    }
  };

  const handlePublishAll = async () => {
    if (!activeSemester) return;
    
    if (confirm('Publish all selected timetables?')) {
      await Promise.all(
        selectedClasses.map(cls =>
          axios.post(`${API_URL}/timetable/publish`, {
            semester_id: activeSemester.id,
            program: cls.program,
            year: cls.year,
            section: cls.section
          })
        )
      );
      alert('All timetables published!');
    }
  };

  const allClassOptions = classes.map(cls => ({
    ...cls,
    key: `${cls.program}-Y${cls.year}-${cls.section}`,
    displayName: `${cls.program} Year ${cls.year}`
  }));

  // Get unique programs for quick selection buttons
  const uniquePrograms = [...new Set(classes.map(c => c.program))];

  // Quick selection functions
  const selectAll = () => setSelectedClasses(allClassOptions);
  const selectNone = () => setSelectedClasses([]);
  const selectByProgram = (program) => {
    setSelectedClasses(allClassOptions.filter(c => c.program === program));
  };

  // Filter courses based on selected filter and search
  const filteredCourses = courses.filter(course => {
    // Apply type filter
    let matchesFilter = true;
    if (courseFilter === 'lab') matchesFilter = course.practical_hours > 0;
    else if (courseFilter === 'elective') matchesFilter = course.is_elective;
    else if (courseFilter === 'regular') matchesFilter = !course.is_elective && course.practical_hours === 0;
    
    // Apply search filter
    const searchLower = courseSearch.toLowerCase().trim();
    const matchesSearch = !searchLower || 
      course.course_code.toLowerCase().includes(searchLower) ||
      course.course_name.toLowerCase().includes(searchLower) ||
      course.instructor.toLowerCase().includes(searchLower);
    
    return matchesFilter && matchesSearch;
  });

  // Group courses by year for better organization
  const groupedCourses = filteredCourses.reduce((acc, course) => {
    const key = `Year ${course.year}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(course);
    return acc;
  }, {});

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      {/* Compact Header */}
      <div className="bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-slate-800">Master Timetable</h1>
          {activeSemester && (
            <Badge variant="secondary" className="font-normal">
              {activeSemester.name}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/incharge/setup')}>
            <Settings className="w-4 h-4 mr-1.5" />
            Semester
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/incharge/courses')}>
            <BookOpen className="w-4 h-4 mr-1.5" />
            Courses
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/incharge/manage-cr')}>
            <Users className="w-4 h-4 mr-1.5" />
            CRs
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/incharge/exam-timetable')}>
            <Calendar className="w-4 h-4 mr-1.5" />
            Exams
          </Button>
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <Button
            size="sm"
            onClick={handlePublishAll}
            disabled={selectedClasses.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Publish {selectedClasses.length > 0 && `(${selectedClasses.length})`}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              localStorage.removeItem('incharge_token');
              navigate('/');
            }}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Class Selection Bar */}
      <div className="bg-white border-b px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Quick Selection Buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-slate-500 mr-1">Quick:</span>
            <button
              onClick={selectAll}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                selectedClasses.length === allClassOptions.length && allClassOptions.length > 0
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
              }`}
            >
              All
            </button>
            {uniquePrograms.map(program => {
              const programClasses = allClassOptions.filter(c => c.program === program);
              const allProgramSelected = programClasses.length > 0 && programClasses.every(pc => 
                selectedClasses.find(c => c.key === pc.key)
              );
              return (
                <button
                  key={program}
                  onClick={() => selectByProgram(program)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    allProgramSelected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                  }`}
                >
                  {program}
                </button>
              );
            })}
          </div>

          <div className="w-px h-6 bg-slate-200" />

          {/* Individual Class Selection */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium text-slate-500 mr-1">Classes:</span>
            {allClassOptions.map(cls => {
              const isSelected = selectedClasses.find(c => c.key === cls.key);
              return (
                <button
                  key={cls.key}
                  onClick={() => toggleClass(cls)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    isSelected 
                      ? 'bg-slate-800 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cls.program.replace('.Tech', '')} Y{cls.year}-{cls.section}
                </button>
              );
            })}
          </div>

          {selectedClasses.length > 0 && (
            <>
              <div className="w-px h-6 bg-slate-200" />
              <Button
                size="sm"
                variant="outline"
                onClick={selectNone}
                className="text-slate-500 h-7 text-xs"
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={handleGenerateDraft}
                disabled={generating}
                className="bg-violet-600 hover:bg-violet-700 h-7 text-xs"
              >
                {generating ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                )}
                Auto Generate
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {selectedClasses.length > 0 ? (
          <DndContext 
            sensors={sensors}
            onDragStart={(e) => setActiveId(e.active.id)} 
            onDragEnd={handleDragEnd}
          >
            {/* Timetable Area */}
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border-b border-r border-slate-200 p-2 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">
                        Day
                      </th>
                      <th className="border-b border-r border-slate-200 p-2 text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">
                        Sec
                      </th>
                      {timeSlots.map(slot => (
                        <th key={slot.slot} className={`border-b border-r border-slate-200 p-2 text-center min-w-[90px] ${slot.slot === 5 ? 'bg-slate-100' : ''}`}>
                          <div className="text-xs font-medium text-slate-700">{slot.start}</div>
                          <div className="text-[10px] text-slate-400">{slot.end}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((day, dayIdx) => (
                      selectedClasses.map((cls, idx) => (
                        <tr 
                          key={`${day}-${cls.key}`} 
                          className={`${idx === selectedClasses.length - 1 ? 'border-b-2 border-slate-300' : 'border-b border-slate-200'}`}
                        >
                          {idx === 0 && (
                            <td 
                              rowSpan={selectedClasses.length} 
                              className="border-r border-slate-200 p-2 text-center bg-slate-50"
                            >
                              <span className="text-sm font-semibold text-slate-700">{day.slice(0, 3)}</span>
                            </td>
                          )}
                          <td className="border-r border-slate-200 p-1 text-center bg-slate-50/50">
                            <div className="text-xs font-medium text-slate-600">{cls.section}</div>
                            <div className="text-[10px] text-slate-400">Y{cls.year}</div>
                          </td>
                          {timeSlots.map(slot => {
                            const timetable = timetables[cls.key] || [];
                            const slotData = timetable.find(s => s.day === day && s.slot_number === slot.slot);
                            const colorClass = slotData?.course_id ? courseColors[slotData.course_id] : '';
                            const isLunch = slot.slot === 5;
                            
                            return (
                              <DroppableSlot
                                key={`${cls.key}|${day}|${slot.slot}`}
                                id={`${cls.key}|${day}|${slot.slot}`}
                                slotData={slotData}
                                colorClass={colorClass}
                                isLunch={isLunch}
                                onDelete={() => handleSlotDelete(cls, day, slot.slot)}
                              />
                            );
                          })}
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Export Buttons */}
              {selectedClasses.length > 0 && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-slate-500">Export:</span>
                  <ExportButtons 
                    timetables={timetables}
                    timeSlots={timeSlots}
                    semester={`${activeSemester?.name || 'Timetable'}`}
                    classes={selectedClasses}
                    viewMode="master"
                  />
                </div>
              )}
            </div>

            {/* Courses Sidebar */}
            <div className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 flex-shrink-0 relative`}>
              {/* Toggle Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="absolute -left-3 top-6 z-10 w-6 h-12 bg-white border shadow-sm rounded-l-lg flex items-center justify-center hover:bg-slate-50"
              >
                {sidebarOpen ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronLeft className="w-4 h-4 text-slate-400" />}
              </button>

              {sidebarOpen && (
                <div className="h-full bg-white border-l flex flex-col">
                  {/* Sidebar Header */}
                  <div className="p-3 border-b flex-shrink-0">
                    <h3 className="font-semibold text-slate-800 mb-2">Courses</h3>
                    {/* Search Bar */}
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="Search courses..."
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                        className="pl-8 pr-8 h-8 text-sm"
                      />
                      {courseSearch && (
                        <button
                          onClick={() => setCourseSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {/* Filter Tabs */}
                    <div className="flex gap-1">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'regular', label: 'Regular' },
                        { id: 'lab', label: 'Lab' },
                        { id: 'elective', label: 'Elective' },
                      ].map(filter => (
                        <button
                          key={filter.id}
                          onClick={() => setCourseFilter(filter.id)}
                          className={`px-2 py-1 text-xs rounded-md transition-colors ${
                            courseFilter === filter.id
                              ? 'bg-slate-800 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Course List */}
                  <div className="flex-1 overflow-auto p-2">
                    {Object.entries(groupedCourses).map(([year, yearCourses]) => (
                      <div key={year} className="mb-4">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-2 mb-2">
                          {year}
                        </div>
                        <div className="space-y-1.5">
                          {yearCourses.map(course => (
                            <DraggableCourse 
                              key={course.id} 
                              course={course} 
                              colorClass={courseColors[course.id] || 'bg-gray-50 border-gray-200'}
                              scheduledCount={getScheduledCount(course.id)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DragOverlay>
              {activeId && (() => {
                let course = null;
                
                if (activeId.startsWith('course-')) {
                  course = courses.find(c => c.id === parseInt(activeId.replace('course-', '')));
                } else if (activeId.startsWith('slot-')) {
                  const slotId = activeId.replace('slot-', '');
                  const [classKey, day, slotNum] = slotId.split('|');
                  const timetable = timetables[classKey] || [];
                  const slotData = timetable.find(s => s.day === day && s.slot_number === parseInt(slotNum));
                  if (slotData) {
                    course = courses.find(c => c.id === slotData.course_id);
                  }
                }
                
                if (!course) return null;
                
                return (
                  <div className="bg-slate-800 text-white px-3 py-2 rounded-lg shadow-xl">
                    <div className="font-medium text-sm">{course.course_code}</div>
                    <div className="text-xs opacity-75">{course.course_name}</div>
                  </div>
                );
              })()}
            </DragOverlay>
          </DndContext>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-700 mb-1">No classes selected</h3>
              <p className="text-sm text-slate-500">Select classes from the bar above to start building timetables</p>
            </div>
          </div>
        )}
      </div>

      {/* Minor Slots Selection Modal */}
      <Dialog open={showMinorModal} onOpenChange={setShowMinorModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Minor Course Slots</DialogTitle>
            <p className="text-sm text-slate-500 mt-1">
              Select exactly 4 slots for minor courses. These slots will be the same for all batches.
            </p>
          </DialogHeader>
          
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border p-2 text-left font-medium text-slate-600">Day</th>
                  {timeSlots.filter(s => s.slot !== 5).map(slot => (
                    <th key={slot.slot} className="border p-2 text-center font-medium text-slate-600 text-xs">
                      {slot.start}<br/>{slot.end}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map(day => (
                  <tr key={day}>
                    <td className="border p-2 text-slate-600 font-medium">
                      {day.substring(0, 3)}
                    </td>
                    {timeSlots.filter(s => s.slot !== 5).map(slot => (
                      <td key={`${day}-${slot.slot}`} className="border p-1 text-center">
                        <button
                          onClick={() => toggleMinorSlot(day, slot.slot)}
                          className={`w-full h-10 rounded transition-all ${
                            isMinorSlotSelected(day, slot.slot)
                              ? 'bg-violet-500 text-white font-medium'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                          }`}
                        >
                          {isMinorSlotSelected(day, slot.slot) ? '✓' : ''}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-sm text-slate-500">
              {selectedMinorSlots.length}/4 slots selected
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowMinorModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmGenerate}
                disabled={selectedMinorSlots.length !== 4}
              >
                Generate Draft
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Warnings Modal */}
      <Dialog open={showWarningsModal} onOpenChange={setShowWarningsModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-amber-500">⚠️</span>
              Scheduling Warnings
            </DialogTitle>
            <p className="text-sm text-slate-500 mt-1">
              Some courses could not be fully scheduled. You may need to manually adjust them.
            </p>
          </DialogHeader>
          
          <div className="max-h-[300px] overflow-auto">
            <div className="space-y-2">
              {generationWarnings.map((warning, idx) => (
                <div key={idx} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-amber-900">{warning.course}</span>
                    <span className="text-sm text-amber-700">
                      {warning.scheduled}/{warning.required} hrs
                    </span>
                  </div>
                  <p className="text-xs text-amber-700 mt-1">
                    {warning.section ? `Section ${warning.section} • ` : ''}{warning.type}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowWarningsModal(false)}>
              OK, I'll adjust manually
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict Confirmation Modal */}
      <Dialog open={showConflictModal} onOpenChange={setShowConflictModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-red-500">⚠️</span>
              Scheduling Conflict
            </DialogTitle>
            <p className="text-sm text-slate-500 mt-1">
              This placement has the following conflicts:
            </p>
          </DialogHeader>
          
          <div className="space-y-2">
            {pendingDrop?.conflicts?.map((conflict, idx) => (
              <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                {conflict}
              </div>
            ))}
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleDropCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleForceDropConfirm}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Continue Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DraggableCourse({ course, colorClass, scheduledCount = 0 }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `course-${course.id}`
  });

  // Determine course type label
  const getCourseTypeLabel = () => {
    if (course.course_type === 'major_project') return 'Major Project';
    if (course.course_type === 'minor_project') return 'Minor Project';
    if (course.practical_hours > 0 && course.course_type === 'lab') return 'Lab';
    if (course.is_elective) return 'Elective';
    return 'Course';
  };

  const typeLabel = getCourseTypeLabel();
  
  // Calculate total required hours/slots
  const totalRequired = course.lecture_hours + course.tutorial_hours + course.practical_hours;
  const isComplete = scheduledCount >= totalRequired;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`group px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md hover:-translate-y-0.5'
      } ${colorClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm">{course.course_code}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 font-medium">{typeLabel}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              isComplete 
                ? 'bg-green-500 text-white' 
                : 'bg-black/10'
            }`}>
              {scheduledCount}/{totalRequired}
            </span>
          </div>
          <div className="text-xs truncate opacity-75 mt-0.5">{course.course_name}</div>
          <div className="text-[10px] opacity-50 mt-1">
            {course.instructor} • {course.lecture_hours}-{course.tutorial_hours}-{course.practical_hours}
          </div>
        </div>
        <GripVertical className="w-4 h-4 opacity-0 group-hover:opacity-40 flex-shrink-0 mt-0.5" />
      </div>
    </div>
  );
}

function DroppableSlot({ id, slotData, colorClass, isLunch, onDelete }) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id });
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `slot-${id}`,
    disabled: !slotData?.course_code || isLunch
  });
  const [showTooltip, setShowTooltip] = useState(false);

  if (isLunch) {
    return (
      <td className="border-r border-slate-200 p-1 bg-slate-100 text-center">
        <span className="text-[10px] text-slate-400">Lunch</span>
      </td>
    );
  }

  // Combine refs for both draggable and droppable
  const setRefs = (node) => {
    setDropRef(node);
    setDragRef(node);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (slotData?.course_code && onDelete) {
      onDelete();
    }
  };

  return (
    <td
      ref={setRefs}
      {...(slotData?.course_code ? { ...listeners, ...attributes } : {})}
      onMouseEnter={() => slotData?.course_code && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={`border-r border-slate-200 p-1 transition-all relative group ${
        isDragging
          ? 'opacity-50 scale-95'
          : isOver 
            ? 'bg-violet-100 ring-2 ring-inset ring-violet-400' 
            : slotData?.course_code 
              ? `${colorClass} cursor-grab active:cursor-grabbing`
              : 'bg-white hover:bg-slate-50'
      }`}
    >
      {slotData?.course_code && (
        <div className="text-center relative">
          <div className="font-semibold text-xs">{slotData.course_code}</div>
          {slotData.room_lab && (
            <div className="text-[10px] opacity-60">{slotData.room_lab}</div>
          )}
          {/* Delete button - appears on hover */}
          <button
            onClick={handleDeleteClick}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-sm"
            title="Remove slot"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Tooltip on hover */}
      {showTooltip && slotData?.course_code && !isDragging && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-slate-900 text-white text-xs rounded-lg shadow-xl p-2.5 pointer-events-none">
          <div className="font-semibold mb-1">{slotData.course_code}</div>
          <div className="opacity-90 mb-1 text-[11px]">{slotData.course_name}</div>
          <div className="text-slate-300 space-y-0.5 text-[10px]">
            <div>👤 {slotData.instructor || 'TBA'}</div>
            <div>📚 L-T-P: {slotData.lecture_hours || 0}-{slotData.tutorial_hours || 0}-{slotData.practical_hours || 0}</div>
            {slotData.room_lab && <div>🏠 {slotData.room_lab}</div>}
            {slotData.slot_type && <div>📋 {slotData.slot_type}</div>}
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </td>
  );
}

export default MasterTimetableBuilderNew;
