import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';

const PrivacyPolicyPage: React.FC = () => {
    const { companyProfile } = useAuth();
    const appName = companyProfile?.appName || "Marketing Capsule ERP";
    const companyName = companyProfile?.companyName || "Marketing Capsule";
    const companyEmail = companyProfile?.email || "privacy@marketingcapsule.com";
    const companyAddress = companyProfile?.address || "Yangon, Myanmar";
    const lastUpdated = "July 25, 2024";

    return (
        <div className="min-h-screen bg-app-bg dark:bg-slate-900 text-text-primary dark:text-slate-200 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto bg-container-bg dark:bg-slate-800 p-8 rounded-lg shadow-xl">
                <header className="text-center mb-10 pb-6 border-b border-slate-200 dark:border-slate-700">
                    {companyProfile?.logoUrl && <img src={companyProfile.logoUrl} alt="Logo" className="h-16 w-auto mx-auto mb-4"/>}
                    <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100">Privacy Policy</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Last Updated: {lastUpdated}</p>
                </header>

                <div className="prose prose-slate dark:prose-invert max-w-none prose-h2:font-semibold prose-h2:text-2xl prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-slate-200 dark:prose-h2:border-slate-700 prose-h3:font-semibold prose-h3:text-xl space-y-6">
                    <section>
                        <h2>1. Introduction</h2>
                        <p>Welcome to {appName}. This Privacy Policy explains how {companyName} ("we," "us," or "our") collects, uses, discloses, and safeguards your information when you use our enterprise resource planning application, {appName} (the "Application"). This policy is designed to help you understand what data we collect, why we collect it, and what we do with it. By accessing or using our Application, you signify that you have read, understood, and agree to our collection, storage, use, and disclosure of your personal information as described in this Privacy Policy and our Terms of Service.</p>
                    </section>
                    
                    <section>
                        <h2>2. Information We Collect</h2>
                        <p>We may collect information about you in several ways. The information we may collect via the Application depends on the content and materials you use, and includes:</p>
                        
                        <h3>A. Personal Data You Provide to Us</h3>
                        <p>We collect personally identifiable information that you voluntarily provide to us when you register for an account, such as your name, username, email address, phone number, job title, and department. This information is essential for creating and administering your user profile and providing you access to the Application's features.</p>

                        <h3>B. Business Data You Enter</h3>
                        <p>As an ERP system, we store data that you or your organization enter into the Application, which may include information about your leads, clients, sales records, financial documents, project details, and HR records for your employees. This data is owned by your organization and is processed by us on your behalf to provide the Application's services.</p>

                        <h3>C. Data From Social Networks (Facebook Integration)</h3>
                        <p>The Application includes features that allow you to connect your Facebook account to streamline your marketing and advertising workflows. When you grant us permission to connect to your Facebook account, we collect specific information to enable these features. We are committed to collecting only the data necessary for the Application's functionality.</p>
                        
                        <p>We request the following permissions from the Facebook API and use them as described below:</p>
                        <ul className="list-disc pl-6 space-y-3">
                            <li>
                                <strong>pages_show_list:</strong>
                                <br/>
                                <em>Purpose:</em> To display a list of the Facebook Pages you manage.
                                <br/>
                                <em>Use Case:</em> This allows you to select and link a specific Facebook Page to a client or business record within the ERP. This linking is crucial for organizing your marketing efforts and correctly associating ad campaigns with the appropriate client.
                            </li>
                            <li>
                                <strong>ads_read & read_insights:</strong>
                                <br/>
                                <em>Purpose:</em> To read your ad campaigns, ad sets, ads, and their performance insights (such as spend, impressions, clicks, etc.).
                                <br/>
                                <em>Use Case:</em> This is a core function of our marketing module. We use this data to populate your dashboard with up-to-date campaign information and performance metrics, allowing you to monitor your advertising efforts directly within {appName} without needing to switch to the Facebook Ads Manager. This helps in generating comprehensive client reports.
                            </li>
                            <li>
                                <strong>business_management:</strong>
                                <br/>
                                <em>Purpose:</em> To access your Facebook Business Manager assets.
                                <br/>
                                <em>Use Case:</em> This permission is necessary to correctly identify and list the Ad Accounts and Pages associated with your business, ensuring a secure and accurate connection between your Facebook assets and our Application.
                            </li>
                            <li>
                                <strong>ads_management:</strong>
                                <br/>
                                <em>Purpose:</em> To manage your ads and ad campaigns.
                                <br/>
                                <em>Use Case:</em> While our primary function is reading ad data, this permission is requested to enable future features that would allow authorized users to perform basic management actions (like pausing or activating a campaign) directly from the {appName} interface, offering a more integrated workflow. <em>(Note: This is for future functionality and currently the app primarily uses read-only permissions).</em>
                            </li>
                        </ul>
                        <p>We use this information from Facebook solely to provide and improve the integration features of the Application. We do not sell this information or use it for any purpose not described here. Your use of the Facebook integration is subject to Facebook's <a href="https://www.facebook.com/about/privacy/" target="_blank" rel="noopener noreferrer" className="text-primary-action hover:underline">Data Policy</a>.</p>
                    </section>
                    
                    <section>
                        <h2>3. How We Use Your Information</h2>
                        <p>We use the information collected to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Create and manage your account and provide customer support.</li>
                            <li>Operate and maintain the core functionalities of the ERP system.</li>
                            <li>Sync your Facebook ad campaigns and performance data for display and analysis within the Application.</li>
                            <li>Link Facebook Pages to client records for better organization.</li>
                            <li>Send administrative information, such as updates, security alerts, and support messages.</li>
                            <li>Monitor and analyze usage and trends to improve your experience with the Application.</li>
                            <li>Comply with legal and regulatory requirements.</li>
                        </ul>
                    </section>
                    
                     <section>
                        <h2>4. Disclosure of Your Information</h2>
                        <p>We are committed to maintaining your trust, and we want you to understand when and with whom we may share the information we collect.</p>
                         <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Within Your Organization:</strong> Your information (such as your name, role, and activities within the ERP) is visible to other authorized users within your organization, as defined by your account administrator.</li>
                            <li><strong>Third-Party Service Providers:</strong> We use third-party service providers to help us operate our Application, including for data hosting and infrastructure. For example, our data is securely stored on Google Firebase. These service providers have access to your information only to perform services on our behalf and are obligated not to disclose or use it for any other purpose.</li>
                            <li><strong>Legal Requirements:</strong> We may disclose your information if required to do so by law or in the good faith belief that such action is necessary to comply with a legal obligation, protect and defend our rights or property, prevent fraud, or protect the personal safety of users or the public.</li>
                            <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of all or a portion of our assets, your information may be transferred as part of that transaction.</li>
                        </ul>
                         <p><strong>We do not sell your personal information to third parties.</strong></p>
                    </section>

                    <section>
                        <h2>5. Your Data Protection Rights & Choices</h2>
                        <p>You have certain rights regarding the personal information we hold about you. These include:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Right to Access & Update:</strong> You can review and change your personal information by logging into your account and visiting your profile page.</li>
                            <li><strong>Right to Deletion:</strong> You may request the deletion of your account and associated personal data by following the instructions in Section 6 below.</li>
                            <li><strong>Right to Restrict Processing:</strong> You may have the right to request that we restrict the processing of your personal data under certain conditions.</li>
                            <li><strong>Control Facebook Permissions:</strong> You can manage the information we receive from Facebook by visiting your Facebook account's "Apps and Websites" settings. You can revoke our access at any time, which will disable the related features in our Application.</li>
                        </ul>
                    </section>

                    <section>
                        <h2>6. Data Deletion Request</h2>
                        <p>You have the right to request the deletion of your account and all associated data from our systems. To initiate this process, please follow these steps:</p>
                        <ol className="list-decimal pl-6 space-y-2">
                            <li>Send an email to our data privacy team at <a href={`mailto:${companyEmail}?subject=Data Deletion Request`} className="text-primary-action hover:underline">{companyEmail}</a>.</li>
                            <li>Use the subject line: "Data Deletion Request for {appName}".</li>
                            <li>In the body of the email, please include your full name and the email address you use to log in to the Application. This is required for us to verify your identity.</li>
                        </ol>
                        <p>Upon receiving a verifiable request, we will process it and permanently delete your account and personal data from our active databases within 30 days. We will notify you by email once the deletion is complete. Please note that we may retain certain information as required by law or for legitimate business purposes, such as financial transaction records.</p>
                        <p>Additionally, you can remove the {appName} application's access from your Facebook account by visiting the <a href="https://www.facebook.com/settings?tab=applications" target="_blank" rel="noopener noreferrer" className="text-primary-action hover:underline">Apps and Websites settings</a> on Facebook.</p>
                    </section>
                    
                    <section>
                        <h2>7. Data Security</h2>
                        <p>We use administrative, technical, and physical security measures, including encryption in transit (HTTPS) and access controls, to help protect your personal information. While we have taken reasonable steps to secure the information you provide to us, please be aware that no security measures are perfect or impenetrable.</p>
                    </section>
                    
                    <section>
                        <h2>8. Policy for Children</h2>
                        <p>Our Application is not intended for use by children under the age of 13. We do not knowingly collect personally identifiable information from children under 13. If we become aware that we have collected such information, we will take steps to delete it.</p>
                    </section>

                    <section>
                        <h2>9. Changes to This Privacy Policy</h2>
                        <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top. You are advised to review this Privacy Policy periodically for any changes.</p>
                    </section>

                    <section>
                        <h2>10. Contact Us</h2>
                        <p>If you have any questions, comments, or concerns about this Privacy Policy or our data practices, please contact us at:</p>
                        <p>
                            <strong>{companyName}</strong><br/>
                            Address: {companyAddress}<br/>
                            Email: <a href={`mailto:${companyEmail}`} className="text-primary-action hover:underline">{companyEmail}</a>
                        </p>
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

export default PrivacyPolicyPage;
