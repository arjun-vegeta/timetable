import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DndContext, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar, BookOpen, LogOut, RotateCcw, Trash2, X, Loader2, Check, Cloud } from 'lucide-react';
import ExportButtons from '../Common/ExportButtons';

const API_URL = 'http://localhost:3001/api';

function CRTimetableBuilderNew() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [originalTimetable, setOriginalTimetable] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [courseColors, setCourseColors] = useState({});
  const [activeSemester, setActiveSemester] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
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
    const token = localStorage.getItem('cr_token');
    const userData = localStorage.getItem('cr_user');
    
    if (!token || !userData) {
      navigate('/cr/login');
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    fetchActiveSemester();
    fetchTimeSlots();
  }, []);

  useEffect(() => {
    if (user && activeSemester) {
      initializeTimetable();
    }
  }, [user, activeSemester]);

  const initializeTimetable = async () => {
    setLoading(true);
    await fetchCourses();
    await fetchOriginalTimetable();
    
    // Fetch CR timetable - if empty, auto-copy from original
    const token = localStorage.getItem('cr_token');
    const response = await axios.get(`${API_URL}/cr/timetable`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.length === 0) {
      // Auto-copy original timetable on first load
      await axios.post(`${API_URL}/cr/copy-original`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchTimetable();
    } else {
      setTimetable(response.data);
    }
    setLoading(false);
  };

  const fetchActiveSemester = async () => {
    try {
      const response = await axios.get(`${API_URL}/semester/active`);
      setActiveSemester(response.data);
    } catch (error) {
      console.error('Error fetching semester:', error);
    }
  };

  const fetchTimeSlots = async () => {
    const response = await axios.get(`${API_URL}/timetable/config`);
    setTimeSlots(response.data);
  };

  const fetchCourses = async () => {
    if (!user || !activeSemester) return;
    
    const response = await axios.get(`${API_URL}/courses`, {
      params: { 
        semester_id: activeSemester.id,
        program: user.program,
        year: user.year,
        section: user.section
      }
    });
    const coursesData = response.data;
    setCourses(coursesData);
    
    const colors = {};
    coursesData.forEach((course, index) => {
      colors[course.id] = colorPalette[index % colorPalette.length];
    });
    setCourseColors(colors);
  };

  const fetchTimetable = async () => {
    const token = localStorage.getItem('cr_token');
    const response = await axios.get(`${API_URL}/cr/timetable`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setTimetable(response.data);
  };

  const fetchOriginalTimetable = async () => {
    if (!user || !activeSemester) return;
    
    const response = await axios.get(`${API_URL}/student/timetable/original`, {
      params: { 
        semester_id: activeSemester.id,
        program: user.program,
        year: user.year,
        section: user.section
      }
    });
    setOriginalTimetable(response.data);
  };

  const handleRevert = async () => {
    const token = localStorage.getItem('cr_token');
    await axios.post(`${API_URL}/cr/copy-original`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    await fetchTimetable();
    setShowRevertConfirm(false);
  };

  // Check if timetable has changes from original
  const hasChanges = () => {
    if (timetable.length !== originalTimetable.length) return true;
    for (const slot of timetable) {
      const original = originalTimetable.find(
        o => o.day === slot.day && o.slot_number === slot.slot_number
      );
      if (!original || original.course_id !== slot.course_id) return true;
    }
    return false;
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (over) {
      const [targetDay, targetSlotStr] = over.id.split('-');
      const targetSlot = parseInt(targetSlotStr);
      const slot = timeSlots.find(s => s.slot === targetSlot);
      const token = localStorage.getItem('cr_token');

      // Check if dragging from course panel or from existing slot
      if (active.id.startsWith('course-')) {
        const courseId = parseInt(active.id.replace('course-', ''));
        
        try {
          setSaving(true);
          await axios.post(`${API_URL}/cr/timetable/slot`, {
            day: targetDay,
            slot_number: targetSlot,
            course_id: courseId,
            slot_type: 'class',
            time_start: slot.start,
            time_end: slot.end
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          await fetchTimetable();
          setLastSaved(new Date());
        } catch (error) {
          alert('Error adding slot: ' + error.response?.data?.message);
        } finally {
          setSaving(false);
        }
      } else if (active.id.startsWith('slot-')) {
        // Moving existing slot
        const [_, sourceDay, sourceSlotStr] = active.id.split('-');
        const sourceSlot = parseInt(sourceSlotStr);
        const existingSlot = timetable.find(t => t.day === sourceDay && t.slot_number === sourceSlot);
        
        if (existingSlot && (sourceDay !== targetDay || sourceSlot !== targetSlot)) {
          try {
            setSaving(true);
            // Delete from source
            await axios.delete(`${API_URL}/cr/timetable/slot`, {
              headers: { Authorization: `Bearer ${token}` },
              data: { day: sourceDay, slot_number: sourceSlot }
            });
            
            // Add to target
            await axios.post(`${API_URL}/cr/timetable/slot`, {
              day: targetDay,
              slot_number: targetSlot,
              course_id: existingSlot.course_id,
              slot_type: existingSlot.slot_type || 'class',
              time_start: slot.start,
              time_end: slot.end
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            await fetchTimetable();
            setLastSaved(new Date());
          } catch (error) {
            alert('Error moving slot: ' + error.response?.data?.message);
          } finally {
            setSaving(false);
          }
        }
      }
    }
    
    setActiveId(null);
  };

  const handleDeleteSlot = async (day, slotNumber) => {
    const token = localStorage.getItem('cr_token');
    setSaving(true);
    try {
      await axios.delete(`${API_URL}/cr/timetable/slot`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { day, slot_number: slotNumber }
      });
      await fetchTimetable();
      setLastSaved(new Date());
    } finally {
      setSaving(false);
    }
    setShowDeleteConfirm(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('cr_token');
    localStorage.removeItem('cr_user');
    navigate('/');
  };

  const getScheduledCount = (courseId) => {
    return timetable.filter(t => t.course_id === courseId).length;
  };

  const getRequiredSlots = (course) => {
    return (course.lecture_hours || 0) + (course.tutorial_hours || 0) + (course.practical_hours || 0);
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto" />
          <p className="mt-2 text-slate-600">Loading timetable...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">CR Timetable Builder</h1>
            <p className="text-xs text-slate-500">
              {user.program} Year {user.year} - Section {user.section} | {activeSemester?.name}
            </p>
          </div>
          {/* Auto-save indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-600" />
                <span className="text-xs text-slate-600">Saving...</span>
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs text-slate-600">
                  {lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Auto-save enabled'}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges() && (
            <Button variant="outline" size="sm" onClick={() => setShowRevertConfirm(true)}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Revert to Original
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <DndContext 
          sensors={sensors}
          onDragStart={(e) => setActiveId(e.active.id)} 
          onDragEnd={handleDragEnd}
        >
          {/* Timetable Grid */}
          <div className="flex-1 p-4 overflow-auto">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border-b border-r p-3 text-left text-sm font-semibold text-slate-700 w-28">
                      Day / Time
                    </th>
                    {timeSlots.map(slot => (
                      <th key={slot.slot} className="border-b p-2 text-center min-w-[100px]">
                        <div className="text-xs font-medium text-slate-600">Slot {slot.slot}</div>
                        <div className="text-xs text-slate-400">{slot.start}-{slot.end}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {days.map(day => (
                    <tr key={day}>
                      <td className="border-b border-r p-3 font-medium text-sm text-slate-700 bg-slate-50">
                        {day}
                      </td>
                      {timeSlots.map(slot => {
                        const slotData = timetable.find(t => t.day === day && t.slot_number === slot.slot);
                        const isLunch = slot.slot === 5;
                        const colorClass = slotData ? courseColors[slotData.course_id] || 'bg-slate-100' : '';
                        
                        return (
                          <DroppableSlot
                            key={`${day}-${slot.slot}`}
                            day={day}
                            slot={slot.slot}
                            slotData={slotData}
                            colorClass={colorClass}
                            isLunch={isLunch}
                            onDelete={() => setShowDeleteConfirm({ day, slot: slot.slot })}
                          />
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Export Buttons */}
            <div className="mt-4">
              <ExportButtons 
                timetable={timetable}
                timeSlots={timeSlots}
                semester={`${user.program}_Y${user.year}`}
                section={user.section}
                viewMode="cr"
              />
            </div>
          </div>

          {/* Course Sidebar */}
          <div className={`w-72 bg-white border-l flex flex-col flex-shrink-0 transition-all ${sidebarOpen ? '' : 'w-0 overflow-hidden'}`}>
            <div className="p-4 border-b">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Courses
              </h3>
              <p className="text-xs text-slate-500 mt-1">Drag courses to the timetable</p>
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-2">
              {courses.map(course => {
                const scheduled = getScheduledCount(course.id);
                const required = getRequiredSlots(course);
                const colorClass = courseColors[course.id] || 'bg-slate-50 border-slate-200';
                
                return (
                  <DraggableCourse 
                    key={course.id} 
                    course={course} 
                    colorClass={colorClass}
                    scheduled={scheduled}
                    required={required}
                  />
                );
              })}
            </div>
          </div>

          <DragOverlay>
            {activeId && (
              <div className="bg-violet-100 border-2 border-violet-400 p-3 rounded-lg shadow-lg">
                {activeId.startsWith('course-') ? (
                  courses.find(c => c.id === parseInt(activeId.replace('course-', '')))?.course_code
                ) : activeId.startsWith('slot-') ? (
                  (() => {
                    const [_, day, slotStr] = activeId.split('-');
                    const slotData = timetable.find(t => t.day === day && t.slot_number === parseInt(slotStr));
                    return slotData?.course_code || 'Moving...';
                  })()
                ) : null}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Slot</DialogTitle>
          </DialogHeader>
          <p className="text-slate-600">Are you sure you want to remove this slot?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => handleDeleteSlot(showDeleteConfirm.day, showDeleteConfirm.slot)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert Confirmation */}
      <Dialog open={showRevertConfirm} onOpenChange={setShowRevertConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revert to Original</DialogTitle>
          </DialogHeader>
          <p className="text-slate-600">
            This will discard all your changes and restore the original timetable created by the incharge. 
            Are you sure you want to continue?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevertConfirm(false)}>Cancel</Button>
            <Button onClick={handleRevert}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Revert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DraggableCourse({ course, colorClass, scheduled, required }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `course-${course.id}`
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`p-3 rounded-lg border-2 cursor-grab transition-all ${colorClass} ${
        isDragging ? 'opacity-50 cursor-grabbing' : 'hover:shadow-md'
      }`}
    >
      <div className="flex justify-between items-start">
        <span className="font-semibold text-sm">{course.course_code}</span>
        <Badge variant={scheduled >= required ? 'default' : 'secondary'} className="text-xs">
          {scheduled}/{required}
        </Badge>
      </div>
      <div className="text-xs mt-1 opacity-80 truncate">{course.course_name}</div>
      <div className="text-xs mt-1 opacity-60">{course.instructor}</div>
    </div>
  );
}

function DroppableSlot({ day, slot, slotData, colorClass, isLunch, onDelete }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${day}-${slot}`
  });

  // Make filled slots draggable
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `slot-${day}-${slot}`,
    disabled: !slotData
  });

  const combinedRef = (node) => {
    setNodeRef(node);
    setDragRef(node);
  };

  return (
    <td
      ref={combinedRef}
      {...(slotData ? { ...listeners, ...attributes } : {})}
      className={`border-b p-1 text-center transition-all min-h-[60px] relative group ${
        isOver ? 'bg-violet-100 ring-2 ring-violet-400 ring-inset' : 
        isLunch && !slotData ? 'bg-amber-50' :
        slotData ? colorClass : 'bg-white hover:bg-slate-50'
      } ${slotData ? 'cursor-grab' : ''} ${isDragging ? 'opacity-50' : ''}`}
    >
      {isLunch && !slotData ? (
        <div className="text-xs text-amber-600 font-medium">Lunch</div>
      ) : slotData ? (
        <div className="p-1 relative">
          <div className="font-semibold text-xs">{slotData.course_code}</div>
          {slotData.room_lab && (
            <div className="text-xs opacity-70 mt-0.5">{slotData.room_lab}</div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : null}
    </td>
  );
}

export default CRTimetableBuilderNew;
