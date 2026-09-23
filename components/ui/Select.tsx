import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string | number; label: string }>;
  containerClassName?: string;
  placeholder?: string; // Added placeholder prop
}

const Select: React.FC<SelectProps> = ({ label, id, error, options, className = '', containerClassName = '', placeholder, ...props }) => {
  const baseStyle = "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-action focus:border-primary-action sm:text-sm text-text-primary bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400";
  const errorStyle = error ? "border-status-danger focus:ring-status-danger focus:border-status-danger" : "";

  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && <label htmlFor={id} className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">{label}</label>}
      <select
        id={id}
        className={`${baseStyle} ${errorStyle} ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-status-danger">{error}</p>}
    </div>
  );
};

export default Select;