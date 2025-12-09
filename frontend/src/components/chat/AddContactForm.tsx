import { useState, FormEvent } from 'react';
import { Button, Input, ErrorMessage } from '@/components/common';
import type { AddContactFormProps } from '@/components/types';

export const AddContactForm = ({ 
  onAdd, 
  onCancel, 
  error 
}: AddContactFormProps) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    await onAdd(username);
    setLoading(false);
    setUsername('');
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="p-3 bg-gray-50 border-b border-gray-200"
    >
      <Input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter username..."
        autoFocus
        disabled={loading}
      />
      <div className="flex gap-2 mt-2">
        <Button 
          type="submit" 
          size="sm" 
          className="flex-1"
          isLoading={loading}
          disabled={loading}
        >
          Add
        </Button>
        <Button 
          type="button" 
          variant="secondary" 
          size="sm" 
          className="flex-1"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
      {error && (
        <div className="mt-2">
          <ErrorMessage message={error} />
        </div>
      )}
    </form>
  );
};
