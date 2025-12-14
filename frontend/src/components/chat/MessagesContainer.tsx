import { useEffect, useRef, useState } from 'react';
import { MessageItem } from '@/components/chat/MessageItem';
import { EmptyState, MessageBubbleIcon, ChevronDownIcon } from '@/components/common';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { MessagesContainerProps } from '@/components/types';

export const MessagesContainer = ({ 
  messages, 
  currentUserId,
  onRetry
}: MessagesContainerProps) => {
  const { sendReadReceipt } = useWebSocket();
  const observedMessages = useRef<Set<string>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const AUTO_SCROLL_THRESHOLD = 150; // pixels from bottom to trigger auto-scroll
  const SCROLL_BUTTON_THRESHOLD = 100; // pixels from bottom to show scroll button
  
  // Calculate distance from bottom of scroll container
  const getDistanceFromBottom = (): number => {
    const container = scrollContainerRef.current;
    if (!container) return 0;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight;
  };
  
  // Update scroll button visibility based on current position
  const updateScrollButtonVisibility = () => {
    const distanceFromBottom = getDistanceFromBottom();
    setShowScrollButton(distanceFromBottom > SCROLL_BUTTON_THRESHOLD);
  };
  
  // Scroll to bottom function
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    container.scrollTo({
      top: container.scrollHeight,
      behavior
    });
  };
  
  // Handle scroll event to show/hide scroll button
  const handleScroll = () => {
    updateScrollButtonVisibility();
  };
  
  // Auto-scroll and update scroll button when messages change
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    // Check if user was near bottom before messages updated
    const wasNearBottom = getDistanceFromBottom() <= AUTO_SCROLL_THRESHOLD;
    
    // Use requestAnimationFrame to ensure DOM has rendered with new message heights
    const rafId = requestAnimationFrame(() => {
      if (wasNearBottom) {
        // Auto-scroll to bottom if user was already near bottom
        scrollToBottom('smooth');
      }
      
      // Update scroll button visibility after messages render
      updateScrollButtonVisibility();
    });
    
    return () => cancelAnimationFrame(rafId);
  }, [messages]);
  
  useEffect(() => {
    // Send read receipts for received messages
    messages.forEach(msg => {
      if (
        msg.sender_id !== currentUserId && // Not our own message
        msg.id && 
        !msg.id.startsWith('temp-') && // Has real server ID
        !observedMessages.current.has(msg.id) // Not already marked as read
      ) {
        sendReadReceipt(msg.id);
        observedMessages.current.add(msg.id);
      }
    });
  }, [messages, currentUserId, sendReadReceipt]);
  
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState 
          title="No messages yet" 
          message="Start the conversation!"
          icon={<MessageBubbleIcon className="w-16 h-16" />}
        />
      </div>
    );
  }

  return (
    <div 
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 relative overflow-y-auto p-4 bg-gray-50"
    >
      {messages.map((msg, index) => (
        <MessageItem
          key={msg.id || index}
          message={msg}
          isSent={msg.sender_id === currentUserId}
          onRetry={onRetry}
        />
      ))}
      
      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom('instant')}
          className="fixed bottom-24 right-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 z-10"
          aria-label="Scroll to bottom"
        >
          <ChevronDownIcon className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
