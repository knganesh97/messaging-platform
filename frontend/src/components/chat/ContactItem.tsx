import { Avatar } from '@/components/common';
import type { ContactItemProps } from '@/components/types';

export const ContactItem = ({ 
  contact, 
  isActive, 
  onClick 
}: ContactItemProps) => {
  return (
    <div
      className={`p-3 flex items-center gap-3 cursor-pointer transition-colors duration-150
        ${isActive ? 'bg-primary-light border-l-4 border-primary' : 'hover:bg-gray-50'}`}
      onClick={onClick}
    >
      <Avatar 
        username={contact.username} 
        size="md" 
        status={contact.status}
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-800 truncate">
          {contact.username}
        </div>
        <div className="text-sm text-gray-500 capitalize">
          {contact.status || 'offline'}
        </div>
      </div>
    </div>
  );
};
