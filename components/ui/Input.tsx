import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
  as?: 'input' | 'textarea'; // Added: Specifies the element type
  rows?: number; // Added: For textarea
  accept?: string; // Already exists for file inputs
  icon?: React.ReactNode; // New: Optional icon for the input
  onIconClick?: () => void; // New: Handler for icon click
}

const Input: React.FC<InputProps> = ({
  label,
  id,
  error,
  className = '',
  containerClassName = '',
  as = 'input', // Default to 'input'
  rows,
  type, // Destructure type to handle it explicitly based on 'as' prop
  accept,
  icon,
  onIconClick,
  ...rest // Collect remaining props. `rest` is of type Omit<InputHTMLAttributes, ...>
}) => {
  const baseStyle = "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-action focus:border-primary-action sm:text-sm text-text-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400";
  const errorStyle = error ? "border-status-danger focus:ring-status-danger focus:border-status-danger" : "";
  const iconPadding = icon && onIconClick ? 'pr-10' : '';

  const elementClassName = `${baseStyle} ${errorStyle} ${iconPadding} ${className}`;

  // Destructure onChange separately due to its specific typing for input vs textarea
  // props.onChange is ChangeEventHandler<HTMLInputElement>
  const { onChange: inputElementOnChangeHandler, ...remainingRestProps } = rest;

  // Destructure known input-specific attributes from remainingRestProps
  // to avoid passing them to the textarea element.
  // This helps in making `compatibleRestProps` safer for textarea.
  const {
    alt,
    checked,
    height,
    src,
    width,
    multiple,
    list,
    max,
    min,
    pattern,
    step,
    size, // Input specific size attribute
    formAction,
    formEncType,
    formMethod,
    formNoValidate,
    formTarget,
    capture,
    // `type` is already destructured from the main props.
    // Other attributes from InputHTMLAttributes that are not in TextareaHTMLAttributes
    // can be added here if they cause issues.
    ...compatibleRestProps // These props are generally common HTML attributes or compatible
  } = remainingRestProps;


  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && <label htmlFor={id} className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">{label}</label>}
      <div className="relative">
        {as === 'textarea' ? (
          <textarea
            id={id}
            className={elementClassName} // Note: iconPadding will be ignored here, which is fine
            rows={rows}
            // The `inputElementOnChangeHandler` is of type React.ChangeEventHandler<HTMLInputElement>.
            // We are passing it to a textarea, which will invoke it with React.ChangeEvent<HTMLTextAreaElement>.
            // This is a type mismatch. The cast to `unknown` then to the target type silences the specific TS error.
            // This assumes the handler function itself is general enough (e.g., only uses e.target.value).
            onChange={inputElementOnChangeHandler as unknown as React.ChangeEventHandler<HTMLTextAreaElement>}
            {...(compatibleRestProps as unknown as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} // Cast here
          />
        ) : (
          <input
            id={id}
            className={elementClassName} // Has icon padding
            type={type}
            accept={accept}
            onChange={inputElementOnChangeHandler} // Use original onChange for input
            {...remainingRestProps} // Input can take all original remainingRestProps
            onWheel={type === 'number' ? (e) => e.currentTarget.blur() : undefined}
          />
        )}
        {icon && onIconClick && as === 'input' && (
          <button
            type="button"
            onClick={onIconClick}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none"
            aria-label="Toggle password visibility"
          >
            {icon}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-status-danger">{error}</p>}
    </div>
  );
};

export default Input;