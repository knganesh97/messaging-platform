import type { MessageItemProps } from '@/components/types';

export const MessageItem = ({ message, isSent }: MessageItemProps) => {
  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-4`}>
      <div 
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
          isSent 
            ? 'bg-gradient-to-r from-primary to-secondary text-white rounded-br-none' 
            : 'bg-gray-200 text-gray-800 rounded-bl-none'
        }`}
      >
        <p className="break-words">{message.content}</p>
        <p className={`text-xs mt-1 ${isSent ? 'text-white/80' : 'text-gray-500'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
      </div>
    </div>
  );
};
