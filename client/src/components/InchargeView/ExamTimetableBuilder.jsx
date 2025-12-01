import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DndContext, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileSpreadsheet, Loader2, ArrowLeft, Sparkles, Settings, Coffee } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Exam slot configurations
const MIDSEM_SLOTS = [
  { id: 1, label: 'I', time: '9:00 - 10:30' },
  { id: 2, label: 'II', time: '11:00 - 12:30' },
  { id: 3, label: 'III', time: '2:00 - 3:30' },
  { id: 4, label: 'IV', time: '4:00 - 5:30' },
];

const ENDSEM_SLOTS = [
  { id: 1, label: 'FN', time: '9:00 - 12:00' },
  { id: 2, label: 'AN', time: '2:00 - 5:00' },
];

function ExamTimetableBuilder() {
  const navigate = useNavigate();
  const [examType, setExamType] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [activeSemester, setActiveSemester] = useState(null);
  const [batches, setBatches] = useState([]);
  const [examSchedule, setExamSchedule] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [showSetupModal, setShowSetupModal] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const batchColors = {
    1: 'bg-sky-50 border-sky-200 text-sky-700',
    2: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    3: 'bg-violet-50 border-violet-200 text-violet-700',
    4: 'bg-amber-50 border-amber-200 text-amber-700',
  };

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
    };
    verifyAuth();
  }, []);

  const fetchActiveSemester = async () => {
    try {
      const response = await axios.get(`${API_URL}/semester/active`);
      setActiveSemester(response.data);
    } catch (error) {
      console.error('Error fetching semester:', error);
    }
  };

  const fetchBatchesAndCourses = async () => {
    if (!activeSemester) return;
    setLoading(true);
    
    try {
      const classesRes = await axios.get(`${API_URL}/semester/${activeSemester.id}/classes`);
      const classes = classesRes.data;

      // Group by year only (assuming single program for simplicity)
      const batchMap = {};
      for (const cls of classes) {
        const batchKey = `Y${cls.year}`;
        if (!batchMap[batchKey]) {
          batchMap[batchKey] = {
            key: batchKey,
            program: cls.program,
            year: cls.year,
          };
        }
      }

      // Fetch courses for each batch - ONLY their year's courses
      const batchesWithCourses = [];
      for (const [batchKey, batch] of Object.entries(batchMap)) {
        const coursesRes = await axios.get(`${API_URL}/courses`, {
          params: {
            semester_id: activeSemester.id,
            program: batch.program,
            year: batch.year,
          },
        });

        // Filter: regular courses (no lab), electives, minors - NO projects
        const examCourses = coursesRes.data.filter(c => {
          // Must be this year's course
          if (c.year !== batch.year) return false;
          // No major/minor projects
          if (c.course_type === 'major_project' || c.course_type === 'minor_project') return false;
          // No pure lab courses (practical only)
          if (c.practical_hours > 0 && c.lecture_hours === 0 && c.tutorial_hours === 0) return false;
          return true;
        });

        batchesWithCourses.push({
          ...batch,
          courses: examCourses,
          color: batchColors[batch.year] || 'bg-slate-50 border-slate-200 text-slate-700',
        });
      }

      // Sort by year
      batchesWithCourses.sort((a, b) => a.year - b.year);
      setBatches(batchesWithCourses);

      // Initialize empty schedule
      const initialSchedule = {};
      batchesWithCourses.forEach(batch => {
        initialSchedule[batch.key] = [];
      });
      setExamSchedule(initialSchedule);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupComplete = () => {
    if (!examType || !startDate) {
      alert('Please select exam type and start date');
      return;
    }
    setShowSetupModal(false);
    fetchBatchesAndCourses();
  };

  // Generate all dates including Sundays
  const generateExamDates = useCallback(() => {
    if (!startDate || batches.length === 0) return [];

    const maxExams = Math.max(...batches.map(b => b.courses.length), 1);
    const slots = examType === 'midsem' ? MIDSEM_SLOTS : ENDSEM_SLOTS;
    
    // Need enough working days for all exams (one per day per batch)
    const workingDaysNeeded = maxExams;
    
    const dates = [];
    let currentDate = new Date(startDate);
    let workingDaysAdded = 0;

    // Generate dates until we have enough working days
    while (workingDaysAdded < workingDaysNeeded) {
      dates.push({
        date: new Date(currentDate),
        isSunday: currentDate.getDay() === 0,
        dayIndex: dates.length,
      });
      
      if (currentDate.getDay() !== 0) {
        workingDaysAdded++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }, [startDate, batches, examType]);

  const examDates = generateExamDates();
  const slots = examType === 'midsem' ? MIDSEM_SLOTS : ENDSEM_SLOTS;

  // Auto-generate schedule
  const autoGenerateSchedule = () => {
    const newSchedule = {};
    
    // Get working day indices (non-Sunday)
    const workingDayIndices = examDates
      .filter(d => !d.isSunday)
      .map(d => d.dayIndex);

    batches.forEach(batch => {
      const batchExams = [];
      batch.courses.forEach((course, idx) => {
        if (idx < workingDayIndices.length) {
          batchExams.push({
            courseId: course.id,
            courseCode: course.course_code,
            courseName: course.course_name,
            dayIndex: workingDayIndices[idx],
            slotId: 1,
          });
        }
      });
      newSchedule[batch.key] = batchExams;
    });

    setExamSchedule(newSchedule);
  };

  // Handle drag end with reordering
  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || !active) return;

    const activeIdStr = active.id;
    const overIdStr = over.id;

    // Parse IDs
    const activeParts = activeIdStr.split('-');
    const activeBatchKey = activeParts[1];
    const activeCourseId = parseInt(activeParts[2]);

    const overParts = overIdStr.split('-');
    const targetBatchKey = overParts[1];
    const targetDayIndex = parseInt(overParts[2]);
    const targetSlotId = parseInt(overParts[3]);

    // Only same batch
    if (activeBatchKey !== targetBatchKey) return;

    // Check if target is Sunday
    const targetDateInfo = examDates.find(d => d.dayIndex === targetDayIndex);
    if (targetDateInfo?.isSunday) return;

    const batchSchedule = [...(examSchedule[activeBatchKey] || [])];
    const movingExamIndex = batchSchedule.findIndex(e => e.courseId === activeCourseId);
    if (movingExamIndex === -1) return;

    const movingExam = batchSchedule[movingExamIndex];
    const sourceDayIndex = movingExam.dayIndex;
    const sourceSlotId = movingExam.slotId;

    if (sourceDayIndex === targetDayIndex && sourceSlotId === targetSlotId) return;

    // Calculate positions (only considering working days)
    const getPosition = (dayIdx, slotId) => {
      const workingDaysBefore = examDates.filter(d => d.dayIndex < dayIdx && !d.isSunday).length;
      return workingDaysBefore * slots.length + (slotId - 1);
    };

    const sourcePos = getPosition(sourceDayIndex, sourceSlotId);
    const targetPos = getPosition(targetDayIndex, targetSlotId);

    // Check if target has an exam
    const targetExam = batchSchedule.find(e => e.dayIndex === targetDayIndex && e.slotId === targetSlotId);

    if (targetExam) {
      // Shift exams
      if (sourcePos > targetPos) {
        // Moving earlier - shift intermediate exams forward
        batchSchedule.forEach(exam => {
          if (exam.courseId === activeCourseId) return;
          const examPos = getPosition(exam.dayIndex, exam.slotId);
          if (examPos >= targetPos && examPos < sourcePos) {
            const newPos = examPos + 1;
            const newDaySlot = positionToDaySlot(newPos);
            exam.dayIndex = newDaySlot.dayIndex;
            exam.slotId = newDaySlot.slotId;
          }
        });
      } else {
        // Moving later - shift intermediate exams backward
        batchSchedule.forEach(exam => {
          if (exam.courseId === activeCourseId) return;
          const examPos = getPosition(exam.dayIndex, exam.slotId);
          if (examPos > sourcePos && examPos <= targetPos) {
            const newPos = examPos - 1;
            const newDaySlot = positionToDaySlot(newPos);
            exam.dayIndex = newDaySlot.dayIndex;
            exam.slotId = newDaySlot.slotId;
          }
        });
      }
    }

    movingExam.dayIndex = targetDayIndex;
    movingExam.slotId = targetSlotId;

    setExamSchedule(prev => ({ ...prev, [activeBatchKey]: batchSchedule }));
  };

  // Convert linear position back to dayIndex and slotId
  const positionToDaySlot = (pos) => {
    const workingDays = examDates.filter(d => !d.isSunday);
    const dayNum = Math.floor(pos / slots.length);
    const slotId = (pos % slots.length) + 1;
    
    if (dayNum < workingDays.length) {
      return { dayIndex: workingDays[dayNum].dayIndex, slotId };
    }
    return { dayIndex: 0, slotId: 1 };
  };

  const getExamAt = (batchKey, dayIndex, slotId) => {
    const schedule = examSchedule[batchKey] || [];
    return schedule.find(e => e.dayIndex === dayIndex && e.slotId === slotId);
  };

  const formatDate = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      month: date.toLocaleString('default', { month: 'short' }),
    };
  };

  const getActiveExam = () => {
    if (!activeId) return null;
    const parts = activeId.split('-');
    const batchKey = parts[1];
    const courseId = parseInt(parts[2]);
    const schedule = examSchedule[batchKey] || [];
    return schedule.find(e => e.courseId === courseId);
  };

  const removeExam = (batchKey, courseId) => {
    setExamSchedule(prev => ({
      ...prev,
      [batchKey]: prev[batchKey].filter(e => e.courseId !== courseId),
    }));
  };

  const addCourseToSchedule = (batchKey, course) => {
    const workingDays = examDates.filter(d => !d.isSunday);
    
    for (const wd of workingDays) {
      for (const slot of slots) {
        if (!getExamAt(batchKey, wd.dayIndex, slot.id)) {
          setExamSchedule(prev => ({
            ...prev,
            [batchKey]: [
              ...prev[batchKey],
              {
                courseId: course.id,
                courseCode: course.course_code,
                courseName: course.course_name,
                dayIndex: wd.dayIndex,
                slotId: slot.id,
              },
            ],
          }));
          return;
        }
      }
    }
    alert('No available slots!');
  };

  const getUnscheduledCourses = (batch) => {
    const scheduled = examSchedule[batch.key] || [];
    const scheduledIds = new Set(scheduled.map(e => e.courseId));
    return batch.courses.filter(c => !scheduledIds.has(c.id));
  };

  // Setup Modal
  if (showSetupModal) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet className="w-7 h-7 text-violet-600" />
            </div>
            <h1 className="text-xl font-semibold text-slate-800">Exam Schedule</h1>
            <p className="text-sm text-slate-500 mt-1">Configure your exam timetable</p>
          </div>

          <div className="space-y-6">
            <div>
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3 block">
                Exam Type
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setExamType('midsem')}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    examType === 'midsem'
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium text-slate-800">Midsem</div>
                  <div className="text-xs text-slate-500 mt-1">1.5 hrs · 4/day</div>
                </button>
                <button
                  onClick={() => setExamType('endsem')}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    examType === 'endsem'
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium text-slate-800">Endsem</div>
                  <div className="text-xs text-slate-500 mt-1">3 hrs · 2/day</div>
                </button>
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block">
                Start Date
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-12"
              />
            </div>

            <Button
              onClick={handleSetupComplete}
              disabled={!examType || !startDate}
              className="w-full h-12 bg-violet-600 hover:bg-violet-700 text-base"
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Clean Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/incharge/master-timetable')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="font-semibold text-slate-800">
              {examType === 'midsem' ? 'Midsem' : 'Endsem'} Exams
            </h1>
            <p className="text-xs text-slate-500">
              {new Date(startDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={autoGenerateSchedule}
            className="gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            Auto Fill
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSetupModal(true)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <DndContext
          sensors={sensors}
          onDragStart={(e) => setActiveId(e.active.id)}
          onDragEnd={handleDragEnd}
        >
          {/* Timetable Grid */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider bg-slate-50 border-b w-24">
                    Date
                  </th>
                  {batches.map(batch => (
                    <th
                      key={batch.key}
                      className="p-3 text-center border-b border-l bg-slate-50"
                      style={{ minWidth: `${slots.length * 80 + 20}px` }}
                    >
                      <div className="text-sm font-semibold text-slate-700">{batch.key}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{batch.courses.length} exams</div>
                      <div className="flex justify-center gap-1 mt-2">
                        {slots.map(slot => (
                          <div key={slot.id} className="text-[10px] text-slate-400 w-16 text-center">
                            {slot.label} <span className="text-slate-300">({slot.time})</span>
                          </div>
                        ))}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {examDates.map(({ date, isSunday, dayIndex }) => {
                  const formatted = formatDate(date);
                  
                  if (isSunday) {
                    return (
                      <tr key={dayIndex} className="bg-orange-50/30">
                        <td className="p-3 border-b">
                          <div className="text-[10px] text-orange-500 font-medium">{formatted.day}</div>
                          <div className="text-base font-semibold text-orange-600">{formatted.date}</div>
                          <div className="text-[10px] text-orange-400">{formatted.month}</div>
                        </td>
                        {batches.map(batch => (
                          <td 
                            key={batch.key}
                            className="p-3 border-b border-l text-center"
                          >
                            <div className="flex items-center justify-center gap-1.5 text-orange-500">
                              <Coffee className="w-3.5 h-3.5" />
                              <span className="text-xs">Holiday</span>
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  }

                  return (
                    <tr key={dayIndex} className="hover:bg-slate-50/50">
                      <td className="p-3 border-b">
                        <div className="text-[10px] text-slate-400 font-medium">{formatted.day}</div>
                        <div className="text-base font-semibold text-slate-700">{formatted.date}</div>
                        <div className="text-[10px] text-slate-400">{formatted.month}</div>
                      </td>
                      {batches.map(batch => (
                        <td key={batch.key} className="p-2 border-b border-l">
                          <div className="flex gap-1.5 justify-center">
                            {slots.map(slot => (
                              <DroppableSlot
                                key={`${batch.key}-${dayIndex}-${slot.id}`}
                                id={`slot-${batch.key}-${dayIndex}-${slot.id}`}
                                exam={getExamAt(batch.key, dayIndex, slot.id)}
                                batchKey={batch.key}
                                batchColor={batch.color}
                                slotLabel={slot.label}
                                onRemove={(courseId) => removeExam(batch.key, courseId)}
                              />
                            ))}
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Unscheduled Courses */}
          {batches.some(b => getUnscheduledCourses(b).length > 0) && (
            <div className="mt-6">
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Unscheduled</h3>
              <div className="flex gap-4 flex-wrap">
                {batches.map(batch => {
                  const unscheduled = getUnscheduledCourses(batch);
                  if (unscheduled.length === 0) return null;

                  return (
                    <div key={batch.key} className="bg-white rounded-lg border p-3 min-w-[200px]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">{batch.key}</span>
                        <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">
                          {unscheduled.length}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {unscheduled.map(course => (
                          <button
                            key={course.id}
                            onClick={() => addCourseToSchedule(batch.key, course)}
                            className={`w-full text-left px-2 py-1.5 rounded border text-xs hover:shadow-sm transition-all ${batch.color}`}
                          >
                            <span className="font-medium">{course.course_code}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <DragOverlay>
            {activeId && (() => {
              const exam = getActiveExam();
              if (!exam) return null;
              return (
                <div className="bg-slate-800 text-white px-3 py-1.5 rounded-lg shadow-xl text-xs font-medium">
                  {exam.courseCode}
                </div>
              );
            })()}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

// Compact Droppable Slot
function DroppableSlot({ id, exam, batchKey, batchColor, slotLabel, onRemove }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`w-16 h-10 rounded transition-all ${
        isOver ? 'bg-violet-100 ring-1 ring-violet-400' : ''
      }`}
    >
      {exam ? (
        <DraggableExam
          exam={exam}
          batchKey={batchKey}
          batchColor={batchColor}
          onRemove={onRemove}
        />
      ) : (
        <div className="h-full w-full border border-dashed border-slate-200 rounded flex items-center justify-center">
          {isOver ? (
            <span className="text-[9px] text-violet-500">Drop</span>
          ) : (
            <span className="text-[9px] text-slate-300">{slotLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

// Compact Draggable Exam
function DraggableExam({ exam, batchKey, batchColor, onRemove }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `exam-${batchKey}-${exam.courseId}`,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      title={exam.courseName}
      className={`group relative h-full w-full px-1 py-0.5 rounded border cursor-grab active:cursor-grabbing transition-all flex items-center justify-center ${
        isDragging ? 'opacity-50 scale-95' : 'hover:shadow-sm'
      } ${batchColor}`}
    >
      <div className="text-[10px] font-semibold truncate">{exam.courseCode}</div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(exam.courseId);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 hover:bg-red-600 text-white rounded-full text-[8px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
      >
        ×
      </button>
    </div>
  );
}

export default ExamTimetableBuilder;
