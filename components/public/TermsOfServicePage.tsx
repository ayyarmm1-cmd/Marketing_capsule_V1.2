import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';

const TermsOfServicePage: React.FC = () => {
    const { companyProfile } = useAuth();
    const appName = companyProfile?.appName || "Marketing Capsule ERP";
    const companyName = companyProfile?.companyName || "Marketing Capsule";
    const companyEmail = companyProfile?.email || "support@marketingcapsule.com";
    const lastUpdated = "July 25, 2024";

    return (
        <div className="min-h-screen bg-app-bg dark:bg-slate-900 text-text-primary dark:text-slate-200 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto bg-container-bg dark:bg-slate-800 p-8 rounded-lg shadow-xl">
                <header className="text-center mb-10 pb-6 border-b border-slate-200 dark:border-slate-700">
                    {companyProfile?.logoUrl && <img src={companyProfile.logoUrl} alt="Logo" className="h-16 w-auto mx-auto mb-4"/>}
                    <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100">Terms of Service</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Last Updated: {lastUpdated}</p>
                </header>

                <div className="prose prose-slate dark:prose-invert max-w-none prose-h2:font-semibold prose-h2:text-2xl prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-slate-200 dark:prose-h2:border-slate-700 prose-h3:font-semibold prose-h3:text-xl space-y-6">
                    <section>
                        <h2>1. Acceptance of Terms</h2>
                        <p>By accessing and using {appName} (the "Application"), provided by {companyName}, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services. Any participation in this service will constitute acceptance of this agreement. If you do not agree to abide by the above, please do not use this service.</p>
                    </section>

                    <section>
                        <h2>2. Description of Service</h2>
                        <p>Our Application is an enterprise resource planning system designed to help manage business operations including leads, clients, sales, finance, and HR. The service is provided on an "as is" and "as available" basis. We disclaim all responsibility and liability for the availability, timeliness, security, or reliability of the service.</p>
                    </section>

                    <section>
                        <h2>3. User Accounts and Responsibilities</h2>
                        <p>To use the Application, you must be a registered user. You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer. You agree to accept responsibility for all activities that occur under your account or password. You must be of legal age to form a binding contract to use this service.</p>
                    </section>

                    <section>
                        <h2>4. Acceptable Use Policy</h2>
                        <p>You agree not to use the Application for any unlawful purpose or any purpose prohibited under this clause. You agree not to use the Application in any way that could damage the Application, services, or general business of {companyName}. You further agree not to use the Application to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Harass, abuse, or threaten others or otherwise violate any person's legal rights.</li>
                            <li>Violate any intellectual property rights of us or any third party.</li>
                            <li>Upload or otherwise disseminate any computer viruses or other software that may damage the property of another.</li>
                            <li>Perpetrate any fraud.</li>
                        </ul>
                    </section>
                    
                     <section>
                        <h2>5. Data Ownership and Privacy</h2>
                        <p>Your organization retains all ownership rights to the business data you enter into the Application. Our use of your personal and business data is governed by our Privacy Policy, which is incorporated by reference into these Terms of Service. Please review our Privacy Policy to understand our practices.</p>
                    </section>

                    <section>
                        <h2>6. Termination of Use</h2>
                        <p>We reserve the right to terminate or suspend your account at any time, without notice, for conduct that we believe violates these Terms of Service or is harmful to other users of the Application, us, or third parties, or for any other reason.</p>
                    </section>

                    <section>
                        <h2>7. Limitation of Liability</h2>
                        <p>In no event shall {companyName}, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service.</p>
                    </section>
                    
                    <section>
                        <h2>8. Changes to Terms</h2>
                        <p>We reserve the right to modify these terms at any time. We will notify you of any changes by posting the new Terms of Service on this page. You are advised to review this page periodically for any changes. Changes to these terms are effective when they are posted on this page.</p>
                    </section>
                    
                    <section>
                        <h2>9. Contact Us</h2>
                        <p>If you have any questions about these Terms of Service, please contact us at <a href={`mailto:${companyEmail}`} className="text-primary-action hover:underline">{companyEmail}</a>.</p>
                    </section>
                </div>

                <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
                    <Link to="/login">
                        <Button variant="secondary">Back to Login</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default TermsOfServicePage;
