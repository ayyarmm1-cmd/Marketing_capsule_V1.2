import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';
import { SitePreferencesProvider } from './context/SitePreferencesContext';
// Initialize Firebase
import './config/firebase';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <SitePreferencesProvider>
          <App />
        </SitePreferencesProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);
