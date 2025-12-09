import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoginForm, AuthToggle } from '@/components/auth';

function Login() {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { login, register } = useAuth();

  const handleSubmit = async (username: string, email: string, password: string) => {
    setError('');
    setLoading(true);

    const result = isLogin
      ? await login(username, password)
      : await register(username, email, password);

    if (!result.success) {
      setError(result.error || 'An error occurred');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-secondary">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          {isLogin ? 'Login' : 'Register'}
        </h1>
        <LoginForm
          isLogin={isLogin}
          onSubmit={handleSubmit}
          error={error}
          loading={loading}
        />
        <AuthToggle
          isLogin={isLogin}
          onToggle={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
        />
      </div>
    </div>
  );
}

export default Login;
