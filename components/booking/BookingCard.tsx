import Link from 'next/link';
import StatusBadge from '../ui/StatusBadge';
import { format } from 'date-fns';

interface BookingCardProps {
  id: string | number;
  booking_date: string;
  check_out_date?: string;
  booking_type: string;
  guests?: number;
  price: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'checked_in' | 'checked_out';
  payment_status?: string;
  items?: any[];
  imageUrl?: string;
  showAction?: boolean;
  className?: string;
  onCancel?: (id: string | number) => void;
  isCancelling?: boolean;
}

export default function BookingCard({
  id,
  booking_date,
  check_out_date,
  booking_type,
  guests,
  price,
  status,
  payment_status,
  items,
  imageUrl,
  showAction = true,
  className = '',
  onCancel,
  isCancelling = false,
}: BookingCardProps) {
  const dateRange = check_out_date
    ? `${format(new Date(booking_date), 'MMM dd')} - ${format(new Date(check_out_date), 'MMM dd, yyyy')}`
    : format(new Date(booking_date), 'MMM dd, yyyy');

  const itemNames = items?.map(item => item.product_name || item.name).join(', ');

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-slate-800 hover:shadow-md transition-all ${className}`}>
      <div className="md:flex">
        {imageUrl && (
          <div className="md:flex-shrink-0 md:w-48 h-48 bg-gray-50 dark:bg-slate-900 relative overflow-hidden">
            <img
              className="w-full h-full object-cover"
              src={imageUrl}
              alt={booking_type}
            />
          </div>
        )}
        <div className="p-6 flex-1 flex flex-col">
          <div className="flex justify-between items-start gap-4">
            <div className="min-w-0">
              <h3 className="text-lg font-black text-accent dark:text-white truncate uppercase tracking-tight">{booking_type}</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Booking ID: #{id}</p>
            </div>
            <div className="flex flex-col items-end gap-2 text-right">
              <StatusBadge variant={status}>
                {status.replace('_', ' ')}
              </StatusBadge>
              {payment_status && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                  payment_status === 'partial' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                  {payment_status}
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-y-4 gap-x-6 text-sm flex-grow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-50 dark:bg-slate-900 rounded-lg">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Stay Period</p>
                <p className="font-bold text-accent dark:text-white">{dateRange}</p>
              </div>
            </div>

            {guests !== undefined && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 dark:bg-slate-900 rounded-lg">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Group Size</p>
                  <p className="font-bold text-accent dark:text-white">{guests} {guests === 1 ? 'Guest' : 'Guests'}</p>
                </div>
              </div>
            )}

            <div className="col-span-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Items Booked</p>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 line-clamp-1 italic">
                {itemNames || 'Accommodation / Service'}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-50 dark:border-slate-700/50">
            <div className="flex flex-col">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Amount</p>
              <p className="text-xl font-black text-primary">₱{price.toLocaleString()}</p>
            </div>

            {showAction && (
              <div className="flex items-center gap-3">
                {status === 'pending' && onCancel && (
                  <button
                    onClick={() => onCancel(id)}
                    disabled={isCancelling}
                    className="px-4 py-2 text-[10px] font-black text-red-500 uppercase tracking-widest bg-transparent border border-red-200 dark:border-red-900/30 hover:bg-red-50/50 dark:hover:bg-red-900/10 rounded-xl transition-all disabled:opacity-50 disabled:border-gray-200 disabled:text-gray-400"
                  >
                    {isCancelling ? 'Cancelling...' : 'Cancel Booking'}
                  </button>
                )}
                <Link
                  href={`/booking/confirmation/${id}`}
                  className="px-6 py-2.5 bg-accent dark:bg-white text-white dark:text-accent text-[10px] font-black rounded-xl hover:opacity-90 transition-all uppercase tracking-[0.2em] shadow-lg shadow-accent/10 dark:shadow-none"
                >
                  View Passport
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
