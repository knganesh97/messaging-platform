import type { AvatarProps } from '@/components/types';

export const Avatar = ({ 
  username, 
  size = 'md',
  status 
}: AvatarProps) => {
  const sizeStyles = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  };

  return (
    <div className="relative inline-block">
      <div className={`${sizeStyles[size]} rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center font-bold`}>
        {username.charAt(0).toUpperCase()}
      </div>
      {status && (
        <span 
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white
            ${status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`}
        />
      )}
    </div>
  );
};
