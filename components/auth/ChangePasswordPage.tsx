import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { APP_NAME } from '../../constants';
import { useNotification } from '../../hooks/useNotification'; // New import

// Icons for password visibility toggle
const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639l4.418-5.523A2.5 2.5 0 0 1 8.5 4.5h7a2.5 2.5 0 0 1 2.044 1.161l4.418 5.523a1.012 1.012 0 0 1 0 .639l-4.418 5.523A2.5 2.5 0 0 1 15.5 19.5h-7a2.5 2.5 0 0 1-2.044-1.161L2.036 12.322Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>;
const EyeSlashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>;


const ChangePasswordPage: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  // const [successMessage, setSuccessMessage] = useState(''); // Replaced by notification
  const [isLoading, setIsLoading] = useState(false);
  const { user, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const { addNotification } = useNotification(); // New hook usage

  if (!user) {
    navigate('/login'); // Should not happen if routed correctly by App.tsx
    return null;
  }

  // Add a logout option if user is stuck
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // setSuccessMessage(''); // Replaced by notification

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const success = await changePassword(newPassword);
      setIsLoading(false);

      if (success) {
        addNotification('Password changed successfully! Redirecting...', 'success', 'Password Updated');
        // Give a moment for the user context to refresh, then navigate
        // Use a longer timeout to ensure state is updated
        setTimeout(() => {
          // Force a full page reload to clear any stuck state
          window.location.href = '/#/dashboard';
        }, 1500);
      } else {
        const apiErrorMsg = 'Failed to change password. Please try again or contact support.';
        setError(apiErrorMsg);
        addNotification(apiErrorMsg, 'error', 'Password Update Failed');
      }
    } catch (error: any) {
      setIsLoading(false);
      const errorMsg = error?.message || 'Failed to change password. Please try again or contact support.';
      setError(errorMsg);
      addNotification(errorMsg, 'error', 'Password Update Failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg dark:bg-slate-900 p-4">
      <div className="w-full max-w-md bg-container-bg dark:bg-slate-800 p-8 rounded-lg shadow-xl">
        <div className="text-center mb-8">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto mb-4 text-primary-action">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
            </svg>
          <h1 className="text-2xl font-bold text-text-primary dark:text-slate-100">{APP_NAME}</h1>
          <h2 className="text-xl font-semibold text-text-primary dark:text-slate-100 mt-2">Create New Password</h2>
          <p className="text-text-secondary dark:text-slate-400 mt-1">Please create a new password for your account.</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <Input
            id="newPassword"
            label="New Password"
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password (min. 8 characters)"
            required
            autoComplete="new-password"
            icon={showNewPassword ? <EyeSlashIcon /> : <EyeIcon />}
            onIconClick={() => setShowNewPassword(!showNewPassword)}
          />
          <Input
            id="confirmPassword"
            label="Confirm New Password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
            autoComplete="new-password"
            icon={showConfirmPassword ? <EyeSlashIcon /> : <EyeIcon />}
            onIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
          />
          {error && <p className="text-sm text-status-danger mb-4 text-center">{error}</p>}
          {/* {successMessage && <p className="text-sm text-status-success mb-4 text-center">{successMessage}</p>} Replaced by notification */}
          <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading} size="lg">
            Set New Password
          </Button>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-text-secondary dark:text-slate-400 hover:text-text-primary dark:hover:text-slate-200 underline"
            >
              Logout and try again
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordPage;