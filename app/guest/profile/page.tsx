'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
    User, Mail, Phone, LogOut, Shield, Calendar,
    Lock, KeyRound, Eye, EyeOff, Save, TrendingUp,
    CreditCard, Clock, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import FormInput from '@/components/ui/FormInput';

interface BookingStats {
    totalCount: number;
    totalSpent: number;
    lastBookingDate: string | null;
}

export default function GuestProfilePage() {
    const { user, token, logout, login, updateUser } = useAuth();
    const router = useRouter();

    // Personal Info State
    const [personalInfo, setPersonalInfo] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        phone: user?.phone || '',
    });

    // Password State
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    // Status State
    const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
    const [stats, setStats] = useState<BookingStats>({
        totalCount: 0,
        totalSpent: 0,
        lastBookingDate: null,
    });

    const hasProfileChanges = useMemo(() => {
        return (
            personalInfo.firstName !== user?.firstName ||
            personalInfo.lastName !== user?.lastName ||
            personalInfo.phone !== (user?.phone || '')
        );
    }, [personalInfo, user]);

    useEffect(() => {
        if (user) {
            setPersonalInfo({
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone || '',
            });
        }
    }, [user]);

    useEffect(() => {
        async function fetchStats() {
            if (!token) return;
            try {
                const res = await fetch('/api/bookings/history', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    const bookings = data.bookings || [];
                    const totalSpent = bookings.reduce((sum: number, b: any) =>
                        b.status !== 'cancelled' ? sum + parseFloat(b.total_amount) : sum, 0
                    );
                    setStats({
                        totalCount: data.pagination?.totalItems || bookings.length,
                        totalSpent,
                        lastBookingDate: bookings.length > 0 ? bookings[0].booking_date : null,
                    });
                }
            } catch (err) {
                console.error('Failed to fetch stats:', err);
            }
        }
        fetchStats();
    }, [token]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        try {
            setIsSubmittingProfile(true);
            const res = await fetch('/api/auth/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(personalInfo)
            });

            if (res.ok) {
                const data = await res.json();
                toast.success('Profile updated successfully');
                if (data.user) {
                    updateUser({ ...user, ...data.user });
                }
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to update profile');
            }
        } catch (err) {
            toast.error('An error occurred');
        } finally {
            setIsSubmittingProfile(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        try {
            setIsSubmittingPassword(true);
            const res = await fetch('/api/auth/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword,
                })
            });

            if (res.ok) {
                toast.success('Password changed successfully');
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to change password');
            }
        } catch (err) {
            toast.error('An error occurred');
        } finally {
            setIsSubmittingPassword(false);
        }
    };

    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully');
        router.push('/guest/login');
    };

    if (!user) return null;

    return (
        <DashboardLayout title="Account Settings">
            <div className="max-w-5xl mx-auto pb-12">

                {/* Profile Header section */}
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-slate-800 mb-8 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-12 opacity-5">
                        <User className="w-48 h-48" />
                    </div>

                    <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
                        <div className="w-32 h-32 rounded-3xl bg-primary/10 flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-lg shrink-0">
                            <span className="text-4xl font-black text-primary">
                                {user.firstName[0]}{user.lastName[0]}
                            </span>
                        </div>

                        <div className="text-center lg:text-left flex-grow">
                            <h2 className="text-3xl font-black text-accent dark:text-white uppercase tracking-tight mb-2">
                                {user.firstName} {user.lastName}
                            </h2>
                            <div className="flex flex-wrap justify-center lg:justify-start gap-3 items-center">
                                <span className="px-4 py-1.5 bg-accent/5 dark:bg-slate-800 rounded-full text-[10px] font-black text-accent dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <Mail className="w-3 h-3 text-primary" />
                                    {user.email}
                                </span>
                                <span className="px-4 py-1.5 bg-primary/5 rounded-full text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                                    <Calendar className="w-3 h-3" />
                                    Member since 2024
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="px-6 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-black rounded-2xl transition-all flex items-center gap-2 uppercase tracking-widest text-[10px] shadow-sm"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600">
                                <Clock className="w-6 h-6" />
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Bookings</p>
                        </div>
                        <p className="text-3xl font-black text-accent dark:text-white uppercase">{stats.totalCount}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl text-green-600">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Investment</p>
                        </div>
                        <p className="text-3xl font-black text-accent dark:text-white uppercase">₱{stats.totalSpent.toLocaleString()}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-orange-600">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Adventure</p>
                        </div>
                        <p className="text-xl font-black text-accent dark:text-white uppercase truncate">
                            {stats.lastBookingDate ? new Date(stats.lastBookingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'}
                        </p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-5 gap-10">
                    {/* Main Info Form */}
                    <div className="lg:col-span-3 space-y-8">
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 border border-gray-100 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-accent dark:text-white uppercase tracking-tight">Personal Information</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Update your contact details</p>
                                </div>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <FormInput
                                        label="First Name"
                                        value={personalInfo.firstName}
                                        onChange={(val) => setPersonalInfo({ ...personalInfo, firstName: val })}
                                        placeholder="Enter your first name"
                                        required
                                        className="rounded-2xl"
                                    />
                                    <FormInput
                                        label="Last Name"
                                        value={personalInfo.lastName}
                                        onChange={(val) => setPersonalInfo({ ...personalInfo, lastName: val })}
                                        placeholder="Enter your last name"
                                        required
                                        className="rounded-2xl"
                                    />
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="opacity-60 relative">
                                        <FormInput
                                            label="Email Address"
                                            value={user.email}
                                            readOnly
                                            className="rounded-2xl bg-gray-50 dark:bg-slate-800/50 cursor-not-allowed pr-10"
                                        />
                                        <Lock className="w-4 h-4 text-gray-400 absolute right-4 top-[2.4rem]" />
                                    </div>
                                    <FormInput
                                        label="Phone Number"
                                        value={personalInfo.phone}
                                        onChange={(val) => setPersonalInfo({ ...personalInfo, phone: val })}
                                        placeholder="e.g., 09123456789"
                                        className="rounded-2xl"
                                    />
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={!hasProfileChanges || isSubmittingProfile}
                                        className="w-full md:w-auto px-10 py-4 bg-primary text-white font-black rounded-2xl transition-all shadow-xl shadow-primary/20 uppercase tracking-widest text-[10px] disabled:opacity-50 disabled:shadow-none hover:bg-primary-600 flex items-center justify-center gap-3"
                                    >
                                        {isSubmittingProfile ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        Save Profile Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Password Sidebar */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm sticky top-24">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-accent/5 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-accent dark:text-white">
                                    <Lock className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-accent dark:text-white uppercase tracking-tight">Security</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Update your password</p>
                                </div>
                            </div>

                            <form onSubmit={handleUpdatePassword} className="space-y-5">
                                <div className="relative">
                                    <FormInput
                                        label="Current Password"
                                        type={showCurrentPass ? 'text' : 'password'}
                                        value={passwordForm.currentPassword}
                                        onChange={(val) => setPasswordForm({ ...passwordForm, currentPassword: val })}
                                        required
                                        className="rounded-2xl pr-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                                        className="absolute right-4 top-[2.3rem] text-gray-400 hover:text-accent"
                                    >
                                        {showCurrentPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>

                                <div className="relative">
                                    <FormInput
                                        label="New Password"
                                        type={showNewPass ? 'text' : 'password'}
                                        value={passwordForm.newPassword}
                                        onChange={(val) => setPasswordForm({ ...passwordForm, newPassword: val })}
                                        required
                                        className="rounded-2xl pr-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPass(!showNewPass)}
                                        className="absolute right-4 top-[2.3rem] text-gray-400 hover:text-accent"
                                    >
                                        {showNewPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>

                                <div className="relative">
                                    <FormInput
                                        label="Confirm New Password"
                                        type={showConfirmPass ? 'text' : 'password'}
                                        value={passwordForm.confirmPassword}
                                        onChange={(val) => setPasswordForm({ ...passwordForm, confirmPassword: val })}
                                        required
                                        className="rounded-2xl pr-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                                        className="absolute right-4 top-[2.3rem] text-gray-400 hover:text-accent"
                                    >
                                        {showConfirmPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={isSubmittingPassword || !passwordForm.currentPassword || !passwordForm.newPassword}
                                        className="w-full py-4 bg-accent dark:bg-white text-white dark:text-accent font-black rounded-2xl transition-all shadow-xl shadow-accent/10 dark:shadow-none uppercase tracking-widest text-[10px] disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {isSubmittingPassword ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <KeyRound className="w-4 h-4" />
                                        )}
                                        Update Password
                                    </button>
                                </div>
                            </form>

                            <div className="mt-8 p-4 bg-accent/5 dark:bg-slate-800/50 rounded-2xl border border-accent/5">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">
                                    Tip: Use at least 8 characters with a mix of letters, numbers, and symbols for better security.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
