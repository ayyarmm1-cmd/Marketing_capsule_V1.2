





import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { APP_NAME } from '../../constants';
import Modal from '../ui/Modal';
import { apiSendPasswordResetEmail } from '../../services/api';
import { useNotification } from '../../hooks/useNotification';

// Icons for password visibility toggle
const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639l4.418-5.523A2.5 2.5 0 0 1 8.5 4.5h7a2.5 2.5 0 0 1 2.044 1.161l4.418 5.523a1.012 1.012 0 0 1 0 .639l-4.418 5.523A2.5 2.5 0 0 1 15.5 19.5h-7a2.5 2.5 0 0 1-2.044-1.161L2.036 12.322Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>;
const EyeSlashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>;


interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { addNotification } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await apiSendPasswordResetEmail(email);
      addNotification('If an account with that email exists, a password reset link has been sent.', 'success', 'Check Your Email');
      onClose();
      setEmail(''); // Reset for next time
    } catch (err) {
      console.error(err);
      const firebaseError = err as { code?: string };
      // For security, don't reveal if the user doesn't exist. Show success message regardless.
      if (firebaseError.code === 'auth/user-not-found') {
          addNotification('If an account with that email exists, a password reset link has been sent.', 'success', 'Check Your Email');
          onClose();
          setEmail('');
      } else {
        setError('Failed to send reset link. Please check the email address and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
      setEmail('');
      setError('');
      onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reset Your Password">
      <form onSubmit={handleSubmit}>
        <p className="text-sm text-text-secondary dark:text-slate-400 mb-4">
          Enter your account's email address and we will send you a link to reset your password.
        </p>
        <Input
          id="reset-email"
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          error={error}
        />
        <div className="mt-6 flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Send Reset Link
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const LoginPage: React.FC = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await auth.login(usernameOrEmail, password);
      // If login succeeds, onAuthStateChanged will handle navigation
      // No need to set loading to false here as component will unmount
    } catch (err: any) {
      console.error("Login error:", err);
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      // Check for custom error messages first
      if (err.message && !err.code) {
        if (err.message.includes('User not found')) {
            errorMessage = 'No user found with this username.';
        } else if (err.message.includes('User has no email')) {
            errorMessage = 'This user account is not configured for email login.';
        } else {
            errorMessage = err.message;
        }
      }
      // Check for Firebase error codes
      else if (err.code) {
        switch (err.code) {
          case 'auth/user-not-found':
          case 'auth/invalid-email':
            errorMessage = 'No user found with this email address or username.';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password. Please try again.';
            break;
          case 'auth/invalid-credential':
            errorMessage = 'Invalid credentials. Please check your username/email and password.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This user account has been disabled by an administrator.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed login attempts. Please reset your password or try again later.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your internet connection and try again.';
            break;
          case 'auth/internal-error':
            errorMessage = 'Internal server error. Please try again later.';
            break;
          default:
            errorMessage = `Login failed: ${err.message || 'An unknown error occurred. Please try again.'}`;
            console.error("Unhandled Firebase login error:", err);
        }
      }
      // If error has a message but no code, use the message
      else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };
  
  const inputClasses = "bg-slate-800/80 border-slate-500/70 text-white placeholder-slate-400 focus:ring-cyan-400 focus:border-cyan-400";


  return (
    <>
      <div 
        className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden"
        style={{
          backgroundImage: `
            linear-gradient(rgba(79, 70, 229, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(79, 70, 229, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-indigo-600/30 via-cyan-500/20 to-transparent rounded-full blur-3xl animate-float" style={{ maxWidth: '100vw', maxHeight: '100vh' }}></div>
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-gradient-to-br from-cyan-500/30 via-indigo-600/20 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '3s', maxWidth: '100vw', maxHeight: '100vh' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-indigo-400/15 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '6s', maxWidth: '100vw', maxHeight: '100vh' }}></div>
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-1/4 w-1 h-full bg-gradient-to-b from-transparent via-cyan-500 to-transparent" style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}></div>
            <div className="absolute top-0 right-1/4 w-1 h-full bg-gradient-to-b from-transparent via-indigo-500 to-transparent" style={{ animation: 'pulse-glow 2s ease-in-out infinite', animationDelay: '1s' }}></div>
          </div>
        </div>
        <div className="relative z-10 w-full max-w-md">
        <div className="w-full bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-cyan-500/30">
            <div className="p-8 text-white">
                <div className="text-center mb-8">
                  {auth.companyProfile?.logoUrl ? (
                    <img src={auth.companyProfile.logoUrl} alt="Company Logo" className="h-16 w-auto mx-auto mb-4" />
                  ) : (
                     <h1 className="text-3xl font-bold text-white mb-2">{auth.companyProfile?.appName || APP_NAME}</h1>
                  )}
                  <p className="text-2xl font-light text-slate-200">Welcome to Marketing Capsule</p>
                </div>

                <h2 className="text-center text-3xl font-bold mb-6 tracking-wide text-white">Login</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div 
                            className="bg-red-600/90 border-2 border-red-500 text-white p-4 rounded-lg text-sm font-medium shadow-lg animate-in fade-in duration-200" 
                            role="alert"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem'
                            }}
                        >
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                strokeWidth={2} 
                                stroke="currentColor" 
                                className="w-5 h-5 flex-shrink-0"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                            </svg>
                            <span>{error}</span>
                            <button
                                type="button"
                                onClick={() => setError('')}
                                className="ml-auto text-white hover:text-red-200 focus:outline-none"
                                aria-label="Dismiss error"
                            >
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    fill="none" 
                                    viewBox="0 0 24 24" 
                                    strokeWidth={2} 
                                    stroke="currentColor" 
                                    className="w-5 h-5"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    )}
                    <Input
                        id="usernameOrEmail"
                        type="text"
                        value={usernameOrEmail}
                        onChange={(e) => {
                            setUsernameOrEmail(e.target.value);
                            if (error) setError(''); // Clear error when user starts typing
                        }}
                        placeholder="Username"
                        required
                        className={inputClasses}
                        containerClassName='mb-0'
                    />
                    <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            if (error) setError(''); // Clear error when user starts typing
                        }}
                        placeholder="Password"
                        required
                        icon={showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                        onIconClick={() => setShowPassword(!showPassword)}
                        className={inputClasses}
                        containerClassName='mb-0'
                    />
                    <div className="flex items-center justify-between text-sm">
                        <label htmlFor="rememberMe" className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-white">
                        <input
                            id="rememberMe"
                            type="checkbox"
                            className="h-4 w-4 bg-slate-700/50 border-slate-500/50 text-indigo-500 focus:ring-indigo-400 rounded"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <span className="text-white">Remember me</span>
                        </label>
                        <a href="#" onClick={(e) => {e.preventDefault(); setIsForgotPasswordModalOpen(true);}} className="font-medium text-slate-300 hover:text-white">
                            Forgot Password?
                        </a>
                    </div>
                    <div className="pt-2">
                        <Button type="submit" className="w-full justify-center bg-white hover:bg-slate-200 text-slate-800 font-bold tracking-wide" isLoading={isLoading} size="lg">
                            Login
                        </Button>
                    </div>
                </form>
                <p className="mt-6 text-center text-xs text-slate-400">
                    By logging in, you agree to our <Link to="/terms-of-service" className="underline hover:text-white">Terms of Service</Link> and <Link to="/privacy-policy" className="underline hover:text-white">Privacy Policy</Link>.
                    <br/>
                    View our <Link to="/payments" className="underline hover:text-white">Payment Methods</Link>.
                </p>
            </div>
        </div>
        </div>
      </div>
      <ForgotPasswordModal
          isOpen={isForgotPasswordModalOpen}
          onClose={() => setIsForgotPasswordModalOpen(false)}
      />
    </>
  );
};

export default LoginPage;