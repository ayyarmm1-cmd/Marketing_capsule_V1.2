import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown, Languages, Menu, Moon, Sun, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { serviceDetails } from '../pages/services/serviceData';
import { useSitePreferences } from '../context/SitePreferencesContext';

const serviceNamesMy: Record<string, string> = {
  'logo-social-media-design': 'Social Media ဖန်တီးမှု',
  'talent-video-editing': 'Media Production',
  'boosting-service': 'Boosting ဝန်ဆောင်မှု',
  'online-license': 'Online License',
  'content-script': 'Social Media စီမံခန့်ခွဲမှု',
  consultation: 'Digital Marketing အကြံပေးခြင်း',
};

export default function Navigation() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { language, setLanguage, theme, toggleTheme } = useSitePreferences();
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMy = language === 'my';

  const labels = isMy
    ? {
        home: 'ပင်မ', about: 'ကျွန်ုပ်တို့အကြောင်း', services: 'ဝန်ဆောင်မှုများ', allServices: 'ဝန်ဆောင်မှုအားလုံး',
        portfolio: 'လုပ်ငန်းများ', contact: 'ဆက်သွယ်ရန်', quote: 'အခမဲ့ တိုင်ပင်ရန်', language: 'ဘာသာစကား',
        theme: theme === 'light' ? 'Dark mode' : 'Light mode',
      }
    : {
        home: 'Home', about: 'About', services: 'Services', allServices: 'All Services',
        portfolio: 'Portfolio', contact: 'Contact', quote: 'Get a Quote', language: 'Language',
        theme: theme === 'light' ? 'Dark mode' : 'Light mode',
      };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setServicesOpen(false);
  }, [pathname]);

  const go = (path: string) => navigate(path);
  const isActive = (path: string) => path === '/' ? pathname === '/' : pathname.startsWith(path);

  const serviceLinks = serviceDetails.map((service) => ({
    label: isMy ? serviceNamesMy[service.id] || service.name : service.name,
    path: `/services/${service.id}`,
  }));

  return (
    <header className={`mc-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="mc-header-inner">
        <button className="mc-brand" onClick={() => go('/')} aria-label="Marketing Capsule home">
          <img src="/logo.png" alt="Marketing Capsule" />
          <span>Marketing Capsule</span>
        </button>

        <nav className="mc-desktop-nav" aria-label="Primary navigation">
          <button className={isActive('/') ? 'active' : ''} onClick={() => go('/')}>{labels.home}</button>
          <button className={isActive('/about') ? 'active' : ''} onClick={() => go('/about')}>{labels.about}</button>
          <div
            className="mc-nav-dropdown"
            onMouseEnter={() => {
              if (closeTimer.current) clearTimeout(closeTimer.current);
              setServicesOpen(true);
            }}
            onMouseLeave={() => {
              closeTimer.current = setTimeout(() => setServicesOpen(false), 180);
            }}
          >
            <button
              className={isActive('/services') ? 'active' : ''}
              onClick={() => go('/services')}
              aria-expanded={servicesOpen}
            >
              {labels.services} <ChevronDown size={15} className={servicesOpen ? 'rotate-180' : ''} />
            </button>
            <div className={`mc-dropdown-panel ${servicesOpen ? 'open' : ''}`}>
              <button onClick={() => go('/services')}>{labels.allServices}</button>
              {serviceLinks.map((item) => (
                <button key={item.path} onClick={() => go(item.path)}>{item.label}</button>
              ))}
            </div>
          </div>
          <button className={isActive('/portfolio') ? 'active' : ''} onClick={() => go('/portfolio')}>{labels.portfolio}</button>
          <button className={isActive('/contact') ? 'active' : ''} onClick={() => go('/contact')}>{labels.contact}</button>
        </nav>

        <div className="mc-header-tools">
          <div className="mc-language-switch" role="group" aria-label={labels.language}>
            <Languages size={15} aria-hidden="true" />
            <button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')} aria-pressed={language === 'en'}>EN</button>
            <span>/</span>
            <button className={language === 'my' ? 'active' : ''} onClick={() => setLanguage('my')} aria-pressed={language === 'my'}>မြန်မာ</button>
          </div>
          <button className="mc-theme-toggle" onClick={toggleTheme} aria-label={labels.theme} title={labels.theme}>
            <span className="mc-theme-icon">{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</span>
          </button>
          <button className="mc-header-cta" onClick={() => go('/contact')}>
            {labels.quote} <ArrowUpRight size={17} />
          </button>
          <button className="mc-menu-toggle" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu">
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <div className={`mc-mobile-nav ${menuOpen ? 'open' : ''}`}>
        <div className="mc-mobile-preferences">
          <div className="mc-language-switch mobile" role="group" aria-label={labels.language}>
            <Languages size={15} />
            <button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button>
            <span>/</span>
            <button className={language === 'my' ? 'active' : ''} onClick={() => setLanguage('my')}>မြန်မာ</button>
          </div>
          <button className="mc-theme-toggle mobile" onClick={toggleTheme} aria-label={labels.theme}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            <span>{labels.theme}</span>
          </button>
        </div>
        <button onClick={() => go('/')}>{labels.home}</button>
        <button onClick={() => go('/about')}>{labels.about}</button>
        <button onClick={() => go('/services')}>{labels.services}</button>
        {serviceLinks.slice(0, 5).map((item) => (
          <button className="sub" key={item.path} onClick={() => go(item.path)}>{item.label}</button>
        ))}
        <button onClick={() => go('/portfolio')}>{labels.portfolio}</button>
        <button onClick={() => go('/contact')}>{labels.contact}</button>
        <button className="quote" onClick={() => go('/contact')}>{labels.quote} <ArrowUpRight size={16} /></button>
      </div>
    </header>
  );
}
