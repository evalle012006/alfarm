'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * /booking/confirmation/[id] now redirects to /booking/success/[id]
 * 
 * The success page is the canonical booking detail page with QR code,
 * item breakdown, and download functionality. This redirect ensures
 * existing links (e.g. "View Passport" in BookingCard) still work.
 */
export default function BookingConfirmationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    const id = params?.id;
    if (id) {
      router.replace(`/booking/success/${id}`);
    } else {
      router.replace('/');
    }
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
}
