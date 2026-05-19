import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { setAuth } from '../utils/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { CloudUpload } from 'lucide-react';
import { toast } from 'sonner';

// Extract auth form component
const AuthForm = ({ isLogin, email, password, loading, onEmailChange, onPasswordChange, onSubmit, onToggleMode }) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-slate-700">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
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
          onChange={(e) => onPasswordChange(e.target.value)}
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
        {loading ? 'Please wait...' : (isLogin ? 'Sign in' : 'Create account')}
      </Button>
      <div className="text-center">
        <button
          type="button"
          onClick={onToggleMode}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          data-testid="toggle-auth-mode"
        >
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </form>
  );
};

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const authFunction = isLogin ? authAPI.login : authAPI.register;
      const response = await authFunction(email, password);
      
      setAuth(response.data.access_token, response.data.user);
      
      const successMessage = isLogin ? 'Login successful!' : 'Account created successfully!';
      toast.success(successMessage);
      
      navigate('/dashboard');
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Authentication failed';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isLogin, email, password, navigate]);

  const toggleMode = useCallback(() => {
    setIsLogin(!isLogin);
  }, [isLogin]);

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
            <AuthForm
              isLogin={isLogin}
              email={email}
              password={password}
              loading={loading}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onSubmit={handleSubmit}
              onToggleMode={toggleMode}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
