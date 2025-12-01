import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

function CRLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/cr/login`, { username, password });
      if (response.data.success) {
        localStorage.setItem('cr_token', response.data.token);
        localStorage.setItem('cr_user', JSON.stringify(response.data.user));
        navigate('/cr/timetable');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button
          onClick={() => navigate('/')}
          className="mb-6 text-gray-600 hover:text-gray-800 flex items-center gap-2"
        >
          ← Back to Home
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            CR Login
          </h2>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter password"
                required
              />
              {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Login
            </button>

            <div className="text-center text-sm text-gray-600">
              Contact your incharge to create a CR account
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CRLogin;
