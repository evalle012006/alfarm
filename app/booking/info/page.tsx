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
      <section className="py-16 hero-gradient">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center animate-fadeIn">
            <h1 className="section-title mb-3">Guest Information</h1>
            <div className="max-w-2xl mx-auto mb-6">
              <BookingStepper current="details" />
            </div>
            <p className="section-subtitle mb-4">
              Tell us who&apos;s staying so we can prepare everything for your visit.
            </p>
            <p className="text-gray-600 dark:text-white text-sm">
              You&apos;ll review your stay details and confirm your booking on the next step.
            </p>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-12 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-gray-50 dark:bg-accent-dark/70 rounded-2xl shadow-xl p-6 md:p-10">
            <h2 className="text-2xl font-bold text-accent dark:text-white mb-6">Contact Details</h2>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Profile Shortcut */}
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-gray-600 dark:text-white">
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

              {/* Name fields */}
              <div className="grid md:grid-cols-3 gap-4">
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
              <div className="grid md:grid-cols-2 gap-4">
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
              <div className="rounded-lg border border-slate-200 bg-white/80 px-4 py-3 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-gray-200">
                <p className="mb-1 font-medium">Guests</p>
                <p>
                  Headcount is managed in the <span className="font-semibold">Booking Summary</span> section below.
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Current: {form.adults} Adults, {form.children} Children
                </p>
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
                  className="input-field bg-white text-black"
                  placeholder="Allergies, late check-in, celebration notes, etc."
                ></textarea>
              </div>

              {/* Booking Summary */}
              <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Review your stay
                    </p>
                    <h3 className="text-lg font-semibold text-accent dark:text-white">
                      Booking Summary
                    </h3>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-sky-700 dark:border-sky-400/40 dark:bg-sky-500/15 dark:text-sky-200">
                    {bookingType === 'overnight' ? 'Overnight Stay' : 'Day Use'}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Dates & items */}
                  <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
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
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Selection
                      </p>
                      <p className="mt-1">
                        {cartItems.length} product{cartItems.length === 1 ? '' : 's'} selected
                      </p>
                    </div>
                  </div>

                  {/* Editable headcount */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Headcount
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <CountSelector
                        label="Adults *"
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
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
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

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                <p className="text-xs text-gray-500 dark:text-white max-w-md">
                  By continuing, you agree to our house rules and cancellation policy. You&apos;ll see a
                  final summary of your stay before confirming the booking.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <Link
                    href="/booking/results"
                    className="btn-outline w-full sm:w-auto text-center"
                  >
                    Back
                  </Link>
                  <PrimaryButton 
                    type="submit" 
                    className="w-full sm:w-auto text-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Continuing...' : 'Continue to Payment'}
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
