'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    User,
    Calendar,
    Package,
    ShoppingCart,
    Plus,
    Minus,
    Check,
    Loader2,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Clock,
    CreditCard
} from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

import Modal from '@/components/admin/Modal';
import QuantitySelector from '@/components/admin/QuantitySelector';

interface Product {
    id: number;
    title: string;
    pricePerNight: number;
    capacity: string[];
    description: string;
    type: string;
    category: string;
    time_slot: string;
}

interface AvailabilityItem {
    id: number;
    name: string;
    category: string;
    pricing_unit: string;
    time_slot: string;
    remaining: number;
    is_available: boolean;
}

export default function NewBookingPage() {
    const router = useRouter();

    // --- Form State ---
    const [guestInfo, setGuestInfo] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: ''
    });

    const [bookingDetails, setBookingDetails] = useState({
        booking_type: 'day' as 'day' | 'overnight',
        booking_date: format(new Date(), 'yyyy-MM-dd'),
        check_out_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        booking_time: 'day', // 'day' | 'night'
        special_requests: '',
        status: 'confirmed',
        payment_status: 'unpaid',
        payment_method: 'cash'
    });

    // --- Product Selection State ---
    const [products, setProducts] = useState<Product[]>([]);
    const [availability, setAvailability] = useState<Record<number, AvailabilityItem>>({});
    const [selectedQtys, setSelectedQtys] = useState<Record<number, number>>({});

    // --- UI State ---
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

    // --- Fetch Products on Mount ---
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setIsLoadingProducts(true);
                const res = await fetch('/api/products');
                if (!res.ok) throw new Error('Failed to fetch products');
                const data = await res.json();
                setProducts(data);

                // Expand first few categories by default
                const categories = Array.from(new Set(data.map((p: Product) => p.category)));
                setExpandedCategories(categories.slice(0, 2) as string[]);
            } catch (error: any) {
                toast.error(error.message);
            } finally {
                setIsLoadingProducts(false);
            }
        };
        fetchProducts();
    }, []);

    // --- Check Availability when dates/type changes ---
    useEffect(() => {
        const checkAvailability = async () => {
            if (!bookingDetails.booking_date) return;

            try {
                setIsCheckingAvailability(true);
                const params = new URLSearchParams({
                    date: bookingDetails.booking_date,
                    type: bookingDetails.booking_type,
                });

                if (bookingDetails.booking_type === 'overnight' && bookingDetails.check_out_date) {
                    params.append('check_out', bookingDetails.check_out_date);
                    params.append('check_in', bookingDetails.booking_date);
                } else {
                    params.append('check_in', bookingDetails.booking_date);
                    params.append('time_slot', bookingDetails.booking_time);
                }

                const res = await fetch(`/api/availability?${params.toString()}`);
                if (!res.ok) throw new Error('Failed to check availability');
                const data = await res.json();

                const availMap: Record<number, AvailabilityItem> = {};
                data.availability.forEach((item: AvailabilityItem) => {
                    availMap[item.id] = item;
                });
                setAvailability(availMap);

                // Reset quantities for items that are no longer available
                setSelectedQtys(prev => {
                    const next = { ...prev };
                    let changed = false;
                    Object.keys(next).forEach(id => {
                        const pid = parseInt(id);
                        if (!availMap[pid] || availMap[pid].remaining <= 0) {
                            delete next[pid];
                            changed = true;
                        } else if (next[pid] > availMap[pid].remaining) {
                            next[pid] = availMap[pid].remaining;
                            changed = true;
                        }
                    });
                    return changed ? next : prev;
                });

            } catch (error: any) {
                console.error(error);
                toast.error('Availability check failed');
            } finally {
                setIsCheckingAvailability(false);
            }
        };

        const timeoutId = setTimeout(checkAvailability, 500);
        return () => clearTimeout(timeoutId);
    }, [bookingDetails.booking_date, bookingDetails.booking_type, bookingDetails.check_out_date, bookingDetails.booking_time]);

    // --- Calculations ---
    const numNights = useMemo(() => {
        if (bookingDetails.booking_type !== 'overnight') return 1;
        try {
            const diff = differenceInDays(new Date(bookingDetails.check_out_date), new Date(bookingDetails.booking_date));
            return Math.max(1, diff);
        } catch {
            return 1;
        }
    }, [bookingDetails.booking_date, bookingDetails.check_out_date, bookingDetails.booking_type]);

    const orderItems = useMemo(() => {
        return Object.entries(selectedQtys).map(([id, qty]) => {
            const product = products.find(p => p.id === parseInt(id));
            if (!product) return null;

            const avail = availability[product.id];
            const isPerNight = avail?.pricing_unit === 'per_night';
            const unitPrice = product.pricePerNight;
            const subtotal = isPerNight && bookingDetails.booking_type === 'overnight'
                ? unitPrice * qty * numNights
                : unitPrice * qty;

            return {
                ...product,
                quantity: qty,
                subtotal,
                isPerNight
            };
        }).filter(Boolean);
    }, [selectedQtys, products, availability, numNights, bookingDetails.booking_type]);

    const totalAmount = useMemo(() => {
        return orderItems.reduce((sum, item) => sum + (item?.subtotal || 0), 0);
    }, [orderItems]);

    // --- Handlers ---
    const toggleCategory = (category: string) => {
        setExpandedCategories(prev =>
            prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
        );
    };

    const handleQtyChange = (productId: number, qty: number) => {
        setSelectedQtys(prev => {
            if (qty <= 0) {
                const { [productId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [productId]: qty };
        });
    };

    const validateForm = () => {
        if (!guestInfo.first_name || !guestInfo.last_name || !guestInfo.email || !guestInfo.phone) {
            toast.error('Please fill in all guest information');
            return false;
        }
        if (orderItems.length === 0) {
            toast.error('Please select at least one product');
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        try {
            setIsSubmitting(true);
            const body = {
                guest_info: guestInfo,
                booking_date: bookingDetails.booking_date,
                check_out_date: bookingDetails.booking_type === 'overnight' ? bookingDetails.check_out_date : null,
                booking_time: bookingDetails.booking_type === 'day' ? bookingDetails.booking_time : null,
                booking_type: bookingDetails.booking_type,
                items: orderItems.map(item => ({
                    product_id: item!.id,
                    quantity: item!.quantity
                })),
                status: bookingDetails.status,
                payment_status: bookingDetails.payment_status,
                payment_method: bookingDetails.payment_method,
                special_requests: bookingDetails.special_requests
            };

            const res = await fetch('/api/admin/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create booking');
            }

            const data = await res.json();
            toast.success('Booking created successfully');
            router.push(`/admin/bookings/${data.booking_id}`);
        } catch (error: any) {
            toast.error(error.message);
            setIsConfirmModalOpen(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Group Products ---
    const groupedProducts = useMemo(() => {
        const groups: Record<string, Product[]> = {};

        // Define relevant time slot filter
        let relevantSlots: string[] = ['any'];
        if (bookingDetails.booking_type === 'day') {
            relevantSlots.push(bookingDetails.booking_time); // 'day' or 'night'
        } else {
            relevantSlots.push('night'); // Overnight stays include the night
        }

        products.forEach(p => {
            // Filter by time_slot
            if (!relevantSlots.includes(p.time_slot)) return;

            if (!groups[p.category]) groups[p.category] = [];
            groups[p.category].push(p);
        });
        return groups;
    }, [products, bookingDetails.booking_type, bookingDetails.booking_time]);

    // Reusable styles to match Project Style
    const cardClass = "bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm";
    const inputClass = "w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dark:text-white";
    const labelClass = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5";

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Link
                    href="/admin/bookings"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-primary transition-colors w-fit"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Bookings
                </Link>
                <h1 className="text-3xl font-bold text-accent dark:text-white">Create New Booking</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Forms */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Guest Information Card */}
                    <div className={cardClass}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <User className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-accent dark:text-white">Guest Information</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>First Name *</label>
                                <input
                                    type="text"
                                    value={guestInfo.first_name}
                                    onChange={e => setGuestInfo(prev => ({ ...prev, first_name: e.target.value }))}
                                    className={inputClass}
                                    placeholder="John"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Last Name *</label>
                                <input
                                    type="text"
                                    value={guestInfo.last_name}
                                    onChange={e => setGuestInfo(prev => ({ ...prev, last_name: e.target.value }))}
                                    className={inputClass}
                                    placeholder="Doe"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Email *</label>
                                <input
                                    type="email"
                                    value={guestInfo.email}
                                    onChange={e => setGuestInfo(prev => ({ ...prev, email: e.target.value }))}
                                    className={inputClass}
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Phone *</label>
                                <input
                                    type="tel"
                                    value={guestInfo.phone}
                                    onChange={e => setGuestInfo(prev => ({ ...prev, phone: e.target.value }))}
                                    className={inputClass}
                                    placeholder="0917 XXX XXXX"
                                />
                            </div>
                        </div>
                        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 italic">
                            If the email matches an existing guest, the booking will be linked to their account.
                        </p>
                    </div>

                    {/* Booking Details Card */}
                    <div className={cardClass}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-accent dark:text-white">Booking Details</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-xl w-full">
                                    <button
                                        onClick={() => setBookingDetails(prev => ({ ...prev, booking_type: 'day' }))}
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${bookingDetails.booking_type === 'day' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-gray-500'}`}
                                    >
                                        Day Use
                                    </button>
                                    <button
                                        onClick={() => setBookingDetails(prev => ({ ...prev, booking_type: 'overnight' }))}
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${bookingDetails.booking_type === 'overnight' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-gray-500'}`}
                                    >
                                        Overnight
                                    </button>
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        {bookingDetails.booking_type === 'overnight' ? 'Check-in Date *' : 'Booking Date *'}
                                    </label>
                                    <input
                                        type="date"
                                        value={bookingDetails.booking_date}
                                        onChange={e => setBookingDetails(prev => ({ ...prev, booking_date: e.target.value }))}
                                        className={inputClass}
                                    />
                                </div>

                                {bookingDetails.booking_type === 'overnight' ? (
                                    <div>
                                        <label className={labelClass}>Check-out Date *</label>
                                        <input
                                            type="date"
                                            value={bookingDetails.check_out_date}
                                            min={addDays(new Date(bookingDetails.booking_date), 1).toISOString().split('T')[0]}
                                            onChange={e => setBookingDetails(prev => ({ ...prev, check_out_date: e.target.value }))}
                                            className={inputClass}
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className={labelClass}>Booking Time</label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <input
                                                    type="radio"
                                                    checked={bookingDetails.booking_time === 'day'}
                                                    onChange={() => setBookingDetails(prev => ({ ...prev, booking_time: 'day' }))}
                                                    className="w-4 h-4 text-primary bg-gray-100 border-gray-300 focus:ring-primary"
                                                />
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">Day (8AM-5PM)</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <input
                                                    type="radio"
                                                    checked={bookingDetails.booking_time === 'night'}
                                                    onChange={() => setBookingDetails(prev => ({ ...prev, booking_time: 'night' }))}
                                                    className="w-4 h-4 text-primary bg-gray-100 border-gray-300 focus:ring-primary"
                                                />
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">Night (6PM-7AM)</span>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className={labelClass}>Special Requests (Optional)</label>
                                <textarea
                                    value={bookingDetails.special_requests}
                                    onChange={e => setBookingDetails(prev => ({ ...prev, special_requests: e.target.value }))}
                                    rows={5}
                                    className={`${inputClass} resize-none`}
                                    placeholder="Any notes from the guest..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Product Selection Card */}
                    <div className={cardClass}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <Package className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold text-accent dark:text-white">Product Selection</h2>
                            </div>
                            {isCheckingAvailability && (
                                <div className="flex items-center gap-2 text-xs font-semibold text-primary/70 animate-pulse">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Checking real-time stock...
                                </div>
                            )}
                        </div>

                        {isLoadingProducts ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                                <p className="text-sm text-gray-500">Loading catalog...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(groupedProducts).map(([category, catProducts]) => (
                                    <div key={category} className="border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                                        <button
                                            onClick={() => toggleCategory(category)}
                                            className="w-full px-5 py-4 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            <span className="font-bold text-accent dark:text-white uppercase tracking-wider text-xs">{category}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-bold text-gray-400 bg-gray-200/50 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                                                    {catProducts.length} items
                                                </span>
                                                {expandedCategories.includes(category) ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                            </div>
                                        </button>

                                        {expandedCategories.includes(category) && (
                                            <div className="divide-y divide-gray-100 dark:divide-slate-800">
                                                {catProducts.map(p => {
                                                    const avail = availability[p.id];
                                                    const isDisabled = !avail || avail.remaining <= 0;
                                                    const isSelected = !!selectedQtys[p.id];

                                                    return (
                                                        <div
                                                            key={p.id}
                                                            className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${isDisabled ? 'grayscale opacity-50' : 'hover:bg-gray-50/30 dark:hover:bg-slate-800/20'}`}
                                                        >
                                                            <div className="flex-1 space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-bold text-accent dark:text-white">{p.title}</h4>
                                                                    {isSelected && <Check className="w-3 h-3 text-green-500" />}
                                                                </div>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{p.description}</p>
                                                                <div className="flex items-center gap-3 pt-1">
                                                                    <span className="text-sm font-bold text-primary">₱{p.pricePerNight.toLocaleString()}</span>
                                                                    <span className="text-[10px] font-medium text-gray-400 uppercase">/ {avail?.pricing_unit === 'per_night' ? 'Night' : 'Piece'}</span>
                                                                    {avail && (
                                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${avail.remaining > 5 ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'}`}>
                                                                            {avail.remaining} left
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <QuantitySelector
                                                                    value={selectedQtys[p.id] || 0}
                                                                    onChange={val => handleQtyChange(p.id, val)}
                                                                    max={avail?.remaining}
                                                                    disabled={isDisabled}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Summary Card (Sticky) */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24 space-y-6">
                        <div className={cardClass}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <ShoppingCart className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold text-accent dark:text-white">Order Summary</h2>
                            </div>

                            {/* Selection Preview */}
                            <div className="space-y-4 mb-8">
                                {orderItems.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-6 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-xl">
                                        <Package className="w-8 h-8 mb-2 opacity-20" />
                                        <p className="text-xs font-medium">No items selected yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {orderItems.map(item => (
                                            <div key={item!.id} className="flex justify-between items-start text-sm group">
                                                <div className="flex-1">
                                                    <p className="font-bold text-accent dark:text-white group-hover:text-primary transition-colors">{item!.title}</p>
                                                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                                        {item!.quantity} x ₱{item!.pricePerNight.toLocaleString()}
                                                        {item!.isPerNight && bookingDetails.booking_type === 'overnight' && ` (${numNights} nights)`}
                                                    </p>
                                                </div>
                                                <p className="font-bold text-accent dark:text-white">₱{item!.subtotal.toLocaleString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Settings */}
                            <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-slate-800">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Initial Status</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setBookingDetails(prev => ({ ...prev, status: 'confirmed' }))}
                                            className={`py-2 text-xs font-bold rounded-lg transition-all border ${bookingDetails.status === 'confirmed' ? 'bg-primary border-primary text-white' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:border-primary'}`}
                                        >
                                            Confirmed
                                        </button>
                                        <button
                                            onClick={() => setBookingDetails(prev => ({ ...prev, status: 'pending' }))}
                                            className={`py-2 text-xs font-bold rounded-lg transition-all border ${bookingDetails.status === 'pending' ? 'bg-yellow-600 border-yellow-600 text-white' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:border-yellow-600'}`}
                                        >
                                            Pending
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Payment</label>
                                        <select
                                            value={bookingDetails.payment_status}
                                            onChange={e => setBookingDetails(prev => ({ ...prev, payment_status: e.target.value }))}
                                            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-accent dark:text-white"
                                        >
                                            <option value="unpaid">Unpaid</option>
                                            <option value="paid">Paid</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Method</label>
                                        <select
                                            value={bookingDetails.payment_method}
                                            onChange={e => setBookingDetails(prev => ({ ...prev, payment_method: e.target.value }))}
                                            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-accent dark:text-white"
                                        >
                                            <option value="cash">Cash</option>
                                            <option value="gcash">GCash</option>
                                            <option value="paymaya">PayMaya</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Total & Submit */}
                            <div className="pt-8 mt-8 border-t border-gray-100 dark:border-slate-800">
                                <div className="flex justify-between items-end mb-6">
                                    <p className="text-sm font-bold text-gray-400 dark:text-gray-500">Total Amount</p>
                                    <p className="text-4xl font-black text-primary">₱{totalAmount.toLocaleString()}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        if (validateForm()) setIsConfirmModalOpen(true);
                                    }}
                                    className="w-full bg-gradient-to-r from-primary to-primary-600 text-white font-black py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 group"
                                >
                                    <span>Create Booking</span>
                                    <Check className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                </button>
                            </div>
                        </div>

                        {/* Help Box */}
                        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/20">
                            <div className="flex gap-3">
                                <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
                                <div className="space-y-2">
                                    <p className="text-sm font-bold text-blue-900 dark:text-blue-300">Walk-in Logic</p>
                                    <p className="text-xs text-blue-700/80 dark:text-blue-400/80 leading-relaxed">
                                        Admins can bypass standard booking rules but must respect real-time availability.
                                        Ensure dates and guest contacts are correct before confirming.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            <Modal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                title="Review Booking"
                size="md"
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Guest</p>
                            <p className="font-bold text-accent dark:text-white">{guestInfo.first_name} {guestInfo.last_name}</p>
                            <p className="text-sm text-gray-500">{guestInfo.email}</p>
                            <p className="text-sm text-gray-500">{guestInfo.phone}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Stay</p>
                            <p className="font-bold text-accent dark:text-white uppercase text-sm">
                                {bookingDetails.booking_type} Stay
                            </p>
                            <p className="text-sm text-gray-500">
                                {format(new Date(bookingDetails.booking_date), 'MMM dd, yyyy')}
                                {bookingDetails.booking_type === 'overnight' && ` — ${format(new Date(bookingDetails.check_out_date), 'MMM dd, yyyy')}`}
                            </p>
                            {bookingDetails.booking_type === 'day' && (
                                <p className="text-xs text-primary font-bold uppercase mt-1">
                                    {bookingDetails.booking_time === 'day' ? '8AM - 5PM' : '6PM - 7AM'}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-4 space-y-3">
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Selected Items</p>
                            {orderItems.map(item => (
                                <div key={item!.id} className="flex justify-between text-sm">
                                    <span className="text-gray-500">
                                        {item!.quantity}x {item!.title}
                                        {item!.isPerNight && bookingDetails.booking_type === 'overnight' && ` (${numNights} nights)`}
                                    </span>
                                    <span className="font-bold text-accent dark:text-white">₱{item!.subtotal.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <div className="pt-3 border-t border-gray-200 dark:border-slate-700 flex justify-between items-center">
                            <span className="text-sm font-black uppercase text-gray-400">Grand Total</span>
                            <span className="text-2xl font-black text-primary">₱{totalAmount.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Status</p>
                                <p className="text-xs font-bold text-accent dark:text-white capitalize">{bookingDetails.status}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
                            <CreditCard className="w-4 h-4 text-gray-400" />
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Payment</p>
                                <p className="text-xs font-bold text-accent dark:text-white capitalize">{bookingDetails.payment_method}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={() => setIsConfirmModalOpen(false)}
                            className="flex-1 px-6 py-3 rounded-xl font-bold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
                        >
                            Back to Edit
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 rounded-xl font-black bg-gradient-to-r from-primary to-primary-600 text-white hover:shadow-xl hover:shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                            Confirm & Create
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
