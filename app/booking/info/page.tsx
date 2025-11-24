'use client';

import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import PrimaryButton from '@/components/ui/PrimaryButton';
import FormInput from '@/components/ui/FormInput';
import Checkbox from '@/components/ui/Checkbox';
import CountSelector from '@/components/ui/CountSelector';

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

interface StoredUserProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export default function BookingInfoPage() {
  const [form, setForm] = useState<GuestInfoForm>({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    adults: 2,
    children: 0,
    useProfile: false,
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [profile, setProfile] = useState<StoredUserProfile | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored) as StoredUserProfile;
        setProfile(parsed);
      }
    } catch {
      // ignore parsing errors
    }
  }, []);

  const updateField = <K extends keyof GuestInfoForm>(field: K, value: GuestInfoForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUseProfileChange = (checked: boolean) => {
    setForm((prev) => {
      const next: GuestInfoForm = { ...prev, useProfile: checked };
      if (checked && profile) {
        next.firstName = profile.firstName ?? next.firstName;
        next.lastName = profile.lastName ?? next.lastName;
        next.email = profile.email ?? next.email;
        next.phone = profile.phone ?? next.phone;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Placeholder: replace with actual booking submission later
    console.log('Guest info submitted', form);
    alert('Guest information captured. Booking flow continues next.');
  };

  return (
    <>
      <Navigation />

      {/* Hero Section */}
      <section className="py-16 hero-gradient">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center animate-fadeIn">
            <h1 className="section-title mb-3">Guest Information</h1>
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
                  disabled={!profile}
                  className={profile ? '' : 'opacity-60 cursor-not-allowed'}
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
              <div className="grid md:grid-cols-2 gap-6">
                <CountSelector
                  label="Adults *"
                  value={form.adults}
                  min={1}
                  onChange={(value) => updateField('adults', value)}
                  helperText="13 years old and above"
                  error={errors.adults}
                />
                <CountSelector
                  label="Children"
                  value={form.children}
                  min={0}
                  onChange={(value) => updateField('children', value)}
                  helperText="0 - 12 years old"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-white">
                  Special requests (optional)
                </label>
                <textarea
                  rows={4}
                  className="input-field"
                  placeholder="Allergies, late check-in, celebration notes, etc."
                ></textarea>
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                <p className="text-xs text-gray-500 dark:text-white max-w-md">
                  By continuing, you agree to our house rules and cancellation policy. You&apos;ll see a
                  final summary of your stay before confirming the booking.
                </p>
                <PrimaryButton type="submit" className="w-full md:w-auto text-center">
                  Continue to Review
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
