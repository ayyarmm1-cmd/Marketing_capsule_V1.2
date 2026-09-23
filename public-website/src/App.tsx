import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import MessengerChatButton from './components/MessengerChatButton';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import PortfolioPage from './pages/PortfolioPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import ServiceDetailPage from './pages/services/ServiceDetailPage';
import { trackPageView } from './utils/analytics';
import { initCoreWebVitals } from './utils/coreWebVitals';
import { useSitePreferences } from './context/SitePreferencesContext';

function App() {
  const location = useLocation();
  const { theme, language } = useSitePreferences();

  useEffect(() => {
    initCoreWebVitals();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    trackPageView(location.pathname, document.title);
  }, [location.pathname]);

  return (
    <div className={`marketing-site theme-${theme} lang-${language}`} data-theme={theme} data-language={language}>
      <Navigation />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/:serviceId" element={<ServiceDetailPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
      <Footer />
      <MessengerChatButton />
    </div>
  );
}

export default App;
