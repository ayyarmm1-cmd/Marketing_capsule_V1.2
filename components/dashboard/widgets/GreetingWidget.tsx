
import React from 'react';

interface GreetingWidgetProps {
  userName: string;
}

const GreetingWidget: React.FC<GreetingWidgetProps> = ({ userName }) => {
  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="p-6 bg-gradient-to-r from-primary-action to-blue-500 text-white rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold">{getTimeOfDay()}, {userName}!</h2>
      <p className="mt-1 text-blue-100">Here's what's happening in your workspace today.</p>
    </div>
  );
};

export default GreetingWidget;
