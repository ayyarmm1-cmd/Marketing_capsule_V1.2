import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { POSCustomer } from '../../types';
import { 
    apiGetPOSCustomers, 
    apiAddPOSCustomer, 
    apiUpdatePOSCustomer, 
    apiDeletePOSCustomer 
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Spinner from '../ui/Spinner';
import Modal from '../ui/Modal';

const CustomerListPage: React.FC = () => {
    const { user, hasPermission } = useAuth();
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation();
    const [customers, setCustomers] = useState<POSCustomer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<POSCustomer | null>(null);
    const [formData, setFormData] = useState({
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

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedCustomers = await apiGetPOSCustomers();
            setCustomers(fetchedCustomers);
        } catch (error) {
            console.error("Failed to load customers:", error);
            addNotification("Failed to load customers.", "error");
        }
        setIsLoading(false);
    }, [addNotification]);

    const handleOpenModal = (customer?: POSCustomer) => {
        if (customer) {
            setEditingCustomer(customer);
            setFormData({
                name: customer.name,
                email: customer.email || '',
                phone: customer.phone || '',
                address: customer.address || {
                    street: '',
                    city: '',
                    state: '',
                    zipCode: '',
                    country: '',
                },
                notes: customer.notes || '',
            });
        } else {
            setEditingCustomer(null);
            setFormData({
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
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            addNotification("Please enter customer name.", "error");
            return;
        }

        try {
            if (editingCustomer) {
                await apiUpdatePOSCustomer({
                    id: editingCustomer.id,
                    ...formData,
                });
                addNotification("Customer updated successfully!", "success");
            } else {
                await apiAddPOSCustomer(formData);
                addNotification("Customer created successfully!", "success");
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addNotification(`Failed to save customer: ${errorMessage}`, "error");
        }
    };

    const handleDelete = async (customer: POSCustomer) => {
        const confirmed = await showConfirmation(
            "Delete Customer",
            `Are you sure you want to delete "${customer.name}"? This action cannot be undone.`
        );
        if (!confirmed) return;

        try {
            await apiDeletePOSCustomer(customer.id);
            addNotification("Customer deleted successfully!", "success");
            fetchData();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addNotification(`Failed to delete customer: ${errorMessage}`, "error");
        }
    };

    const filteredCustomers = useMemo(() => {
        if (!searchTerm) return customers;
        const term = searchTerm.toLowerCase();
        return customers.filter(customer =>
            customer.name.toLowerCase().includes(term) ||
            customer.id.toLowerCase().includes(term) ||
            (customer.email && customer.email.toLowerCase().includes(term)) ||
            (customer.phone && customer.phone.includes(term))
        );
    }, [customers, searchTerm]);

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
                <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">POS Customers</h1>
                {hasPermission('CREATE_POS_ORDER' as any) && (
                    <Button onClick={() => handleOpenModal()} variant="primary">+ New Customer</Button>
                )}
            </div>

            {/* Search */}
            <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow mb-6">
                <Input
                    placeholder="Search customers by name, ID, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Customers Table */}
            <div className="bg-container-bg dark:bg-slate-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-100 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">ID</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Email</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Phone</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Address</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Created</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredCustomers.map(customer => (
                            <tr key={customer.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="px-4 py-3 text-sm font-mono">{customer.id}</td>
                                <td className="px-4 py-3 text-sm font-medium">
                                    <Link
                                        to={`/pos/customers/${customer.id}`}
                                        className="text-primary-action hover:text-blue-700 dark:text-blue-400"
                                    >
                                        {customer.name}
                                    </Link>
                                </td>
                                <td className="px-4 py-3 text-sm">{customer.email || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm">{customer.phone || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm">
                                    {customer.address ? (
                                        [
                                            customer.address.street,
                                            customer.address.city,
                                            customer.address.state
                                        ].filter(Boolean).join(', ') || 'N/A'
                                    ) : 'N/A'}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {new Date(customer.createdAt).toLocaleDateString('en-GB')}
                                </td>
                                <td className="px-4 py-3 text-sm space-x-2">
                                    <Link
                                        to={`/pos/customers/${customer.id}`}
                                        className="text-primary-action hover:text-blue-700 dark:text-blue-400"
                                    >
                                        View
                                    </Link>
                                    {hasPermission('MANAGE_POS_ORDERS' as any) && (
                                        <>
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                onClick={() => handleOpenModal(customer)}
                                            >
                                                Edit
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="danger" 
                                                onClick={() => handleDelete(customer)}
                                            >
                                                Delete
                                            </Button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredCustomers.length === 0 && (
                    <p className="text-center text-text-secondary py-8">
                        {searchTerm ? 'No customers found matching your search.' : 'No customers found.'}
                    </p>
                )}
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={editingCustomer ? 'Edit Customer' : 'New Customer'}
                >
                    <div className="space-y-4">
                        <Input
                            label="Name *"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                        <Input
                            label="Email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                        <Input
                            label="Phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                        <Input
                            label="Street"
                            value={formData.address.street}
                            onChange={(e) => setFormData({
                                ...formData,
                                address: { ...formData.address, street: e.target.value }
                            })}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="City"
                                value={formData.address.city}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    address: { ...formData.address, city: e.target.value }
                                })}
                            />
                            <Input
                                label="State"
                                value={formData.address.state}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    address: { ...formData.address, state: e.target.value }
                                })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Zip Code"
                                value={formData.address.zipCode}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    address: { ...formData.address, zipCode: e.target.value }
                                })}
                            />
                            <Input
                                label="Country"
                                value={formData.address.country}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    address: { ...formData.address, country: e.target.value }
                                })}
                            />
                        </div>
                        <Input
                            label="Notes"
                            as="textarea"
                            rows={3}
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
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

export default CustomerListPage;






