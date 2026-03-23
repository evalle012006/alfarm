'use client';

import { useEffect } from 'react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-accent dark:text-white">Terms & Conditions</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">AlFarm Resort & Adventure Park</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <section>
            <h3 className="text-base font-bold text-accent dark:text-white mb-2">1. Booking & Reservations</h3>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>All bookings are subject to availability and confirmation by AlFarm Resort & Adventure Park.</li>
              <li>A valid email address and phone number are required to complete a reservation.</li>
              <li>Booking confirmation will be sent to the email address provided during the reservation process.</li>
              <li>Guests must present their booking QR code or reference number upon check-in.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-bold text-accent dark:text-white mb-2">2. Payment Policy</h3>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Full payment is required at the time of booking for online reservations.</li>
              <li>Accepted online payment methods include credit/debit cards, GCash, GrabPay, and Maya via our secure payment partner.</li>
              <li>All prices displayed are in Philippine Pesos (PHP) and inclusive of applicable fees.</li>
              <li>The resort reserves the right to adjust pricing without prior notice for future bookings.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-bold text-accent dark:text-white mb-2">3. Cancellation & Refund Policy</h3>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li><strong>Free cancellation</strong> is available up to 48 hours before the scheduled check-in date.</li>
              <li>Cancellations made within 48 hours of check-in may incur a charge equivalent to one night&apos;s stay or 50% of the total booking amount, whichever is lower.</li>
              <li>No-shows will be charged the full booking amount.</li>
              <li>Refunds for eligible cancellations will be processed within 5&ndash;10 business days to the original payment method.</li>
              <li>In the event of force majeure (typhoons, natural disasters, government-mandated closures), bookings may be rescheduled at no extra cost.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-bold text-accent dark:text-white mb-2">4. Check-In & Check-Out</h3>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li><strong>Check-in time:</strong> 2:00 PM onwards.</li>
              <li><strong>Check-out time:</strong> 12:00 PM (noon).</li>
              <li><strong>Day-use hours:</strong> 8:00 AM &ndash; 5:00 PM.</li>
              <li>Early check-in or late check-out is subject to availability and may incur additional charges.</li>
              <li>A valid government-issued ID is required upon check-in for all guests aged 18 and above.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-bold text-accent dark:text-white mb-2">5. House Rules</h3>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Smoking is strictly prohibited inside all accommodations and enclosed areas.</li>
              <li>Excessive noise is not permitted between 10:00 PM and 6:00 AM.</li>
              <li>Guests are responsible for any damage to resort property during their stay.</li>
              <li>Outside food and beverages are allowed; however, the resort is not responsible for any health-related incidents.</li>
              <li>Pets are allowed in designated pet-friendly areas only and must be supervised at all times.</li>
              <li>Swimming pools and recreational facilities must be used at the guest&apos;s own risk and in accordance with posted safety guidelines.</li>
              <li>Children under 12 must be accompanied by an adult at all times in pool areas and adventure activities.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-bold text-accent dark:text-white mb-2">6. Adventure Activities & Safety</h3>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Participation in adventure activities (zip-lining, rock climbing, cave tours, etc.) is voluntary and at the guest&apos;s own risk.</li>
              <li>All participants must sign a waiver form before engaging in adventure activities.</li>
              <li>Age, height, and health restrictions apply to certain activities for safety purposes.</li>
              <li>The resort reserves the right to refuse participation to any guest who appears to be under the influence of alcohol or substances.</li>
              <li>Safety equipment provided by the resort must be worn at all times during activities.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-bold text-accent dark:text-white mb-2">7. Liability</h3>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>AlFarm Resort & Adventure Park shall not be liable for any loss, theft, or damage to personal belongings of guests during their stay.</li>
              <li>The resort is not liable for injuries sustained due to guest negligence or failure to follow safety instructions.</li>
              <li>Guests are encouraged to secure travel insurance for their visit.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-bold text-accent dark:text-white mb-2">8. Privacy & Data Protection</h3>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Personal information collected during the booking process is used solely for reservation management, communication, and improving our services.</li>
              <li>We do not sell or share guest information with third parties except as required for payment processing and legal obligations.</li>
              <li>Guests may request access to, correction of, or deletion of their personal data by contacting our support team.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-bold text-accent dark:text-white mb-2">9. Changes to Terms</h3>
            <p>
              AlFarm Resort & Adventure Park reserves the right to update or modify these terms and conditions at any time. Guests will be notified of significant changes via email or through our website. Continued use of our booking services constitutes acceptance of the updated terms.
            </p>
          </section>

          <div className="pt-2 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-slate-800">
            <p>Last updated: March 2026</p>
            <p>For questions or concerns, contact us at <strong>info@alfarm-resort.com</strong> or call <strong>+63 123 456 7890</strong>.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary-600 text-white font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all duration-200"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
