import React, { useEffect, useState } from 'react';
import { HashRouter } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ERPApp from './App';
import PublicWebsiteApp from './public-website/src/App';
import { SitePreferencesProvider } from './public-website/src/context/SitePreferencesContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { PersistentNotificationProvider } from './contexts/PersistentNotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ConfirmationProvider } from './contexts/ConfirmationContext';

// Initialize public website Firebase config
import './public-website/src/config/firebase';

const RootApp: React.FC = () => {
  // Check if current URL has a hash route (ERP routes)
  // ERP routes start with #/ (e.g., #/login, #/dashboard)
  // Empty hash (#) also indicates ERP (default route)
  const checkIsHashRoute = () => {
    const hash = window.location.hash;
    // Check if hash exists and starts with #/ or is just #
    return hash !== '' && (hash.startsWith('#/') || hash === '#');
  };

  // Initialize state based on current hash
  const [isHashRoute, setIsHashRoute] = useState(() => {
    // On initial load, check the hash
    return checkIsHashRoute();
  });

  useEffect(() => {
    // Listen for hash changes
    const handleHashChange = () => {
      const newIsHashRoute = checkIsHashRoute();
      setIsHashRoute(newIsHashRoute);
    };

    // Also listen for popstate (browser back/forward)
    const handlePopState = () => {
      const newIsHashRoute = checkIsHashRoute();
      setIsHashRoute(newIsHashRoute);
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // If hash route, render ERP app
  if (isHashRoute) {
    return (
      <ErrorBoundary>
        <HashRouter>
          <AuthProvider>
            <ThemeProvider>
              <NotificationProvider>
                <PersistentNotificationProvider>
                  <ConfirmationProvider>
                    <ERPApp />
                  </ConfirmationProvider>
                </PersistentNotificationProvider>
              </NotificationProvider>
            </ThemeProvider>
          </AuthProvider>
        </HashRouter>
      </ErrorBoundary>
    );
  }

  // Otherwise, render public website
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <HelmetProvider>
          <SitePreferencesProvider>
            <PublicWebsiteApp />
          </SitePreferencesProvider>
        </HelmetProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default RootApp;




















