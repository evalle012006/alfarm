import { ChangeEvent, InputHTMLAttributes } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
}

export default function Checkbox({ label, checked, onChange, className = '', ...rest }: CheckboxProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.checked);
  };

  return (
    <label className={`inline-flex items-center space-x-2 cursor-pointer ${className}`}>
      <input
        {...rest}
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
      />
      <span className="text-sm text-gray-700 dark:text-white">{label}</span>
    </label>
  );
}
