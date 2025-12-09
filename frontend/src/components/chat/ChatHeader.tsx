import { Avatar } from '@/components/common';
import type { ChatHeaderProps } from '@/components/types';

export const ChatHeader = ({ contact }: ChatHeaderProps) => {
  return (
    <div className="p-4 border-b border-gray-200 bg-white flex items-center gap-3">
      <Avatar 
        username={contact.username} 
        size="md" 
        status={contact.status}
      />
      <div>
        <h3 className="font-semibold text-gray-800">{contact.username}</h3>
        <span className="text-sm text-gray-500 capitalize">
          {contact.status || 'offline'}
        </span>
      </div>
    </div>
  );
};
