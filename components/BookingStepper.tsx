'use client';

import Link from 'next/link';

export type BookingStep = 'dates' | 'select' | 'details' | 'payment' | 'done';

const steps: Array<{ key: BookingStep; label: string; href?: string }> = [
  { key: 'dates', label: 'Dates', href: '/' },
  { key: 'select', label: 'Select', href: '/booking/results' },
  { key: 'details', label: 'Details', href: '/booking/info' },
  { key: 'payment', label: 'Payment', href: '/booking/checkout' },
  { key: 'done', label: 'Done' },
];

function stepIndex(step: BookingStep) {
  return steps.findIndex((s) => s.key === step);
}

export default function BookingStepper({ current }: { current: BookingStep }) {
  const currentIdx = stepIndex(current);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2">
        {steps.map((step, idx) => {
          const isActive = idx === currentIdx;
          const isComplete = idx < currentIdx;

          const content = (
            <div className="flex items-center gap-3">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border transition-colors ${
                  isComplete
                    ? 'bg-primary border-primary text-white'
                    : isActive
                      ? 'bg-white border-primary text-primary'
                      : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                {idx + 1}
              </div>
              <div className={`text-sm font-semibold ${isActive ? 'text-accent dark:text-white' : 'text-gray-500 dark:text-gray-300'}`}>
                {step.label}
              </div>
            </div>
          );

          return (
            <div key={step.key} className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {step.href ? (
                  <Link
                    href={step.href}
                    className={`block w-full rounded-lg px-2 py-2 ${isActive ? '' : 'hover:bg-gray-50 dark:hover:bg-slate-900'}`}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="px-2 py-2">{content}</div>
                )}
                {idx !== steps.length - 1 && (
                  <div className={`hidden md:block h-px flex-1 ${isComplete ? 'bg-primary' : 'bg-gray-200 dark:bg-slate-800'}`} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
