interface TagToggleProps {
  options: string[];
  active: string;
  onChange?: (option: string) => void;
  className?: string;
}

export default function TagToggle({
  options,
  active,
  onChange,
  className = '',
}: TagToggleProps) {
  return (
    <div className={`inline-flex rounded-full bg-gray-100 p-1 text-xs font-medium ${className}`}>
      {options.map((option) => {
        const isActive = option === active;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange && onChange(option)}
            className={`px-4 py-1.5 rounded-full transition-all duration-200 ${
              isActive ? 'bg-white shadow-sm text-accent' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
