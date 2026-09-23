import React, { useState, useEffect, useCallback } from 'react';
import { apiGetFinanceVendors, apiSaveFinanceVendor } from '../../services/api';
import { Vendor } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { useNotification } from '../../hooks/useNotification';
import {
  notifyOperationWithData,
  notifyWarning,
} from '../../utils/notificationUtils';
import FinanceTable from './shared/FinanceTable';
import { useSearchFilter } from '../../hooks/useFinanceFilters';

const VendorManagementTab: React.FC = () => {
  const { addNotification } = useNotification();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [vendorForm, setVendorForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
  });

  const { searchTerm, setSearchTerm, filterBySearch } = useSearchFilter<Vendor>();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const vendorData = await apiGetFinanceVendors();
      setVendors(vendorData);
    } catch (error) {
      console.error('Error loading vendors:', error);
      addNotification((error as Error).message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleOpenModal = (vendor: Vendor | null = null) => {
    if (vendor) {
      setEditingVendor(vendor);
      setVendorForm({
        name: vendor.name,
        contactPerson: vendor.contactPerson || '',
        phone: vendor.phone || '',
        email: vendor.email || '',
        address: vendor.address || '',
      });
    } else {
      setEditingVendor(null);
      setVendorForm({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!vendorForm.name) {
      notifyWarning(addNotification, 'Vendor name is required.');
      return;
    }

    const vendorData: Partial<Vendor> & { name: string } = {
      name: vendorForm.name,
      contactPerson: vendorForm.contactPerson || undefined,
      phone: vendorForm.phone || undefined,
      email: vendorForm.email || undefined,
      address: vendorForm.address || undefined,
      ...(editingVendor ? { id: editingVendor.id } : {}),
    };

    const vendor = await notifyOperationWithData(
      addNotification,
      () => apiSaveFinanceVendor(vendorData),
      editingVendor
        ? `Vendor "${vendorForm.name}" updated successfully.`
        : `Vendor "${vendorForm.name}" added successfully.`,
      'Failed to save vendor',
    );

    if (!vendor) return;
    await loadData();
    setIsModalOpen(false);
  };

  const filteredVendors = React.useMemo(() => {
    if (!searchTerm) return vendors;
    return vendors.filter(vendor =>
      filterBySearch(vendor, ['name', 'contactPerson', 'phone', 'email', 'address'])
    );
  }, [vendors, searchTerm, filterBySearch]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Vendor Management</h1>
          <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">
            Manage vendor information and contact details.
          </p>
        </div>
        <Button onClick={() => handleOpenModal(null)} variant="primary">
          + Add Vendor
        </Button>
      </div>

      {/* Search Filter */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 mb-6">
        <Input
          label="Search Vendors"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search by name, contact, phone, email, or address..."
        />
      </div>

      {/* Vendors Table */}
      <FinanceTable
        columns={[
          {
            key: 'name',
            label: 'Vendor Name',
            render: (vendor: Vendor) => (
              <span className="font-medium text-text-primary dark:text-slate-100">{vendor.name}</span>
            ),
          },
          {
            key: 'contactPerson',
            label: 'Contact Person',
            render: (vendor: Vendor) => vendor.contactPerson || '-',
          },
          {
            key: 'phone',
            label: 'Phone',
            render: (vendor: Vendor) => vendor.phone || '-',
          },
          {
            key: 'email',
            label: 'Email',
            render: (vendor: Vendor) => vendor.email || '-',
          },
          {
            key: 'address',
            label: 'Address',
            render: (vendor: Vendor) => vendor.address || '-',
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (vendor: Vendor) => (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenModal(vendor)}
                >
                  Edit
                </Button>
              </div>
            ),
          },
        ]}
        data={filteredVendors}
        isLoading={isLoading}
        emptyMessage="No vendors found. Add your first vendor to get started."
        rowKey="id"
      />

      {/* Add/Edit Vendor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVendor ? 'Edit Vendor' : 'Add Vendor'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Vendor Name*"
            value={vendorForm.name}
            onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })}
            required
          />
          <Input
            label="Contact Person"
            value={vendorForm.contactPerson}
            onChange={e => setVendorForm({ ...vendorForm, contactPerson: e.target.value })}
          />
          <Input
            label="Phone"
            value={vendorForm.phone}
            onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={vendorForm.email}
            onChange={e => setVendorForm({ ...vendorForm, email: e.target.value })}
          />
          <Input
            label="Address"
            value={vendorForm.address}
            onChange={e => setVendorForm({ ...vendorForm, address: e.target.value })}
            as="textarea"
            rows={2}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">{editingVendor ? 'Update' : 'Add'} Vendor</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VendorManagementTab;

