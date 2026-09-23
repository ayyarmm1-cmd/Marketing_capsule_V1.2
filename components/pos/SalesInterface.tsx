import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { POSProduct, POSOrderItem, POSCustomer, SalesType, POSOrderStatus, DeliveryStatus, POSOrder, CompanyProfileSetting } from '../../types';
import { 
    apiGetPOSProducts, apiGetPOSCustomers, apiAddPOSCustomer, apiCreatePOSOrder, apiGetCompanyProfile, apiUpdatePOSOrder
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import SearchableSelect from '../ui/SearchableSelect';
import Spinner from '../ui/Spinner';
import Modal from '../ui/Modal';
import POSOrderPDFTemplate from './POSOrderPDFTemplate';

interface CartItem extends POSOrderItem {
    product?: POSProduct;
}

const SalesInterface: React.FC = () => {
    const { user, hasPermission } = useAuth();
    const { addNotification } = useNotification();
    const navigate = useNavigate();
    const [products, setProducts] = useState<POSProduct[]>([]);
    const [customers, setCustomers] = useState<POSCustomer[]>([]);
    const [companyProfile, setCompanyProfile] = useState<CompanyProfileSetting | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const pdfTemplateRef = useRef<HTMLDivElement>(null);
    
    // Search and filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    
    // Customer selection
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [newCustomerData, setNewCustomerData] = useState({
        name: '',
        email: '',
        phone: '',
        address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: '',
        },
        notes: '',
    });
    
    // Sales type
    const [salesType, setSalesType] = useState<SalesType>(SalesType.STANDARD);
    
    // Cart
    const [cart, setCart] = useState<CartItem[]>([]);
    
    // Order details
    const [discount, setDiscount] = useState<number>(0);
    const [discountDescription, setDiscountDescription] = useState<string>('');
    const [taxPercentage, setTaxPercentage] = useState<number>(0);
    const [shippingCost, setShippingCost] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [deliveryAddress, setDeliveryAddress] = useState({
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        contactName: '',
        contactPhone: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fetchedProducts, fetchedCustomers, profile] = await Promise.all([
                apiGetPOSProducts(),
                apiGetPOSCustomers(),
                apiGetCompanyProfile(),
            ]);
            setProducts(fetchedProducts.filter(p => p.isActive));
            setCustomers(fetchedCustomers);
            setCompanyProfile(profile);
        } catch (error) {
            console.error("Failed to load POS data:", error);
            addNotification("Failed to load POS data.", "error");
        }
        setIsLoading(false);
    }, [addNotification]);

    const handleAddCustomer = async () => {
        if (!newCustomerData.name.trim()) {
            addNotification("Please enter customer name.", "error");
            return;
        }

        try {
            const newCustomer = await apiAddPOSCustomer(newCustomerData);
            setCustomers([...customers, newCustomer]);
            setSelectedCustomerId(newCustomer.id);
            setSelectedCustomerName(newCustomer.name);
            setIsCustomerModalOpen(false);
            setNewCustomerData({
                name: '',
                email: '',
                phone: '',
                address: {
                    street: '',
                    city: '',
                    state: '',
                    zipCode: '',
                    country: '',
                },
                notes: '',
            });
            addNotification("Customer added successfully!", "success");
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addNotification(`Failed to add customer: ${errorMessage}`, "error");
        }
    };

    const categories = useMemo(() => {
        const cats = new Set<string>();
        products.forEach(p => {
            if (p.category) cats.add(p.category);
        });
        return Array.from(cats).sort();
    }, [products]);

    // Create a flat list of products and variants for display
    const displayItems = useMemo(() => {
        const items: Array<{
            id: string;
            productId: string;
            productName: string;
            productSku: string;
            variant?: POSProduct['variants'][0];
            name: string;
            sku: string;
            priceMMK: number;
            stockQuantity: number;
            image?: string;
            isVariant: boolean;
        }> = [];

        products.forEach(product => {
            const matchesCategory = !selectedCategory || product.category === selectedCategory;
            if (!matchesCategory) return;
            
            if (!searchTerm) {
                // No search - show all
                if (product.variants && product.variants.length > 0) {
                    // Show each variant as separate item
                    product.variants
                        .filter(v => v.isActive && v.stockQuantity > 0)
                        .forEach(variant => {
                            items.push({
                                id: variant.id,
                                productId: product.id,
                                productName: product.name,
                                productSku: product.sku,
                                variant,
                                name: `${product.name} - ${variant.name}`,
                                sku: variant.sku || product.sku,
                                priceMMK: variant.priceMMK,
                                stockQuantity: variant.stockQuantity,
                                image: (variant as any).image || product.images?.[0],
                                isVariant: true,
                            });
                        });
                } else {
                    // No variants - show product
                    items.push({
                        id: product.id,
                        productId: product.id,
                        productName: product.name,
                        productSku: product.sku,
                        name: product.name,
                        sku: product.sku,
                        priceMMK: product.priceMMK,
                        stockQuantity: product.stockQuantity,
                        image: product.images?.[0],
                        isVariant: false,
                    });
                }
            } else {
                // Has search term
                const searchLower = searchTerm.toLowerCase();
                
                // Check product name and SKU
                const productMatches = 
                    product.name.toLowerCase().includes(searchLower) ||
                    product.sku.toLowerCase().includes(searchLower);
                
                if (product.variants && product.variants.length > 0) {
                    // Check each variant
                    product.variants
                        .filter(v => v.isActive && v.stockQuantity > 0)
                        .forEach(variant => {
                            const variantMatches = 
                                variant.name?.toLowerCase().includes(searchLower) ||
                                variant.sku?.toLowerCase().includes(searchLower);
                            
                            if (productMatches || variantMatches) {
                                items.push({
                                    id: variant.id,
                                    productId: product.id,
                                    productName: product.name,
                                    productSku: product.sku,
                                    variant,
                                    name: `${product.name} - ${variant.name}`,
                                    sku: variant.sku || product.sku,
                                    priceMMK: variant.priceMMK,
                                    stockQuantity: variant.stockQuantity,
                                    image: (variant as any).image || product.images?.[0],
                                    isVariant: true,
                                });
                            }
                        });
                } else if (productMatches) {
                    // No variants and product matches
                    items.push({
                        id: product.id,
                        productId: product.id,
                        productName: product.name,
                        productSku: product.sku,
                        name: product.name,
                        sku: product.sku,
                        priceMMK: product.priceMMK,
                        stockQuantity: product.stockQuantity,
                        image: product.images?.[0],
                        isVariant: false,
                    });
                }
            }
        });

        return items;
    }, [products, searchTerm, selectedCategory]);

    const addToCart = (product: POSProduct, variantId?: string) => {
        const variant = variantId ? product.variants?.find(v => v.id === variantId) : null;
        const availableStock = variant ? variant.stockQuantity : product.stockQuantity;
        
        if (availableStock <= 0) {
            addNotification(`Product ${product.name} is out of stock.`, "error");
            return;
        }

        // Check if this exact product+variant combination already exists
        const existingItem = cart.find(item => 
            item.productId === product.id && item.variantId === variantId
        );

        if (existingItem) {
            if (existingItem.quantity >= availableStock) {
                addNotification(`Only ${availableStock} units available.`, "error");
                return;
            }
            setCart(cart.map(item =>
                item.productId === product.id && item.variantId === variantId
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            // Allow multiple items in cart (including multiple variants of the same product)
            const unitPrice = variant ? variant.priceMMK : product.priceMMK;
            const taxPct = product.taxPercentage || 0;
            const taxAmount = (unitPrice * taxPct) / 100;
            const subtotal = unitPrice + taxAmount;

            const newItem: CartItem = {
                productId: product.id,
                productName: product.name,
                productSku: variant?.sku || product.sku,
                variantId,
                variantName: variant?.name,
                quantity: 1,
                unitPriceMMK: unitPrice,
                discountMMK: 0,
                taxPercentage: taxPct,
                taxAmountMMK: taxAmount,
                subtotalMMK: subtotal,
                product,
            };
            setCart([...cart, newItem]);
        }
    };

    const updateCartItemQuantity = (productId: string, variantId: string | undefined, newQuantity: number) => {
        if (newQuantity <= 0) {
            removeFromCart(productId, variantId);
            return;
        }

        const item = cart.find(i => i.productId === productId && i.variantId === variantId);
        if (!item) return;

        const product = item.product || products.find(p => p.id === productId);
        if (!product) return;

        const variant = variantId ? product.variants?.find(v => v.id === variantId) : null;
        const availableStock = variant ? variant.stockQuantity : product.stockQuantity;

        if (newQuantity > availableStock) {
            addNotification(`Only ${availableStock} units available.`, "error");
            return;
        }

        setCart(cart.map(item => {
            if (item.productId === productId && item.variantId === variantId) {
                const taxAmount = (item.unitPriceMMK * (item.taxPercentage || 0)) / 100;
                return {
                    ...item,
                    quantity: newQuantity,
                    taxAmountMMK: taxAmount * newQuantity,
                    subtotalMMK: (item.unitPriceMMK + taxAmount) * newQuantity - (item.discountMMK || 0),
                };
            }
            return item;
        }));
    };

    const removeFromCart = (productId: string, variantId: string | undefined) => {
        setCart(cart.filter(item => !(item.productId === productId && item.variantId === variantId)));
    };

    const cartSubtotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.subtotalMMK, 0);
    }, [cart]);

    const cartTax = useMemo(() => {
        return cart.reduce((sum, item) => sum + (item.taxAmountMMK || 0), 0);
    }, [cart]);

    const orderTotal = useMemo(() => {
        const subtotal = cartSubtotal - discount;
        const tax = taxPercentage > 0 ? (subtotal * taxPercentage) / 100 : 0;
        return subtotal + tax + shippingCost;
    }, [cartSubtotal, discount, taxPercentage, shippingCost]);

    const handleCustomerChange = (customerId: string) => {
        setSelectedCustomerId(customerId);
        const customer = customers.find(c => c.id === customerId);
        setSelectedCustomerName(customer?.name || '');
    };

    const handleCheckout = async () => {
        if (cart.length === 0) {
            addNotification("Cart is empty. Add products to cart first.", "error");
            return;
        }

        if (!selectedCustomerId) {
            addNotification("Please select a customer.", "error");
            return;
        }

        if (!user) {
            addNotification("User not authenticated.", "error");
            return;
        }

        try {
            const orderItems: POSOrderItem[] = cart.map(item => ({
                productId: item.productId,
                productName: item.productName,
                productSku: item.productSku,
                variantId: item.variantId,
                variantName: item.variantName,
                quantity: item.quantity,
                unitPriceMMK: item.unitPriceMMK,
                discountMMK: item.discountMMK,
                taxPercentage: item.taxPercentage,
                taxAmountMMK: item.taxAmountMMK,
                subtotalMMK: item.subtotalMMK,
            }));

            const orderData: Omit<POSOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'deliveryTracking'> & { deliveryTracking?: any } = {
                customerId: selectedCustomerId,
                customerName: selectedCustomerName,
                salesType,
                status: POSOrderStatus.PENDING,
                items: orderItems,
                subtotalMMK: cartSubtotal,
                discountMMK: discount > 0 ? discount : undefined,
                discountDescription: discountDescription || undefined,
                taxPercentage: taxPercentage > 0 ? taxPercentage : undefined,
                taxAmountMMK: taxPercentage > 0 ? ((cartSubtotal - discount) * taxPercentage) / 100 : 0,
                shippingCostMMK: shippingCost > 0 ? shippingCost : undefined,
                grandTotalMMK: orderTotal,
                amountPaidMMK: orderTotal,
                paymentMethod: paymentMethod || undefined,
                deliveryTracking: {
                    status: DeliveryStatus.PENDING,
                    deliveryAddress,
                    updatedAt: new Date().toISOString(),
                    updatedBy: user.id,
                },
                notes: notes || undefined,
                createdByUserId: user.id,
            };

            const createdOrder = await apiCreatePOSOrder(orderData);
            addNotification("Order created successfully!", "success");
            
            // Store order temporarily for printing
            const tempOrderForPrint = createdOrder;
            
            // Print the order after a short delay to ensure order is saved
            setTimeout(() => {
                handlePrintOrder(tempOrderForPrint);
            }, 500);
            
            // Reset form
            setCart([]);
            setSelectedCustomerId('');
            setSelectedCustomerName('');
            setDiscount(0);
            setDiscountDescription('');
            setTaxPercentage(0);
            setShippingCost(0);
            setPaymentMethod('');
            setNotes('');
            setDeliveryAddress({
                street: '',
                city: '',
                state: '',
                zipCode: '',
                country: '',
                contactName: '',
                contactPhone: '',
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addNotification(`Failed to create order: ${errorMessage}`, "error");
            console.error("Failed to create order:", error);
        }
    };

    const handlePrintOrder = async (order: POSOrder) => {
        if (!order) return;
    
        // Navigate to order detail page and trigger print there
        navigate(`/pos/orders/${order.id}?print=true`);
    };

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
                <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">POS Sales</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel - Products */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Search and Filters */}
                    <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <Input
                                placeholder="Search products by name or SKU..."
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
                                    ...categories.map(cat => ({ value: cat, label: cat }))
                                ]}
                                containerClassName="mb-0"
                            />
                        </div>
                    </div>

                    {/* Products Grid */}
                    <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-4">Products</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto">
                            {displayItems.map(item => {
                                const product = products.find(p => p.id === item.productId);
                                if (!product) return null;
                                
                                return (
                                    <div
                                        key={item.id}
                                        className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:shadow-md transition-shadow flex flex-col cursor-pointer"
                                        onClick={() => {
                                            addToCart(product, item.isVariant ? item.variant?.id : undefined);
                                        }}
                                    >
                                        {/* Product/Variant Image */}
                                        <div className="w-full h-32 mb-2 rounded overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                            {item.image ? (
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="text-text-secondary text-xs">No Image</div>
                                            )}
                                        </div>
                                        <div className="text-sm font-semibold mb-1 truncate">{item.name}</div>
                                        <div className="text-xs text-text-secondary mb-2">SKU: {item.sku}</div>
                                        <div className="text-lg font-bold text-primary-action mb-2">
                                            {item.priceMMK.toLocaleString()} MMK
                                        </div>
                                        <div className="text-xs text-text-secondary mb-2">
                                            Stock: {item.stockQuantity}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {displayItems.length === 0 && (
                            <p className="text-center text-text-secondary py-8">No products found.</p>
                        )}
                    </div>
                </div>

                {/* Right Panel - Cart and Checkout */}
                <div className="space-y-4">
                    {/* Customer Selection */}
                    <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">Customer</h2>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setIsCustomerModalOpen(true)}
                            >
                                + New
                            </Button>
                        </div>
                        <div className="space-y-3">
                            <SearchableSelect
                                label="Customer"
                                value={selectedCustomerId}
                                onChange={(value) => handleCustomerChange(value as string)}
                                options={[
                                    { value: '', label: 'Select Customer' },
                                    ...customers.map(c => {
                                        const parts = [c.name];
                                        if (c.id) parts.push(`ID: ${c.id}`);
                                        if (c.phone) parts.push(`Phone: ${c.phone}`);
                                        return {
                                            value: c.id,
                                            label: parts.join(' | ')
                                        };
                                    })
                                ]}
                                placeholder="Search by name, ID, or phone..."
                                containerClassName="mb-0"
                            />
                            {selectedCustomerId && (
                                <Link
                                    to={`/pos/customers/${selectedCustomerId}`}
                                    className="text-sm text-primary-action hover:text-blue-700 dark:text-blue-400"
                                >
                                    View Customer Details →
                                </Link>
                            )}
                            <Select
                                label="Sales Type"
                                value={salesType}
                                onChange={(e) => setSalesType(e.target.value as SalesType)}
                                options={[
                                    { value: SalesType.STANDARD, label: SalesType.STANDARD },
                                    { value: SalesType.SUBSCRIPTION, label: SalesType.SUBSCRIPTION },
                                    { value: SalesType.WHOLESALE, label: SalesType.WHOLESALE },
                                    { value: SalesType.RETAIL, label: SalesType.RETAIL },
                                ]}
                                containerClassName="mb-0"
                            />
                        </div>
                    </div>

                    {/* Cart */}
                    <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-4">Cart ({cart.length})</h2>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {cart.map((item, index) => (
                                <div key={index} className="border border-slate-200 dark:border-slate-700 rounded p-2">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex-1">
                                            <div className="text-sm font-semibold">{item.productName}</div>
                                            {item.variantName && (
                                                <div className="text-xs text-text-secondary">{item.variantName}</div>
                                            )}
                                            <div className="text-xs text-text-secondary">SKU: {item.productSku}</div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="danger"
                                            onClick={() => removeFromCart(item.productId, item.variantId)}
                                        >
                                            ×
                                        </Button>
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => updateCartItemQuantity(item.productId, item.variantId, item.quantity - 1)}
                                            >
                                                -
                                            </Button>
                                            <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => updateCartItemQuantity(item.productId, item.variantId, item.quantity + 1)}
                                            >
                                                +
                                            </Button>
                                        </div>
                                        <div className="text-sm font-semibold">
                                            {item.subtotalMMK.toLocaleString()} MMK
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {cart.length === 0 && (
                            <p className="text-center text-text-secondary py-4">Cart is empty</p>
                        )}
                    </div>

                    {/* Order Summary */}
                    <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>{cartSubtotal.toLocaleString()} MMK</span>
                            </div>
                            <Input
                                label="Discount (MMK)"
                                type="number"
                                value={discount}
                                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                                containerClassName="mb-0"
                            />
                            <Input
                                label="Discount Description"
                                value={discountDescription}
                                onChange={(e) => setDiscountDescription(e.target.value)}
                                containerClassName="mb-0"
                            />
                            <Input
                                label="Tax Percentage"
                                type="number"
                                value={taxPercentage}
                                onChange={(e) => setTaxPercentage(Number(e.target.value) || 0)}
                                containerClassName="mb-0"
                            />
                            <Input
                                label="Shipping Cost (MMK)"
                                type="number"
                                value={shippingCost}
                                onChange={(e) => setShippingCost(Number(e.target.value) || 0)}
                                containerClassName="mb-0"
                            />
                            <div className="border-t pt-3">
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Total:</span>
                                    <span>{orderTotal.toLocaleString()} MMK</span>
                                </div>
                            </div>
                            <Input
                                label="Payment Method"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                containerClassName="mb-0"
                            />
                            <Input
                                label="Notes"
                                as="textarea"
                                rows={3}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                containerClassName="mb-0"
                            />
                            <Button
                                variant="primary"
                                size="lg"
                                onClick={handleCheckout}
                                className="w-full"
                            >
                                Checkout
                            </Button>
                        </div>
                    </div>
                </div>
            </div>


            {/* Customer Modal */}
            {isCustomerModalOpen && (
                <Modal
                    isOpen={isCustomerModalOpen}
                    onClose={() => setIsCustomerModalOpen(false)}
                    title="New Customer"
                >
                    <div className="space-y-4">
                        <Input
                            label="Name *"
                            value={newCustomerData.name}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                        />
                        <Input
                            label="Email"
                            type="email"
                            value={newCustomerData.email}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                        />
                        <Input
                            label="Phone"
                            value={newCustomerData.phone}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                        />
                        <Input
                            label="Street"
                            value={newCustomerData.address.street}
                            onChange={(e) => setNewCustomerData({
                                ...newCustomerData,
                                address: { ...newCustomerData.address, street: e.target.value }
                            })}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="City"
                                value={newCustomerData.address.city}
                                onChange={(e) => setNewCustomerData({
                                    ...newCustomerData,
                                    address: { ...newCustomerData.address, city: e.target.value }
                                })}
                            />
                            <Input
                                label="State"
                                value={newCustomerData.address.state}
                                onChange={(e) => setNewCustomerData({
                                    ...newCustomerData,
                                    address: { ...newCustomerData.address, state: e.target.value }
                                })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Zip Code"
                                value={newCustomerData.address.zipCode}
                                onChange={(e) => setNewCustomerData({
                                    ...newCustomerData,
                                    address: { ...newCustomerData.address, zipCode: e.target.value }
                                })}
                            />
                            <Input
                                label="Country"
                                value={newCustomerData.address.country}
                                onChange={(e) => setNewCustomerData({
                                    ...newCustomerData,
                                    address: { ...newCustomerData.address, country: e.target.value }
                                })}
                            />
                        </div>
                        <Input
                            label="Notes"
                            as="textarea"
                            rows={3}
                            value={newCustomerData.notes}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, notes: e.target.value })}
                        />
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="secondary" onClick={() => setIsCustomerModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleAddCustomer}>Add Customer</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default SalesInterface;






