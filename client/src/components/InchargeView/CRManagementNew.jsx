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
import { Users, BookOpen, Calendar, LogOut, Trash2, Settings } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

function CRManagementNew() {
  const navigate = useNavigate();
  const [crs, setCRs] = useState([]);
  const [classes, setClasses] = useState([]);
  const [activeSemester, setActiveSemester] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    program: '',
    year: '',
    section: ''
  });

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
      fetchCRs();
    };
    verifyAuth();
  }, []);

  useEffect(() => {
    if (activeSemester) {
      fetchClasses();
    }
  }, [activeSemester]);

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
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchCRs = async () => {
    const response = await axios.get(`${API_URL}/cr/list`);
    setCRs(response.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/cr/create`, formData);
      fetchCRs();
      resetForm();
      alert('CR created successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Error creating CR');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this CR account?')) {
      await axios.delete(`${API_URL}/cr/${id}`);
      fetchCRs();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      username: '',
      password: '',
      program: '',
      year: '',
      section: ''
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Manage Class Representatives</h1>
              <p className="text-sm text-slate-600 mt-1">
                Create and manage CR accounts
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate('/incharge/setup')}>
                <Settings className="w-4 h-4 mr-2" />
                Semester
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

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Create CR Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create New CR</CardTitle>
              <CardDescription>Add a new Class Representative account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="johndoe"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="class">Class</Label>
                    <Select
                      value={formData.program && formData.year && formData.section ? 
                        `${formData.program}-${formData.year}-${formData.section}` : ''}
                      onValueChange={(value) => {
                        const [program, year, section] = value.split('-');
                        setFormData({...formData, program, year: parseInt(year), section});
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(cls => (
                          <SelectItem key={cls.id} value={`${cls.program}-${cls.year}-${cls.section}`}>
                            {cls.program} Year {cls.year} - {cls.section}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700">
                  <Users className="w-4 h-4 mr-2" />
                  Create CR Account
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* CRs List */}
          <Card>
            <CardHeader>
              <CardTitle>All CRs</CardTitle>
              <CardDescription>{crs.length} Class Representatives</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-auto">
                {crs.map(cr => (
                  <div key={cr.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900">{cr.name}</h3>
                        <p className="text-sm text-slate-600 mt-1">@{cr.username}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">{cr.program} Year {cr.year}</Badge>
                          <Badge variant="outline">Section {cr.section}</Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          Created: {new Date(cr.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(cr.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
                {crs.length === 0 && (
                  <p className="text-center text-slate-500 py-8">No CRs created yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default CRManagementNew;
