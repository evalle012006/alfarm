interface TagToggleProps {
  options: string[];
  active: string;
  className?: string;
}

export default function TagToggle({
  options,
  active,
  className = '',
}: TagToggleProps) {
  return (
    <div className={`inline-flex rounded-full bg-gray-100 p-1 text-xs font-medium ${className}`}>
      {options.map((option) => {
        const isActive = option === active;
        return (
          <span
            key={option}
            className={`px-4 py-1.5 rounded-full ${
              isActive ? 'bg-white shadow-sm text-accent' : 'text-gray-500'
            }`}
          >
            {option}
          </span>
        );
      })}
    </div>
  );
}
