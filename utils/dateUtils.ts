import { Employee, Holiday } from '../types';
import { DEFAULT_TIMEZONE } from '../constants';

/**
 * Checks if the given date of birth (month and day) matches today's month and day.
 * @param dateOfBirth - The date of birth string in 'YYYY-MM-DD' format.
 * @returns True if it's the birthday today, false otherwise.
 */
export const isBirthdayToday = (dateOfBirth?: string): boolean => {
  if (!dateOfBirth) return false;
  try {
    const today = new Date();
    // Ensure dateOfBirth is treated as local date by explicitly setting time to avoid timezone shifts from just YYYY-MM-DD
    const parts = dateOfBirth.split('-');
    const birthDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0);
    
    return birthDate.getMonth() === today.getMonth() && birthDate.getDate() === today.getDate();
  } catch (error) {
    console.error("Error parsing dateOfBirth in isBirthdayToday:", error, "Input was:", dateOfBirth);
    return false;
  }
};

/**
 * Gets employees with upcoming birthdays within a specified number of days.
 * @param employees - Array of employee objects.
 * @param daysAhead - Number of days ahead to check for birthdays (default: 7).
 * @returns Array of employees with upcoming birthdays, sorted by birthday.
 */
export const getUpcomingBirthdays = (employees: Employee[], daysAhead: number = 7): { employee: Employee, birthdayThisYear: Date }[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today to the start of the day

  const upcoming: { employee: Employee, birthdayThisYear: Date }[] = [];

  employees.forEach(employee => {
    if (employee.dateOfBirth) {
      try {
        const parts = employee.dateOfBirth.split('-');
        const birthMonth = parseInt(parts[1], 10) -1; // Month is 0-indexed
        const birthDay = parseInt(parts[2], 10);

        let birthdayThisYear = new Date(today.getFullYear(), birthMonth, birthDay);
        birthdayThisYear.setHours(0,0,0,0);

        // If birthdayThisYear has already passed this year, check for next year's birthday
        if (birthdayThisYear < today) {
          birthdayThisYear.setFullYear(today.getFullYear() + 1);
        }
        
        const diffTime = birthdayThisYear.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 0 && diffDays <= daysAhead) {
          upcoming.push({ employee, birthdayThisYear });
        }
      } catch (error) {
         console.error("Error processing employee birthday:", employee.name, employee.dateOfBirth, error);
      }
    }
  });

  // Sort by upcoming birthday date
  upcoming.sort((a, b) => a.birthdayThisYear.getTime() - b.birthdayThisYear.getTime());

  return upcoming;
};

/**
 * Gets employees with upcoming work anniversaries within a specified number of days.
 * @param employees - Array of employee objects.
 * @param daysAhead - Number of days ahead to check for anniversaries (default: 30).
 * @returns Array of employees with upcoming anniversaries, sorted by date.
 */
export const getUpcomingAnniversaries = (employees: Employee[], daysAhead: number = 30): { employee: Employee, anniversaryThisYear: Date, yearsOfService: number }[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today to the start of the day

  const upcoming: { employee: Employee, anniversaryThisYear: Date, yearsOfService: number }[] = [];

  employees.forEach(employee => {
    if (employee.joiningDate) {
      try {
        const parts = employee.joiningDate.split('-');
        const joiningDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        joiningDate.setHours(0,0,0,0);
        
        const joiningMonth = joiningDate.getMonth();
        const joiningDay = joiningDate.getDate();
        
        // Don't show anniversary for people who just joined this year.
        if (joiningDate.getFullYear() === today.getFullYear()) {
            return;
        }

        let anniversaryThisYear = new Date(today.getFullYear(), joiningMonth, joiningDay);
        anniversaryThisYear.setHours(0,0,0,0);

        if (anniversaryThisYear < today) {
          anniversaryThisYear.setFullYear(today.getFullYear() + 1);
        }
        
        const diffTime = anniversaryThisYear.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 0 && diffDays <= daysAhead) {
          const yearsOfService = anniversaryThisYear.getFullYear() - joiningDate.getFullYear();
          // Don't show "0 years of service"
          if (yearsOfService > 0) {
            upcoming.push({ employee, anniversaryThisYear, yearsOfService });
          }
        }
      } catch (error) {
         console.error("Error processing employee anniversary:", employee.name, employee.joiningDate, error);
      }
    }
  });

  // Sort by upcoming anniversary date
  upcoming.sort((a, b) => a.anniversaryThisYear.getTime() - b.anniversaryThisYear.getTime());

  return upcoming;
};

/**
 * Gets upcoming holidays within a specified number of days.
 * @param holidays - Array of holiday objects.
 * @param daysAhead - Number of days ahead to check for holidays (default: 30).
 * @returns Array of holidays that are upcoming.
 */
