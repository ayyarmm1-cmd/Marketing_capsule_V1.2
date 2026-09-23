/**
 * Shared utility functions for Finance Module
 * Consolidates common formatting and helper functions used across finance pages
 */

import { Client, Business, User, Payment } from '../types';
import { formatDateForDisplay } from './dateUtils';

/**
 * Format a date string to DD/MM/YYYY in Yangon timezone.
 */
export const formatDate = (dateString: string | Date): string => {
  try {
    if (!dateString) return 'N/A';
    const iso = typeof dateString === 'string' ? dateString : dateString.toISOString();
    return formatDateForDisplay(iso);
  } catch (error) {
    console.error('Error formatting date:', error, dateString);
    return 'Invalid Date';
  }
};

/**
 * Get client name by ID from a list of clients
 */
export const getClientName = (clientId: string, clients: Client[]): string => {
  return clients.find(c => c.id === clientId)?.name || clientId;
};

/**
 * Get business name by ID from a list of businesses
 */
export const getBusinessName = (businessId: string, businesses: Business[]): string => {
  return businesses.find(b => b.id === businessId)?.name || businessId;
};

/**
 * Get user name by ID from a list of users
 */
export const getUserName = (userId: string, users: User[]): string => {
  return users.find(u => u.id === userId)?.name || userId;
};

/**
 * Check if a date falls within a specific month and year
 */
export const isDateInMonthYear = (dateString: string | Date, month: number, year: number): boolean => {
  try {
    if (!dateString) return false;
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return false;
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  } catch (error) {
    console.error('Error checking date in month/year:', error, dateString);
    return false;
  }
};

/**
 * Check if a date falls within a date range
 */
export const isDateInRange = (dateString: string | Date, startDate?: string, endDate?: string): boolean => {
  try {
    if (!dateString) return false;
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return false;
    
    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) return true; // If start date is invalid, don't filter
      start.setHours(0, 0, 0, 0);
      if (date < start) return false;
    }
    
    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) return true; // If end date is invalid, don't filter
      end.setHours(23, 59, 59, 999);
      if (date > end) return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking date in range:', error, dateString);
    return false;
  }
};

/**
 * Generic search filter function that searches across multiple fields
 */
export const matchesSearchTerm = <T>(
  item: T,
  searchTerm: string,
  searchFields: Array<keyof T | ((item: T) => string | undefined)>
): boolean => {
  if (!searchTerm) return true;
  
  const term = searchTerm.toLowerCase();
  
  return searchFields.some(field => {
    let value: string | undefined;
    
    if (typeof field === 'function') {
      value = field(item);
    } else {
      const fieldValue = item[field];
      value = fieldValue ? String(fieldValue) : undefined;
    }
    
    return value?.toLowerCase().includes(term);
  });
};

/**
 * Generate month options for select dropdowns
 */
export const getMonthOptions = () => {
  return Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString('default', { month: 'long' }),
  }));
};

/**
 * Generate year options for select dropdowns (default: last 5 years)
 */
export const getYearOptions = (yearsBack: number = 5) => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: yearsBack }, (_, i) => ({
    value: currentYear - i,
    label: (currentYear - i).toString(),
  }));
};

/**
 * Format currency amount with locale
 */
export const formatCurrency = (amount: number, currency: string = 'MMK'): string => {
  return amount.toLocaleString();
};

/**
 * Get current month and year as default values
 */
export const getCurrentMonthYear = () => {
  return {
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  };
};

