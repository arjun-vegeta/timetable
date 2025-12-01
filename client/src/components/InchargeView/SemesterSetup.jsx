import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Trash2, BookOpen, Users, LogOut, AlertTriangle, Plus, Settings } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

function SemesterSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [semesterData, setSemesterData] = useState({
    name: '',
    type: '',
    start_date: '',
    end_date: ''
  });
  const [semesterId, setSemesterId] = useState(null);
  const [classes, setClasses] = useState([]);
  const [newClass, setNewClass] = useState({
    program: '',
    year: '',
    sections: [''], // Array of section names
    classroom: ''
  });
  const [showNewSemesterDialog, setShowNewSemesterDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

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
      // Check if there's an active semester to edit
      checkActiveSemester();
    };
    verifyAuth();
  }, []);

  const checkActiveSemester = async () => {
    try {
      const response = await axios.get(`${API_URL}/semester/active`);
      if (response.data) {
        // Load existing semester
        setSemesterData({
          name: response.data.name,
          type: response.data.type,
          start_date: response.data.start_date,
          end_date: response.data.end_date
        });
        setSemesterId(response.data.id);
        setStep(2);
        // Load existing classes
        loadExistingData(response.data.id);
      }
    } catch (error) {
      console.error('Error checking semester:', error);
    }
  };

  const loadExistingData = async (semId) => {
    try {
      const classesRes = await axios.get(`${API_URL}/semester/${semId}/classes`);
      setClasses(classesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSemesterSubmit = async (e) => {
    e.preventDefault();
    try {
      if (semesterId) {
        // Update existing semester
        setIsUpdating(true);
        await axios.put(`${API_URL}/semester/${semesterId}`, {
          ...semesterData,
          is_active: true
        });
        setIsUpdating(false);
        alert('Semester updated successfully!');
      } else {
        // Create new semester
        const response = await axios.post(`${API_URL}/semester`, semesterData);
        setSemesterId(response.data.id);
      }
      setStep(2);
    } catch (error) {
      setIsUpdating(false);
      alert('Error saving semester: ' + error.response?.data?.message);
    }
  };

  const handleCreateNewSemester = async () => {
    if (confirmText !== 'DELETE') {
      alert('Please type DELETE to confirm');
      return;
    }
    
    try {
      // Delete all data for current semester
      if (semesterId) {
        await axios.delete(`${API_URL}/semester/${semesterId}`);
      }
      
      // Reset state
      setSemesterId(null);
      setSemesterData({
        name: '',
        type: '',
        start_date: '',
        end_date: ''
      });
      setClasses([]);
      setStep(1);
      setShowNewSemesterDialog(false);
      setConfirmText('');
    } catch (error) {
      alert('Error creating new semester: ' + error.response?.data?.message);
    }
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    
    // Filter out empty sections
    const validSections = newClass.sections.filter(s => s.trim() !== '');
    
    if (validSections.length === 0) {
      alert('Please enter at least one section name!');
      return;
    }
    
    // Get classroom from first section of same program/year, or use new classroom
    const existingClass = classes.find(c => c.program === newClass.program && c.year.toString() === newClass.year.toString());
    const classroom = existingClass ? existingClass.classroom : newClass.classroom;
    
    if (!classroom) {
      alert('Please enter a classroom for this class!');
      return;
    }
    
    try {
      const newClasses = [];
      
      // Add each section
      for (const sectionName of validSections) {
        // Check if section already exists
        const exists = classes.find(
          c => c.program === newClass.program && c.year.toString() === newClass.year.toString() && c.section === sectionName
        );
        
        if (exists) {
          alert(`Section ${sectionName} already exists! Skipping...`);
          continue;
        }
        
        const classData = { 
          program: newClass.program, 
          year: newClass.year, 
          section: sectionName, 
          classroom 
        };
        
        const response = await axios.post(`${API_URL}/semester/${semesterId}/classes`, classData);
        newClasses.push({ ...classData, id: response.data.id });
      }
      
      setClasses([...classes, ...newClasses]);
      setNewClass({ program: '', year: '', sections: [''], classroom: '' });
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      alert('Error adding class: ' + errorMsg);
    }
  };

  const addSectionInput = () => {
    setNewClass({...newClass, sections: [...newClass.sections, '']});
  };

  const removeSectionInput = (index) => {
    const newSections = newClass.sections.filter((_, i) => i !== index);
    setNewClass({...newClass, sections: newSections.length > 0 ? newSections : ['']});
  };

  const updateSectionName = (index, value) => {
    const newSections = [...newClass.sections];
    newSections[index] = value.trim();
    setNewClass({...newClass, sections: newSections});
  };

  const handleComplete = () => {
    navigate('/incharge/courses');
  };

  const handleBackToCourses = () => {
    navigate('/incharge/courses');
  };

  const handleDeleteClass = async (classId) => {
    if (confirm('Delete this section?')) {
      try {
        await axios.delete(`${API_URL}/semester/classes/${classId}`);
        setClasses(classes.filter(c => c.id !== classId));
      } catch (error) {
        alert('Error deleting class: ' + error.response?.data?.message);
      }
    }
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Semester Setup</h1>
                <p className="text-sm text-slate-600 mt-1">
                  {semesterId ? 'Edit current semester settings' : 'Configure new academic semester'}
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate('/incharge/courses')}>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Courses
                </Button>
                <Button variant="outline" onClick={() => navigate('/incharge/timetable')}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Timetable
                </Button>
                <Button variant="outline" onClick={() => navigate('/incharge/manage-cr')}>
                  <Users className="w-4 h-4 mr-2" />
                  CRs
                </Button>
                <Button
                  variant="ghost"
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

        <div className="max-w-2xl mx-auto p-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Semester Information
                  </CardTitle>
                  <CardDescription>
                    {semesterId ? 'Update semester details or create a new one' : 'Enter the semester type and duration'}
                  </CardDescription>
                </div>
                {semesterId && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    Active Semester
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSemesterSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Semester Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Fall 2024, Spring 2025"
                    value={semesterData.name}
                    onChange={(e) => setSemesterData({...semesterData, name: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Semester Type</Label>
                  <Select
                    value={semesterData.type}
                    onValueChange={(value) => setSemesterData({...semesterData, type: value})}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select semester type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="odd">Odd Semester</SelectItem>
                      <SelectItem value="even">Even Semester</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={semesterData.start_date}
                      onChange={(e) => setSemesterData({...semesterData, start_date: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={semesterData.end_date}
                      onChange={(e) => setSemesterData({...semesterData, end_date: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isUpdating}>
                  {isUpdating ? 'Saving...' : (semesterId ? 'Save Changes & Continue' : 'Continue to Class Setup')}
                </Button>
              </form>

              {semesterId && (
                <div className="mt-6 pt-6 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setShowNewSemesterDialog(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Semester
                  </Button>
                  <p className="text-xs text-slate-500 text-center mt-2">
                    This will delete all data from the current semester
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* New Semester Confirmation Dialog */}
        <Dialog open={showNewSemesterDialog} onOpenChange={setShowNewSemesterDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Create New Semester?
              </DialogTitle>
              <DialogDescription className="pt-2">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="font-semibold text-red-800 mb-2">⚠️ Warning: This action cannot be undone!</p>
                  <p className="text-red-700 text-sm">
                    Creating a new semester will permanently delete ALL data from the current semester including:
                  </p>
                  <ul className="list-disc list-inside text-red-700 text-sm mt-2 space-y-1">
                    <li>All courses</li>
                    <li>All timetable slots</li>
                    <li>All class/section configurations</li>
                    <li>All CR timetable modifications</li>
                  </ul>
                </div>
                <p className="text-sm text-slate-600 mb-2">
                  Type <strong>DELETE</strong> to confirm:
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="Type DELETE"
                  className="font-mono"
                />
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowNewSemesterDialog(false);
                setConfirmText('');
              }}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleCreateNewSemester}
                disabled={confirmText !== 'DELETE'}
              >
                Delete & Create New
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Group classes by program and year
  const groupedClasses = classes.reduce((acc, cls) => {
    const key = `${cls.program}-${cls.year}`;
    if (!acc[key]) {
      acc[key] = {
        program: cls.program,
        year: cls.year,
        classroom: cls.classroom,
        sections: []
      };
    }
    acc[key].sections.push(cls);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Class & Section Setup</h1>
              <p className="text-sm text-slate-600 mt-1">
                {semesterData.name} ({semesterData.type === 'odd' ? 'Odd' : 'Even'} Semester)
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>
                <Settings className="w-4 h-4 mr-2" />
                Edit Semester
              </Button>
              <Button variant="outline" onClick={() => navigate('/incharge/courses')}>
                <BookOpen className="w-4 h-4 mr-2" />
                Courses
              </Button>
              <Button variant="outline" onClick={() => navigate('/incharge/timetable')}>
                <Calendar className="w-4 h-4 mr-2" />
                Timetable
              </Button>
              <Button
                variant="ghost"
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

      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-6">
          <p className="text-sm text-slate-500">
            💡 Each class (e.g., B.Tech Year 3) has ONE classroom shared by all sections
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Add Section Form */}
          <Card>
            <CardHeader>
              <CardTitle>Add Section</CardTitle>
              <CardDescription>Add a new section with its classroom</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddClass} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="program">Program</Label>
                  <Select
                    value={newClass.program}
                    onValueChange={(value) => setNewClass({...newClass, program: value, year: '', sections: [''], classroom: ''})}
                    required
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
                  <Label htmlFor="year">Year</Label>
                  <Select
                    value={newClass.year}
                    onValueChange={(value) => setNewClass({...newClass, year: value, sections: [''], classroom: ''})}
                    required
                    disabled={!newClass.program}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Section Names</Label>
                  <div className="space-y-2">
                    {newClass.sections.map((section, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder={`e.g., S${index + 1}`}
                          value={section}
                          onChange={(e) => updateSectionName(index, e.target.value)}
                          disabled={!newClass.year}
                          className="flex-1"
                        />
                        {index === newClass.sections.length - 1 ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addSectionInput}
                            disabled={!newClass.year || !section.trim()}
                            className="px-3"
                          >
                            <span className="text-lg">+</span>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSectionInput(index)}
                            className="px-3"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    💡 Click + to add another section (e.g., S1, S2)
                  </p>
                </div>

                {/* Show existing classroom or allow new one */}
                {newClass.program && newClass.year && (
                  <div className="space-y-2">
                    {classes.find(c => c.program === newClass.program && c.year.toString() === newClass.year.toString()) ? (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-900">
                          📍 Classroom: {classes.find(c => c.program === newClass.program && c.year.toString() === newClass.year.toString())?.classroom}
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          (Shared with other sections of this class)
                        </p>
                      </div>
                    ) : (
                      <>
                        <Label htmlFor="classroom">Classroom</Label>
                        <Input
                          id="classroom"
                          placeholder="e.g., Room 301, LHC-CR2"
                          value={newClass.classroom}
                          onChange={(e) => setNewClass({...newClass, classroom: e.target.value})}
                          required
                        />
                        <p className="text-xs text-slate-500">
                          This classroom will be shared by all sections of {newClass.program} Year {newClass.year}
                        </p>
                      </>
                    )}
                  </div>
                )}

                <Button type="submit" className="w-full">Add Section</Button>
              </form>
            </CardContent>
          </Card>

          {/* Classes List */}
          <Card>
            <CardHeader>
              <CardTitle>All Sections</CardTitle>
              <CardDescription>{classes.length} sections configured</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[500px] overflow-auto">
                {Object.values(groupedClasses).map((group, idx) => (
                  <div key={idx} className="border rounded-lg p-4 bg-slate-50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-bold text-slate-900">
                          {group.program} - Year {group.year}
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          📍 {group.classroom}
                        </div>
                      </div>
                      <Badge variant="secondary">{group.sections.length} sections</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.sections.map((cls) => (
                        <div key={cls.id} className="flex items-center gap-1 bg-white px-3 py-1 rounded-md border">
                          <span className="text-sm font-medium">{cls.section}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => handleDeleteClass(cls.id)}
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {classes.length === 0 && (
                  <p className="text-center text-slate-500 py-8">No sections added yet</p>
                )}
              </div>

              {classes.length > 0 && (
                <Button onClick={handleComplete} className="w-full mt-6">
                  Complete Setup & Continue
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default SemesterSetup;
