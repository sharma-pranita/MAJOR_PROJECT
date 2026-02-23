import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { setAuth } from '../utils/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { CloudUpload } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = isLogin
        ? await authAPI.login(email, password)
        : await authAPI.register(email, password);
      
      setAuth(response.data.access_token, response.data.user);
      toast.success(isLogin ? 'Login successful!' : 'Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-xl mb-4">
            <CloudUpload className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            CloudVault
          </h1>
          <p className="text-slate-500 mt-2">Secure backup and recovery</p>
        </div>

        <Card className="rounded-xl border border-slate-200 shadow-sm" data-testid="auth-card">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {isLogin ? 'Welcome back' : 'Create account'}
            </CardTitle>
            <CardDescription className="text-slate-500">
              {isLogin ? 'Sign in to access your backups' : 'Get started with CloudVault'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="email-input"
                  className="h-10 border-slate-300 focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="password-input"
                  className="h-10 border-slate-300 focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-10 transition-all duration-200 hover:-translate-y-0.5 shadow-sm"
                data-testid="submit-button"
              >
                {loading ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                data-testid="toggle-auth-mode"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;