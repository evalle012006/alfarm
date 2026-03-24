'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  Upload,
  ScanLine,
  UserCheck,
  XCircle,
  Loader2,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import StatusBadge from '@/components/admin/StatusBadge';
import { adminFetch } from '@/lib/adminFetch';

interface BookingItem {
  id: number;
  product_id: number;
  product_name: string;
  category: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface ScannedBooking {
  id: number;
  booking_date: string;
  check_out_date: string | null;
  booking_type: string;
  booking_time: string | null;
  status: string;
  payment_status: string;
  payment_method: string;
  total_amount: number;
  guest_first_name: string;
  guest_last_name: string;
  guest_email: string;
  guest_phone: string;
  checked_in_at: string | null;
  created_at: string;
  items: BookingItem[];
}

type ScanMode = 'idle' | 'camera' | 'processing';

export default function AdminCheckinPage() {
  const [scanMode, setScanMode] = useState<ScanMode>('idle');
  const [booking, setBooking] = useState<ScannedBooking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerContainerId = 'qr-reader';

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lookupQR = useCallback(async (qrValue: string) => {
    setIsLookingUp(true);
    setError(null);
    setBooking(null);

    try {
      const res = await adminFetch('/api/admin/bookings/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_value: qrValue }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.error?.message || data?.error || 'Failed to look up QR code';
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        return;
      }

      setBooking(data.booking);
    } catch (err: any) {
      setError(err.message || 'Network error looking up QR code');
    } finally {
      setIsLookingUp(false);
    }
  }, []);

  // ─── Camera scanning ───
  const startCamera = async () => {
    setError(null);
    setBooking(null);
    setCameraStarting(true);
    setScanMode('camera');

    // Small delay to let the DOM render the container
    await new Promise((r) => setTimeout(r, 200));

    try {
      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        async (decodedText) => {
          // QR decoded — stop camera and look up
          await stopCamera();
          setScanMode('processing');
          lookupQR(decodedText);
        },
        () => {
          // Ignore scan failures (no QR in frame)
        }
      );
    } catch (err: any) {
      console.error('Camera start error:', err);
      setError(
        typeof err === 'string'
          ? err
          : err?.message || 'Could not access camera. Please check permissions or try uploading an image instead.'
      );
      setScanMode('idle');
    } finally {
      setCameraStarting(false);
    }
  };