export const getUpcomingHolidays = (holidays: Holiday[], daysAhead: number = 30): Holiday[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today

  const limitDate = new Date(today);
  limitDate.setDate(today.getDate() + daysAhead); // End of the period

  const upcoming = holidays.filter(holiday => {
    if (!holiday.date) return false;
    try {
      // Create date from 'YYYY-MM-DD' string, ensuring it's treated as local date, not UTC midnight
      const holidayDate = new Date(holiday.date + 'T00:00:00');
      return holidayDate >= today && holidayDate <= limitDate;
    } catch (e) {
      console.error(`Error parsing holiday date: ${holiday.date}`, e);
      return false;
    }
  });
  
  // The API already sorts by date, but we can ensure it here.
  return upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

/**
 * Returns the current date as a 'YYYY-MM-DD' string in the app's default timezone (Yangon).
 * This is crucial for default values in date inputs to prevent timezone-related "off-by-one-day" errors.
 */
export const getCurrentDateInDefaultTimezone = (): string => {
    const now = new Date();
    // 'en-CA' locale formats to YYYY-MM-DD, which is what HTML date inputs expect.
    const formatter = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: DEFAULT_TIMEZONE, // Asia/Yangon
    });
    return formatter.format(now);
};

/**
 * Converts a Date object to YYYY-MM-DD string in Yangon timezone.
 * Use this instead of new Date().toISOString().split('T')[0] to ensure Yangon timezone.
 */
export const getDateInYangonTimezone = (date: Date = new Date()): string => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: DEFAULT_TIMEZONE, // Asia/Yangon
    });
    return formatter.format(date);
};

/**
 * Gets the current date in Yangon timezone as YYYY-MM-DD.
 * Alias for getCurrentDateInDefaultTimezone for clarity.
 */
export const getTodayInYangon = (): string => {
    return getCurrentDateInDefaultTimezone();
};

/**
 * Formats a date string (like 'YYYY-MM-DD') for display in Yangon timezone.
 * @param dateString - The date string to format.
 * @returns A formatted string like 'DD/MM/YYYY', or 'N/A'.
 */
export const formatDateForDisplay = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    try {
        // Parse the date string as a date in Yangon timezone
        // Append time to ensure proper parsing
        const date = new Date(`${dateString}T00:00:00`);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: DEFAULT_TIMEZONE // Display in Yangon timezone
        });
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return 'Invalid Date';
    }
};

/**
 * Formats a date for CSV/Excel export. Handles YYYY-MM-DD, full ISO timestamps,
 * Date instances, and Firestore Timestamp-like objects.
 */
export const formatDateForExport = (dateInput?: string | Date | { toDate?: () => Date } | null): string => {
    if (dateInput == null) return '';
    try {
        let raw: string;
        if (typeof dateInput === 'object' && dateInput !== null && 'toDate' in dateInput && typeof dateInput.toDate === 'function') {
            raw = dateInput.toDate().toISOString();
        } else if (dateInput instanceof Date) {
            raw = dateInput.toISOString();
        } else {
            raw = String(dateInput).trim();
        }
        if (!raw) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            return formatDateForDisplay(raw);
        }
        const date = new Date(raw);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: DEFAULT_TIMEZONE,
        });
    } catch (e) {
        console.error('Error formatting export date:', dateInput, e);
        return '';
    }
};

/**
 * Formats a full ISO timestamp string for display in the app's default timezone.
 * @param isoString - The ISO timestamp string.
 * @returns A formatted string like 'DD/MM/YYYY, h:mm:ss a', or 'N/A'.
 */
export const formatDateTimeForDisplay = (isoString?: string): string => {
    if (!isoString) return 'N/A';
    try {
        const date = new Date(isoString);
        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: DEFAULT_TIMEZONE // Asia/Yangon
        });
    } catch (e) {
        console.error("Error formatting datetime:", isoString, e);
        return 'Invalid DateTime';
    }
};

/**
 * Formats a timestamp for display in Yangon (Asia/Yangon) timezone only.
 * Uses internet/server time, NOT the device's local timezone.
 * Use this for Activity Log and any place requiring consistent Yangon display.
 */
export const formatTimestampInYangon = (isoString?: string): string => {
    return formatDateTimeForDisplay(isoString);
};

/**
 * Given an ISO timestamp, return YYYY-MM-DD in Yangon (for grouping/filters).
 */
export const getDateInYangonTimezoneFromISO = (isoString: string): string => {
    return getDateInYangonTimezone(new Date(isoString));
};

/**
 * Format date for month/year or weekday labels in Yangon (e.g. "Jan 2025", "Mon").
 */
export const formatDatePartInYangon = (date: Date, options: Intl.DateTimeFormatOptions): string => {
    return date.toLocaleDateString('en-GB', { ...options, timeZone: DEFAULT_TIMEZONE });
};
