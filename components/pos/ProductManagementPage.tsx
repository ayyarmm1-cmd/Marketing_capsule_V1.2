import React, { useState, useEffect, useCallback } from 'react';
import { POSProduct } from '../../types';
import { apiGetPOSProducts, apiAddPOSProduct, apiUpdatePOSProduct, apiDeletePOSProduct } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import Modal from '../ui/Modal';

const ProductManagementPage: React.FC = () => {
    const { user, hasPermission } = useAuth();
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation();
    const [products, setProducts] = useState<POSProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<POSProduct | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');

    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        description: '',
        category: '',
        priceMMK: 0,
        costMMK: 0,
        stockQuantity: 0,
        reorderPoint: 0,
        reorderQuantity: 0,
        supplierId: '',
        supplierName: '',
        taxPercentage: 0,
        isActive: true,
    });
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedProducts = await apiGetPOSProducts();
            setProducts(fetchedProducts);
        } catch (error) {
            console.error("Failed to load products:", error);
            addNotification("Failed to load products.", "error");
        }
        setIsLoading(false);
    }, [addNotification]);

    const handleOpenModal = (product?: POSProduct) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                sku: product.sku,
                name: product.name,
                description: product.description || '',
                category: product.category || '',
                priceMMK: product.priceMMK,
                costMMK: product.costMMK || 0,
                stockQuantity: product.stockQuantity,
                reorderPoint: product.reorderPoint || 0,
                reorderQuantity: product.reorderQuantity || 0,
                supplierId: product.supplierId || '',
                supplierName: product.supplierName || '',
                taxPercentage: product.taxPercentage || 0,
                isActive: product.isActive,
            });
            setImagePreviews(product.images || []);
            setImageFiles([]);
        } else {
            setEditingProduct(null);
            setFormData({
                sku: '',
                name: '',
                description: '',
                category: '',
                priceMMK: 0,
                costMMK: 0,
                stockQuantity: 0,
                reorderPoint: 0,
                reorderQuantity: 0,
                supplierId: '',
                supplierName: '',
                taxPercentage: 0,
                isActive: true,
            });
            setImagePreviews([]);
            setImageFiles([]);
        }
        setIsModalOpen(true);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newFiles = [...imageFiles, ...files];
        setImageFiles(newFiles);
        
        // Create previews for new files only
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    setImagePreviews(prev => [...prev, reader.result as string]);
                }
            };
            reader.readAsDataURL(file);
        });
        
        // Reset file input
        e.target.value = '';
    };

    const removeImage = (index: number) => {
        const existingImageCount = editingProduct?.images?.length || 0;
        const isExistingImage = index < existingImageCount;
        
        // Remove from previews
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
        
        if (isExistingImage && editingProduct) {
            // Remove from existing images
            const updatedImages = editingProduct.images?.filter((_, i) => i !== index) || [];
            setEditingProduct({ ...editingProduct, images: updatedImages });
        } else {
            // Remove from new image files
            const newImageIndex = index - existingImageCount;
            setImageFiles(prev => prev.filter((_, i) => i !== newImageIndex));
        }
    };

    const handleSubmit = async () => {
        if (!formData.sku || !formData.name || formData.priceMMK <= 0) {
            addNotification("Please fill in all required fields.", "error");
            return;
        }

        try {
            if (editingProduct) {
                // Get existing images that are still in previews (not removed)
                const existingImages = editingProduct.images?.filter((img, idx) => 
                    imagePreviews.includes(img)
                ) || [];
                
                await apiUpdatePOSProduct({
                    id: editingProduct.id,
                    ...formData,
                    images: existingImages,
                }, imageFiles);
                addNotification("Product updated successfully!", "success");
            } else {
                await apiAddPOSProduct(formData, imageFiles);
                addNotification("Product created successfully!", "success");
            }
            setIsModalOpen(false);
            setImageFiles([]);
            setImagePreviews([]);
            fetchData();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addNotification(`Failed to save product: ${errorMessage}`, "error");
        }
    };

    const handleDelete = async (product: POSProduct) => {
        const confirmed = await showConfirmation(
            "Delete Product",
            `Are you sure you want to delete "${product.name}"? This action cannot be undone.`
        );
        if (!confirmed) return;

        try {
            await apiDeletePOSProduct(product.id);
            addNotification("Product deleted successfully!", "success");
            fetchData();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addNotification(`Failed to delete product: ${errorMessage}`, "error");
        }
    };

    const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort();
    const filteredProducts = products.filter(p => {
        const matchesSearch = !searchTerm || 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !selectedCategory || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Product Management</h1>
                {hasPermission('MANAGE_POS_PRODUCTS' as any) && (
                    <Button onClick={() => handleOpenModal()} variant="primary">+ New Product</Button>
                )}
            </div>

            <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Select
                        label="Category"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        options={[
                            { value: '', label: 'All Categories' },
                            ...categories.map(cat => ({ value: cat, label: cat }))
                        ]}
                        containerClassName="mb-0"
                    />
                </div>
            </div>

            <div className="bg-container-bg dark:bg-slate-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-100 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">SKU</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Category</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Price</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Stock</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredProducts.map(product => (
                            <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="px-4 py-3 text-sm">
                                    <div className="flex items-center gap-3">
                                        {product.images && product.images.length > 0 ? (
                                            <img
                                                src={product.images[0]}
                                                alt={product.name}
                                                className="w-10 h-10 object-cover rounded border border-slate-200 dark:border-slate-700"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center text-xs text-text-secondary">
                                                No Image
                                            </div>
                                        )}
                                        <span>{product.sku}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-sm font-medium">{product.name}</td>
                                <td className="px-4 py-3 text-sm">{product.category || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm">{product.priceMMK.toLocaleString()} MMK</td>
                                <td className="px-4 py-3 text-sm">{product.stockQuantity}</td>
                                <td className="px-4 py-3 text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                        {product.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm space-x-2">
                                    <Button size="sm" variant="ghost" onClick={() => handleOpenModal(product)}>Edit</Button>
                                    {hasPermission('MANAGE_POS_PRODUCTS' as any) && (
                                        <Button size="sm" variant="danger" onClick={() => handleDelete(product)}>Delete</Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredProducts.length === 0 && (
                    <p className="text-center text-text-secondary py-8">No products found.</p>
                )}
            </div>

            {isModalOpen && (
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={editingProduct ? 'Edit Product' : 'New Product'}
                >
                    <div className="space-y-4">
                        <Input
                            label="SKU *"
                            value={formData.sku}
                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        />
                        <Input
                            label="Name *"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                        <Input
                            label="Description"
                            as="textarea"
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                        <Input
                            label="Category"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Price (MMK) *"
                                type="number"
                                value={formData.priceMMK}
                                onChange={(e) => setFormData({ ...formData, priceMMK: Number(e.target.value) || 0 })}
                            />
                            <Input
                                label="Cost (MMK)"
                                type="number"
                                value={formData.costMMK}
                                onChange={(e) => setFormData({ ...formData, costMMK: Number(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <Input
                                label="Stock Quantity"
                                type="number"
                                value={formData.stockQuantity}
                                onChange={(e) => setFormData({ ...formData, stockQuantity: Number(e.target.value) || 0 })}
                            />
                            <Input
                                label="Reorder Point"
                                type="number"
                                value={formData.reorderPoint}
                                onChange={(e) => setFormData({ ...formData, reorderPoint: Number(e.target.value) || 0 })}
                            />
                            <Input
                                label="Reorder Quantity"
                                type="number"
                                value={formData.reorderQuantity}
                                onChange={(e) => setFormData({ ...formData, reorderQuantity: Number(e.target.value) || 0 })}
                            />
                        </div>
                        <Input
                            label="Tax Percentage"
                            type="number"
                            value={formData.taxPercentage}
                            onChange={(e) => setFormData({ ...formData, taxPercentage: Number(e.target.value) || 0 })}
                        />
                        <div>
                            <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-2">
                                Product Images
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageChange}
                                className="block w-full text-sm text-text-secondary
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-md file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-primary-action file:text-white
                                    hover:file:bg-blue-700
                                    cursor-pointer"
                            />
                            {imagePreviews.length > 0 && (
                                <div className="mt-4 grid grid-cols-3 gap-4">
                                    {imagePreviews.map((preview, index) => (
                                        <div key={index} className="relative">
                                            <img
                                                src={preview}
                                                alt={`Preview ${index + 1}`}
                                                className="w-full h-32 object-cover rounded border border-slate-200 dark:border-slate-700"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="mr-2"
                            />
                            <label htmlFor="isActive" className="text-sm">Active</label>
                        </div>
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleSubmit}>Save</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ProductManagementPage;