  const stopCamera = async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        // 2 = SCANNING, 3 = PAUSED
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch {
      // Ignore cleanup errors
    }
  };

  const handleCancelCamera = async () => {
    await stopCamera();
    setScanMode('idle');
  };

  // ─── Image upload ───
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setBooking(null);
    setScanMode('processing');

    try {
      const scanner = new Html5Qrcode('qr-file-scanner');
      const result = await scanner.scanFile(file, true);
      scanner.clear();
      lookupQR(result);
    } catch {
      setError('Could not read a QR code from this image. Make sure the image is clear and contains a valid AlFarm booking QR.');
      setScanMode('idle');
    }

    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ─── Check-in action ───
  const handleCheckIn = async () => {
    if (!booking) return;

    setIsCheckingIn(true);
    try {
      const res = await adminFetch(`/api/admin/bookings/${booking.id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || data?.error || 'Failed to check in');
      }

      toast.success(`${booking.guest_first_name} ${booking.guest_last_name} checked in successfully!`);

      // Refresh booking state
      setBooking((prev) =>
        prev ? { ...prev, status: 'checked_in', checked_in_at: new Date().toISOString() } : prev
      );
    } catch (err: any) {
      toast.error(err.message || 'Check-in failed');
    } finally {
      setIsCheckingIn(false);
    }
  };

  // ─── Reset ───
  const handleReset = async () => {
    await stopCamera();
    setBooking(null);
    setError(null);
    setScanMode('idle');
  };

  // ─── Helpers ───
  const canCheckIn = booking && ['pending', 'confirmed'].includes(booking.status);
  const isAlreadyCheckedIn = booking && ['checked_in', 'checked_out', 'completed'].includes(booking.status);
  const isCancelled = booking?.status === 'cancelled';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link
          href="/admin/bookings"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-primary transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Bookings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-accent dark:text-white flex items-center gap-3">
              <ScanLine className="w-8 h-8 text-primary" />
              QR Check-In
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Scan a guest&apos;s booking QR code to view details and check them in
            </p>
          </div>
        </div>
      </div>

      {/* Scanner Area */}
      {!booking && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Scan Mode Selector */}
          {scanMode === 'idle' && (
            <div className="p-8">
              <div className="max-w-md mx-auto text-center space-y-6">
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                  <ScanLine className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-accent dark:text-white mb-2">
                    Scan Booking QR Code
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Use your device camera or upload a QR code image to look up a booking
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <button
                    onClick={startCamera}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all group"
                  >
                    <div className="w-14 h-14 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                      <Camera className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-accent dark:text-white">Camera Scan</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Use device camera to scan live
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 hover:border-secondary hover:bg-secondary/5 dark:hover:bg-secondary/10 transition-all group"
                  >
                    <div className="w-14 h-14 rounded-xl bg-secondary/10 group-hover:bg-secondary/20 flex items-center justify-center transition-colors">
                      <Upload className="w-7 h-7 text-secondary" />
                    </div>
                    <div>
                      <p className="font-bold text-accent dark:text-white">Upload Image</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Select a QR code image file
                      </p>
                    </div>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Camera View */}
          {scanMode === 'camera' && (
            <div className="relative">
              <div className="bg-black">
                <div
                  id={scannerContainerId}
                  className="w-full max-w-md mx-auto"
                  style={{ minHeight: 300 }}
                />
              </div>
              {cameraStarting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                  <div className="text-center text-white">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                    <p className="font-semibold">Starting camera...</p>
                  </div>
                </div>
              )}
              <div className="p-4 flex items-center justify-between bg-gray-50 dark:bg-slate-800">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Point camera at the booking QR code
                </p>
                <button
                  onClick={handleCancelCamera}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 dark:bg-red-900/10 dark:border-red-800 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Processing State */}
          {scanMode === 'processing' && isLookingUp && (
            <div className="p-12 text-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300 font-semibold">Looking up booking...</p>
            </div>
          )}
        </div>
      )}

      {/* Hidden container for file-based QR scanning */}
      <div id="qr-file-scanner" className="hidden" />

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-red-800 dark:text-red-300 mb-1">QR Scan Failed</h3>
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Booking Result */}
      {booking && (
        <div className="space-y-6 animate-fadeIn">
          {/* Status Banner */}
          {canCheckIn && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                  <div>
                    <h3 className="font-bold text-green-800 dark:text-green-300 text-lg">
                      Ready for Check-In
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      Booking #{booking.id} &mdash; {booking.guest_first_name} {booking.guest_last_name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCheckIn}
                  disabled={isCheckingIn}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 shadow-lg shadow-green-600/20 hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {isCheckingIn ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <UserCheck className="w-5 h-5" />
                  )}
                  {isCheckingIn ? 'Checking In...' : 'Check In Guest'}
                </button>
              </div>
            </div>
          )}

          {isAlreadyCheckedIn && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <UserCheck className="w-8 h-8 text-blue-500" />
                <div>
                  <h3 className="font-bold text-blue-800 dark:text-blue-300 text-lg">
                    Already {booking.status === 'checked_in' ? 'Checked In' : booking.status === 'checked_out' ? 'Checked Out' : 'Completed'}
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    Booking #{booking.id} &mdash; {booking.guest_first_name} {booking.guest_last_name}
                    {booking.checked_in_at && (
                      <> &middot; Checked in at {format(new Date(booking.checked_in_at), 'MMM dd, yyyy HH:mm')}</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isCancelled && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-red-500" />
                <div>
                  <h3 className="font-bold text-red-800 dark:text-red-300 text-lg">
                    Booking Cancelled
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    Booking #{booking.id} has been cancelled and cannot be checked in.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Booking Details Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-accent dark:text-white">
                    {booking.guest_first_name} {booking.guest_last_name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Booking #{booking.id} &middot; {booking.guest_email} &middot; {booking.guest_phone}
                  </p>
                </div>
                <div className="flex gap-2">
                  <StatusBadge status={booking.status} />
                  <StatusBadge status={booking.payment_status} />
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase">
                      {booking.booking_type === 'overnight' ? 'Check-in' : 'Date'}
                    </span>
                  </div>
                  <p className="font-bold text-accent dark:text-white">
                    {format(new Date(booking.booking_date), 'MMM dd, yyyy')}
                  </p>
                  {booking.booking_type === 'overnight' && booking.check_out_date && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Check-out: {format(new Date(booking.check_out_date), 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase">Type</span>
                  </div>
                  <p className="font-bold text-accent dark:text-white capitalize">
                    {booking.booking_type === 'overnight' ? 'Overnight Stay' : 'Day Use'}
                  </p>
                  {booking.booking_time && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase">
                      {booking.booking_time}
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase">Payment</span>
                  </div>
                  <p className="font-bold text-accent dark:text-white capitalize">
                    {booking.payment_method === 'paymongo' ? 'Online' : booking.payment_method}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
                    {booking.payment_status}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase">Total</span>
                  </div>
                  <p className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    &#8369;{booking.total_amount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Reserved Items
                </h3>
                <div className="divide-y divide-gray-100 dark:divide-slate-800 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
                  {booking.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-4 py-3 bg-gray-50/50 dark:bg-slate-800/50"
                    >
                      <div>
                        <span className="font-semibold text-accent dark:text-white">
                          {item.product_name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          {item.category} &middot; Qty {item.quantity} &times; &#8369;{item.unit_price.toLocaleString()}
                        </span>
                      </div>
                      <span className="font-bold text-primary whitespace-nowrap">
                        &#8369;{item.subtotal.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-100 dark:border-slate-800 flex flex-wrap gap-3">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Scan Another
              </button>
              <Link
                href={`/admin/bookings/${booking.id}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-primary border border-primary/30 bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors"
              >
                View Full Booking
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
