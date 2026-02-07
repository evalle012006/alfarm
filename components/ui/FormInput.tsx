import { ChangeEvent, InputHTMLAttributes } from 'react';

interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  error?: string;
  onChange?: (value: string) => void;
}

export default function FormInput({
  label,
  error,
  onChange,
  className = '',
  ...rest
}: FormInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-white">
        {label}
      </label>
      <input
        {...rest}
        onChange={handleChange}
        className={`input-field ${
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
        }`}
      />
      {error && (
        <p className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
