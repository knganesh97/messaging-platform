import { useState, FormEvent } from 'react';
import { Button, Input, ErrorMessage } from '@/components/common';
import type { LoginFormProps } from '@/components/types';

export const LoginForm = ({ 
  isLogin, 
  onSubmit, 
  error, 
  loading 
}: LoginFormProps) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onSubmit(username, email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Username"
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
        disabled={loading}
        placeholder="Enter your username"
      />

      {!isLogin && (
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          placeholder="Enter your email"
        />
      )}

      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        disabled={loading}
        placeholder="Enter your password"
      />

      {error && <ErrorMessage message={error} />}

      <Button 
        type="submit" 
        className="w-full"
        isLoading={loading}
        disabled={loading}
      >
        {isLogin ? 'Login' : 'Register'}
      </Button>
    </form>
  );
};
