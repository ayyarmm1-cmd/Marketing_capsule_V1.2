import React, { useState, useEffect, useRef, useMemo } from 'react';

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  containerClassName?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = 'Select options...',
  containerClassName = 'mb-4',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);
  
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const handleSelect = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const handleRemove = (value: string) => {
    onChange(selectedValues.filter(v => v !== value));
  };
  
  const selectedOptions = selectedValues.map(val => options.find(opt => opt.value === val)).filter(Boolean) as MultiSelectOption[];

  return (
    <div className={`relative ${containerClassName}`} ref={wrapperRef}>
      {label && <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">{label}</label>}
      <div 
        className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm min-h-[42px] flex items-center flex-wrap p-1 cursor-pointer focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 dark:focus-within:ring-offset-slate-800 focus-within:ring-primary-action"
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setIsOpen(!isOpen)}
      >
        {selectedOptions.length > 0 ? (
          selectedOptions.map((option) => (
            <div key={option.value} className="flex items-center bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 text-xs font-semibold mr-2 my-0.5 px-2 py-1 rounded-full">
              {option.label}
              <button
                type="button"
                className="ml-2 text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100 font-bold focus:outline-none"
                onClick={(e) => { e.stopPropagation(); handleRemove(option.value); }}
                aria-label={`Remove ${option.label}`}
              >
                &times;
              </button>
            </div>
          ))
        ) : (
          <span className="text-text-secondary dark:text-slate-400 px-2">{placeholder}</span>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg">
          <div className="p-2 border-b dark:border-slate-600">
            <input
              type="text"
              placeholder="Search members..."
              className="w-full px-2 py-1 border rounded-md bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 focus:ring-primary-action focus:border-primary-action"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onClick={e => e.stopPropagation()}
              autoFocus
            />
          </div>
          <ul className="max-h-60 overflow-y-auto custom-scrollbar">
            {filteredOptions.map(option => (
              <li
                key={option.value}
                className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-600 cursor-pointer"
                onClick={() => handleSelect(option.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSelect(option.value)}
                tabIndex={0}
                role="option"
                aria-selected={selectedValues.includes(option.value)}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 text-primary-action border-gray-300 rounded focus:ring-primary-action pointer-events-none dark:bg-slate-600 dark:border-slate-500"
                  checked={selectedValues.includes(option.value)}
                  readOnly
                  tabIndex={-1}
                />
                <span className="ml-3 text-sm text-text-primary dark:text-slate-100">{option.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MultiSelect;