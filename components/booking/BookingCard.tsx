import Link from 'next/link';
import StatusBadge from '../ui/StatusBadge';

interface BookingCardProps {
  id: string;
  title: string;
  date: string;
  guests: number;
  price: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  imageUrl?: string;
  showAction?: boolean;
  className?: string;
}

export default function BookingCard({
  id,
  title,
  date,
  guests,
  price,
  status,
  imageUrl,
  showAction = true,
  className = '',
}: BookingCardProps) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-slate-700 ${className}`}>
      <div className="md:flex">
        {imageUrl && (
          <div className="md:flex-shrink-0 md:w-48 h-40 bg-gray-200 dark:bg-slate-700 relative overflow-hidden">
            <img
              className="w-full h-full object-cover"
              src={imageUrl}
              alt={title}
            />
          </div>
        )}
        <div className="p-4 flex-1">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            <StatusBadge variant={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </StatusBadge>
          </div>
          
          <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {date}
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              {guests} {guests === 1 ? 'Guest' : 'Guests'}
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              ₱{price.toLocaleString()}
            </div>
          </div>
          
          {showAction && (
            <div className="mt-4 flex justify-end">
              <Link 
                href={`/booking/${id}`}
                className="text-sm font-medium text-primary hover:text-primary-600 dark:text-primary-300 dark:hover:text-primary-400"
              >
                View Details →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
