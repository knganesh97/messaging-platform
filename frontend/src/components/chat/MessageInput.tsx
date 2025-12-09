import { FormEvent } from 'react';
import { Button } from '@/components/common';
import type { MessageInputProps } from '@/components/types';

export const MessageInput = ({ 
  value, 
  onChange, 
  onSubmit, 
  disabled,
  placeholder = "Type a message..."
}: MessageInputProps) => {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className="p-4 border-t border-gray-200 bg-white"
    >
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <Button 
          type="submit" 
          disabled={disabled || !value.trim()}
          className="rounded-full"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </Button>
      </div>
    </form>
  );
};
