import React, { useState, useEffect, useCallback } from 'react';
import { PaymentMethodSetting } from '../../types';
import { 
    apiGetPaymentMethodSettings, 
    apiAddPaymentMethodSetting, 
    apiUpdatePaymentMethodSetting, 
    apiDeletePaymentMethodSetting,
    apiUpdatePaymentMethodsOrder
} from '../../services/api';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Spinner from '../ui/Spinner';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';

const DragHandleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-400 cursor-grab group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
    </svg>
);


const AddEditPaymentMethodModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  existingMethod?: PaymentMethodSetting | null;
}> = ({ isOpen, onClose, onSave, existingMethod }) => {
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation();
    const [name, setName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [showInPublic, setShowInPublic] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [qrCodePreview, setQrCodePreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
  
    useEffect(() => {
      if (existingMethod) {
        setName(existingMethod.name);
        setAccountNumber(existingMethod.accountNumber || '');
        setIsActive(existingMethod.isActive);
        setShowInPublic(existingMethod.showInPublic ?? false);
        setLogoPreview(existingMethod.logoUrl || null);
        setQrCodePreview(existingMethod.qrCodeUrl || null);
      } else {
        setName('');
        setAccountNumber('');
        setIsActive(true);
        setShowInPublic(false);
        setLogoPreview(null);
        setQrCodePreview(null);
      }
      setLogoFile(null);
      setQrCodeFile(null);
    }, [existingMethod]);
  
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'qr') => {
        const file = e.target.files?.[0] || null;
        if (file && file.size > 2 * 1024 * 1024) { // 2MB limit
            addNotification("Image file is too large. Max 2MB.", "error");
            return;
        }

        if (type === 'logo') {
            setLogoFile(file);
            if (logoPreview) URL.revokeObjectURL(logoPreview);
            setLogoPreview(file ? URL.createObjectURL(file) : existingMethod?.logoUrl || null);
        } else {
            setQrCodeFile(file);
            if (qrCodePreview) URL.revokeObjectURL(qrCodePreview);
            setQrCodePreview(file ? URL.createObjectURL(file) : existingMethod?.qrCodeUrl || null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) {
        addNotification("Payment method name is required.", "error");
        return;
      }
  
      setIsLoading(true);
      try {
        const dataPayload = { name, accountNumber, isActive, showInPublic };
        const filesPayload = { logoFile, qrCodeFile };
        
        if (existingMethod) {
          await apiUpdatePaymentMethodSetting(existingMethod.id, dataPayload, filesPayload);
          addNotification("Payment method updated successfully.", "success");
        } else {
          await apiAddPaymentMethodSetting(dataPayload, filesPayload);
          addNotification("Payment method added successfully.", "success");
        }
        onSave();
        onClose();
      } catch (error) {
        addNotification(`Failed to save payment method: ${(error as Error).message}`, "error");
      }
      setIsLoading(false);
    };
  
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={existingMethod ? "Edit Payment Method" : "Add New Payment Method"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Method Name*" value={name} onChange={e => setName(e.target.value)} required />
          <Input label="Account / Phone Number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div>
                <Input label="Logo Image (Optional)" type="file" onChange={e => handleFileChange(e, 'logo')} accept="image/*" />
                {logoPreview && <img src={logoPreview} alt="Logo Preview" className="mt-2 h-16 w-auto object-contain border p-1 rounded" />}
            </div>
             <div>
                <Input label={name === 'KBZ Pay (Quick Pay)' ? 'Instruction Image (Landscape)' : 'QR Code Image (Optional)'} type="file" onChange={e => handleFileChange(e, 'qr')} accept="image/*" />
                {qrCodePreview && <img src={qrCodePreview} alt="QR Preview" className="mt-2 h-16 w-auto object-contain border p-1 rounded" />}
            </div>
          </div>

          <div className="flex items-center">
            <input type="checkbox" id="pm-isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-4 w-4" />
            <label htmlFor="pm-isActive" className="ml-2 text-sm">Active (can be used for payments)</label>
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="pm-showInPublic" checked={showInPublic} onChange={e => setShowInPublic(e.target.checked)} className="h-4 w-4" />
            <label htmlFor="pm-showInPublic" className="ml-2 text-sm">Show on Public Payment Page</label>
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={isLoading}>{existingMethod ? "Save Changes" : "Add Method"}</Button>
          </div>
        </form>
      </Modal>
    );
};

interface PaymentMethodsSettingsProps {
    methods: PaymentMethodSetting[];
    onDataChange: () => void;
}

const PaymentMethodsSettings: React.FC<PaymentMethodsSettingsProps> = ({ methods, onDataChange }) => {
    const [localMethods, setLocalMethods] = useState<PaymentMethodSetting[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMethod, setEditingMethod] = useState<PaymentMethodSetting | null>(null);
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation();
    const [draggedItem, setDraggedItem] = useState<PaymentMethodSetting | null>(null);

    useEffect(() => {
        setLocalMethods(methods);
    }, [methods]);
  
    const handleOpenModal = (method: PaymentMethodSetting | null = null) => {
        setEditingMethod(method);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        const confirmed = await showConfirmation({
          title: 'Delete Payment Method',
          message: `Are you sure you want to delete "${name}"?`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          confirmVariant: 'danger',
        });
        if (confirmed) {
          try {
            await apiDeletePaymentMethodSetting(id);
            addNotification(`"${name}" deleted successfully.`, "success");
            onDataChange();
          } catch (error) {
            addNotification(`Failed to delete "${name}". ${(error as Error).message}`, "error");
          }
        }
    };
    
    const handleDragStart = (e: React.DragEvent<HTMLLIElement>, item: PaymentMethodSetting) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent<HTMLLIElement>, targetItem: PaymentMethodSetting) => {
        e.preventDefault();
        if (!draggedItem || draggedItem.id === targetItem.id) {
            setDraggedItem(null);
            return;
        }

        let newMethods = [...localMethods];
        const draggedIndex = newMethods.findIndex(m => m.id === draggedItem.id);
        const targetIndex = newMethods.findIndex(m => m.id === targetItem.id);

        const [removed] = newMethods.splice(draggedIndex, 1);
        newMethods.splice(targetIndex, 0, removed);
        setLocalMethods(newMethods);
        setDraggedItem(null);

        try {
            const orderedIds = newMethods.map(m => m.id);
            await apiUpdatePaymentMethodsOrder(orderedIds);
            addNotification('Payment method order saved.', 'success');
            onDataChange();
        } catch (error) {
            addNotification('Failed to save order.', 'error');
            onDataChange();
        }
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
    };

    return (
        <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-text-primary dark:text-slate-100">Payment Methods</h3>
                <Button onClick={() => handleOpenModal()} variant="primary" size="sm">Add New</Button>
            </div>
            {localMethods.length === 0 ? <p className="text-text-secondary dark:text-slate-400">No payment methods configured yet.</p> : (
                <ul className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                    {localMethods.map(method => (
                        <li 
                            key={method.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, method)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, method)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-md group hover:bg-gray-100 dark:hover:bg-slate-700 transition-shadow ${draggedItem?.id === method.id ? 'opacity-50 shadow-lg' : ''}`}
                        >
                            <div className="flex items-center gap-4">
                                <DragHandleIcon />
                                {method.logoUrl && <img src={method.logoUrl} alt={method.name} className="h-8 w-auto object-contain" />}
                                <div>
                                    <p className="text-text-primary dark:text-slate-200 font-medium">{method.name}</p>
                                    <p className="text-xs text-text-secondary dark:text-slate-400 font-mono">{method.accountNumber}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                {method.showInPublic && (
                                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                        Public
                                    </span>
                                )}
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${method.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {method.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <Button onClick={() => handleOpenModal(method)} variant="ghost" size="sm" className="!px-2 !py-1 text-xs">Edit</Button>
                                <Button onClick={() => handleDelete(method.id, method.name)} variant="danger" size="sm" className="!px-2 !py-1 text-xs">Delete</Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            <AddEditPaymentMethodModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={onDataChange} 
                existingMethod={editingMethod} 
            />
        </div>
    );
};

export default PaymentMethodsSettings;
