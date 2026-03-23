'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Package, Search } from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/adminFetch';
import Modal from './Modal';

interface BookingItem {
    id: number;
    product_id: number;
    product_name: string;
    category: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
}

interface Product {
    id: number;
    name: string;
    category_name: string;
    price: number;
    pricing_unit: string;
    inventory_count: number;
    is_active: boolean;
}

interface BookingItemsEditorProps {
    bookingId: string | number;
    items: BookingItem[];
    bookingStatus: string;
    totalAmount: number;
    onRefresh: () => void;
}

export default function BookingItemsEditor({
    bookingId,
    items,
    bookingStatus,
    totalAmount,
    onRefresh,
}: BookingItemsEditorProps) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [isAdding, setIsAdding] = useState(false);
    const [removingId, setRemovingId] = useState<number | null>(null);

    const isEditable = !['completed', 'cancelled'].includes(bookingStatus);

    useEffect(() => {
        if (isAddModalOpen) {
            fetchProducts();
        }
    }, [isAddModalOpen]);

    const fetchProducts = async () => {
        try {
            const res = await adminFetch('/api/admin/products?limit=200&is_active=true');
            if (res.ok) {
                const data = await res.json();
                setProducts(data.products || []);
            }
        } catch {
            toast.error('Failed to load products');
        }
    };

    const handleAddItem = async () => {
        if (!selectedProduct) return;
        setIsAdding(true);
        try {
            const res = await adminFetch(`/api/admin/bookings/${bookingId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_id: selectedProduct.id, quantity }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to add item');
            }
            toast.success(`Added ${selectedProduct.name}`);
            setIsAddModalOpen(false);
            setSelectedProduct(null);
            setQuantity(1);
            setProductSearch('');
            onRefresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemoveItem = async (itemId: number, productName: string) => {
        if (!confirm(`Remove "${productName}" from this booking?`)) return;
        setRemovingId(itemId);
        try {
            const res = await adminFetch(`/api/admin/bookings/${bookingId}/items`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_id: itemId }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to remove item');
            }
            toast.success(`Removed ${productName}`);
            onRefresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setRemovingId(null);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.category_name.toLowerCase().includes(productSearch.toLowerCase())
    );

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600">
                        <Package className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-accent dark:text-white">Booked Items</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{items.length} item(s)</p>
                    </div>
                </div>
                {isEditable && (
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Add Item
                    </button>
                )}
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-gray-100 dark:border-slate-800">
                            <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Product</th>
                            <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Category</th>
                            <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Qty</th>
                            <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Unit Price</th>
                            <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Subtotal</th>
                            {isEditable && (
                                <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                        {items.map((item) => (
                            <tr key={item.id} className="group">
                                <td className="py-3 font-semibold text-sm text-accent dark:text-white">{item.product_name}</td>
                                <td className="py-3 text-sm text-gray-500 dark:text-gray-400">{item.category}</td>
                                <td className="py-3 text-sm text-center font-bold">{item.quantity}</td>
                                <td className="py-3 text-sm text-right text-gray-600 dark:text-gray-300">₱{item.unit_price.toLocaleString()}</td>
                                <td className="py-3 text-sm text-right font-bold text-accent dark:text-white">₱{item.subtotal.toLocaleString()}</td>
                                {isEditable && (
                                    <td className="py-3 text-right">
                                        <button
                                            onClick={() => handleRemoveItem(item.id, item.product_name)}
                                            disabled={removingId === item.id || items.length <= 1}
                                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                            title={items.length <= 1 ? 'Cannot remove the last item' : 'Remove item'}
                                        >
                                            {removingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-gray-200 dark:border-slate-700">
                            <td colSpan={isEditable ? 4 : 3} className="py-3 text-sm font-bold text-accent dark:text-white text-right">Total</td>
                            <td className="py-3 text-right font-black text-lg text-primary">₱{totalAmount.toLocaleString()}</td>
                            {isEditable && <td />}
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Add Item Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setSelectedProduct(null); setProductSearch(''); }} title="Add Product to Booking" size="md">
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search products..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none text-accent dark:text-white"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                        />
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-1 border border-gray-100 dark:border-slate-800 rounded-xl p-2">
                        {filteredProducts.length === 0 ? (
                            <p className="text-center text-sm text-gray-400 py-6">No products found</p>
                        ) : (
                            filteredProducts.map((product) => (
                                <button
                                    key={product.id}
                                    onClick={() => setSelectedProduct(product)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm ${
                                        selectedProduct?.id === product.id
                                            ? 'bg-primary/10 border border-primary/30 text-primary'
                                            : 'hover:bg-gray-50 dark:hover:bg-slate-800 text-accent dark:text-white'
                                    }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold">{product.name}</p>
                                            <p className="text-xs text-gray-400">{product.category_name} · {product.pricing_unit}</p>
                                        </div>
                                        <span className="font-bold text-sm">₱{product.price.toLocaleString()}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {selectedProduct && (
                        <div className="flex items-center gap-4 p-3 bg-primary/5 rounded-xl border border-primary/20">
                            <div className="flex-1">
                                <p className="font-bold text-sm text-accent dark:text-white">{selectedProduct.name}</p>
                                <p className="text-xs text-gray-500">₱{selectedProduct.price.toLocaleString()} × {quantity} = ₱{(selectedProduct.price * quantity).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Qty:</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-16 px-2 py-1.5 text-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-bold outline-none text-accent dark:text-white"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                        <button
                            onClick={() => { setIsAddModalOpen(false); setSelectedProduct(null); setProductSearch(''); }}
                            className="flex-1 px-6 py-3 rounded-xl font-bold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddItem}
                            disabled={!selectedProduct || isAdding}
                            className="flex-1 px-6 py-3 rounded-xl font-bold bg-primary text-white hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Add to Booking
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
