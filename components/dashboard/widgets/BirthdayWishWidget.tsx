import React from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { Employee } from '../../../types';
import { isBirthdayToday } from '../../../utils/dateUtils';

const BirthdayWishWidget: React.FC = () => {
  const { user } = useAuth();

  if (!user || !(user as Employee).dateOfBirth) {
    return null; // User is not an employee with a date of birth
  }

  const employee = user as Employee;

  if (isBirthdayToday(employee.dateOfBirth)) {
    return (
      <div className="p-4 mb-6 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white rounded-xl shadow-lg text-center">
        <span role="img" aria-label="Party Popper" className="text-3xl mr-2">🎉</span>
        <span className="text-2xl font-bold">Happy Birthday, {employee.name}!</span>
        <span role="img" aria-label="Cake" className="text-3xl ml-2">🎂</span>
        <p className="text-sm opacity-90 mt-1">Wishing you a fantastic day!</p>
      </div>
    );
  }

  return null; // Not their birthday
};

export default BirthdayWishWidget;