'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product?: {
        id: number;
        name: string;
        category_id: number;
        category_name: string;
        description: string;
        capacity: number;
        price: number;
        pricing_unit: string;
        time_slot: string;
        inventory_count: number;
        image_url: string | null;
        is_active: boolean;
    } | null;
}

export default function ProductModal({ isOpen, onClose, product }: ProductModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        category_id: 1,
        description: '',
        capacity: 0,
        price: 0,
        pricing_unit: 'fixed',
        time_slot: 'any',
        inventory_count: 1,
        image_url: '',
        is_active: true
    });

    // Reset form when product changes or modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: product?.name || '',
                category_id: product?.category_id || 1,
                description: product?.description || '',
                capacity: product?.capacity || 0,
                price: product?.price || 0,
                pricing_unit: product?.pricing_unit || 'fixed',
                time_slot: product?.time_slot || 'any',
                inventory_count: product?.inventory_count || 1,
                image_url: product?.image_url || '',
                is_active: product?.is_active ?? true
            });
        }
    }, [isOpen, product]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // UI only - no actual submission
        console.log('Form data:', formData);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={product ? 'Edit Product' : 'Create New Product'}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Product Name *
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="e.g., Deluxe Suite"
                    />
                </div>

                {/* Category */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category *
                    </label>
                    <select
                        required
                        value={formData.category_id}
                        onChange={(e) => setFormData({ ...formData, category_id: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    >
                        <option value={1}>Entrance Fee</option>
                        <option value={2}>Accommodation</option>
                        <option value={3}>Amenities</option>
                        <option value={4}>Rentals</option>
                    </select>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description *
                    </label>
                    <textarea
                        required
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Describe the product..."
                    />
                </div>

                {/* Price and Pricing Unit */}
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Price (₱) *
                        </label>
                        <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            placeholder="0"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Pricing Unit *
                        </label>
                        <select
                            required
                            value={formData.pricing_unit}
                            onChange={(e) => setFormData({ ...formData, pricing_unit: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        >
                            <option value="fixed">Fixed</option>
                            <option value="per_head">Per Head</option>
                            <option value="per_hour">Per Hour</option>
                            <option value="per_night">Per Night</option>
                        </select>
                    </div>
                </div>

                {/* Time Slot and Capacity */}
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Time Slot *
                        </label>
                        <select
                            required
                            value={formData.time_slot}
                            onChange={(e) => setFormData({ ...formData, time_slot: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        >
                            <option value="day">Day</option>
                            <option value="night">Night</option>
                            <option value="any">Any</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Capacity
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={formData.capacity}
                            onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            placeholder="0 for N/A"
                        />
                    </div>
                </div>

                {/* Inventory and Status */}
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Inventory Count *
                        </label>
                        <input
                            type="number"
                            required
                            min="1"
                            value={formData.inventory_count}
                            onChange={(e) => setFormData({ ...formData, inventory_count: Number(e.target.value) })}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            placeholder="1"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Status
                        </label>
                        <div className="flex items-center h-[50px]">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                                    {formData.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Image URL */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Image URL (Optional)
                    </label>
                    <input
                        type="url"
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="https://example.com/image.jpg"
                    />
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-600 text-white font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all"
                    >
                        {product ? 'Update Product' : 'Create Product'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
