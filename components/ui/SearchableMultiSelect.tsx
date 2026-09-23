import React, { useState, useEffect, useRef, useMemo } from 'react';

interface SearchableMultiSelectOption {
  value: string | number;
  label: string;
}

interface SearchableMultiSelectProps {
  label?: string;
  options: SearchableMultiSelectOption[];
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  placeholder?: string;
  containerClassName?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

const SearchableMultiSelect: React.FC<SearchableMultiSelectProps> = ({
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

  const valueSet = useMemo(() => new Set(value.map(v => String(v))), [value]);

  const availableOptions = useMemo(() => {
    return options.filter(opt => !valueSet.has(String(opt.value)));
  }, [options, valueSet]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return availableOptions;
    return availableOptions.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableOptions, searchTerm]);

  useEffect(() => {
    if (!isOpen) {
      isSelectingRef.current = false;
      return;
    }
    function handleClickOutside(event: MouseEvent) {
      if (isSelectingRef.current) return;
      if (wrapperRef.current && wrapperRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
      setSearchTerm('');
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isOpen]);

  const handleAdd = (optionValue: string | number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    isSelectingRef.current = true;
    onChange([...value, optionValue]);
    setSearchTerm('');
    setTimeout(() => { isSelectingRef.current = false; }, 200);
  };

  const handleRemove = (optionValue: string | number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(value.filter(v => String(v) !== String(optionValue)));
  };

  const getLabel = (v: string | number) => {
    const found = options.find(opt => String(opt.value) === String(v));
    return found ? found.label : String(v);
  };

  return (
    <div className={`relative ${containerClassName}`} ref={wrapperRef}>
      {label && <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">{label}</label>}
      <div
        className={`min-h-[42px] w-full rounded-md border bg-white dark:bg-slate-700 shadow-sm p-2 flex flex-wrap gap-2 items-center ${
          disabled ? 'bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'cursor-pointer hover:border-primary-action dark:hover:border-blue-500'
        } ${error ? 'border-status-danger' : 'border-gray-300 dark:border-slate-600'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {value.length > 0 ? (
          value.map(v => (
            <span
              key={String(v)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-sm text-gray-900 dark:text-slate-200"
            >
              {getLabel(v)}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => handleRemove(v, e)}
                  className="hover:text-status-danger focus:outline-none"
                  aria-label={`Remove ${getLabel(v)}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </span>
          ))
        ) : (
          <span className="text-text-secondary dark:text-slate-400 text-sm">{placeholder}</span>
        )}
        {!disabled && (
          <span className="ml-auto">
            <svg className={`w-5 h-5 text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-status-danger">{error}</p>}

      {isOpen && !disabled && (
        <div
          className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-2">
            <input
              type="text"
              placeholder="Search to add..."
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
                  className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer text-sm text-gray-900 dark:text-slate-200"
                  onClick={(e) => handleAdd(option.value, e)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(option.value); }}
                  tabIndex={0}
                >
                  {option.label}
                </li>
              ))
            ) : (
              <li className="px-4 py-2 text-sm text-gray-500 dark:text-slate-400">No more options or no match.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableMultiSelect;
