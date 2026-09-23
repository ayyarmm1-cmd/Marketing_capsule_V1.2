import React, { useState, useEffect, useCallback } from 'react';
import { CashAccount, CompanyProfileSetting, PaymentMethodSetting } from '../../types';
import { apiGetCashAccounts, apiGetPaymentMethodSettings, apiGetCompanyProfile } from '../../services/api';
import Spinner from '../ui/Spinner';
import { useNotification } from '../../hooks/useNotification';

const ClipboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v3.042m-7.416 0v3.042c0 .212.03.418.084.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-green-500"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;

type PaymentMethodDisplay = {
    id: string;
    name: string;
    accountNumber?: string;
    logoUrl?: string;
    qrCodeUrl?: string;
    phoneNumber?: string;
};

const PaymentMethodCard: React.FC<{ method: PaymentMethodDisplay }> = ({ method }) => {
    const { addNotification } = useNotification();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const textToCopy = method.accountNumber || method.phoneNumber || '';
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        addNotification(`Copied '${textToCopy}' to clipboard!`, "success");
        setTimeout(() => setCopied(false), 2000);
    };

    const displayText = method.accountNumber || method.phoneNumber || '';

    return (
        <div className="bg-container-bg dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden flex flex-col items-center p-6 border border-slate-200 dark:border-slate-700 transition-transform hover:scale-105 hover:shadow-xl">
            {method.logoUrl && (
                <img src={method.logoUrl} alt={`${method.name} logo`} className="h-16 w-auto object-contain mb-4" />
            )}
            <h3 className="text-xl font-bold text-text-primary dark:text-slate-100">{method.name}</h3>
            {displayText && (
                <div className="mt-2 flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <p className="font-mono text-lg text-primary-action dark:text-blue-400">{displayText}</p>
                    <button onClick={handleCopy} className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" aria-label={`Copy ${displayText}`}>
                        {copied ? <CheckIcon /> : <ClipboardIcon />}
                    </button>
                </div>
            )}
            {method.qrCodeUrl && (
                method.name === 'KBZ Pay (Quick Pay)' ? (
                    <img src={method.qrCodeUrl} alt={`${method.name} Instructions`} className="w-full h-auto object-contain mt-4 border-4 border-slate-200 dark:border-slate-700 rounded-lg" />
                ) : (
                    <img src={method.qrCodeUrl} alt={`${method.name} QR Code`} className="w-48 h-48 object-contain mt-4 border-4 border-slate-200 dark:border-slate-700 rounded-lg" />
                )
            )}
        </div>
    );
};

const PaymentMethodsPage: React.FC = () => {
    const [methods, setMethods] = useState<PaymentMethodDisplay[]>([]);
    const [companyProfile, setCompanyProfile] = useState<CompanyProfileSetting | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { addNotification } = useNotification();

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fetchedAccounts, fetchedLegacyMethods, fetchedProfile] = await Promise.all([
                apiGetCashAccounts(),
                apiGetPaymentMethodSettings(),
                apiGetCompanyProfile()
            ]);
            
            // Convert CashAccounts to PaymentMethodDisplay format
            const accountMethods: PaymentMethodDisplay[] = fetchedAccounts
                .filter(acc => acc.isActive && acc.showInPublic)
                .map(acc => ({
                    id: acc.id,
                    name: acc.name,
                    accountNumber: acc.accountNumber,
                    phoneNumber: acc.phoneNumber,
                    logoUrl: acc.logoUrl,
                    qrCodeUrl: acc.qrCodeUrl, // Include QR code from cash accounts
                }));

            // Convert legacy PaymentMethodSettings to PaymentMethodDisplay format
            const legacyMethods: PaymentMethodDisplay[] = fetchedLegacyMethods
                .filter(m => m.isActive && m.showInPublic)
                .map(m => ({
                    id: m.id,
                    name: m.name,
                    accountNumber: m.accountNumber,
                    logoUrl: m.logoUrl,
                    qrCodeUrl: m.qrCodeUrl, // Include QR code from legacy methods
                }));

            // Combine both, prioritizing legacy methods first (as requested)
            const allMethods = [...legacyMethods, ...accountMethods];
            setMethods(allMethods);
            setCompanyProfile(fetchedProfile);
        } catch (err) {
            setError("Could not load payment information. Please try again later.");
            addNotification("Error loading payment methods.", "error");
        }
        setIsLoading(false);
    }, [addNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (isLoading) {
        return <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center"><Spinner size="lg" /></div>;
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
                <div className="text-center p-8 bg-white dark:bg-slate-800 shadow-lg rounded-lg">
                    <h2 className="text-2xl font-bold text-red-600">An Error Occurred</h2>
                    <p className="text-gray-600 dark:text-slate-400 mt-2">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 font-sans p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-10 pb-6 border-b border-slate-200 dark:border-slate-700">
                    {companyProfile?.logoUrl && (
                        <img src={companyProfile.logoUrl} alt="Logo" className="h-20 w-auto mx-auto mb-4"/>
                    )}
                    <h1 className="text-4xl font-extrabold text-slate-800 dark:text-slate-100">Payment Options</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        Thank you for your business! Please use one of the following methods to complete your payment.
                    </p>
                </header>
                
                {methods.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {methods.map(method => (
                            <PaymentMethodCard key={method.id} method={method} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <p className="text-slate-500 dark:text-slate-400">No payment methods are currently configured.</p>
                    </div>
                )}

                <footer className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-700 text-center text-sm text-slate-500 dark:text-slate-400">
                    <p>If you have any questions, please contact us at:</p>
                    <p><strong>{companyProfile?.companyName}</strong></p>
                    <p>{companyProfile?.address}</p>
                    <p>Phone: {companyProfile?.phone} | Email: <a href={`mailto:${companyProfile?.email}`} className="text-primary-action hover:underline">{companyProfile?.email}</a></p>
                </footer>
            </div>
        </div>
    );
};

export default PaymentMethodsPage;