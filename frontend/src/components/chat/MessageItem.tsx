import type { MessageItemProps } from '@/components/types';
import { 
  SpinnerIcon, 
  CheckIcon, 
  DoubleCheckIcon, 
  AlertCircleIcon, 
  RefreshIcon 
} from '@/components/common';

export const MessageItem = ({ message, isSent, onRetry }: MessageItemProps) => {
  const renderStatusIcon = () => {
    if (!isSent) return null;

    switch (message.status) {
      case 'pending':
        return <SpinnerIcon className="w-3 h-3" />;
      case 'sent':
        return <CheckIcon className="w-3 h-3" />;
      case 'delivered':
        return <DoubleCheckIcon className="w-3 h-3" />;
      case 'read':
        return <DoubleCheckIcon className="w-3 h-3 text-blue-400" />;
      case 'failed':
        return <AlertCircleIcon className="w-3 h-3 text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-4 group`}>
      <div className="flex flex-col items-end max-w-xs lg:max-w-md">
        <div 
          className={`px-4 py-2 rounded-2xl ${
            isSent 
              ? message.status === 'failed'
                ? 'bg-red-100 text-red-900 rounded-br-none'
                : 'bg-gradient-to-r from-primary to-secondary text-white rounded-br-none'
              : 'bg-gray-200 text-gray-800 rounded-bl-none'
          }`}
        >
          <p className="break-words">{message.content}</p>
          <div className="flex items-center justify-end gap-2 mt-1">
            <p className={`text-xs ${
              isSent 
                ? message.status === 'failed' ? 'text-red-600' : 'text-white/80'
                : 'text-gray-500'
            }`}>
              {new Date(message.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
            {renderStatusIcon()}
          </div>
        </div>
        {message.status === 'failed' && message.temp_id && onRetry && (
          <button
            onClick={() => onRetry(message.temp_id!)}
            className="mt-1 text-xs text-red-600 hover:text-red-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
          >
            <RefreshIcon className="w-3 h-3" />
            Retry
          </button>
        )}
        {message.status === 'failed' && message.error && (
          <p className="text-xs text-red-600 mt-1">{message.error}</p>
        )}
      </div>
    </div>
  );
};
