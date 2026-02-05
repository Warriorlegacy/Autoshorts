import React from 'react';

interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  maxLength?: number;
  showCharCount?: boolean;
}

const Input: React.FC<InputProps> = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  label,
  error,
  required = false,
  disabled = false,
  className = '',
  maxLength,
  showCharCount = false
}) => {
  const id = `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        className={`
          w-full px-4 py-3 rounded-xl border-2 transition-all duration-200
          focus:outline-none focus:ring-0
          ${error 
            ? 'border-red-500 bg-red-50' 
            : 'border-gray-200 focus:border-primary-blue bg-white'
          }
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
        `}
      />
      
      {(error || (showCharCount && maxLength)) && (
        <div className="flex justify-between text-xs">
          {error && <span className="text-red-500">{error}</span>}
          {showCharCount && maxLength && (
            <span className="text-gray-500">
              {value.length}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Input;