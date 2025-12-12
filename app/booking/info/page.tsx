'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import PrimaryButton from '@/components/ui/PrimaryButton';
import FormInput from '@/components/ui/FormInput';
import Checkbox from '@/components/ui/Checkbox';
import CountSelector from '@/components/ui/CountSelector';
import BookingStepper from '@/components/BookingStepper';
import { useAuth } from '@/lib/AuthContext';
import { getBookingCartItems, useBooking } from '@/lib/BookingContext';

interface GuestInfoForm {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  adults: number;
  children: number;
  useProfile: boolean;
}

interface ValidationErrors {
  [key: string]: string | undefined;
}

export default function BookingInfoPage() {
  const router = useRouter();

  const { user, isAuthenticated } = useAuth();
  const { state: bookingState, setGuestInfo, setSpecialRequests } = useBooking();

  const bookingType = bookingState.bookingType;
  const checkInDate = bookingState.checkInDate;
  const checkOutDate = bookingState.checkOutDate;
  const cartItems = getBookingCartItems(bookingState.cart);

  useEffect(() => {
    // Guard: require search step completed
    if (!checkInDate) {
      router.push('/');
      return;
    }

    // For overnight, require check-out
    if (bookingType === 'overnight' && !checkOutDate) {
      router.push('/');
      return;
    }
  }, [bookingType, checkInDate, checkOutDate, router]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<GuestInfoForm>({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    adults: bookingState.adults,
    children: bookingState.children,
    useProfile: false,
  });

  const [specialRequestsLocal, setSpecialRequestsLocal] = useState('');

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [profileAvailable, setProfileAvailable] = useState(false);

  useEffect(() => {
    setProfileAvailable(Boolean(isAuthenticated && user));
  }, []);

  const updateField = <K extends keyof GuestInfoForm>(field: K, value: GuestInfoForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUseProfileChange = (checked: boolean) => {
    setForm((prev) => {
      const next: GuestInfoForm = { ...prev, useProfile: checked };
      if (checked && user) {
        next.firstName = user.firstName ?? next.firstName;
        next.lastName = user.lastName ?? next.lastName;
        next.email = user.email ?? next.email;
        next.phone = user.phone ?? next.phone;
      }
      return next;
    });
  };

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';

    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!form.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (form.phone.replace(/[^0-9]/g, '').length < 7) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (form.adults < 1) {
      newErrors.adults = 'At least 1 adult is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      setGuestInfo({
        firstName: form.firstName,
        middleName: form.middleName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        adults: form.adults,
        children: form.children,
      });
      setSpecialRequests(specialRequestsLocal);

      router.push('/booking/checkout');

    } catch (error) {
      console.error('Booking submission error:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navigation />

      {/* Hero Section */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center animate-fadeIn">
            <div className="inline-flex items-center gap-2 bg-primary/10 dark:bg-primary/20 px-4 py-2 rounded-full mb-4">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-sm font-semibold text-primary">Step 3 of 4</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-accent dark:text-white mb-4">Guest Information</h1>
            <div className="max-w-2xl mx-auto mb-6">
              <BookingStepper current="details" />
            </div>
            <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 mb-2">
              Tell us who&apos;s staying so we can prepare everything for your visit.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You&apos;ll review your stay details and confirm your booking on the next step.
            </p>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-8 md:py-12 bg-gradient-to-b from-gray-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg border border-gray-200 dark:border-slate-800 p-4 md:p-6 lg:p-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-accent dark:text-white">Contact Details</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Please provide your information</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Profile Shortcut */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Logged in? You can pull your saved details to speed things up.
                  </p>
                  <Checkbox
                    label="Use my profile details"
                    checked={form.useProfile}
                    onChange={handleUseProfileChange}
                    disabled={!profileAvailable}
                    className={profileAvailable ? '' : 'opacity-60 cursor-not-allowed'}
                  />
                </div>
              </div>

              {/* Name fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <FormInput
                  label="First name *"
                  value={form.firstName}
                  onChange={(value) => updateField('firstName', value)}
                  placeholder="Juan"
                  error={errors.firstName}
                />
                <FormInput
                  label="Middle name"
                  value={form.middleName}
                  onChange={(value) => updateField('middleName', value)}
                  placeholder="Santos"
                />
                <FormInput
                  label="Last name *"
                  value={form.lastName}
                  onChange={(value) => updateField('lastName', value)}
                  placeholder="Dela Cruz"
                  error={errors.lastName}
                />
              </div>

              {/* Contact fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Email address *"
                  type="email"
                  value={form.email}
                  onChange={(value) => updateField('email', value)}
                  placeholder="you@example.com"
                  error={errors.email}
                />
                <FormInput
                  label="Phone number *"
                  type="tel"
                  value={form.phone}
                  onChange={(value) => updateField('phone', value)}
                  placeholder="+63 912 345 6789"
                  error={errors.phone}
                />
              </div>

              {/* Guests */}
              <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20 px-4 py-3 text-sm">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Guests</p>
                    <p className="text-gray-700 dark:text-gray-300">
                      Headcount is managed in the <span className="font-semibold">Booking Summary</span> section below.
                    </p>
                    <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                      Current: {form.adults} Adults, {form.children} Children
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-white">
                  Special requests (optional)
                </label>
                <textarea
                  rows={4}
                  value={specialRequestsLocal}
                  onChange={(e) => setSpecialRequestsLocal(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  placeholder="Allergies, late check-in, celebration notes, etc."
                ></textarea>
              </div>

              {/* Booking Summary */}
              <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800 p-5 md:p-6 shadow-lg">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Review your stay
                      </p>
                      <h3 className="text-lg font-bold text-accent dark:text-white">
                        Booking Summary
                      </h3>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary dark:border-primary/30">
                    {bookingType === 'overnight' ? 'Overnight Stay' : 'Day Use'}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Dates & items */}
                  <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Dates
                      </p>
                      <p className="mt-1">
                        {checkInDate ? new Date(checkInDate).toLocaleDateString() : 'Not set'}
                        {bookingType === 'overnight' && checkOutDate && (
                          <>
                            {' '}→ {new Date(checkOutDate).toLocaleDateString()}
                          </>
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Selection
                      </p>
                      <p className="mt-1">
                        {cartItems.length} product{cartItems.length === 1 ? '' : 's'} selected
                      </p>
                    </div>
                  </div>

                  {/* Editable headcount */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Headcount
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <CountSelector
                        label="Adults*"
                        value={form.adults}
                        min={1}
                        onChange={(value) => updateField('adults', value)}
                        helperText="13+ yrs"
                        error={errors.adults}
                      />
                      <CountSelector
                        label="Children"
                        value={form.children}
                        min={0}
                        onChange={(value) => updateField('children', value)}
                        helperText="0 - 12 yrs"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Adjust adults and children here. We&apos;ll use this for your booking records and fees.
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {submitError}
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-6 border-t-2 border-gray-200 dark:border-slate-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md">
                  By continuing, you agree to our house rules and cancellation policy. You&apos;ll see a
                  final summary of your stay before confirming the booking.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <Link
                    href="/booking/results"
                    className="px-6 py-3 rounded-xl border-2 border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200 w-full sm:w-auto text-center"
                  >
                    ← Back
                  </Link>
                  <PrimaryButton
                    type="submit"
                    className="w-full sm:w-auto text-center px-6 py-3"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Continuing...' : 'Continue to Payment →'}
                  </PrimaryButton>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
