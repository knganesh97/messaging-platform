import { Avatar, Button } from '@/components/common';
import type { SidebarHeaderProps } from '@/components/types';

export const SidebarHeader = ({ 
  username, 
  isConnected, 
  onLogout 
}: SidebarHeaderProps) => {
  return (
    <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
      <div className="flex items-center gap-3">
        {username && <Avatar username={username} size="sm" />}
        <div>
          <h3 className="font-semibold text-gray-800">{username}</h3>
          <span className={`text-xs font-medium ${isConnected ? 'text-green-500' : 'text-gray-400'}`}>
            {isConnected ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
      <Button 
        variant="danger" 
        size="sm" 
        onClick={onLogout}
      >
        Logout
      </Button>
    </div>
  );
};
