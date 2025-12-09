import { ContactItem } from '@/components/chat/ContactItem';
import { EmptyState } from '@/components/common';
import type { ContactsListProps } from '@/components/types';

export const ContactsList = ({ 
  contacts, 
  selectedContactId, 
  onSelectContact 
}: ContactsListProps) => {
  if (contacts.length === 0) {
    return (
      <div className="p-4">
        <EmptyState 
          title="No contacts yet" 
          message="Click + to add someone!"
        />
      </div>
    );
  }

  return (
    <div className="overflow-y-auto">
      {contacts.map(contact => (
        <ContactItem
          key={contact.id}
          contact={contact}
          isActive={selectedContactId === contact.id}
          onClick={() => onSelectContact(contact)}
        />
      ))}
    </div>
  );
};
