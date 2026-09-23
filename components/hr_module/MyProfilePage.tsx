import React, { useState, useEffect, useCallback } from 'react';
import { Employee, UserRole, EmployeeStatus } from '../../types';
import { apiGetEmployeeById, apiUpdateEmployee } 
from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import { STATUS_COLORS } from '../../constants';
import { useNotification } from '../../hooks/useNotification';

type MyProfileFormData = Partial<Employee> & {
    facePhotoFile?: File | null;
    nrcFrontPhotoFile?: File | null;
    nrcBackPhotoFile?: File | null;
};

const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>;


const MyProfilePage: React.FC = () => {
  const { user, updateUserContext } = useAuth();
  const { addNotification } = useNotification();
  const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);
  const [initialEmployeeDetails, setInitialEmployeeDetails] = useState<Employee | null>(null); 
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<MyProfileFormData>({});

  const [facePhotoPreview, setFacePhotoPreview] = useState<string | null>(null);
  const [nrcFrontPhotoPreview, setNrcFrontPhotoPreview] = useState<string | null>(null);
  const [nrcBackPhotoPreview, setNrcBackPhotoPreview] = useState<string | null>(null);

  const fetchProfileData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const details = await apiGetEmployeeById(user.id);
      if (details) {
        setEmployeeDetails(details);
        setInitialEmployeeDetails(details); 
        setFormData({
            ...details,
            facePhotoFile: null,
            nrcFrontPhotoFile: null,
            nrcBackPhotoFile: null,
        });
        setFacePhotoPreview(details.facePhotoUrl || null);
        setNrcFrontPhotoPreview(details.nrcFrontPhotoUrl || null);
        setNrcBackPhotoPreview(details.nrcBackPhotoUrl || null);
      } else {
        console.error("Employee details not found for logged in user.");
      }
    } catch (error) {
      console.error("Failed to fetch profile data:", error);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Effect to clean up blob URLs
  useEffect(() => {
    return () => {
      if (facePhotoPreview && facePhotoPreview.startsWith('blob:')) URL.revokeObjectURL(facePhotoPreview);
      if (nrcFrontPhotoPreview && nrcFrontPhotoPreview.startsWith('blob:')) URL.revokeObjectURL(nrcFrontPhotoPreview);
      if (nrcBackPhotoPreview && nrcBackPhotoPreview.startsWith('blob:')) URL.revokeObjectURL(nrcBackPhotoPreview);
    };
  }, [facePhotoPreview, nrcFrontPhotoPreview, nrcBackPhotoPreview]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
     if (type === 'file') {
        const files = (e.target as HTMLInputElement).files;
        const file = files && files[0] ? files[0] : null;

        if (file && file.size > 5 * 1024 * 1024) { // 5MB limit
            addNotification("File is too large. Please select an image smaller than 5MB.", "error", "Upload Error");
            (e.target as HTMLInputElement).value = ''; // Clear the file input
            return;
        }

        setFormData(prev => ({ ...prev, [name]: file }));

        // Handle previews
        if (name === 'facePhotoFile') {
            if (facePhotoPreview && facePhotoPreview.startsWith('blob:')) URL.revokeObjectURL(facePhotoPreview);
            setFacePhotoPreview(file ? URL.createObjectURL(file) : employeeDetails?.facePhotoUrl || null);
        } else if (name === 'nrcFrontPhotoFile') {
            if (nrcFrontPhotoPreview && nrcFrontPhotoPreview.startsWith('blob:')) URL.revokeObjectURL(nrcFrontPhotoPreview);
            setNrcFrontPhotoPreview(file ? URL.createObjectURL(file) : employeeDetails?.nrcFrontPhotoUrl || null);
        } else if (name === 'nrcBackPhotoFile') {
            if (nrcBackPhotoPreview && nrcBackPhotoPreview.startsWith('blob:')) URL.revokeObjectURL(nrcBackPhotoPreview);
            setNrcBackPhotoPreview(file ? URL.createObjectURL(file) : employeeDetails?.nrcBackPhotoUrl || null);
        }
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveChanges = async () => {
    if (!employeeDetails) return;
    setIsLoading(true);
    try {
      // Start with always-editable fields and photo files
      const updatePayload: Partial<Employee> & { id: string; facePhotoFile?: File | null; nrcFrontPhotoFile?: File | null; nrcBackPhotoFile?: File | null; } = {
        id: employeeDetails.id,
        personalPhone: formData.personalPhone,
        maritalStatus: formData.maritalStatus,
        bankAccountNumber: formData.bankAccountNumber,
        bankName: formData.bankName,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
        facePhotoFile: formData.facePhotoFile,
        nrcFrontPhotoFile: formData.nrcFrontPhotoFile,
        nrcBackPhotoFile: formData.nrcBackPhotoFile,
      };

      // Conditionally add "fill once" fields ONLY IF they were initially empty.
      // This prevents accidental overwriting or deletion of existing data for these fields.
      if (!initialEmployeeDetails?.address) {
        updatePayload.address = formData.address;
      }
      if (!initialEmployeeDetails?.nrcNumber) {
        updatePayload.nrcNumber = formData.nrcNumber;
      }
      if (!initialEmployeeDetails?.gender) {
        updatePayload.gender = formData.gender;
      }
      if (!initialEmployeeDetails?.nationality) {
        updatePayload.nationality = formData.nationality;
      }
      if (!initialEmployeeDetails?.dateOfBirth) {
        updatePayload.dateOfBirth = formData.dateOfBirth;
      }
      
      // Remove any keys that ended up as undefined before sending to the API.
      Object.keys(updatePayload).forEach(key => (updatePayload[key as keyof typeof updatePayload] === undefined) && delete updatePayload[key as keyof typeof updatePayload]);

      const updatedEmployee = await apiUpdateEmployee(updatePayload);
      
      setEmployeeDetails(updatedEmployee);
      setInitialEmployeeDetails(updatedEmployee); 
      setFormData({ // Reset form data, keeping files null
          ...updatedEmployee,
          facePhotoFile: null,
          nrcFrontPhotoFile: null,
          nrcBackPhotoFile: null,
      });
      updateUserContext(updatedEmployee); 
      setIsEditing(false);
      addNotification("Profile updated successfully!", "success");
    } catch (error) {
      console.error("Failed to update profile:", error);
      addNotification("Failed to update profile. Please try again.", "error");
    }
    setIsLoading(false);
  };
  
  const formatDate = (dateString?: string) => dateString ? new Date(dateString).toLocaleDateString('en-GB') : 'N/A';

  if (isLoading && !employeeDetails) {
    return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  }

  if (!employeeDetails) {
    return <div className="text-center text-text-primary dark:text-slate-200 p-8">Employee profile not available.</div>;
  }
  
  const isFieldEditable = (fieldName: keyof Employee) => {
    const initialValue = initialEmployeeDetails?.[fieldName];
    return initialValue === undefined || initialValue === null || initialValue === '';
  };
  
  const canEditAddress = isFieldEditable('address');
  const canEditNrcNumber = isFieldEditable('nrcNumber');
  const canEditGender = isFieldEditable('gender');
  const canEditNationality = isFieldEditable('nationality');
  const canEditDob = isFieldEditable('dateOfBirth');

  return (
    <div className="p-6 max-w-4xl mx-auto bg-container-bg dark:bg-slate-800 shadow-xl rounded-lg">
      <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
        <div className="relative flex-shrink-0">
          <div className="w-32 h-32 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold text-4xl shadow-lg ring-4 ring-white dark:ring-slate-800">
            {facePhotoPreview ? (
              <img
                className="w-full h-full rounded-full object-cover"
                src={facePhotoPreview}
                alt="Profile"
              />
            ) : (
              <span>{employeeDetails.name.split(' ').map(n => n[0]).join('').toUpperCase()}</span>
            )}
          </div>
          {isEditing && (
            <label htmlFor="facePhotoFile" className="absolute -bottom-2 -right-2 bg-primary-action text-white rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors shadow-md border-2 border-white dark:border-slate-800">
              <UploadIcon />
              <input id="facePhotoFile" name="facePhotoFile" type="file" className="hidden" onChange={handleChange} accept="image/*" />
            </label>
          )}
        </div>
        <div className="flex-grow text-center sm:text-left">
          <h1 className="text-3xl font-bold text-text-primary dark:text-slate-100">{employeeDetails.name}</h1>
          <p className="text-md text-text-secondary dark:text-slate-400">{employeeDetails.jobTitle}</p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="primary">Edit Profile</Button>
        )}
      </div>

      <div className="space-y-6">
        {/* Employment Information (Read-Only by Employee) */}
        <section>
          <h2 className="text-xl font-semibold text-text-secondary dark:text-slate-300 mb-3">Employment Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <p><strong className="text-text-secondary dark:text-slate-400 w-36 inline-block">Employee ID:</strong> {employeeDetails.employeeId}</p>
            <p><strong className="text-text-secondary dark:text-slate-400 w-36 inline-block">Name:</strong> {employeeDetails.name}</p>
            <p><strong className="text-text-secondary dark:text-slate-400 w-36 inline-block">Login Email:</strong> {employeeDetails.email}</p>
            <p><strong className="text-text-secondary dark:text-slate-400 w-36 inline-block">Role:</strong> {employeeDetails.role}</p>
            <p><strong className="text-text-secondary dark:text-slate-400 w-36 inline-block">Department:</strong> {employeeDetails.department}</p>
            <p><strong className="text-text-secondary dark:text-slate-400 w-36 inline-block">Job Title:</strong> {employeeDetails.jobTitle}</p>
            <p><strong className="text-text-secondary dark:text-slate-400 w-36 inline-block">Joining Date:</strong> {formatDate(employeeDetails.joiningDate)}</p>
            <p><strong className="text-text-secondary dark:text-slate-400 w-36 inline-block">Status:</strong> 
                <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[employeeDetails.employeeStatus] || 'bg-gray-200 text-gray-700'}`}>
                    {employeeDetails.employeeStatus}
                </span>
            </p>
            <p><strong className="text-text-secondary dark:text-slate-400 w-36 inline-block">Basic Pay:</strong> {employeeDetails.basicPay.toLocaleString()} MMK</p>
            <p><strong className="text-text-secondary dark:text-slate-400 w-36 inline-block">Payment Type:</strong> {employeeDetails.paymentType}</p>
          </div>
        </section>

        {/* Personal Information (Partially Editable by Employee) */}
        <section>
          <h2 className="text-xl font-semibold text-text-secondary dark:text-slate-300 mb-3 pt-4 border-t border-slate-200 dark:border-slate-700">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <Input label="Personal Phone" name="personalPhone" value={formData.personalPhone || ''} onChange={handleChange} disabled={!isEditing} />
            <Input label="Date of Birth" type="date" name="dateOfBirth" value={formData.dateOfBirth?.split('T')[0] || ''} onChange={handleChange} disabled={!isEditing || !canEditDob} containerClassName={!canEditDob && !!initialEmployeeDetails?.dateOfBirth ? 'opacity-70' : ''}/>
            
            <Select label="Gender" name="gender" value={formData.gender || ''} onChange={handleChange} disabled={!isEditing || !canEditGender}
                options={[{value: '', label: '-- Select --'},{value: 'Male', label: 'Male'}, {value: 'Female', label: 'Female'}, {value: 'Other', label: 'Other'}, {value: 'Prefer not to say', label: 'Prefer not to say'}]} 
                containerClassName={!canEditGender && !!initialEmployeeDetails?.gender ? 'opacity-70' : ''}
            />
            <Select label="Marital Status" name="maritalStatus" value={formData.maritalStatus || ''} onChange={handleChange} disabled={!isEditing}
                options={[{value: '', label: '-- Select --'},{value: 'Single', label: 'Single'}, {value: 'Married', label: 'Married'}, {value: 'Divorced', label: 'Widowed'}, {value: 'Other', label: 'Other'}]} />
            
            <Input label="Nationality" name="nationality" value={formData.nationality || ''} onChange={handleChange} disabled={!isEditing || !canEditNationality} 
                containerClassName={!canEditNationality && !!initialEmployeeDetails?.nationality ? 'opacity-70' : ''}/>
            <Input label="Address" name="address" value={formData.address || ''} onChange={handleChange} disabled={!isEditing || !canEditAddress} 
                containerClassName={!canEditAddress && !!initialEmployeeDetails?.address ? 'opacity-70' : ''} />
          </div>
        </section>

        {/* NRC Information & Photos (Editable by Employee) */}
        <section>
          <h2 className="text-xl font-semibold text-text-secondary dark:text-slate-300 mb-3 pt-4 border-t border-slate-200 dark:border-slate-700">NRC Information & Photos</h2>
          <div className="space-y-4">
            <Input label="NRC Number" name="nrcNumber" value={formData.nrcNumber || ''} onChange={handleChange} disabled={!isEditing || !canEditNrcNumber} 
                containerClassName={!canEditNrcNumber && !!initialEmployeeDetails?.nrcNumber ? 'opacity-70' : ''}/>
            { !canEditNrcNumber && initialEmployeeDetails?.nrcNumber && isEditing && <p className="text-xs text-text-secondary dark:text-slate-400 -mt-3">NRC Number can only be filled once. Contact HR to update.</p>}
            {!initialEmployeeDetails?.nrcNumber && isEditing && <p className="text-xs text-text-secondary dark:text-slate-400 -mt-3">This can only be filled once.</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">NRC Front Photo</label>
                    {isEditing && <Input type="file" name="nrcFrontPhotoFile" onChange={handleChange} accept="image/*" containerClassName='mb-2'/>}
                    {nrcFrontPhotoPreview && <img src={nrcFrontPhotoPreview} alt="NRC Front" className="mt-2 rounded-md border dark:border-slate-600 h-24 object-contain"/>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">NRC Back Photo</label>
                    {isEditing && <Input type="file" name="nrcBackPhotoFile" onChange={handleChange} accept="image/*" containerClassName='mb-2'/>}
                    {nrcBackPhotoPreview && <img src={nrcBackPhotoPreview} alt="NRC Back" className="mt-2 rounded-md border dark:border-slate-600 h-24 object-contain"/>}
                </div>
            </div>
          </div>
        </section>
        
        {/* Emergency Contact & Bank Details */}
        <section>
          <h2 className="text-xl font-semibold text-text-secondary dark:text-slate-300 mb-3 pt-4 border-t border-slate-200 dark:border-slate-700">Emergency Contact & Bank Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <Input label="Emergency Contact Name" name="emergencyContactName" value={formData.emergencyContactName || ''} onChange={handleChange} disabled={!isEditing} />
            <Input label="Emergency Contact Phone" name="emergencyContactPhone" value={formData.emergencyContactPhone || ''} onChange={handleChange} disabled={!isEditing} />
            <Input label="Bank Account Number" name="bankAccountNumber" value={formData.bankAccountNumber || ''} onChange={handleChange} disabled={!isEditing} />
            <Input label="Bank Name" name="bankName" value={formData.bankName || ''} onChange={handleChange} disabled={!isEditing} />
          </div>
        </section>

        {isEditing && (
          <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200 dark:border-slate-700">
            <Button onClick={() => { setIsEditing(false); fetchProfileData(); }} variant="secondary" disabled={isLoading}>Cancel</Button>
            <Button onClick={handleSaveChanges} variant="primary" isLoading={isLoading} disabled={isLoading}>Save Changes</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyProfilePage;