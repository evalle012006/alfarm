'use client';

import { useState } from 'react';
import Modal from './Modal';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product?: {
        id: string;
        name: string;
        type: string;
        description: string;
        capacity: string;
        pricePerNight: number;
    } | null;
}

export default function ProductModal({ isOpen, onClose, product }: ProductModalProps) {
    const [formData, setFormData] = useState({
        name: product?.name || '',
        type: product?.type || 'room',
        description: product?.description || '',
        capacity: product?.capacity || '',
        pricePerNight: product?.pricePerNight || 0,
        imageUrl: ''
    });

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

                {/* Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Product Type *
                    </label>
                    <select
                        required
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    >
                        <option value="room">Room</option>
                        <option value="day-use">Day Use</option>
                        <option value="add-on">Add-on</option>
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

                {/* Capacity and Price */}
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Capacity *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.capacity}
                            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            placeholder="e.g., 4 Adults"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Price per Night *
                        </label>
                        <input
                            type="number"
                            required
                            min="0"
                            value={formData.pricePerNight}
                            onChange={(e) => setFormData({ ...formData, pricePerNight: Number(e.target.value) })}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            placeholder="0"
                        />
                    </div>
                </div>

                {/* Image URL */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Image URL (Optional)
                    </label>
                    <input
                        type="url"
                        value={formData.imageUrl}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
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
