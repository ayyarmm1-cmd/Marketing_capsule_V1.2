import { MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface MessengerChatButtonProps {
  messengerUrl?: string;
}

export default function MessengerChatButton({ 
  messengerUrl = 'https://m.me/100064128399209' // Facebook Page ID: 100064128399209
}: MessengerChatButtonProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Show button after a short delay for better UX
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleClick = () => {
    window.open(messengerUrl, '_blank', 'noopener,noreferrer');
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 w-16 h-16 neon-border rounded-full bg-gradient-to-br from-indigo-600 via-indigo-700 to-cyan-600 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 animate-glow shadow-2xl group"
      aria-label="Chat with us on Messenger"
      title="Chat with us on Messenger"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/80 via-cyan-500/80 to-indigo-600/80 rounded-full blur-sm group-hover:blur-md transition-all duration-300"></div>
      <MessageCircle className="h-7 w-7 text-white relative z-10 group-hover:scale-110 transition-transform" />
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full animate-pulse border-2 border-black"></div>
    </button>
  );
}











