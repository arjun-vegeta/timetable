import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Lock } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

function InchargeLoginNew() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { password });
      if (response.data.success) {
        // Store the JWT token
        localStorage.setItem('incharge_token', response.data.token);
        
        // Check if there's an active semester
        const semesterResponse = await axios.get(`${API_URL}/semester/active`);
        if (semesterResponse.data) {
          navigate('/incharge/courses');
        } else {
          navigate('/incharge/setup');
        }
      }
    } catch (error) {
      setError('Invalid password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
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
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-indigo-600" />
            </div>
            <CardTitle className="text-3xl">Incharge Login</CardTitle>
            <CardDescription>
              Enter your password to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
                 {/* <p className="text-xs text-slate-500">
                  Default password: <code className="bg-slate-100 px-1 py-0.5 rounded">admin123</code>
                </p> */}
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default InchargeLoginNew;
