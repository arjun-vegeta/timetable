import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Users, Calendar, LogOut, Trash2, Edit, Settings } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function CourseManagementNew() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [activeSemester, setActiveSemester] = useState(null);
  const [classes, setClasses] = useState([]);
  const [formData, setFormData] = useState({
    course_code: '',
    course_name: '',
    instructor: '',
    lecture_hours: 0,
    tutorial_hours: 0,
    practical_hours: 0,
    is_elective: false,
    is_combined: false,
    is_minor: false,
    program: '',
    year: '',
    sections: [],
    room_lab: '',
    classroom: '',
    course_type: 'regular'
  });
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  useEffect(() => {
    if (activeSemester) {
      fetchClasses();
      fetchCourses();
    }
  }, [activeSemester]);

  const fetchActiveSemester = async () => {
    try {
      const response = await axios.get(`${API_URL}/semester/active`);
      if (!response.data) {
        navigate('/incharge/setup');
      } else {
        setActiveSemester(response.data);
      }
    } catch (error) {
      console.error('Error fetching semester:', error);
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

  const fetchCourses = async () => {
    const response = await axios.get(`${API_URL}/courses`);
    setCourses(response.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const courseData = {
        ...formData,
        semester_id: activeSemester.id
      };
      
      if (editingId) {
        await axios.put(`${API_URL}/courses/${editingId}`, courseData);
      } else {
        await axios.post(`${API_URL}/courses`, courseData);
      }
      fetchCourses();
      resetForm();
    } catch (error) {
      alert(error.response?.data?.message || 'Error saving course');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this course?')) {
      await axios.delete(`${API_URL}/courses/${id}`);
      fetchCourses();
    }
  };

  const handleEdit = (course) => {
    // sections is stored as comma-separated string "S1,S2", convert to array
    const sectionsArray = course.sections ? course.sections.split(',').map(s => s.trim()) : [];
    setFormData({
      ...course,
      sections: sectionsArray
    });
    setEditingId(course.id);
  };

  const resetForm = () => {
    setFormData({
      course_code: '',
      course_name: '',
      instructor: '',
      lecture_hours: 0,
      tutorial_hours: 0,
      practical_hours: 0,
      is_elective: false,
      is_combined: false,
      is_minor: false,
      program: '',
      year: '',
      sections: [],
      room_lab: '',
      classroom: '',
      course_type: 'regular'
    });
    setEditingId(null);
  };



  const totalHours = formData.lecture_hours + formData.tutorial_hours + formData.practical_hours;
  const filteredCourses = courses.filter(c =>
    c.course_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.course_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!activeSemester) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Course Management</h1>
              <p className="text-sm text-slate-600 mt-1">
                {activeSemester.name} • {activeSemester.type === 'odd' ? 'Odd' : 'Even'} Semester
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={() => navigate('/incharge/setup')}>
                <Settings className="w-4 h-4 mr-2" />
                Semester
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/incharge/manage-cr')}>
                <Users className="w-4 h-4 mr-2" />
                CRs
              </Button>
              <Button size="sm" onClick={() => navigate('/incharge/master-timetable')}>
                <Calendar className="w-4 h-4 mr-2" />
                Timetable Builder
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  localStorage.removeItem('incharge_token');
                  navigate('/');
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Add/Edit Course Form */}
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? 'Edit Course' : 'Add New Course'}</CardTitle>
              <CardDescription>Configure course details and assign to sections</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="course_code">Course Code</Label>
                    <Input
                      id="course_code"
                      placeholder="CS301"
                      value={formData.course_code}
                      onChange={(e) => setFormData({...formData, course_code: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instructor">Instructor</Label>
                    <Input
                      id="instructor"
                      placeholder="Dr. Smith"
                      value={formData.instructor}
                      onChange={(e) => setFormData({...formData, instructor: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="course_name">Course Name</Label>
                  <Input
                    id="course_name"
                    placeholder="Data Structures"
                    value={formData.course_name}
                    onChange={(e) => setFormData({...formData, course_name: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Course Type</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={formData.course_type === 'regular' ? "default" : "outline"}
                      onClick={() => setFormData({...formData, course_type: 'regular', practical_hours: 0, lecture_hours: 3, tutorial_hours: 0, room_lab: ''})}
                    >
                      📚 Regular
                    </Button>
                    <Button
                      type="button"
                      variant={formData.course_type === 'lab' ? "default" : "outline"}
                      onClick={() => setFormData({...formData, course_type: 'lab', practical_hours: 3, lecture_hours: 0, tutorial_hours: 0})}
                    >
                      🔬 Lab
                    </Button>
                    <Button
                      type="button"
                      variant={formData.is_elective ? "default" : "outline"}
                      onClick={() => setFormData({...formData, is_elective: !formData.is_elective})}
                      className={formData.is_elective ? "bg-purple-600 hover:bg-purple-700" : ""}
                    >
                      ⭐ Elective
                    </Button>
                    <Button
                      type="button"
                      variant={formData.course_type === 'major_project' ? "default" : "outline"}
                      onClick={() => setFormData({...formData, course_type: 'major_project', practical_hours: 4, lecture_hours: 0, tutorial_hours: 0})}
                    >
                      📋 Major Project
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Hours (L-T-P)</Label>
                  <div className="grid grid-cols-4 gap-2">
                    <Input
                      type="number"
                      min="0"
                      placeholder="L"
                      value={formData.lecture_hours}
                      onChange={(e) => setFormData({...formData, lecture_hours: parseInt(e.target.value) || 0})}
                    />
                    <Input
                      type="number"
                      min="0"
                      placeholder="T"
                      value={formData.tutorial_hours}
                      onChange={(e) => setFormData({...formData, tutorial_hours: parseInt(e.target.value) || 0})}
                    />
                    <Input
                      type="number"
                      min="0"
                      placeholder="P"
                      value={formData.practical_hours}
                      onChange={(e) => setFormData({...formData, practical_hours: parseInt(e.target.value) || 0})}
                    />
                    <div className="flex items-center justify-center bg-blue-50 rounded-md px-3">
                      <span className="text-sm font-semibold text-blue-900">{totalHours}h</span>
                    </div>
                  </div>
                </div>

                {/* Location - Lab Room or Classroom */}
                {formData.sections.length > 0 && (
                  <div className="space-y-2">
                    {formData.course_type === 'lab' || formData.course_type === 'minor_project' || formData.course_type === 'major_project' ? (
                      <>
                        <Label htmlFor="room_lab">
                          {formData.course_type === 'lab' ? 'Lab Room' : 'Project Room/Lab'}
                        </Label>
                        <Input
                          id="room_lab"
                          placeholder={formData.course_type === 'lab' ? "e.g., Lab 301" : "e.g., Project Lab 401"}
                          value={formData.room_lab}
                          onChange={(e) => setFormData({...formData, room_lab: e.target.value})}
                          required
                        />
                        <p className="text-xs text-slate-500">
                          {formData.course_type === 'lab' 
                            ? 'Enter the lab room number (separate from regular classroom)'
                            : 'Enter the project lab/room number'}
                        </p>
                      </>
                    ) : (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-900">
                          📍 Classroom: <span className="font-semibold">{formData.classroom}</span>
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          Auto-filled from {formData.program} Year {formData.year}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Cascading Dropdowns for Program → Year → Sections */}
                <div className="space-y-2">
                  <Label htmlFor="program_select">Program</Label>
                  <Select
                    value={formData.program}
                    onValueChange={(value) => setFormData({...formData, program: value, year: '', sections: []})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="B.Tech">B.Tech</SelectItem>
                      <SelectItem value="M.Tech">M.Tech</SelectItem>
                      <SelectItem value="PhD">PhD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year_select">Year</Label>
                  <Select
                    value={formData.year}
                    onValueChange={(value) => setFormData({...formData, year: value, sections: [], classroom: ''})}
                    disabled={!formData.program}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(new Set(classes
                        .filter(c => c.program === formData.program)
                        .map(c => c.year)))
                        .sort()
                        .map(year => (
                          <SelectItem key={year} value={year.toString()}>
                            Year {year}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {formData.program && classes.filter(c => c.program === formData.program).length === 0 && (
                    <p className="text-xs text-amber-600">No classes configured for {formData.program}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section_select">Section</Label>
                  <Select
                    value={
                      formData.sections.length > 1 
                        ? 'both' 
                        : formData.sections.length === 1 
                          ? formData.sections[0] 
                          : ''
                    }
                    onValueChange={(value) => {
                      if (value === 'both') {
                        const availableSections = classes
                          .filter(c => c.program === formData.program && c.year.toString() === formData.year.toString())
                          .map(c => c.section);
                        // Auto-fill classroom
                        const firstClass = classes.find(c => 
                          c.program === formData.program && 
                          c.year.toString() === formData.year.toString()
                        );
                        if (firstClass && formData.practical_hours === 0) {
                          setFormData({...formData, sections: availableSections, classroom: firstClass.classroom});
                        } else {
                          setFormData({...formData, sections: availableSections});
                        }
                      } else {
                        // Auto-fill classroom
                        const selectedClass = classes.find(c => 
                          c.program === formData.program && 
                          c.year.toString() === formData.year.toString() && 
                          c.section === value
                        );
                        if (selectedClass && formData.practical_hours === 0) {
                          setFormData({...formData, sections: [value], classroom: selectedClass.classroom});
                        } else {
                          setFormData({...formData, sections: [value]});
                        }
                      }
                    }}
                    disabled={!formData.year}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes
                        .filter(c => c.program === formData.program && c.year.toString() === formData.year.toString())
                        .map(cls => (
                          <SelectItem key={cls.id} value={cls.section}>
                            Section {cls.section}
                          </SelectItem>
                        ))}
                      {classes.filter(c => c.program === formData.program && c.year.toString() === formData.year.toString()).length >= 2 && (
                        <SelectItem value="both">Both Sections</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {formData.program && formData.year && 
                   classes.filter(c => c.program === formData.program && c.year.toString() === formData.year.toString()).length === 0 && (
                    <p className="text-xs text-amber-600">No sections configured for {formData.program} Year {formData.year}</p>
                  )}
                </div>

                {/* Combined Class Checkbox - only show when both sections are selected */}
                {formData.sections.length > 1 && !formData.is_elective && formData.course_type === 'regular' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_combined}
                        onChange={(e) => setFormData({...formData, is_combined: e.target.checked, is_minor: e.target.checked ? formData.is_minor : false})}
                        className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-medium text-blue-900">Combined Class</span>
                        <p className="text-xs text-blue-700 mt-0.5">
                          Both sections will attend together at the same timeslot
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                {/* Minor Course Checkbox - only show when combined is checked */}
                {formData.is_combined && !formData.is_elective && formData.course_type === 'regular' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_minor}
                        onChange={(e) => setFormData({...formData, is_minor: e.target.checked})}
                        className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <span className="font-medium text-amber-900">Minor Course</span>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Slots are pre-given by the institute (same for all batches)
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button type="submit" className="flex-1">
                    {editingId ? 'Update' : 'Add'} Course
                  </Button>
                  {editingId && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Courses List */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>All Courses</CardTitle>
                  <CardDescription>{filteredCourses.length} courses</CardDescription>
                </div>
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-auto">
                {filteredCourses.map(course => (
                  <div key={course.id} className="border rounded-lg p-3 hover:shadow-md transition-shadow bg-white">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-slate-900">{course.course_code}</h3>
                          {course.is_elective === 1 && (
                            <Badge className="bg-purple-100 text-purple-800 text-xs">Elective</Badge>
                          )}
                          {course.is_minor === 1 && (
                            <Badge className="bg-amber-100 text-amber-800 text-xs">Minor</Badge>
                          )}
                          {course.is_combined === 1 && !course.is_elective && !course.is_minor && (
                            <Badge className="bg-cyan-100 text-cyan-800 text-xs">Combined</Badge>
                          )}
                          {course.course_type === 'lab' && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">Lab</Badge>
                          )}
                          {course.course_type === 'major_project' && (
                            <Badge className="bg-orange-100 text-orange-800 text-xs">Major Project</Badge>
                          )}
                          {!course.course_type && course.practical_hours > 0 && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">Lab</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 mb-1 truncate">{course.course_name}</p>
                        <p className="text-xs text-slate-600 mb-1">{course.instructor}</p>
                        <div className="flex gap-3 text-xs text-slate-500">
                          <span>{course.lecture_hours}-{course.tutorial_hours}-{course.practical_hours}</span>
                          <span>•</span>
                          <span>{course.program} Y{course.year}</span>
                          <span>•</span>
                          <span>
                            {(() => {
                              // sections is stored as comma-separated string like "S1,S2"
                              const sections = course.sections ? course.sections.split(',').map(s => s.trim()) : [];
                              return sections.length > 1 ? 'Both Sections' : `Section ${sections[0] || ''}`;
                            })()}
                          </span>
                          {course.room_lab && (
                            <>
                              <span>•</span>
                              <span>{course.room_lab}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(course)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDelete(course.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default CourseManagementNew;
