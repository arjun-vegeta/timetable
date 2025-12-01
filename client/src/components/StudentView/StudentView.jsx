import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TimetableGrid from '../Common/TimetableGrid';
import ExportButtons from '../Common/ExportButtons';

const API_URL = 'http://localhost:3001/api';

function StudentView() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [semester, setSemester] = useState('');
  const [section, setSection] = useState('');
  const [timetable, setTimetable] = useState([]);
  const [crTimetable, setCrTimetable] = useState([]);
  const [courses, setCourses] = useState([]);
  const [electives, setElectives] = useState([]);
  const [selectedElectives, setSelectedElectives] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [viewMode, setViewMode] = useState('original'); // 'original' or 'cr'
  const [showElectiveModal, setShowElectiveModal] = useState(false);
  const [courseColors, setCourseColors] = useState({});

  const semesters = ['III', 'V', 'VII', 'I M.Tech', 'III M.Tech'];
  const sections = ['S1', 'S2', 'CSE', 'CSE-IS'];

  // Color palette for courses
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
    if (step === 2) {
      fetchTimetable();
      fetchCourses();
    }
  }, [step, semester, section]);

  const fetchTimetable = async () => {
    try {
      const [originalRes, crRes] = await Promise.all([
        axios.get(`${API_URL}/student/timetable/original`, {
          params: { semester, section }
        }),
        axios.get(`${API_URL}/student/timetable/cr`, {
          params: { semester, section }
        })
      ]);
      setTimetable(originalRes.data);
      setCrTimetable(crRes.data);
    } catch (error) {
      console.error('Error fetching timetable:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await axios.get(`${API_URL}/courses`, {
        params: { semester, section }
      });
      
      const allCourses = response.data;
      const electiveCourses = allCourses.filter(c => c.is_elective);
      const regularCourses = allCourses.filter(c => !c.is_elective);
      
      setCourses(regularCourses);
      setElectives(electiveCourses);
      
      // Assign colors to courses
      const colors = {};
      allCourses.forEach((course, index) => {
        colors[course.id] = colorPalette[index % colorPalette.length];
      });
      setCourseColors(colors);
      
      // Show elective modal if there are electives
      if (electiveCourses.length > 0) {
        setShowElectiveModal(true);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleNext = () => {
    if (semester && section) {
      setStep(2);
    }
  };

  const highlightCourse = (courseId) => {
    setSelectedCourse(courseId === selectedCourse ? null : courseId);
  };

  const toggleElective = (courseId) => {
    setSelectedElectives(prev => {
      if (prev.includes(courseId)) {
        return prev.filter(id => id !== courseId);
      } else {
        return [...prev, courseId];
      }
    });
  };

  const confirmElectives = () => {
    setShowElectiveModal(false);
  };

  const getCourseColor = (courseId) => {
    return courseColors[courseId] || 'bg-gray-100 border-gray-300 text-gray-800';
  };

  const allDisplayCourses = [...courses, ...electives.filter(e => selectedElectives.includes(e.id))];

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="mb-6 text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            ← Back to Home
          </button>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">
              Select Your Details
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Semester
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Semester</option>
                  {semesters.map(sem => (
                    <option key={sem} value={sem}>{sem}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Section
                </label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Section</option>
                  {sections.map(sec => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleNext}
                disabled={!semester || !section}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Timetable - {semester} Semester, Section {section}
              </h1>
            </div>
            <button
              onClick={() => setStep(1)}
              className="text-gray-600 hover:text-gray-800"
            >
              Change Selection
            </button>
          </div>
          
          {crTimetable.length > 0 && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">View:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('original')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'original'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Original (Incharge)
                </button>
                <button
                  onClick={() => setViewMode('cr')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'cr'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Modified (CR)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        <div className="flex-1 p-6 overflow-auto">
          <TimetableGrid 
            timetable={viewMode === 'original' ? timetable : crTimetable} 
            selectedCourse={selectedCourse}
            courseColors={courseColors}
            selectedElectives={selectedElectives}
            readOnly={true}
          />
          <ExportButtons 
            timetable={viewMode === 'original' ? timetable : crTimetable}
            semester={semester}
            section={section}
            viewMode={viewMode}
          />
        </div>

        <div className="w-80 bg-white border-l p-6 overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">
              Your Courses
            </h3>
            {electives.length > 0 && (
              <button
                onClick={() => setShowElectiveModal(true)}
                className="text-xs bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700"
              >
                Electives
              </button>
            )}
          </div>
          
          <div className="space-y-3">
            {allDisplayCourses.map(course => {
              const colorClass = getCourseColor(course.id);
              return (
                <div
                  key={course.id}
                  onClick={() => highlightCourse(course.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${colorClass} ${
                    selectedCourse === course.id ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="font-semibold">
                      {course.course_code}
                    </div>
                    {course.is_elective && (
                      <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded">
                        Elective
                      </span>
                    )}
                  </div>
                  <div className="text-sm mt-1">
                    {course.course_name}
                  </div>
                  <div className="text-xs mt-2">
                    {course.instructor}
                  </div>
                  <div className="text-xs mt-1">
                    L-T-P: {course.lecture_hours}-{course.tutorial_hours}-{course.practical_hours}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Elective Selection Modal */}
      {showElectiveModal && electives.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-800">Select Your Electives</h2>
              <p className="text-sm text-gray-600 mt-2">
                Choose the elective courses you want to take this semester
              </p>
            </div>
            
            <div className="p-6 space-y-3">
              {electives.map(course => (
                <div
                  key={course.id}
                  onClick={() => toggleElective(course.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedElectives.includes(course.id)
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedElectives.includes(course.id)}
                      onChange={() => {}}
                      className="mt-1 w-5 h-5 text-purple-600"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">
                        {course.course_code} - {course.course_name}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {course.instructor}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        L-T-P: {course.lecture_hours}-{course.tutorial_hours}-{course.practical_hours}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <button
                onClick={confirmElectives}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700"
              >
                Confirm Selection ({selectedElectives.length} selected)
              </button>
              <button
                onClick={() => setShowElectiveModal(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentView;
