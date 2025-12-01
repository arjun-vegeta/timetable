import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, UserCog, Settings, Calendar, Palette, Zap } from 'lucide-react';

function HomeNew() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            Timetable Management System
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Department of Computer Science and Engineering, NITK Surathkal
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Student */}
          <Card className="hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-300 cursor-pointer group">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                <GraduationCap className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Student</CardTitle>
              <CardDescription>
                View timetable, select electives, and export schedules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate('/student')} 
                className="w-full"
                variant="default"
              >
                Continue
              </Button>
            </CardContent>
          </Card>

          {/* CR */}
          <Card className="hover:shadow-xl transition-all duration-300 border-2 hover:border-purple-300 cursor-pointer group">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                <UserCog className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle className="text-xl">Class Representative</CardTitle>
              <CardDescription>
                Modify and manage your class timetable
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate('/cr/login')} 
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                Login
              </Button>
            </CardContent>
          </Card>

          {/* Incharge */}
          <Card className="hover:shadow-xl transition-all duration-300 border-2 hover:border-slate-300 cursor-pointer group">
            <CardHeader>
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-slate-200 transition-colors">
                <Settings className="w-6 h-6 text-slate-700" />
              </div>
              <CardTitle className="text-xl">Incharge</CardTitle>
              <CardDescription>
                Manage courses, create timetables, oversee CRs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate('/incharge/login')} 
                className="w-full bg-slate-700 hover:bg-slate-800"
              >
                Access
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        {/* <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">
            Key Features
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Palette className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Color-Coded Courses</h3>
                <p className="text-sm text-slate-600">
                  Each course has a unique color for easy identification
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Elective Selection</h3>
                <p className="text-sm text-slate-600">
                  Students can choose and manage their elective courses
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Google Calendar Sync</h3>
                <p className="text-sm text-slate-600">
                  Export and sync timetables with Google Calendar
                </p>
              </div>
            </div>
          </div>
        </div> */}

        {/* Footer */}
        {/* <div className="mt-12 text-center">
          <div className="flex justify-center gap-3 flex-wrap">
            <Badge variant="secondary" className="text-sm">
              Drag & Drop Interface
            </Badge>
            <Badge variant="secondary" className="text-sm">
              AI Auto-Generation
            </Badge>
            <Badge variant="secondary" className="text-sm">
              Multi-Format Export
            </Badge>
            <Badge variant="secondary" className="text-sm">
              Real-Time Updates
            </Badge>
          </div>
        </div> */}
      </div>
    </div>
  );
}

export default HomeNew;
