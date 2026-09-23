import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { POSProduct, POSProductCategory, InventoryTransaction, InventoryTransactionType, POSProductVariant } from '../../types';
import { 
    apiGetPOSProducts, 
    apiAddPOSProduct, 
    apiUpdatePOSProduct, 
    apiDeletePOSProduct,
    apiGetInventoryTransactions,
    apiAddInventoryTransaction,
    apiGetLowStockProducts,
    apiGetPOSCategories,
    apiAddPOSCategory,
    apiUpdatePOSCategory,
    apiDeletePOSCategory,
    apiUploadFile
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import Modal from '../ui/Modal';
import InventoryExcelImportModal from './InventoryExcelImportModal';

const ProductsInventoryPage: React.FC = () => {
    const { user, hasPermission } = useAuth();
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation();
    const [activeTab, setActiveTab] = useState<'products' | 'inventory' | 'categories'>('products');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('productsInventorySidebarCollapsed');
        return saved ? JSON.parse(saved) : false;
    });

    useEffect(() => {
        localStorage.setItem('productsInventorySidebarCollapsed', JSON.stringify(isSidebarCollapsed));
    }, [isSidebarCollapsed]);
    
    // Products state
    const [products, setProducts] = useState<POSProduct[]>([]);
    const [categories, setCategories] = useState<POSProductCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<POSProduct | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [productFormData, setProductFormData] = useState({
        sku: '',
        name: '',
        description: '',
        category: '',
        categoryId: '',
        priceMMK: 0,
        costMMK: 0,
        stockQuantity: 0,
        minStockQuantity: 0,
        supplierId: '',
        supplierName: '',
        taxPercentage: 0,
        isActive: true,
    });
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [variants, setVariants] = useState<POSProductVariant[]>([]);
    const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
    const [editingVariant, setEditingVariant] = useState<POSProductVariant | null>(null);
    const [variantFormData, setVariantFormData] = useState({
        name: '',
        sku: '',
        priceMMK: 0,
        stockQuantity: 0,
        isActive: true,
    });
    const [variantImageFile, setVariantImageFile] = useState<File | null>(null);
    const [variantImagePreview, setVariantImagePreview] = useState<string>('');

    // Inventory state
    const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
    const [lowStockProducts, setLowStockProducts] = useState<POSProduct[]>([]);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [transactionFormData, setTransactionFormData] = useState({
        productId: '',
        type: 'STOCK_IN' as 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT',
        quantity: 0,
        costMMK: 0,
        notes: '',
    });
    const [isQuickStockInOpen, setIsQuickStockInOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Categories state
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<POSProductCategory | null>(null);
    const [categoryFormData, setCategoryFormData] = useState({
        name: '',
        description: '',
        isActive: true,
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fetchedProducts, fetchedCategories, fetchedTransactions, lowStock] = await Promise.all([
                apiGetPOSProducts(),
                apiGetPOSCategories(),
                apiGetInventoryTransactions(),
                apiGetLowStockProducts(),
            ]);
            setProducts(fetchedProducts);
            setCategories(fetchedCategories);
            setTransactions(fetchedTransactions);
            setLowStockProducts(lowStock);
        } catch (error) {
            console.error("Failed to load data:", error);
            addNotification("Failed to load data.", "error");
        }
        setIsLoading(false);
    }, [addNotification]);

    // Product handlers
    const handleOpenProductModal = (product?: POSProduct) => {
        if (product) {
            setEditingProduct(product);
            setProductFormData({
                sku: product.sku,
                name: product.name,
                description: product.description || '',
                category: product.category || '',
                categoryId: product.categoryId || '',
                priceMMK: product.priceMMK,
                costMMK: product.costMMK || 0,
                stockQuantity: product.stockQuantity,
                minStockQuantity: product.minStockQuantity || 0,
                supplierId: product.supplierId || '',
                supplierName: product.supplierName || '',
                taxPercentage: product.taxPercentage || 0,
                isActive: product.isActive,
            });
            setImagePreviews(product.images || []);
            setImageFiles([]);
            setVariants(product.variants || []);
        } else {
            setEditingProduct(null);
            setProductFormData({
                sku: '',
                name: '',
                description: '',
                category: '',
                categoryId: '',
                priceMMK: 0,
                costMMK: 0,
                stockQuantity: 0,
                minStockQuantity: 0,
                supplierId: '',
                supplierName: '',
                taxPercentage: 0,
                isActive: true,
            });
            setImagePreviews([]);
            setImageFiles([]);
            setVariants([]);
        }
        setIsProductModalOpen(true);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newFiles = [...imageFiles, ...files];
        setImageFiles(newFiles);
        
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    setImagePreviews(prev => [...prev, reader.result as string]);
                }
            };
            reader.readAsDataURL(file);
        });
        
        e.target.value = '';
    };

    const removeImage = (index: number) => {
        const existingImageCount = editingProduct?.images?.length || 0;
        const isExistingImage = index < existingImageCount;
        
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
        
        if (isExistingImage && editingProduct) {
            const updatedImages = editingProduct.images?.filter((_, i) => i !== index) || [];
            setEditingProduct({ ...editingProduct, images: updatedImages });
        } else {
            const newImageIndex = index - existingImageCount;
            setImageFiles(prev => prev.filter((_, i) => i !== newImageIndex));
        }
    };

    const handleProductSubmit = async () => {
        if (!productFormData.sku || !productFormData.name || productFormData.priceMMK <= 0) {
            addNotification("Please fill in all required fields.", "error");
            return;
        }

        try {
            // Get category name from categoryId if provided
            const categoryName = productFormData.categoryId 
                ? categories.find(c => c.id === productFormData.categoryId)?.name || productFormData.category
                : productFormData.category;

            const productData = {
                ...productFormData,
                category: categoryName,
                variants: variants.length > 0 ? variants : undefined,
            };

            if (editingProduct) {
                const existingImages = editingProduct.images?.filter((img, idx) => 
                    imagePreviews.includes(img)
                ) || [];
                
                await apiUpdatePOSProduct({
                    id: editingProduct.id,
                    ...productData,
                    images: existingImages,
                }, imageFiles);
                addNotification("Product updated successfully!", "success");
            } else {
                await apiAddPOSProduct(productData, imageFiles);
                addNotification("Product created successfully!", "success");
            }
            setIsProductModalOpen(false);
            setImageFiles([]);
            setImagePreviews([]);
            fetchData();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addNotification(`Failed to save product: ${errorMessage}`, "error");
        }
    };

    const handleDeleteProduct = async (product: POSProduct) => {
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

    // Variant handlers
    const handleOpenVariantModal = (variant?: POSProductVariant) => {
        if (variant) {
            setEditingVariant(variant);
            setVariantFormData({
                name: variant.name,
                sku: variant.sku || '',
                priceMMK: variant.priceMMK,
                stockQuantity: variant.stockQuantity,
                isActive: variant.isActive,
            });
            setVariantImagePreview(variant.image || '');
            setVariantImageFile(null);
        } else {
            setEditingVariant(null);
            setVariantFormData({
                name: '',
                sku: '',
                priceMMK: productFormData.priceMMK,
                stockQuantity: 0,
                isActive: true,
            });
            setVariantImagePreview('');
            setVariantImageFile(null);
        }
        setIsVariantModalOpen(true);
    };

    const handleVariantImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setVariantImageFile(file);
        
        const reader = new FileReader();
        reader.onloadend = () => {
            if (reader.result) {
                setVariantImagePreview(reader.result as string);
            }
        };
        reader.readAsDataURL(file);
        
        e.target.value = '';
    };

    const removeVariantImage = () => {
        setVariantImageFile(null);
        setVariantImagePreview('');
    };

    const handleVariantSubmit = async () => {
        if (!variantFormData.name || variantFormData.priceMMK <= 0) {
            addNotification("Please fill in variant name and price.", "error");
            return;
        }

        let variantImageUrl = variantImagePreview;
        
        // If there's a new image file, upload it
        if (variantImageFile) {
            try {
                const productId = editingProduct?.id || 'temp';
                const variantId = editingVariant?.id || `variant_${Date.now()}`;
                const uploadPath = `pos_products/${productId}/variants/${variantId}/image.jpg`;
                variantImageUrl = await apiUploadFile(variantImageFile, uploadPath);
            } catch (error) {
                addNotification("Failed to upload variant image. Variant saved without image.", "warning");
                variantImageUrl = variantImagePreview; // Use preview if upload fails
            }
        }

        const variant: POSProductVariant = {
            id: editingVariant?.id || `variant_${Date.now()}`,
            name: variantFormData.name,
            sku: variantFormData.sku || undefined,
            priceMMK: variantFormData.priceMMK,
            stockQuantity: variantFormData.stockQuantity,
            isActive: variantFormData.isActive,
            image: variantImageUrl || undefined,
        };

        if (editingVariant) {
            setVariants(variants.map(v => v.id === editingVariant.id ? variant : v));
        } else {
            setVariants([...variants, variant]);
        }

        setIsVariantModalOpen(false);
        setVariantFormData({
            name: '',
            sku: '',
            priceMMK: productFormData.priceMMK,
            stockQuantity: 0,
            isActive: true,
        });
        setVariantImageFile(null);
        setVariantImagePreview('');
    };

    const handleDeleteVariant = (variantId: string) => {
        setVariants(variants.filter(v => v.id !== variantId));
    };

    // Inventory handlers
    const handleOpenTransactionModal = (productId?: string) => {
        const product = productId ? products.find(p => p.id === productId) : null;
        setTransactionFormData({
            productId: productId || '',
            type: 'STOCK_IN',
            quantity: 0,
            costMMK: product?.costMMK || 0,
            notes: '',
        });
        setIsTransactionModalOpen(true);
    };

    const handleQuickStockIn = (productId?: string) => {
        const product = productId ? products.find(p => p.id === productId) : null;
        setTransactionFormData({
            productId: productId || '',
            type: 'STOCK_IN',
            quantity: 0,
            costMMK: product?.costMMK || 0,
            notes: '',
        });
        setIsQuickStockInOpen(true);
    };

    const handleDownloadTemplate = () => {
        const headers = [
            'Product Name*',
            'SKU (Optional)',
            'Price MMK*',
            'Cost MMK (Optional)',
            'Stock Quantity*',
            'Min Stock Quantity (Optional)',
            'Category (Optional)',
            'Colour of Frame*',
            'Colour of Glass*',
            'Description (Optional)'
        ];
        
        const ws = XLSX.utils.json_to_sheet([
            {
                "Product Name*": "Sunglasses",
                "SKU (Optional)": "SUN-001",
                "Price MMK*": "5000",
                "Cost MMK (Optional)": "3000",
                "Stock Quantity*": "10",
                "Min Stock Quantity (Optional)": "5",
                "Category (Optional)": "Eyewear",
                "Colour of Frame*": "Black",
                "Colour of Glass*": "Clear",
                "Description (Optional)": "Classic black frame with clear glass"
            },
            {
                "Product Name*": "Sunglasses",
                "SKU (Optional)": "SUN-002",
                "Price MMK*": "5000",
                "Cost MMK (Optional)": "3000",
                "Stock Quantity*": "15",
                "Min Stock Quantity (Optional)": "5",
                "Category (Optional)": "Eyewear",
                "Colour of Frame*": "Black",
                "Colour of Glass*": "Blue",
                "Description (Optional)": "Classic black frame with blue glass"
            },
            {
                "Product Name*": "Sunglasses",
                "SKU (Optional)": "SUN-003",
                "Price MMK*": "5500",
                "Cost MMK (Optional)": "3200",
                "Stock Quantity*": "8",
                "Min Stock Quantity (Optional)": "5",
                "Category (Optional)": "Eyewear",
                "Colour of Frame*": "Brown",
                "Colour of Glass*": "Green",
                "Description (Optional)": "Brown frame with green glass"
            }
        ], { header: headers });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "pos_inventory_import_template.xlsx");
    };

    const handleTransactionSubmit = async () => {
        if (!transactionFormData.productId || transactionFormData.quantity === 0) {
            addNotification("Please select a product and enter a quantity.", "error");
            return;
        }

        if (!user) {
            addNotification("User not authenticated.", "error");
            return;
        }

        try {
            const product = products.find(p => p.id === transactionFormData.productId);
            if (!product) {
                addNotification("Product not found.", "error");
                return;
            }

            // Map simplified types to InventoryTransactionType
            let transactionType: InventoryTransactionType;
            if (transactionFormData.type === 'STOCK_IN') {
                transactionType = InventoryTransactionType.ADJUSTMENT;
            } else if (transactionFormData.type === 'STOCK_OUT') {
                transactionType = InventoryTransactionType.ADJUSTMENT;
            } else {
                transactionType = InventoryTransactionType.ADJUSTMENT;
            }

            const quantity = transactionFormData.type === 'STOCK_OUT' 
                ? -Math.abs(transactionFormData.quantity)
                : Math.abs(transactionFormData.quantity);

            await apiAddInventoryTransaction({
                productId: transactionFormData.productId,
                productName: product.name,
                type: transactionType,
                quantity: quantity,
                previousQuantity: 0,
                newQuantity: 0,
                costMMK: transactionFormData.costMMK > 0 ? transactionFormData.costMMK : undefined,
                notes: transactionFormData.notes || undefined,
                userId: user.id,
            }, true);

            addNotification("Inventory transaction recorded successfully!", "success");
            setIsTransactionModalOpen(false);
            setIsQuickStockInOpen(false);
            fetchData();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addNotification(`Failed to record transaction: ${errorMessage}`, "error");
        }
    };

    // Category handlers
    const handleOpenCategoryModal = (category?: POSProductCategory) => {
        if (category) {
            setEditingCategory(category);
            setCategoryFormData({
                name: category.name,
                description: category.description || '',
                isActive: category.isActive,
            });
        } else {
            setEditingCategory(null);
            setCategoryFormData({
                name: '',
                description: '',
                isActive: true,
            });
        }
        setIsCategoryModalOpen(true);
    };

    const handleCategorySubmit = async () => {
        if (!categoryFormData.name.trim()) {
            addNotification("Please enter category name.", "error");
            return;
        }

        try {
            if (editingCategory) {
                await apiUpdatePOSCategory({
                    id: editingCategory.id,
                    ...categoryFormData,
                });
                addNotification("Category updated successfully!", "success");
            } else {
                await apiAddPOSCategory(categoryFormData);
                addNotification("Category created successfully!", "success");
            }
            setIsCategoryModalOpen(false);
            fetchData();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addNotification(`Failed to save category: ${errorMessage}`, "error");
        }
    };

    const handleDeleteCategory = async (category: POSProductCategory) => {
        const confirmed = await showConfirmation(
            "Delete Category",
            `Are you sure you want to delete "${category.name}"? This action cannot be undone.`
        );
        if (!confirmed) return;

        try {
            await apiDeletePOSCategory(category.id);
            addNotification("Category deleted successfully!", "success");
            fetchData();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addNotification(`Failed to delete category: ${errorMessage}`, "error");
        }
    };

    // Get unique categories from products (for backward compatibility) and from category list
    const availableCategories = useMemo(() => {
        const productCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
        const categoryNames = categories.filter(c => c.isActive).map(c => c.name);
        return Array.from(new Set([...productCategories, ...categoryNames])).sort();
    }, [products, categories]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = !searchTerm || 
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.sku.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = !selectedCategory || p.category === selectedCategory || 
                (p.categoryId && categories.find(c => c.id === p.categoryId)?.name === selectedCategory);
            return matchesSearch && matchesCategory;
        });
    }, [products, searchTerm, selectedCategory, categories]);

    const filteredTransactions = useMemo(() => {
        return selectedProductId
            ? transactions.filter(t => t.productId === selectedProductId)
            : transactions;
    }, [transactions, selectedProductId]);

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
                <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Products & Inventory</h1>
                <div className="flex gap-2">
                    {activeTab === 'products' && hasPermission('MANAGE_POS_PRODUCTS' as any) && (
                        <Button onClick={() => handleOpenProductModal()} variant="primary">+ New Product</Button>
                    )}
                    {activeTab === 'categories' && hasPermission('MANAGE_POS_PRODUCTS' as any) && (
                        <Button onClick={() => handleOpenCategoryModal()} variant="primary">+ New Category</Button>
                    )}
                </div>
            </div>

            {/* Secondary Sidebar Layout */}
            <div className="flex flex-col lg:flex-row gap-8">
                <aside className={`${isSidebarCollapsed ? 'lg:w-16' : 'lg:w-1/4 xl:w-1/5'} transition-all duration-300`}>
                    <div className="flex justify-between items-center mb-6">
                        {!isSidebarCollapsed && <h2 className="text-xl font-semibold text-text-primary dark:text-slate-200">Navigation</h2>}
                        <button
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            className="hidden lg:flex p-1 rounded-full text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700"
                            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            {isSidebarCollapsed ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15l-7.5-7.5 7.5-7.5" /></svg>
                            )}
                        </button>
                    </div>
                    <nav className="space-y-2">
                        <button
                            onClick={() => setActiveTab('products')}
                            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg ${isSidebarCollapsed ? '' : 'text-left'} font-medium transition-colors duration-150 group
                                ${activeTab === 'products' 
                                    ? 'bg-primary-action text-white shadow-md' 
                                    : 'bg-white dark:bg-slate-800 text-text-secondary dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700 hover:text-primary-action'
                                }`}
                            title={isSidebarCollapsed ? `Products (${products.length})` : ''}
                        >
                            {isSidebarCollapsed ? (
                                <span className="text-lg font-bold">{products.length}</span>
                            ) : (
                                <>Products ({products.length})</>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('inventory')}
                            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg ${isSidebarCollapsed ? '' : 'text-left'} font-medium transition-colors duration-150 group
                                ${activeTab === 'inventory' 
                                    ? 'bg-primary-action text-white shadow-md' 
                                    : 'bg-white dark:bg-slate-800 text-text-secondary dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700 hover:text-primary-action'
                                }`}
                            title={isSidebarCollapsed ? 'Inventory' : ''}
                        >
                            {isSidebarCollapsed ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                                </svg>
                            ) : (
                                'Inventory'
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('categories')}
                            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg ${isSidebarCollapsed ? '' : 'text-left'} font-medium transition-colors duration-150 group
                                ${activeTab === 'categories' 
                                    ? 'bg-primary-action text-white shadow-md' 
                                    : 'bg-white dark:bg-slate-800 text-text-secondary dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700 hover:text-primary-action'
                                }`}
                            title={isSidebarCollapsed ? `Categories (${categories.length})` : ''}
                        >
                            {isSidebarCollapsed ? (
                                <span className="text-lg font-bold">{categories.length}</span>
                            ) : (
                                <>Categories ({categories.length})</>
                            )}
                        </button>
                    </nav>
                </aside>
                <main className="flex-1">
                    <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                    {/* Products Tab */}
                    {activeTab === 'products' && (
                        <div className="space-y-6">
                            {/* Search and Filters */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                <Input
                                    placeholder="Search products..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    containerClassName="mb-0"
                                />
                                <Select
                                    label="Category"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    options={[
                                        { value: '', label: 'All Categories' },
                                        ...availableCategories.map(cat => ({ value: cat, label: cat }))
                                    ]}
                                    containerClassName="mb-0"
                                />
                            </div>

                            {/* Products Table */}
                            <div className="overflow-x-auto">
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
                                                <td className="px-4 py-3 text-sm font-medium">
                                                    <Link to={`/pos/products/${product.id}`} className="text-primary-action hover:underline">
                                                        {product.name}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3 text-sm">{product.category || 'N/A'}</td>
                                                <td className="px-4 py-3 text-sm">{product.priceMMK.toLocaleString()} MMK</td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={product.minStockQuantity && product.stockQuantity <= product.minStockQuantity ? 'text-yellow-600 dark:text-yellow-400 font-semibold' : ''}>
                                                        {product.stockQuantity}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`px-2 py-1 rounded-full text-xs ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                        {product.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm space-x-2">
                                                    <Button size="sm" variant="ghost" onClick={() => handleOpenProductModal(product)}>Edit</Button>
                                                    {hasPermission('MANAGE_POS_PRODUCTS' as any) && (
                                                        <Button size="sm" variant="danger" onClick={() => handleDeleteProduct(product)}>Delete</Button>
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
                        </div>
                    )}

                    {/* Inventory Tab */}
                    {activeTab === 'inventory' && (
                        <div className="space-y-6">
                            {/* Quick Actions */}
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-semibold">Inventory Management</h2>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
                                        📥 Download Excel Template
                                    </Button>
                                    <Button variant="secondary" onClick={() => setIsImportModalOpen(true)}>
                                        Import from Excel
                                    </Button>
                                    <Button variant="primary" onClick={() => handleQuickStockIn()}>
                                        Quick Stock In
                                    </Button>
                                    <Button variant="secondary" onClick={() => handleOpenTransactionModal()}>
                                        Record Transaction
                                    </Button>
                                </div>
                            </div>

                            {/* Low Stock Alerts */}
                            {lowStockProducts.length > 0 && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                    <h2 className="text-lg font-semibold mb-2">Low Stock Alerts ({lowStockProducts.length})</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {lowStockProducts.map(product => (
                                            <div key={product.id} className="bg-white dark:bg-slate-800 p-3 rounded border">
                                                <div className="font-semibold">{product.name}</div>
                                                <div className="text-sm text-text-secondary">SKU: {product.sku}</div>
                                                <div className="text-sm text-text-secondary">Stock: {product.stockQuantity}</div>
                                                {product.minStockQuantity && (
                                                    <div className="text-sm text-text-secondary">Min Stock: {product.minStockQuantity}</div>
                                                )}
                                                <Button 
                                                    size="sm" 
                                                    variant="primary" 
                                                    className="mt-2 w-full"
                                                    onClick={() => handleQuickStockIn(product.id)}
                                                >
                                                    Stock In
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Current Stock Levels */}
                            <div>
                                <h2 className="text-lg font-semibold mb-4">Current Stock Levels</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {products.filter(p => p.isActive).map(product => (
                                        <div key={product.id} className="border border-slate-200 dark:border-slate-700 rounded p-3">
                                            <div className="font-semibold truncate">{product.name}</div>
                                            <div className="text-sm text-text-secondary">SKU: {product.sku}</div>
                                            <div className={`text-lg font-bold mt-2 ${product.minStockQuantity && product.stockQuantity <= product.minStockQuantity ? 'text-yellow-600 dark:text-yellow-400' : ''}`}>
                                                {product.stockQuantity} units
                                            </div>
                                            {product.minStockQuantity && product.stockQuantity <= product.minStockQuantity && (
                                                <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Low Stock!</div>
                                            )}
                                            <Button 
                                                size="sm" 
                                                variant="primary" 
                                                className="mt-2 w-full"
                                                onClick={() => handleQuickStockIn(product.id)}
                                            >
                                                Stock In
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Filters */}
                            <div>
                                <Select
                                    label="Filter by Product"
                                    value={selectedProductId}
                                    onChange={(e) => setSelectedProductId(e.target.value)}
                                    options={[
                                        { value: '', label: 'All Products' },
                                        ...products.map(p => ({ value: p.id, label: p.name }))
                                    ]}
                                    containerClassName="mb-0"
                                />
                            </div>

                            {/* Transaction History */}
                            <div>
                                <h2 className="text-lg font-semibold mb-4">Transaction History</h2>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                        <thead className="bg-slate-100 dark:bg-slate-700/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Date</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Product</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Type</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Quantity</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Cost/Unit</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Previous Stock</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">New Stock</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {filteredTransactions.map(transaction => (
                                                <tr key={transaction.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                    <td className="px-4 py-3 text-sm">
                                                        {new Date(transaction.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium">{transaction.productName}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {transaction.quantity > 0 ? 'Stock In' : 'Stock Out'}
                                                    </td>
                                                    <td className={`px-4 py-3 text-sm font-semibold ${transaction.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {transaction.quantity > 0 ? '+' : ''}{transaction.quantity}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {transaction.costMMK ? `${transaction.costMMK.toLocaleString()} MMK` : 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">{transaction.previousQuantity}</td>
                                                    <td className="px-4 py-3 text-sm font-semibold">{transaction.newQuantity}</td>
                                                    <td className="px-4 py-3 text-sm">{transaction.notes || 'N/A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {filteredTransactions.length === 0 && (
                                        <p className="text-center text-text-secondary py-8">No transactions found.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Categories Tab */}
                    {activeTab === 'categories' && (
                        <div className="space-y-6">
                            {/* Categories Table */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                    <thead className="bg-slate-100 dark:bg-slate-700/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Name</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Description</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Created</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {categories.map(category => (
                                            <tr key={category.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <td className="px-4 py-3 text-sm font-medium">{category.name}</td>
                                                <td className="px-4 py-3 text-sm">{category.description || 'N/A'}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`px-2 py-1 rounded-full text-xs ${category.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                        {category.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {new Date(category.createdAt).toLocaleDateString('en-GB')}
                                                </td>
                                                <td className="px-4 py-3 text-sm space-x-2">
                                                    <Button size="sm" variant="ghost" onClick={() => handleOpenCategoryModal(category)}>Edit</Button>
                                                    {hasPermission('MANAGE_POS_PRODUCTS' as any) && (
                                                        <Button size="sm" variant="danger" onClick={() => handleDeleteCategory(category)}>Delete</Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {categories.length === 0 && (
                                    <p className="text-center text-text-secondary py-8">No categories found.</p>
                                )}
                            </div>
                        </div>
                    )}
                    </div>
                </main>
            </div>

            {/* Product Modal */}
            {isProductModalOpen && (
                <Modal
                    isOpen={isProductModalOpen}
                    onClose={() => setIsProductModalOpen(false)}
                    title={editingProduct ? 'Edit Product' : 'New Product'}
                >
                    <div className="space-y-4">
                        <Input
                            label="SKU *"
                            value={productFormData.sku}
                            onChange={(e) => setProductFormData({ ...productFormData, sku: e.target.value })}
                        />
                        <Input
                            label="Name *"
                            value={productFormData.name}
                            onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                        />
                        <Input
                            label="Description"
                            as="textarea"
                            rows={3}
                            value={productFormData.description}
                            onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                        />
                        <Select
                            label="Category"
                            value={productFormData.categoryId || ''}
                            onChange={(e) => {
                                if (e.target.value) {
                                    const selectedCat = categories.find(c => c.id === e.target.value);
                                    setProductFormData({ 
                                        ...productFormData, 
                                        categoryId: e.target.value,
                                        category: selectedCat?.name || ''
                                    });
                                } else {
                                    setProductFormData({ 
                                        ...productFormData, 
                                        categoryId: '',
                                        category: ''
                                    });
                                }
                            }}
                            options={[
                                { value: '', label: 'Select Category' },
                                ...categories.filter(c => c.isActive).map(cat => ({ value: cat.id, label: cat.name }))
                            ]}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Selling Price (MMK) *"
                                type="number"
                                value={productFormData.priceMMK}
                                onChange={(e) => setProductFormData({ ...productFormData, priceMMK: Number(e.target.value) || 0 })}
                            />
                            <Input
                                label="Opening Cost (MMK)"
                                type="number"
                                value={productFormData.costMMK}
                                onChange={(e) => setProductFormData({ ...productFormData, costMMK: Number(e.target.value) || 0 })}
                            />
                        </div>
                        <Input
                            label="Opening Stock Quantity"
                            type="number"
                            value={productFormData.stockQuantity}
                            onChange={(e) => setProductFormData({ ...productFormData, stockQuantity: Number(e.target.value) || 0 })}
                            placeholder="Initial stock quantity when adding product"
                        />
                        <Input
                            label="Min Stock Quantity (for alerts)"
                            type="number"
                            value={productFormData.minStockQuantity}
                            onChange={(e) => setProductFormData({ ...productFormData, minStockQuantity: Number(e.target.value) || 0 })}
                            placeholder="Alert when stock falls below this quantity"
                        />
                        <Input
                            label="Tax Percentage"
                            type="number"
                            value={productFormData.taxPercentage}
                            onChange={(e) => setProductFormData({ ...productFormData, taxPercentage: Number(e.target.value) || 0 })}
                        />
                        
                        {/* Variants Section */}
                        <div className="border-t pt-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-semibold">Product Variants (Size/Color)</h3>
                                <Button size="sm" variant="secondary" onClick={() => handleOpenVariantModal()}>
                                    + Add Variant
                                </Button>
                            </div>
                            {variants.length > 0 ? (
                                <div className="space-y-2">
                                    {variants.map((variant) => (
                                        <div key={variant.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                            <div className="flex-1">
                                                <div className="font-medium">{variant.name}</div>
                                                <div className="text-sm text-text-secondary">
                                                    Price: {variant.priceMMK.toLocaleString()} MMK | 
                                                    Stock: {variant.stockQuantity} | 
                                                    {variant.sku && `SKU: ${variant.sku}`}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="ghost" onClick={() => handleOpenVariantModal(variant)}>
                                                    Edit
                                                </Button>
                                                <Button size="sm" variant="danger" onClick={() => handleDeleteVariant(variant.id)}>
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-text-secondary">No variants added. Click "Add Variant" to create size/color options.</p>
                            )}
                        </div>
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
                                checked={productFormData.isActive}
                                onChange={(e) => setProductFormData({ ...productFormData, isActive: e.target.checked })}
                                className="mr-2"
                            />
                            <label htmlFor="isActive" className="text-sm">Active</label>
                        </div>
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="secondary" onClick={() => setIsProductModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleProductSubmit}>Save</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Transaction Modal */}
            {isTransactionModalOpen && (
                <Modal
                    isOpen={isTransactionModalOpen}
                    onClose={() => setIsTransactionModalOpen(false)}
                    title="Record Inventory Transaction"
                >
                    <div className="space-y-4">
                        <Select
                            label="Product *"
                            value={transactionFormData.productId}
                            onChange={(e) => setTransactionFormData({ ...transactionFormData, productId: e.target.value })}
                            options={[
                                { value: '', label: 'Select Product' },
                                ...products.filter(p => p.isActive).map(p => ({ value: p.id, label: p.name }))
                            ]}
                        />
                        <Select
                            label="Transaction Type *"
                            value={transactionFormData.type}
                            onChange={(e) => setTransactionFormData({ ...transactionFormData, type: e.target.value as 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' })}
                            options={[
                                { value: 'STOCK_IN', label: 'Stock In' },
                                { value: 'STOCK_OUT', label: 'Stock Out' },
                                { value: 'ADJUSTMENT', label: 'Adjustment' }
                            ]}
                        />
                        <Input
                            label="Quantity *"
                            type="number"
                            value={transactionFormData.quantity}
                            onChange={(e) => setTransactionFormData({ ...transactionFormData, quantity: Number(e.target.value) || 0 })}
                            placeholder={transactionFormData.type === 'STOCK_OUT' ? 'Enter quantity to remove' : 'Enter quantity to add'}
                        />
                        {(transactionFormData.type === 'STOCK_IN' || (transactionFormData.type === 'ADJUSTMENT' && transactionFormData.quantity > 0)) && (
                            <Input
                                label="Cost per Unit (MMK)"
                                type="number"
                                value={transactionFormData.costMMK}
                                onChange={(e) => setTransactionFormData({ ...transactionFormData, costMMK: Number(e.target.value) || 0 })}
                                placeholder="Cost for this stock in (can differ from opening cost)"
                            />
                        )}
                        <Input
                            label="Notes"
                            as="textarea"
                            rows={3}
                            value={transactionFormData.notes}
                            onChange={(e) => setTransactionFormData({ ...transactionFormData, notes: e.target.value })}
                        />
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="secondary" onClick={() => setIsTransactionModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleTransactionSubmit}>Record</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Category Modal */}
            {isCategoryModalOpen && (
                <Modal
                    isOpen={isCategoryModalOpen}
                    onClose={() => setIsCategoryModalOpen(false)}
                    title={editingCategory ? 'Edit Category' : 'New Category'}
                >
                    <div className="space-y-4">
                        <Input
                            label="Name *"
                            value={categoryFormData.name}
                            onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                        />
                        <Input
                            label="Description"
                            as="textarea"
                            rows={3}
                            value={categoryFormData.description}
                            onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                        />
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="categoryIsActive"
                                checked={categoryFormData.isActive}
                                onChange={(e) => setCategoryFormData({ ...categoryFormData, isActive: e.target.checked })}
                                className="mr-2"
                            />
                            <label htmlFor="categoryIsActive" className="text-sm">Active</label>
                        </div>
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="secondary" onClick={() => setIsCategoryModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleCategorySubmit}>Save</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Variant Modal */}
            {isVariantModalOpen && (
                <Modal
                    isOpen={isVariantModalOpen}
                    onClose={() => setIsVariantModalOpen(false)}
                    title={editingVariant ? 'Edit Variant' : 'New Variant'}
                >
                    <div className="space-y-4">
                        <Input
                            label="Variant Name *"
                            value={variantFormData.name}
                            onChange={(e) => setVariantFormData({ ...variantFormData, name: e.target.value })}
                            placeholder="e.g., Size: Large, Color: Red"
                        />
                        <Input
                            label="Variant SKU (optional)"
                            value={variantFormData.sku}
                            onChange={(e) => setVariantFormData({ ...variantFormData, sku: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Price (MMK) *"
                                type="number"
                                value={variantFormData.priceMMK}
                                onChange={(e) => setVariantFormData({ ...variantFormData, priceMMK: Number(e.target.value) || 0 })}
                            />
                            <Input
                                label="Stock Quantity"
                                type="number"
                                value={variantFormData.stockQuantity}
                                onChange={(e) => setVariantFormData({ ...variantFormData, stockQuantity: Number(e.target.value) || 0 })}
                            />
                        </div>
                        {/* Variant Image Upload */}
                        <div>
                            <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-2">
                                Variant Image
                            </label>
                            {variantImagePreview ? (
                                <div className="relative mb-2">
                                    <img
                                        src={variantImagePreview}
                                        alt="Variant preview"
                                        className="w-full h-48 object-cover rounded border border-slate-200 dark:border-slate-700"
                                    />
                                    <Button
                                        type="button"
                                        variant="danger"
                                        size="sm"
                                        onClick={removeVariantImage}
                                        className="absolute top-2 right-2"
                                    >
                                        ×
                                    </Button>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded p-4 text-center">
                                    <p className="text-sm text-text-secondary mb-2">No image selected</p>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleVariantImageChange}
                                className="mt-2 text-sm"
                            />
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="variantIsActive"
                                checked={variantFormData.isActive}
                                onChange={(e) => setVariantFormData({ ...variantFormData, isActive: e.target.checked })}
                                className="mr-2"
                            />
                            <label htmlFor="variantIsActive" className="text-sm">Active</label>
                        </div>
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="secondary" onClick={() => setIsVariantModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleVariantSubmit}>Save</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Quick Stock In Modal */}
            {isQuickStockInOpen && (
                <Modal
                    isOpen={isQuickStockInOpen}
                    onClose={() => setIsQuickStockInOpen(false)}
                    title="Quick Stock In"
                >
                    <div className="space-y-4">
                        <Select
                            label="Product *"
                            value={transactionFormData.productId}
                            onChange={(e) => {
                                const product = products.find(p => p.id === e.target.value);
                                setTransactionFormData({ 
                                    ...transactionFormData, 
                                    productId: e.target.value,
                                    costMMK: product?.costMMK || 0
                                });
                            }}
                            options={[
                                { value: '', label: 'Select Product' },
                                ...products.filter(p => p.isActive).map(p => ({ value: p.id, label: p.name }))
                            ]}
                        />
                        <Input
                            label="Quantity *"
                            type="number"
                            value={transactionFormData.quantity}
                            onChange={(e) => setTransactionFormData({ ...transactionFormData, quantity: Number(e.target.value) || 0 })}
                            placeholder="Enter quantity to add"
                        />
                        <Input
                            label="Cost per Unit (MMK) *"
                            type="number"
                            value={transactionFormData.costMMK}
                            onChange={(e) => setTransactionFormData({ ...transactionFormData, costMMK: Number(e.target.value) || 0 })}
                            placeholder="Cost for this stock in"
                        />
                        <Input
                            label="Notes (optional)"
                            as="textarea"
                            rows={3}
                            value={transactionFormData.notes}
                            onChange={(e) => setTransactionFormData({ ...transactionFormData, notes: e.target.value })}
                        />
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="secondary" onClick={() => setIsQuickStockInOpen(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleTransactionSubmit}>Stock In</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Excel Import Modal */}
            {isImportModalOpen && (
                <InventoryExcelImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onImportComplete={() => {
                        setIsImportModalOpen(false);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
};

export default ProductsInventoryPage;






