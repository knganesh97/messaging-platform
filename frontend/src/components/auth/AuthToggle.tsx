import type { AuthToggleProps } from '@/components/types';

export const AuthToggle = ({ isLogin, onToggle }: AuthToggleProps) => {
  return (
    <p className="text-center mt-4 text-gray-600">
      {isLogin ? "Don't have an account? " : 'Already have an account? '}
      <span 
        onClick={onToggle}
        className="text-primary font-semibold cursor-pointer hover:underline"
      >
        {isLogin ? 'Register' : 'Login'}
      </span>
    </p>
  );
};
