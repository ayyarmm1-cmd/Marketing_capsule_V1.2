import React, { useState, useEffect, useRef, useMemo } from 'react';

interface SearchableSelectOption {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  label?: string;
  options: SearchableSelectOption[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  containerClassName?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  containerClassName = 'mb-4',
  error,
  disabled = false,
  required,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef(false);

  const selectedLabel = useMemo(() => {
    if (value === '' || value === null || value === undefined) return ''; // Handle empty string, null, undefined
    if (value === 0) {
      // Special case for 0 - check if there's an option with value 0
      const found = options.find(opt => opt.value === 0);
      return found ? found.label : '';
    }
    // Try to find the value in options - use strict comparison first, then string comparison
    const found = options.find(opt => {
      // First try strict equality (handles same type)
      if (opt.value === value) return true;
      // Then try string comparison (handles type mismatch)
      return String(opt.value) === String(value);
    });
    if (found) {
      return found.label;
    }
    // If not found in options, return empty string (will show placeholder)
    // This ensures the component doesn't show stale data
    return '';
  }, [value, options]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  useEffect(() => {
    if (!isOpen) {
      isSelectingRef.current = false;
      return;
    }
    
    function handleClickOutside(event: MouseEvent) {
      // If we're in the process of selecting, don't close
      if (isSelectingRef.current) {
        return;
      }
      
      // Check if click is inside the wrapper
      if (wrapperRef.current && wrapperRef.current.contains(event.target as Node)) {
        return;
      }
      
      // Click is outside, close the dropdown
      setIsOpen(false);
      setSearchTerm('');
    }
    
    // Attach listener immediately, but use bubble phase (not capture) so click handlers fire first
    document.addEventListener("click", handleClickOutside);
    
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string | number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Set flag to prevent outside click handler from interfering
    isSelectingRef.current = true;
    // Update the value
    onChange(optionValue);
    // Close the dropdown and clear search
    setIsOpen(false);
    setSearchTerm('');
    // Reset flag after a short delay
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 200);
  };

  return (
    <div className={`relative ${containerClassName}`} ref={wrapperRef}>
      {label && <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">{label}</label>}
      <div
        className={`w-full bg-white dark:bg-slate-700 border rounded-md shadow-sm min-h-[42px] flex items-center justify-between p-2 cursor-pointer ${
          disabled ? 'bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'hover:border-primary-action dark:hover:border-blue-500'
        } ${error ? 'border-status-danger focus:ring-status-danger' : 'border-gray-300 dark:border-slate-600 focus:ring-primary-action focus:border-primary-action'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => !disabled && e.key === 'Enter' && setIsOpen(!isOpen)}
        role="combobox"
        aria-expanded={isOpen}
      >
        <span className={value ? 'text-text-primary dark:text-slate-100' : 'text-text-secondary dark:text-slate-400'}>
          {selectedLabel || placeholder}
        </span>
        <svg className={`w-5 h-5 text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {error && <p className="mt-1 text-xs text-status-danger">{error}</p>}

      {isOpen && !disabled && (
        <div 
          className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg"
          onClick={(e) => {
            // Prevent clicks inside dropdown from closing it
            e.stopPropagation();
          }}
        >
          <div className="p-2">
            <input
              type="text"
              placeholder="Search..."
              className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-primary-action focus:border-primary-action"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <ul className="max-h-60 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-700">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <li
                  key={option.value}
                  className={`px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer text-sm dark:text-slate-200 ${
                    String(option.value) === String(value) || option.value === value
                      ? 'bg-blue-100 dark:bg-blue-900/50 font-semibold text-gray-900' 
                      : 'bg-white dark:bg-slate-700 text-gray-900'
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelect(option.value, e);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelect(option.value);
                    }
                  }}
                  tabIndex={0}
                  role="option"
                  aria-selected={String(option.value) === String(value) || option.value === value}
                  style={{ color: '#111827' }}
                >
                  {option.label}
                </li>
              ))
            ) : (
              <li className="px-4 py-2 text-sm text-gray-900 dark:text-slate-400 bg-white dark:bg-slate-700" style={{ color: '#374151' }}>No options found.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;