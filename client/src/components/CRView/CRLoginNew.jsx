import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, UserCog } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

function CRLoginNew() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_URL}/cr/login`, { username, password });
      if (response.data.success) {
        localStorage.setItem('cr_token', response.data.token);
        localStorage.setItem('cr_user', JSON.stringify(response.data.user));
        navigate('/cr/timetable');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 flex items-center justify-center p-4">
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
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <UserCog className="w-6 h-6 text-purple-600" />
            </div>
            <CardTitle className="text-3xl">CR Login</CardTitle>
            <CardDescription>
              Class Representative access to manage timetables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

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
              </div>

              <Button 
                type="submit" 
                className="w-full bg-purple-600 hover:bg-purple-700" 
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>

              <p className="text-center text-sm text-slate-600">
                Contact your incharge to create a CR account
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default CRLoginNew;
