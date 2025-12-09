import { SidebarHeader } from '@/components/chat/SidebarHeader';
import { ContactsList } from '@/components/chat/ContactsList';
import { AddContactForm } from '@/components/chat/AddContactForm';
import { useChatContext } from '@/contexts/ChatContext';
import type { SidebarProps } from '@/components/types';

export const Sidebar = ({ user, isConnected, onLogout }: SidebarProps) => {
  const {
    contacts,
    selectedContact,
    showAddContact,
    addContactError,
    setShowAddContact,
    handleSelectContact,
    handleAddContact,
    setAddContactError,
  } = useChatContext();

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <SidebarHeader
        username={user?.username}
        isConnected={isConnected}
        onLogout={onLogout}
      />

      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Contacts
        </h4>
        <button
          className="w-8 h-8 rounded-full bg-primary text-white hover:bg-primary-dark transition-colors flex items-center justify-center text-xl font-light"
          onClick={() => setShowAddContact(!showAddContact)}
        >
          +
        </button>
      </div>

      {showAddContact && (
        <AddContactForm
          onAdd={handleAddContact}
          onCancel={() => {
            setShowAddContact(false);
            setAddContactError('');
          }}
          error={addContactError}
        />
      )}

      <ContactsList
        contacts={contacts}
        selectedContactId={selectedContact?.id}
        onSelectContact={handleSelectContact}
      />
    </div>
  );
};
