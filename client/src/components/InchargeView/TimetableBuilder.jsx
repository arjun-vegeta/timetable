import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DndContext, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import TimetableGrid from '../Common/TimetableGrid';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function TimetableBuilder() {
  const navigate = useNavigate();
  const [semester, setSemester] = useState('');
  const [section, setSection] = useState('');
  const [courses, setCourses] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [courseColors, setCourseColors] = useState({});

  const semesters = ['III', 'V', 'VII', 'I M.Tech', 'III M.Tech'];
  const sections = ['S1', 'S2', 'CSE', 'CSE-IS'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const colorPalette = [
    'bg-blue-100 border-blue-300 text-blue-800',
    'bg-green-100 border-green-300 text-green-800',
    'bg-purple-100 border-purple-300 text-purple-800',
    'bg-pink-100 border-pink-300 text-pink-800',
    'bg-yellow-100 border-yellow-300 text-yellow-800',
    'bg-indigo-100 border-indigo-300 text-indigo-800',
    'bg-red-100 border-red-300 text-red-800',
    'bg-orange-100 border-orange-300 text-orange-800',
    'bg-teal-100 border-teal-300 text-teal-800',
    'bg-cyan-100 border-cyan-300 text-cyan-800',
  ];

  useEffect(() => {
    if (!sessionStorage.getItem('incharge_auth')) {
      navigate('/incharge/login');
      return;
    }
    fetchTimeSlots();
  }, []);

  useEffect(() => {
    if (semester && section) {
      fetchCourses();
      fetchTimetable();
    }
  }, [semester, section]);

  const fetchTimeSlots = async () => {
    const response = await axios.get(`${API_URL}/timetable/config`);
    setTimeSlots(response.data);
  };

  const fetchCourses = async () => {
    const response = await axios.get(`${API_URL}/courses`, {
      params: { semester, section }
    });
    const coursesData = response.data;
    setCourses(coursesData);
    
    // Assign colors
    const colors = {};
    coursesData.forEach((course, index) => {
      colors[course.id] = colorPalette[index % colorPalette.length];
    });
    setCourseColors(colors);
  };

  const fetchTimetable = async () => {
    const response = await axios.get(`${API_URL}/timetable/all`, {
      params: { semester, section }
    });
    setTimetable(response.data);
  };

  const getCourseProgress = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return { scheduled: 0, total: 0 };
    
    const scheduled = timetable.filter(t => t.course_id === courseId).length;
    const total = course.total_hours;
    return { scheduled, total };
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (over && active.id.startsWith('course-')) {
      const courseId = parseInt(active.id.replace('course-', ''));
      const [day, slotNum] = over.id.split('-');
      const slotNumber = parseInt(slotNum);
      
      const slot = timeSlots.find(s => s.slot === slotNumber);
      
      try {
        await axios.post(`${API_URL}/timetable/slot`, {
          semester,
          section,
          day,
          slot_number: slotNumber,
          course_id: courseId,
          slot_type: 'class',
          time_start: slot.start,
          time_end: slot.end
        });
        fetchTimetable();
      } catch (error) {
        alert('Error adding slot: ' + error.response?.data?.message);
      }
    }
    
    setActiveId(null);
  };

  const handleSlotClick = async (day, slotNumber) => {
    const existing = timetable.find(t => t.day === day && t.slot_number === slotNumber);
    if (existing) {
      if (confirm('Remove this slot?')) {
        await axios.delete(`${API_URL}/timetable/slot`, {
          data: { semester, section, day, slot_number: slotNumber }
        });
        fetchTimetable();
      }
    }
  };

  const handlePublish = async () => {
    if (confirm('Publish this timetable? Students will be able to see it.')) {
      await axios.post(`${API_URL}/timetable/publish`, { semester, section });
      alert('Timetable published successfully!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Timetable Builder</h1>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/incharge/courses')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Manage Courses
            </button>
            <button
              onClick={() => navigate('/incharge/master-timetable')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Master Builder
            </button>
            <button
              onClick={handlePublish}
              disabled={!semester || !section}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
            >
              Publish Timetable
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">Select Semester</option>
              {semesters.map(sem => (
                <option key={sem} value={sem}>{sem}</option>
              ))}
            </select>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">Select Section</option>
              {sections.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>
        </div>

        {semester && section && (
          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-6">
              <div className="flex-1">
                <DroppableTimetable
                  timetable={timetable}
                  days={days}
                  timeSlots={timeSlots}
                  onSlotClick={handleSlotClick}
                />
              </div>

              <div className="w-96 bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Available Courses
                </h3>
                <div className="space-y-3 max-h-[600px] overflow-auto">
                  {courses.map(course => {
                    const progress = getCourseProgress(course.id);
                    const colorClass = courseColors[course.id] || 'bg-gray-100 border-gray-300';
                    return (
                      <DraggableCourse
                        key={course.id}
                        course={course}
                        progress={progress}
                        colorClass={colorClass}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <DragOverlay>
              {activeId && (
                <div className="bg-blue-100 border-2 border-blue-500 p-3 rounded-lg shadow-lg">
                  {courses.find(c => c.id === parseInt(activeId.replace('course-', '')))?.course_code}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function DraggableCourse({ course, progress, colorClass }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `course-${course.id}`
  });

  const isComplete = progress.scheduled >= progress.total;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`p-4 rounded-lg border-2 cursor-move transition-all ${
        isDragging ? 'opacity-50' : 'hover:shadow-lg hover:scale-105'
      } ${isComplete ? 'opacity-60' : colorClass}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="font-bold text-lg">{course.course_code}</div>
        {isComplete && (
          <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">✓ Done</span>
        )}
      </div>
      <div className="text-sm font-medium mb-2">{course.course_name}</div>
      <div className="text-xs mb-2">{course.instructor}</div>
      <div className="text-xs mb-3">
        L-T-P: {course.lecture_hours}-{course.tutorial_hours}-{course.practical_hours}
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="font-medium">Scheduled</span>
          <span className="font-bold">{progress.scheduled}/{progress.total}</span>
        </div>
        <div className="w-full bg-white bg-opacity-50 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${
              isComplete ? 'bg-green-600' : 'bg-blue-600'
            }`}
            style={{ width: `${Math.min((progress.scheduled / progress.total) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function DroppableTimetable({ timetable, days, timeSlots, courseColors = {}, onSlotClick }) {
  const getSlotData = (day, slotNum) => {
    return timetable.find(s => s.day === day && s.slot_number === slotNum);
  };

  const getCourseColor = (slotData) => {
    if (!slotData?.course_id) return 'bg-white';
    if (!courseColors || Object.keys(courseColors).length === 0) {
      return 'bg-blue-100 border-blue-300 text-blue-800';
    }
    return courseColors[slotData.course_id] || 'bg-gray-100 border-gray-300 text-gray-800';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-3 text-sm font-semibold text-gray-700 w-32">Day / Time</th>
              {timeSlots.map(slot => (
                <th key={slot.slot} className="border p-2 text-xs font-medium text-gray-600 min-w-[120px]">
                  <div>Slot {slot.slot}</div>
                  <div className="text-gray-500 font-normal">{slot.start}-{slot.end}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(day => (
              <tr key={day}>
                <td className="border p-3 font-medium text-gray-700 bg-gray-50">{day}</td>
                {timeSlots.map(slot => {
                  const slotData = getSlotData(day, slot.slot);
                  const colorClass = getCourseColor(slotData);
                  return (
                    <DroppableSlot
                      key={`${day}-${slot.slot}`}
                      day={day}
                      slot={slot.slot}
                      slotData={slotData}
                      colorClass={colorClass}
                      onClick={() => onSlotClick(day, slot.slot)}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DroppableSlot({ day, slot, slotData, colorClass, onClick }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${day}-${slot}`
  });

  return (
    <td
      ref={setNodeRef}
      onClick={onClick}
      className={`border p-2 text-xs cursor-pointer transition-all ${
        isOver ? 'bg-blue-200 ring-2 ring-blue-400' : slotData?.course_code ? colorClass : 'bg-white hover:bg-gray-50'
      }`}
    >
      {slotData?.course_code && (
        <div className="space-y-1">
          <div className="font-bold">{slotData.course_code}</div>
          {slotData.room_lab && (
            <div className="text-xs opacity-80">{slotData.room_lab}</div>
          )}
        </div>
      )}
    </td>
  );
}

export default TimetableBuilder;
