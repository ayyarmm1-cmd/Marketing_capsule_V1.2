import { ArrowUpRight, Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

export default function Footer() {
  const navigate = useNavigate();
  const { language } = useSitePreferences();
  const isMy = language === 'my';
  const t = (en: string, my: string) => (isMy ? my : en);
  const year = new Date().getFullYear();
  const services = serviceDetails.slice(0, 6);

  return (
    <footer className="mc-footer">
      <div className="mc-footer-band">
        <div>
          <span className="mc-eyebrow light">{t('READY TO GROW?', 'တိုးတက်ဖို့ အဆင်သင့်လား?')}</span>
          <h2>{t('Turn your next idea into measurable growth.', 'နောက်ထပ်အကြံတစ်ခုကို တိုင်းတာနိုင်တဲ့ လုပ်ငန်းတိုးတက်မှုအဖြစ် ပြောင်းလိုက်ပါ။')}</h2>
        </div>
        <button onClick={() => navigate('/contact')}>{t('Start a project', 'Project စတင်ရန်')} <ArrowUpRight size={20} /></button>
      </div>

      <div className="mc-footer-main">
        <div className="mc-footer-brand">
          <div className="mc-footer-logo">
            <img src="/logo.png" alt="Marketing Capsule" />
            <strong>Marketing Capsule</strong>
          </div>
          <p>{t('Creative strategy, social media, paid campaigns and digital support built around real business goals.', 'လုပ်ငန်းရည်မှန်းချက်များအပေါ် အခြေခံထားသော Creative Strategy, Social Media, Paid Campaigns နှင့် Digital Support ဝန်ဆောင်မှုများ။')}</p>
          <div className="mc-socials">
            <a href="#" aria-label="Facebook"><Facebook size={18} /></a>
            <a href="#" aria-label="Instagram"><Instagram size={18} /></a>
            <a href="#" aria-label="LinkedIn"><Linkedin size={18} /></a>
          </div>
        </div>

        <div>
          <h3>{t('Company', 'ကုမ္ပဏီ')}</h3>
          <button onClick={() => navigate('/about')}>{t('About Us', 'ကျွန်ုပ်တို့အကြောင်း')}</button>
          <button onClick={() => navigate('/services')}>{t('Services', 'ဝန်ဆောင်မှုများ')}</button>
          <button onClick={() => navigate('/portfolio')}>{t('Portfolio', 'လုပ်ငန်းများ')}</button>
          <button onClick={() => navigate('/contact')}>{t('Contact', 'ဆက်သွယ်ရန်')}</button>
        </div>

        <div>
          <h3>{t('Services', 'ဝန်ဆောင်မှုများ')}</h3>
          {services.map((service) => (
            <button key={service.id} onClick={() => navigate(`/services/${service.id}`)}>{isMy ? serviceNamesMy[service.id] || service.name : service.name}</button>
          ))}
        </div>

        <div className="mc-footer-contact">
          <h3>{t('Contact', 'ဆက်သွယ်ရန်')}</h3>
          <a href="mailto:info@marketingcapsulemm.com"><Mail size={17} /> info@marketingcapsulemm.com</a>
          <a href="tel:+959450510920"><Phone size={17} /> 09 450 510 920</a>
          <a href="tel:+959450510930"><Phone size={17} /> 09 450 510 930</a>
          <span><MapPin size={17} /> No.(2), Thuzar St, Pabaedan Qtr, Mawlamyine</span>
        </div>
      </div>

      <div className="mc-footer-bottom">
        <span>© {year} Marketing Capsule. {t('All rights reserved.', 'မူပိုင်ခွင့်အားလုံး ရယူထားသည်။')}</span>
        <span>{t('Strategy · Creative · Performance', 'မဟာဗျူဟာ · Creative · Performance')}</span>
      </div>
    </footer>
  );
}
