import type { EmptyStateProps } from '@/components/types';

export const EmptyState = ({ 
  title, 
  message, 
  icon 
}: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      {icon && (
        <div className="mb-4 text-gray-400">
          {icon}
        </div>
      )}
      <h2 className="text-xl font-semibold text-gray-700 mb-2">
        {title}
      </h2>
      {message && (
        <p className="text-gray-500">{message}</p>
      )}
    </div>
  );
};
