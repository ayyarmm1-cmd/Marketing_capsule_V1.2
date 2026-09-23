import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { PersistentNotificationProvider } from './contexts/PersistentNotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ConfirmationProvider } from './contexts/ConfirmationContext'; // New import

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.Fragment>
    <HashRouter>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            <PersistentNotificationProvider>
              <ConfirmationProvider>
                <App />
              </ConfirmationProvider>
            </PersistentNotificationProvider>
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </HashRouter>
  </React.Fragment>
);