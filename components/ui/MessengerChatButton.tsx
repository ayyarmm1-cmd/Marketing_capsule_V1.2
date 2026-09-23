import React from 'react';
import { MessageCircle } from 'lucide-react';

interface MessengerChatButtonProps {
  messengerUrl?: string;
}

const MessengerChatButton: React.FC<MessengerChatButtonProps> = ({ 
  messengerUrl = 'https://m.me/100064128399209' // Facebook Page ID: 100064128399209
}) => {
  const handleClick = () => {
    window.open(messengerUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-xl group border-2 border-blue-400"
      aria-label="Chat with us on Messenger"
      title="Chat with us on Messenger"
      style={{
        boxShadow: '0 4px 20px rgba(59, 130, 246, 0.5)',
      }}
    >
      <MessageCircle className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse border-2 border-white"></div>
    </button>
  );
};

export default MessengerChatButton;




















