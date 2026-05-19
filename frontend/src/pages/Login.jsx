import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { setAuth } from '../utils/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';

const AuthForm = ({ isLogin, email, password, loading, onEmailChange, onPasswordChange, onSubmit, onToggleMode }) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-zinc-300">
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
          className="h-10 border-zinc-800 bg-zinc-950/60 text-white placeholder-zinc-500 focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:border-zinc-500 rounded-lg transition-all duration-200"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-zinc-300">
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
          className="h-10 border-zinc-800 bg-zinc-950/60 text-white placeholder-zinc-500 focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:border-zinc-500 rounded-lg transition-all duration-200"
        />
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-white hover:bg-zinc-200 text-black h-10 transition-all duration-200 active:scale-[0.98] hover:shadow-lg hover:shadow-white/10 font-semibold rounded-lg shadow-sm"
        data-testid="submit-button"
      >
        {loading ? 'Please wait...' : (isLogin ? 'Sign in' : 'Create account')}
      </Button>
      <div className="text-center">
        <button
          type="button"
          onClick={onToggleMode}
          className="text-sm text-zinc-400 hover:text-white font-medium transition-colors duration-200 hover:underline decoration-zinc-600 underline-offset-4"
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
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md">
        <div 
          className="text-center mb-8 cursor-pointer select-none active:scale-[0.98] transition-transform duration-200"
          onClick={() => window.location.reload()}
          title="Click to refresh page"
        >
          <div className="group inline-flex items-center justify-center w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl mb-4 shadow-xl ring-4 ring-zinc-900/50 hover:scale-105 active:scale-95 hover:border-zinc-700 transition-all duration-300">
            <Shield className="w-8 h-8 text-white group-hover:rotate-12 transition-transform duration-300" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            CloudShield
          </h1>
          <p className="text-zinc-400 mt-2">Secure backup and recovery</p>
        </div>

        <Card className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md shadow-2xl transition-all duration-300 hover:border-zinc-800" data-testid="auth-card">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-tight text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {isLogin ? 'Welcome back' : 'Create account'}
            </CardTitle>
            <CardDescription className="text-zinc-400">
              {isLogin ? 'Sign in to access your backups' : 'Get started with CloudShield'}
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
