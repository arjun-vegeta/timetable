import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DndContext, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import { useGoogleLogin } from '@react-oauth/google';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function CRTimetableBuilder() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [courseColors, setCourseColors] = useState({});

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
    const token = localStorage.getItem('cr_token');
    const userData = localStorage.getItem('cr_user');
    
    if (!token || !userData) {
      navigate('/cr/login');
      return;
    }
    
    setUser(JSON.parse(userData));
    fetchTimeSlots();
    fetchCourses();
    fetchTimetable();
  }, []);

  const fetchTimeSlots = async () => {
    const response = await axios.get(`${API_URL}/timetable/config`);
    setTimeSlots(response.data);
  };

  const fetchCourses = async () => {
    const userData = JSON.parse(localStorage.getItem('cr_user'));
    const response = await axios.get(`${API_URL}/courses`, {
      params: { semester: userData.semester, section: userData.section }
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
    const token = localStorage.getItem('cr_token');
    const response = await axios.get(`${API_URL}/cr/timetable`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setTimetable(response.data);
  };

  const handleCopyOriginal = async () => {
    if (confirm('Copy original timetable? This will replace your current changes.')) {
      const token = localStorage.getItem('cr_token');
      await axios.post(`${API_URL}/cr/copy-original`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTimetable();
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (over && active.id.startsWith('course-')) {
      const courseId = parseInt(active.id.replace('course-', ''));
      const [day, slotNum] = over.id.split('-');
      const slotNumber = parseInt(slotNum);
      
      const slot = timeSlots.find(s => s.slot === slotNumber);
      const token = localStorage.getItem('cr_token');
      
      try {
        await axios.post(`${API_URL}/cr/timetable/slot`, {
          day,
          slot_number: slotNumber,
          course_id: courseId,
          slot_type: 'class',
          time_start: slot.start,
          time_end: slot.end
        }, {
          headers: { Authorization: `Bearer ${token}` }
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
        const token = localStorage.getItem('cr_token');
        await axios.delete(`${API_URL}/cr/timetable/slot`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { day, slot_number: slotNumber }
        });
        fetchTimetable();
      }
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const token = localStorage.getItem('cr_token');
      await axios.post(`${API_URL}/cr/google-calendar/token`, {
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGoogleConnected(true);
      alert('Google Calendar connected!');
    },
    scope: 'https://www.googleapis.com/auth/calendar',
    flow: 'implicit'
  });

  const syncToGoogleCalendar = async () => {
    if (!googleConnected) {
      alert('Please connect Google Calendar first');
      return;
    }
    // Implementation for syncing to Google Calendar
    alert('Syncing to Google Calendar...');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                CR Timetable Builder
              </h1>
              <p className="text-sm text-gray-600">
                {user.semester} Semester, Section {user.section}
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleCopyOriginal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Copy Original
              </button>
              <button
                onClick={() => googleLogin()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {googleConnected ? '✓ Google Connected' : 'Connect Google'}
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('cr_token');
                  localStorage.removeItem('cr_user');
                  navigate('/');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <DndContext onDragStart={(e) => setActiveId(e.active.id)} onDragEnd={handleDragEnd}>
          <div className="flex gap-6">
            <div className="flex-1">
              <DroppableTimetable
                timetable={timetable}
                days={days}
                timeSlots={timeSlots}
                courseColors={courseColors}
                onSlotClick={handleSlotClick}
              />
            </div>

            <div className="w-80 bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                Available Courses
              </h3>
              <div className="space-y-3 max-h-[600px] overflow-auto">
                {courses.map(course => {
                  const colorClass = courseColors[course.id] || 'bg-gray-100 border-gray-300';
                  return (
                    <DraggableCourse key={course.id} course={course} colorClass={colorClass} />
                  );
                })}
              </div>
            </div>
          </div>

          <DragOverlay>
            {activeId && (
              <div className="bg-purple-100 border-2 border-purple-500 p-3 rounded-lg shadow-lg">
                {courses.find(c => c.id === parseInt(activeId.replace('course-', '')))?.course_code}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

function DraggableCourse({ course, colorClass }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `course-${course.id}`
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`p-4 rounded-lg border-2 cursor-move transition-all ${
        isDragging ? 'opacity-50' : 'hover:shadow-lg hover:scale-105'
      } ${colorClass}`}
    >
      <div className="font-bold text-lg">{course.course_code}</div>
      <div className="text-sm mt-1">{course.course_name}</div>
    </div>
  );
}

function DroppableTimetable({ timetable, days, timeSlots, courseColors, onSlotClick }) {
  const getSlotData = (day, slotNum) => {
    return timetable.find(s => s.day === day && s.slot_number === slotNum);
  };

  const getCourseColor = (slotData) => {
    if (!slotData?.course_id) return 'bg-white';
    if (!courseColors || Object.keys(courseColors).length === 0) {
      return 'bg-purple-100 border-purple-300 text-purple-800';
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

export default CRTimetableBuilder;
