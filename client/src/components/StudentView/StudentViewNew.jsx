import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, BookOpen, GraduationCap, Calendar, Download, FileSpreadsheet } from 'lucide-react';
import ExportButtons from '../Common/ExportButtons';

const API_URL = 'http://localhost:3001/api';

function StudentViewNew() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [activeSemester, setActiveSemester] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [timetable, setTimetable] = useState([]);
  const [crTimetable, setCrTimetable] = useState([]);
  const [courses, setCourses] = useState([]);
  const [electives, setElectives] = useState([]);
  const [selectedElectives, setSelectedElectives] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [viewMode, setViewMode] = useState('original');
  const [showElectiveModal, setShowElectiveModal] = useState(false);
  const [courseColors, setCourseColors] = useState({});
  const [timeSlots, setTimeSlots] = useState([]);

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
    fetchActiveSemester();
    fetchTimeSlots();
  }, []);

  useEffect(() => {
    if (activeSemester) {
      fetchClasses();
    }
  }, [activeSemester]);

  useEffect(() => {
    if (step === 2 && selectedClass) {
      fetchTimetable();
      fetchCourses();
    }
  }, [step, selectedClass]);

  const fetchActiveSemester = async () => {
    try {
      const response = await axios.get(`${API_URL}/semester/active`);
      setActiveSemester(response.data);
    } catch (error) {
      console.error('Error fetching semester:', error);
    }
  };

  const fetchTimeSlots = async () => {
    try {
      const response = await axios.get(`${API_URL}/timetable/config`);
      setTimeSlots(response.data);
    } catch (error) {
      console.error('Error fetching time slots:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await axios.get(`${API_URL}/semester/${activeSemester.id}/classes`);
      setClasses(response.data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchTimetable = async () => {
    if (!selectedClass || !activeSemester) return;
    
    try {
      const [originalRes, crRes] = await Promise.all([
        axios.get(`${API_URL}/student/timetable/original`, {
          params: { 
            semester_id: activeSemester.id,
            program: selectedClass.program,
            year: selectedClass.year,
            section: selectedClass.section
          }
        }),
        axios.get(`${API_URL}/student/timetable/cr`, {
          params: { 
            semester_id: activeSemester.id,
            program: selectedClass.program,
            year: selectedClass.year,
            section: selectedClass.section
          }
        })
      ]);
      setTimetable(originalRes.data);
      setCrTimetable(crRes.data);
      
      // Default to CR timetable if available, otherwise original
      if (crRes.data.length > 0) {
        setViewMode('cr');
      } else {
        setViewMode('original');
      }
    } catch (error) {
      console.error('Error fetching timetable:', error);
    }
  };

  const fetchCourses = async () => {
    if (!selectedClass || !activeSemester) return;
    
    try {
      const response = await axios.get(`${API_URL}/courses`, {
        params: { 
          semester_id: activeSemester.id,
          program: selectedClass.program,
          year: selectedClass.year,
          section: selectedClass.section
        }
      });
      
      const allCourses = response.data;
      const electiveCourses = allCourses.filter(c => c.is_elective);
      const regularCourses = allCourses.filter(c => !c.is_elective);
      
      setCourses(regularCourses);
      setElectives(electiveCourses);
      
      const colors = {};
      allCourses.forEach((course, index) => {
        colors[course.id] = colorPalette[index % colorPalette.length];
      });
      setCourseColors(colors);
      
      if (electiveCourses.length > 0) {
        setShowElectiveModal(true);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleNext = () => {
    if (selectedClass) {
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

  const getCourseColor = (courseId) => {
    return courseColors[courseId] || 'bg-slate-50 border-slate-200 text-slate-700';
  };

  const getSlotData = (day, slotNum) => {
    // Use CR timetable if viewing CR mode and CR has data, otherwise use original
    const data = viewMode === 'cr' && crTimetable.length > 0 ? crTimetable : timetable;
    return data.find(s => s.day === day && s.slot_number === slotNum);
  };

  // Get the active timetable for export
  const getActiveTimetable = () => {
    return viewMode === 'cr' && crTimetable.length > 0 ? crTimetable : timetable;
  };

  const allDisplayCourses = [...courses, ...electives.filter(e => selectedElectives.includes(e.id))];

  // Group classes by program and year
  const groupedClasses = classes.reduce((acc, cls) => {
    const key = `${cls.program} Year ${cls.year}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(cls);
    return acc;
  }, {});

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <Card className="shadow-xl">
            <CardHeader className="space-y-1">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <GraduationCap className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-3xl">View Timetable</CardTitle>
              <CardDescription>
                {activeSemester ? (
                  <>Select your class for {activeSemester.name}</>
                ) : (
                  'Loading semester...'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(groupedClasses).map(([group, groupClasses]) => (
                <div key={group}>
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">{group}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {groupClasses.map(cls => (
                      <Button
                        key={cls.id}
                        variant={selectedClass?.id === cls.id ? 'default' : 'outline'}
                        className="justify-start"
                        onClick={() => setSelectedClass(cls)}
                      >
                        Section {cls.section}
                        {cls.classroom && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {cls.classroom}
                          </Badge>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}

              <Button
                onClick={handleNext}
                disabled={!selectedClass}
                className="w-full"
              >
                View Timetable
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-lg font-bold text-slate-800">
              {selectedClass?.program} Year {selectedClass?.year} - Section {selectedClass?.section}
            </h1>
            <p className="text-xs text-slate-500">
              {activeSemester?.name} • {viewMode === 'cr' ? 'CR Timetable' : 'Original Timetable'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {timetable.length > 0 && (
            <div className="flex bg-slate-100 rounded-lg p-1 mr-4">
              <Button
                variant={viewMode === 'cr' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cr')}
              >
                CR Timetable
              </Button>
              <Button
                variant={viewMode === 'original' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('original')}
              >
                Original
              </Button>
            </div>
          )}
          {electives.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowElectiveModal(true)}>
              Electives ({selectedElectives.length})
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Timetable */}
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
                      const slotData = getSlotData(day, slot.slot);
                      const isLunch = slot.slot === 5;
                      const colorClass = slotData ? getCourseColor(slotData.course_id) : '';
                      const isHighlighted = selectedCourse && slotData?.course_id === selectedCourse;
                      
                      return (
                        <td 
                          key={`${day}-${slot.slot}`}
                          className={`border-b p-1 text-center transition-all ${
                            isLunch ? 'bg-amber-50' : 
                            slotData ? colorClass : 'bg-white'
                          } ${isHighlighted ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                        >
                          {isLunch && !slotData ? (
                            <div className="text-xs text-amber-600 font-medium">Lunch</div>
                          ) : slotData ? (
                            <div className="p-1">
                              <div className="font-semibold text-xs">{slotData.course_code}</div>
                              {slotData.room_lab && (
                                <div className="text-xs opacity-70 mt-0.5">{slotData.room_lab}</div>
                              )}
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Export Buttons */}
          <div className="mt-4 flex gap-2">
            <ExportButtons 
              timetable={getActiveTimetable()}
              timeSlots={timeSlots}
              semester={`${selectedClass?.program}_Y${selectedClass?.year}`}
              section={selectedClass?.section}
              viewMode={viewMode}
            />
          </div>
        </div>

        {/* Course Sidebar */}
        <div className="w-72 bg-white border-l p-4 overflow-auto flex-shrink-0">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Your Courses
          </h3>
          <div className="space-y-2">
            {allDisplayCourses.map(course => {
              const colorClass = getCourseColor(course.id);
              return (
                <div
                  key={course.id}
                  onClick={() => highlightCourse(course.id)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${colorClass} ${
                    selectedCourse === course.id ? 'ring-2 ring-offset-1 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-sm">{course.course_code}</span>
                    {course.is_elective && (
                      <Badge variant="secondary" className="text-xs">Elective</Badge>
                    )}
                  </div>
                  <div className="text-xs mt-1 opacity-80">{course.course_name}</div>
                  <div className="text-xs mt-1 opacity-60">{course.instructor}</div>
                  <div className="text-xs mt-1 opacity-60">
                    L-T-P: {course.lecture_hours}-{course.tutorial_hours}-{course.practical_hours}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Elective Selection Modal */}
      <Dialog open={showElectiveModal} onOpenChange={setShowElectiveModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Select Your Electives</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {electives.map(course => (
              <div
                key={course.id}
                onClick={() => toggleElective(course.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedElectives.includes(course.id)
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-slate-200 hover:border-violet-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedElectives.includes(course.id)}
                    onChange={() => {}}
                    className="mt-1 w-4 h-4 text-violet-600 rounded"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800">
                      {course.course_code} - {course.course_name}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">{course.instructor}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      L-T-P: {course.lecture_hours}-{course.tutorial_hours}-{course.practical_hours}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowElectiveModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowElectiveModal(false)}>
              Confirm ({selectedElectives.length} selected)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StudentViewNew;
