'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tag, Plus, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/adminFetch';
import Modal from '@/components/admin/Modal';

interface Category {
    id: number;
    name: string;
    description: string;
    created_at: string;
    product_count?: number;
}

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({ name: '', description: '' });

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminFetch('/api/admin/categories');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();

            // Enrich with product counts
            const prodRes = await adminFetch('/api/admin/products?limit=1000');
            let productCounts: Record<number, number> = {};
            if (prodRes.ok) {
                const prodData = await prodRes.json();
                (prodData.products || []).forEach((p: any) => {
                    productCounts[p.category_id] = (productCounts[p.category_id] || 0) + 1;
                });
            }

            setCategories(
                (data.categories || []).map((c: Category) => ({
                    ...c,
                    product_count: productCounts[c.id] || 0,
                }))
            );
        } catch {
            toast.error('Failed to load categories');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCategories(); }, [fetchCategories]);

    const handleCreate = async () => {
        if (!formData.name.trim()) {
            toast.error('Category name is required');
            return;
        }
        setIsSaving(true);
        try {
            const res = await adminFetch('/api/admin/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create');
            }
            toast.success('Category created');
            setIsModalOpen(false);
            setFormData({ name: '', description: '' });
            fetchCategories();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const inputClass = "w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-accent dark:text-white flex items-center gap-3">
                        <Tag className="w-8 h-8 text-primary" />
                        Categories
                        <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded-full">
                            {categories.length}
                        </span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Manage product categories for your inventory.
                    </p>
                </div>
                <button
                    onClick={() => { setFormData({ name: '', description: '' }); setIsModalOpen(true); }}
                    className="px-6 py-3 bg-gradient-to-r from-primary to-primary-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    New Category
                </button>
            </div>

            {/* Categories Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : categories.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-16 text-center">
                    <Package className="w-12 h-12 text-gray-200 dark:text-slate-700 mx-auto mb-4" />
                    <p className="text-gray-400 font-medium">No categories yet.</p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((cat) => (
                        <div
                            key={cat.id}
                            className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
                                    {cat.name.charAt(0)}
                                </div>
                                <span className="text-xs font-bold px-2 py-1 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 rounded-lg">
                                    {cat.product_count || 0} products
                                </span>
                            </div>
                            <h3 className="font-black text-accent dark:text-white text-lg">{cat.name}</h3>
                            {cat.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{cat.description}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create Category Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Category" size="sm">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={inputClass}
                            placeholder="e.g., Accommodation"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className={`${inputClass} resize-none`}
                            placeholder="Optional description..."
                        />
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-800">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            disabled={isSaving}
                            className="flex-1 px-6 py-3 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={isSaving}
                            className="flex-1 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                            Create
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
