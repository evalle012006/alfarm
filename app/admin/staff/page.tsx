'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Pencil,
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  Save,
  UserCircle,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import Modal from '@/components/admin/Modal';
import AuditTrail from '@/components/admin/AuditTrail';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface StaffUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface AdminUser {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

type PermissionSet = string[] | '*';

export default function StaffManagement() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [permissions, setPermissions] = useState<PermissionSet>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Check permissions
  const canManageStaff = permissions === '*' || permissions.includes('staff:manage');
  const canReadStaff = permissions === '*' || permissions.includes('staff:read');

  useEffect(() => {
    fetchPermissions();
  }, []);

  useEffect(() => {
    if (canReadStaff) {
      fetchStaff();
    }
  }, [canReadStaff, includeInactive]);

  async function fetchPermissions() {
    try {
      const response = await fetch('/api/admin/me', { credentials: 'include' });
      if (!response.ok) {
        router.push('/admin/login');
        return;
      }
      const data = await response.json();
      setPermissions(data.permissions);
      setCurrentUser(data.user);
    } catch {
      router.push('/admin/login');
    }
  }

  async function fetchStaff() {
    try {
      setLoading(true);
      const url = includeInactive
        ? '/api/admin/staff?include_inactive=true'
        : '/api/admin/staff';
      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        if (response.status === 403) {
          setError('You do not have permission to view staff');
          return;
        }
        throw new Error('Failed to fetch staff');
      }

      const data = await response.json();
      setStaff(data.staff);
    } catch (err) {
      setError('Failed to load staff list');
    } finally {
      setLoading(false);
    }
  }

  async function toggleStaffStatus(staffId: number, currentStatus: boolean) {
    if (!canManageStaff) return;

    try {
      const response = await fetch(`/api/admin/staff/${staffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error?.message || 'Failed to update staff status');
        return;
      }

      toast.success(`Staff member ${currentStatus ? 'disabled' : 'enabled'} successfully`);
      fetchStaff();
    } catch {
      toast.error('Failed to update staff status');
    }
  }

  if (!canReadStaff && !loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-slate-950 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            You do not have permission to view this page.
          </div>
          <Link href="/admin/dashboard" className="text-primary hover:underline mt-4 inline-block">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950 dark:text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-accent dark:text-white">Staff Management</h1>
            <p className="text-gray-600 dark:text-gray-300">Manage staff accounts and permissions</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/admin/dashboard"
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              ← Back
            </Link>
            {canManageStaff && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                + Add Staff
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4 mb-6 border border-gray-200 dark:border-slate-800">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Show inactive staff</span>
          </label>
        </div>

        {/* Staff Table */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-slate-800">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">Loading staff...</p>
            </div>
          ) : staff.length === 0 ? (
            <div className="p-8 text-center text-gray-600 dark:text-gray-300">
              No staff members found.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  {canManageStaff && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {staff.map((member) => (
                  <tr key={member.id} className={!member.isActive ? 'opacity-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">{member.firstName} {member.lastName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">
                      {member.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${member.role === 'super_admin' || member.role === 'root' || member.role === 'admin'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${member.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canManageStaff && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingStaffId(member.id);
                              setIsEditModalOpen(true);
                            }}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Edit Staff"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleStaffStatus(member.id, member.isActive)}
                            disabled={currentUser?.email === member.email}
                            className={`p-2 rounded-lg transition-colors ${member.isActive
                              ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                              : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                              } ${currentUser?.email === member.email ? 'opacity-30 cursor-not-allowed' : ''}`}
                            title={member.isActive ? 'Disable Staff' : 'Enable Staff'}
                          >
                            <CheckCircle2 className={`w-4 h-4 ${member.isActive ? 'text-red-500' : 'text-green-500'}`} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Staff Modal */}
      {isEditModalOpen && editingStaffId && (
        <EditStaffModal
          staffId={editingStaffId}
          currentAdmin={currentUser}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingStaffId(null);
          }}
          onSuccess={() => {
            setIsEditModalOpen(false);
            setEditingStaffId(null);
            fetchStaff();
          }}
        />
      )}

      {showCreateModal && (
        <CreateStaffModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchStaff();
          }}
        />
      )}
    </div>
  );
}

// --- Edit Staff Modal Component ---

interface EditStaffModalProps {
  staffId: number;
  currentAdmin: AdminUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

function EditStaffModal({ staffId, currentAdmin, onClose, onSuccess }: EditStaffModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    role: ''
  });

  // Password reset state
  const [passwords, setPasswords] = useState({
    new: '',
    confirm: ''
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showRoleConfirm, setShowRoleConfirm] = useState(false);
  const [pendingRole, setPendingRole] = useState<string | null>(null);

  const isSelf = currentAdmin?.email === staff?.email;

  const fetchStaffDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/staff/${staffId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch details');
      const data = await response.json();
      setStaff(data.staff);
      setFormData({
        firstName: data.staff.firstName,
        lastName: data.staff.lastName,
        phone: data.staff.phone || '',
        role: data.staff.role
      });
    } catch (err) {
      toast.error("Failed to load staff details");
      onClose();
    } finally {
      setIsLoading(false);
    }
  }, [staffId, onClose]);

  useEffect(() => {
    fetchStaffDetails();
  }, [fetchStaffDetails]);

  const handleProfileUpdate = async () => {
    if (!staff) return;

    // Only send changed fields
    const changes: any = {};
    if (formData.firstName !== staff.firstName) changes.firstName = formData.firstName;
    if (formData.lastName !== staff.lastName) changes.lastName = formData.lastName;
    if (formData.phone !== (staff.phone || '')) changes.phone = formData.phone;
    if (formData.role !== staff.role) changes.role = formData.role;

    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/staff/${staffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(changes),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Update failed');
      }

      toast.success("Staff updated successfully");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (passwords.new.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsResettingPassword(true);
    try {
      const response = await fetch(`/api/admin/staff/${staffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: passwords.new }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Password reset failed');
      }

      toast.success("Password reset successfully");
      setPasswords({ new: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Edit Staff Member">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="mt-4 text-gray-500 font-medium">Loading profile...</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Staff Profile">
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Section 1: Staff Info Header */}
        <div className="flex items-center gap-6 p-6 bg-gray-50 dark:bg-slate-800/50 rounded-3xl border border-gray-100 dark:border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-primary/20">
            {staff?.firstName?.[0]}{staff?.lastName?.[0]}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                {staff?.email}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-400">
                Added {staff?.createdAt ? format(new Date(staff.createdAt), 'MMM dd, yyyy') : 'Recently'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Editable Fields */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">First Name</label>
              <input
                type="text"
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold outline-none"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Last Name</label>
              <input
                type="text"
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold outline-none"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                className="w-full pl-12 pr-5 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold outline-none"
                placeholder="09XX-XXX-XXXX"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Role / Permissions</label>
            <select
              disabled={isSelf}
              className={`w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold outline-none appearance-none ${isSelf ? 'opacity-50 cursor-not-allowed' : ''}`}
              value={formData.role}
              onChange={(e) => {
                const newRole = e.target.value;
                if (newRole !== staff?.role) {
                  setPendingRole(newRole);
                  setShowRoleConfirm(true);
                }
                setFormData({ ...formData, role: newRole });
              }}
            >
              <option value="cashier">Cashier</option>
              <option value="super_admin">Super Admin</option>
            </select>
            {isSelf && (
              <p className="text-[10px] text-orange-500 font-bold uppercase mt-1 ml-1 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                You cannot change your own role
              </p>
            )}
            {showRoleConfirm && (
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-2xl mt-4 animate-in zoom-in-95 duration-200">
                <div className="flex gap-3">
                  <ShieldAlert className="w-5 h-5 text-orange-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-orange-800 dark:text-orange-400 uppercase tracking-wider mb-1">Confirm Role Change</p>
                    <p className="text-sm text-orange-700 dark:text-orange-500">
                      Changing to <span className="font-black underline">{pendingRole}</span> will immediately update this user's access level.
                    </p>
                    <div className="flex gap-4 mt-3">
                      <button
                        onClick={() => setShowRoleConfirm(false)}
                        className="text-xs font-black text-orange-800 dark:text-orange-400 hover:underline"
                      >
                        Understood
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Password Reset */}
        <div className="pt-8 border-t border-gray-100 dark:border-slate-800">
          <div className="p-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-[2rem] space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-red-900 dark:text-red-400 tracking-tight">System Security Reset</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative group">
                <input
                  type={showPasswords ? "text" : "password"}
                  placeholder="New Password"
                  className="w-full pl-5 pr-12 py-3.5 bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/30 rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-semibold outline-none"
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                />
                <button
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <input
                type={showPasswords ? "text" : "password"}
                placeholder="Confirm New Password"
                className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/30 rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-semibold outline-none"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              />
            </div>

            <button
              onClick={handlePasswordReset}
              disabled={isResettingPassword || !passwords.new}
              className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-slate-800 text-white font-black rounded-2xl shadow-lg shadow-red-200 dark:shadow-none transition-all flex items-center justify-center gap-2 group"
            >
              {isResettingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
              Force Password Reset
            </button>
          </div>
        </div>

        {/* Section 4: Audit Trail */}
        <div className="pt-8 border-t border-gray-100 dark:border-slate-800">
          <AuditTrail
            entityId={staffId}
            entityType="user"
            title="Profile Audit Trail"
          />
        </div>

        {/* Final Actions */}
        <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-gray-100 dark:border-slate-800 focus-within:z-10">
          <button
            onClick={onClose}
            className="flex-1 px-8 py-4 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-black rounded-2xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleProfileUpdate}
            disabled={isSaving}
            className="flex-1 px-8 py-4 bg-primary text-white font-black rounded-2xl hover:shadow-2xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 group shadow-xl shadow-primary/10"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />}
            Save Official Records
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CreateStaffModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'cashier',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error?.message || 'Failed to create staff');
        setLoading(false);
        return;
      }

      toast.success("Staff account created successfully");
      onSuccess();
    } catch {
      toast.error('Failed to create staff');
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Staff Account">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">First Name</label>
            <input
              type="text"
              required
              className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold outline-none"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Last Name</label>
            <input
              type="text"
              required
              className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold outline-none"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              required
              className="w-full pl-12 pr-5 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold outline-none"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Temporary Password</label>
          <div className="relative">
            <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="password"
              required
              minLength={8}
              className="w-full pl-12 pr-5 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold outline-none"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 ml-1">Minimum 8 characters</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Role</label>
            <select
              className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold outline-none appearance-none"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="cashier">Cashier</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Phone (Optional)</label>
            <div className="relative">
              <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                className="w-full pl-12 pr-5 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold outline-none"
                placeholder="09XX..."
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-gray-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-8 py-4 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-black rounded-2xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-8 py-4 bg-primary text-white font-black rounded-2xl hover:shadow-2xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 group shadow-xl shadow-primary/10"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />}
            Create Account
          </button>
        </div>
      </form>
    </Modal>
  );
}
