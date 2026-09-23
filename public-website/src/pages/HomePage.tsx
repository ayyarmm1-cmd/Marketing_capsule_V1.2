import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleCheck,
  Lightbulb,
  Megaphone,
  MousePointerClick,
  Quote,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Seo from '../components/Seo';
import { BASE_URL } from '../utils/seo';
import { serviceDetails } from './services/serviceData';
import { useSitePreferences } from '../context/SitePreferencesContext';

const testimonials = [
  {
    text: 'Marketing Capsule transformed our social media presence. The process was clear, creative and easy to follow from the first meeting.',
    name: 'Sarah Chen',
    role: 'Fashion Boutique Owner',
  },
  {
    text: 'Their campaign planning helped us focus our budget on the channels that mattered. Communication and reporting were consistently strong.',
    name: 'Michael Tan',
    role: 'Restaurant Marketing Director',
  },
  {
    text: 'The team handles strategy, content and campaign execution in one place, which makes our monthly marketing workflow much easier.',
    name: 'Emily Wong',
    role: 'Beauty Clinic Founder',
  },
  {
    text: 'We wanted a more professional digital presence without losing our brand personality. The new direction gave us both.',
    name: 'Business Client',
    role: 'SME Owner',
  },
];

const faqs = [
  ['What services does Marketing Capsule provide?', 'We support businesses with social media creative, campaign boosting, media production, business licensing support, social media operations and related digital marketing services.'],
  ['Can you manage both creative and paid campaigns?', 'Yes. Strategy, creative production and campaign management can be coordinated together so the messaging and performance work as one system.'],
  ['Do you work with growing small and medium businesses?', 'Yes. Our service structure can be adapted to businesses that need a focused one-off project or ongoing monthly marketing support.'],
  ['How do we start?', 'Start with a consultation. We clarify your goals, current channels, audience and priority problems before recommending the right service mix.'],
];

export default function HomePage() {
  const navigate = useNavigate();
  const { language } = useSitePreferences();
  const isMy = language === 'my';
  const t = (en: string, my: string) => (isMy ? my : en);
  const [openFaq, setOpenFaq] = useState(0);
  const featuredServices = serviceDetails.slice(0, 6);
  const serviceNamesMy: Record<string, string> = {
    'logo-social-media-design': 'Social Media ဖန်တီးမှု',
    'talent-video-editing': 'Media Production',
    'boosting-service': 'Boosting ဝန်ဆောင်မှု',
    'online-license': 'Online License',
    'content-script': 'Social Media စီမံခန့်ခွဲမှု',
    consultation: 'Digital Marketing အကြံပေးခြင်း',
  };
  const serviceDescriptionsMy: Record<string, string> = {
    'logo-social-media-design': 'သင့် Brand ကို ပိုမိုမှတ်မိစေပြီး Social Media တွင် ထင်ရှားစေမည့် Creative Design များ။',
    'talent-video-editing': 'Talent, shooting, editing နှင့် platform-ready delivery အပါအဝင် Media Production ဝန်ဆောင်မှု။',
    'boosting-service': 'Targeting, budget control နှင့် report ရှင်းလင်းမှုတို့ပါဝင်သော Paid Campaign Management။',
    'online-license': 'Online Business အတွက် လိုအပ်သော License နှင့် စာရွက်စာတမ်းဆိုင်ရာ ပံ့ပိုးမှု။',
    'content-script': 'Content planning မှ posting နှင့် ongoing social media operation အထိ စီမံပေးခြင်း။',
    consultation: 'သင့်လုပ်ငန်းအတွက် လက်တွေ့အသုံးချနိုင်သော Digital Marketing Strategy အကြံပေးမှု။',
  };
  const faqsMy = [
    ['Marketing Capsule က ဘာဝန်ဆောင်မှုတွေ ပေးသလဲ?', 'Social Media Creative, Campaign Boosting, Media Production, Business Licensing Support, Social Media Operations နှင့် ဆက်စပ် Digital Marketing ဝန်ဆောင်မှုများကို ပံ့ပိုးပေးပါသည်။'],
    ['Creative နဲ့ Paid Campaign နှစ်ခုလုံးကို စီမံပေးနိုင်လား?', 'ရပါတယ်။ Strategy, Creative Production နှင့် Campaign Management ကို တစ်စနစ်တည်းအဖြစ် ပေါင်းစပ်စီမံပေးနိုင်ပါသည်။'],
    ['အသေးစားနဲ့ အလတ်စား လုပ်ငန်းတွေနဲ့လည်း လုပ်ပေးလား?', 'လုပ်ပေးပါသည်။ တစ်ကြိမ်တည်း Project ဖြစ်စေ၊ လစဉ် Marketing Support ဖြစ်စေ လုပ်ငန်းလိုအပ်ချက်အလိုက် ညှိပေးနိုင်ပါသည်။'],
    ['ဘယ်လိုစရမလဲ?', 'Consultation ဖြင့် စတင်ပါ။ သင့်ရည်မှန်းချက်၊ လက်ရှိ Channel များ၊ ပရိသတ်နှင့် အဓိကပြဿနာများကို ရှင်းလင်းပြီး သင့်တော်သော Service Mix ကို အကြံပြုပါမည်။'],
  ];
  const activeFaqs = isMy ? faqsMy : faqs;

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Marketing Capsule',
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'info@marketingcapsulemm.com',
      telephone: '+959450510920',
      contactType: 'customer service',
      areaServed: 'Worldwide',
      availableLanguage: ['English', 'Myanmar'],
    },
  };

  const partnerLabels = isMy
    ? ['မဟာဗျူဟာ', 'Creative', 'Social Media', 'Paid Media', 'Branding', 'Content', 'Video', 'တိုးတက်မှု']
    : ['Strategy', 'Creative', 'Social Media', 'Paid Media', 'Branding', 'Content', 'Video', 'Growth'];

  return (
    <>
      <Seo
        title="Digital Marketing Agency Myanmar | Marketing Capsule"
        description="Marketing Capsule provides creative, social media, performance marketing and digital business support for growing brands."
        canonical={`${BASE_URL}/`}
        image={`${BASE_URL}/logo.png`}
        keywords="digital marketing Myanmar, social media marketing, creative agency, boosting service, content creation, Marketing Capsule"
        jsonLd={organizationSchema}
      />

      <div className="mc-home">
        <section className="mc-hero">
          <div className="mc-hero-grid">
            <div className="mc-hero-copy">
              <span className="mc-eyebrow"><Sparkles size={15} /> {t('DIGITAL GROWTH PARTNER', 'ဒစ်ဂျစ်တယ် တိုးတက်မှု မိတ်ဖက်')}</span>
              <h1>{t('Marketing that turns attention into ', 'လူစိတ်ဝင်စားမှုကို ')}<span>{t('business growth.', 'လုပ်ငန်းတိုးတက်မှုအဖြစ် ပြောင်းလဲပါ။')}</span></h1>
              <p>{t('We combine strategy, creative execution and performance marketing to help brands look stronger, communicate clearly and grow with purpose.', 'မဟာဗျူဟာ၊ ဖန်တီးမှုနှင့် performance marketing ကို ပေါင်းစပ်ပြီး သင့် Brand ကို ပိုမိုခိုင်မာစွာ ရပ်တည်နိုင်ရန်၊ ရှင်းလင်းစွာ ဆက်သွယ်နိုင်ရန်နှင့် ရည်ရွယ်ချက်ရှိရှိ တိုးတက်နိုင်ရန် ကူညီပေးပါသည်။')}</p>
              <div className="mc-hero-actions">
                <button className="mc-btn primary" onClick={() => navigate('/contact')}>{t('Get a Free Consultation', 'အခမဲ့ တိုင်ပင်ဆွေးနွေးရန်')} <ArrowUpRight size={18} /></button>
                <button className="mc-btn ghost" onClick={() => navigate('/services')}>{t('Explore Services', 'ဝန်ဆောင်မှုများ ကြည့်ရန်')} <ArrowRight size={18} /></button>
              </div>
              <div className="mc-hero-proof">
                <div><strong>2019</strong><span>{t('Growing brands since', 'Brand များ တိုးတက်အောင် ကူညီခဲ့သည့်နှစ်')}</span></div>
                <div><strong>360°</strong><span>{t('Creative + performance', 'Creative + Performance')}</span></div>
                <div><strong>1 team</strong><span>{t('From idea to execution', 'အကြံမှ အကောင်အထည်ဖော်မှုအထိ')}</span></div>
              </div>
            </div>

            <div className="mc-hero-visual" aria-label="Marketing Capsule digital marketing services">
              <div className="mc-orbit orbit-one"><span></span><span></span><span></span></div>
              <div className="mc-orbit orbit-two"><span></span><span></span><span></span><span></span></div>
              <div className="mc-visual-core">
                <div className="mc-core-ring"></div>
                <img src="/logo.png" alt="Marketing Capsule logo" />
                <strong>{t('Ideas', 'အကြံများ')}<br />{t('to impact', 'မှ ရလဒ်')}</strong>
              </div>
              <div className="mc-float-card card-a"><Target size={20} /><span>{t('Performance', 'Performance')}</span><strong>{t('Campaigns', 'Campaigns')}</strong></div>
              <div className="mc-float-card card-b"><Megaphone size={20} /><span>Social</span><strong>Creative</strong></div>
              <div className="mc-float-card card-c"><TrendingUp size={20} /><span>{t('Growth', 'တိုးတက်မှု')}</span><strong>{t('Strategy', 'မဟာဗျူဟာ')}</strong></div>
              <div className="mc-dots dots-a"></div>
              <div className="mc-dots dots-b"></div>
            </div>
          </div>
        </section>

        <section className="mc-marquee-section" aria-label="Marketing capabilities">
          <div className="mc-marquee-track">
            {[...partnerLabels, ...partnerLabels].map((label, index) => (
              <div className="mc-marquee-item" key={`${label}-${index}`}><span>✦</span>{label}</div>
            ))}
          </div>
        </section>

        <section className="mc-section mc-about-preview">
          <div className="mc-section-grid two-col">
            <div className="mc-about-art">
              <div className="mc-about-photo-card">
                <div className="mc-about-illustration">
                  <div className="mc-chart bars"><i></i><i></i><i></i><i></i></div>
                  <div className="mc-chart line"><svg viewBox="0 0 220 100" role="img" aria-label="Growth chart"><path d="M7 85 C45 68, 65 74, 92 50 S145 59, 173 27 S205 26, 215 12" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/></svg></div>
                  <div className="mc-target"><Target size={72} /></div>
                  <div className="mc-art-person"><span></span></div>
                </div>
              </div>
              <div className="mc-satisfaction"><strong>100%</strong><span>{t('Client-focused', 'ဖောက်သည်ဦးစားပေး')}<br />{t('service', 'ဝန်ဆောင်မှု')}</span></div>
            </div>
            <div className="mc-about-copy">
              <span className="mc-eyebrow">{t('ABOUT MARKETING CAPSULE', 'MARKETING CAPSULE အကြောင်း')}</span>
              <h2>{t('We help businesses grow ', 'လုပ်ငန်းများကို ')}<span>{t('digitally and strategically.', 'ဒစ်ဂျစ်တယ်နည်းလမ်းနှင့် မဟာဗျူဟာကျကျ တိုးတက်အောင် ကူညီပါသည်။')}</span></h2>
              <p>{t('Great marketing is not just a beautiful post or a boosted ad. It is a connected system: clear positioning, strong creative, consistent execution and useful performance feedback.', 'ကောင်းမွန်သော Marketing ဆိုတာ လှပတဲ့ Post တစ်ခု သို့မဟုတ် Boost လုပ်ထားတဲ့ ကြော်ငြာတစ်ခုတည်း မဟုတ်ပါ။ Positioning, Creative, အဆက်မပြတ် အကောင်အထည်ဖော်မှုနှင့် ရလဒ်အပေါ် အခြေခံသော ပြန်လည်သုံးသပ်မှုများ ချိတ်ဆက်ထားသည့် စနစ်တစ်ခု ဖြစ်ပါသည်။')}</p>
              <p>{t('Marketing Capsule brings those pieces together so business owners can move from scattered marketing tasks to a more focused growth plan.', 'Marketing Capsule သည် အဆိုပါ အစိတ်အပိုင်းများကို တစ်နေရာတည်းတွင် ချိတ်ဆက်ပေးပြီး လုပ်ငန်းရှင်များအတွက် ပိုမိုရှင်းလင်းပြီး အာရုံစိုက်ထားသော Growth Plan တစ်ခုဖြင့် လုပ်ဆောင်နိုင်အောင် ကူညီပေးပါသည်။')}</p>
              <div className="mc-tab-row">
                <div><CircleCheck size={19} /><span><strong>{t('Strategy first', 'မဟာဗျူဟာကို ဦးစားပေး')}</strong> {t('Every project starts with your business objective.', 'Project တိုင်းကို သင့်လုပ်ငန်းရည်မှန်းချက်မှ စတင်ပါသည်။')}</span></div>
                <div><CircleCheck size={19} /><span><strong>{t('Built for execution', 'အကောင်အထည်ဖော်နိုင်ရန် တည်ဆောက်ထားသည်')}</strong> {t('Ideas become real campaigns, content and deliverables.', 'အကြံများကို လက်တွေ့ Campaign၊ Content နှင့် Deliverables များအဖြစ် ပြောင်းလဲပေးပါသည်။')}</span></div>
                <div><CircleCheck size={19} /><span><strong>{t('Clear communication', 'ရှင်းလင်းသော ဆက်သွယ်မှု')}</strong> {t('You know what is happening and why.', 'ဘာလုပ်နေသည်၊ ဘာကြောင့်လုပ်နေသည်ကို ရှင်းလင်းစွာ သိနိုင်ပါသည်။')}</span></div>
              </div>
              <button className="mc-text-link" onClick={() => navigate('/about')}>{t('More about us', 'ကျွန်ုပ်တို့အကြောင်း ပိုမိုသိရန်')} <ArrowUpRight size={17} /></button>
            </div>
          </div>
        </section>

        <section className="mc-section mc-services-showcase">
          <div className="mc-section-heading light-heading">
            <div><span className="mc-eyebrow light">{t('WHAT WE DO', 'ကျွန်ုပ်တို့ ဘာလုပ်ပေးသလဲ')}</span><h2>{t('Our working roadmap', 'ကျွန်ုပ်တို့၏ ဝန်ဆောင်မှုလမ်းကြောင်း')}</h2></div>
            <p>{t('One coordinated team for the marketing work that keeps your brand visible, credible and growing.', 'သင့် Brand ကို မြင်သာမှုရှိစေပြီး ယုံကြည်မှုတိုးစေကာ ဆက်လက်တိုးတက်နိုင်ရန် Marketing လုပ်ငန်းအားလုံးကို အဖွဲ့တစ်ဖွဲ့တည်းမှ ပေါင်းစပ်ဆောင်ရွက်ပေးပါသည်။')}</p>
          </div>
          <div className="mc-service-grid">
            {featuredServices.map((service, index) => (
              <button className="mc-service-card" key={service.id} onClick={() => navigate(`/services/${service.id}`)}>
                <span className="mc-service-index">0{index + 1}</span>
                <service.icon size={32} />
                <h3>{isMy ? serviceNamesMy[service.id] || service.name : service.name}</h3>
                <p>{isMy ? serviceDescriptionsMy[service.id] || service.subheadline : service.subheadline}</p>
                <span className="mc-service-arrow"><ArrowUpRight size={18} /></span>
              </button>
            ))}
          </div>
        </section>

        <section className="mc-section mc-why">
          <div className="mc-section-heading">
            <div><span className="mc-eyebrow">{t('WHY CHOOSE US', 'ဘာကြောင့် ကျွန်ုပ်တို့ကို ရွေးချယ်သင့်သလဲ')}</span><h2>{t('Reasons to partner with ', 'Marketing Partner အဖြစ် ')}<span>Marketing Capsule</span>{t('', ' ကို ရွေးချယ်ရမည့် အကြောင်းရင်းများ')}</h2></div>
            <p>{t('We keep the process practical: understand the problem, build the right creative system, execute consistently and improve from real feedback.', 'ပြဿနာကို နားလည်ခြင်း၊ သင့်တော်သော Creative System တည်ဆောက်ခြင်း၊ အဆက်မပြတ် အကောင်အထည်ဖော်ခြင်းနှင့် အမှန်တကယ် Feedback များမှ တိုးတက်အောင် ပြုလုပ်ခြင်းတို့ကို လက်တွေ့ကျကျ ဆောင်ရွက်ပါသည်။')}</p>
          </div>
          <div className="mc-reason-grid">
            {[
              [Search, t('Research before execution', 'မလုပ်ဆောင်မီ သုတေသန'), t('We look at your business, audience and current presence before deciding what to make or promote.', 'ဘာကို ဖန်တီးမည်၊ ဘာကို Promote လုပ်မည် ဆုံးဖြတ်မီ သင့်လုပ်ငန်း၊ ပရိသတ်နှင့် လက်ရှိ Digital Presence ကို လေ့လာပါသည်။')],
              [Lightbulb, t('Creative with a purpose', 'ရည်ရွယ်ချက်ရှိသော Creative'), t('Design and content are shaped around the message and action your audience needs to understand.', 'ပရိသတ်နားလည်ရန်လိုသော Message နှင့် Action အပေါ် အခြေခံ၍ Design နှင့် Content ကို ဖန်တီးပါသည်။')],
              [MousePointerClick, t('Performance-minded delivery', 'ရလဒ်ကို အာရုံစိုက်သော လုပ်ဆောင်မှု'), t('Campaign work is structured around measurable objectives instead of vanity activity.', 'Campaign များကို တိုင်းတာနိုင်သော ရည်မှန်းချက်များအပေါ် အခြေခံ၍ တည်ဆောက်ပါသည်။')],
              [Users, t('A team you can work with', 'လက်တွဲလုပ်ကိုင်လို့ကောင်းသော အဖွဲ့'), t('Clear communication and ongoing support keep projects moving without unnecessary complexity.', 'ရှင်းလင်းသော ဆက်သွယ်မှုနှင့် ဆက်လက်ပံ့ပိုးမှုတို့ဖြင့် Project များကို မလိုအပ်ဘဲ ရှုပ်ထွေးစေခြင်းမရှိဘဲ ဆက်လက်လုပ်ဆောင်နိုင်ပါသည်။')],
            ].map(([Icon, title, body], index) => {
              const ReasonIcon = Icon as typeof Search;
              return (
                <div className="mc-reason-card" key={index}>
                  <div className="mc-reason-icon"><ReasonIcon size={27} /></div>
                  <span>0{index + 1}</span>
                  <h3>{title as string}</h3>
                  <p>{body as string}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mc-workflow">
          <div className="mc-section mc-workflow-inner">
            <div className="mc-workflow-title">
              <span className="mc-eyebrow">{t('HOW WE WORK', 'ကျွန်ုပ်တို့ ဘယ်လိုလုပ်ဆောင်သလဲ')}</span>
              <h2>{t('Our creative workflow', 'ကျွန်ုပ်တို့၏ Creative Workflow')}</h2>
              <p>{t('A simple four-stage process keeps strategy and execution connected from kickoff through optimization.', 'စတင်ချိန်မှ Optimization အထိ မဟာဗျူဟာနှင့် လက်တွေ့အကောင်အထည်ဖော်မှု ချိတ်ဆက်နေစေရန် အဆင့် ၄ ဆင့်ဖြင့် ရှင်းလင်းစွာ လုပ်ဆောင်ပါသည်။')}</p>
            </div>
            <div className="mc-workflow-steps">
              {[
                ['01', t('Research & Strategy', 'Research & Strategy'), t('We clarify goals, audience, channels and the main business problem to solve.', 'ရည်မှန်းချက်၊ ပရိသတ်၊ Channel များနှင့် ဖြေရှင်းရမည့် အဓိကလုပ်ငန်းပြဿနာကို သတ်မှတ်ပါသည်။')],
                ['02', t('Design & Create', 'Design & Create'), t('We turn the strategy into practical creative, content and campaign assets.', 'မဟာဗျူဟာကို လက်တွေ့ Creative၊ Content နှင့် Campaign Assets များအဖြစ် ပြောင်းလဲပါသည်။')],
                ['03', t('Launch & Promote', 'Launch & Promote'), t('Content and campaigns are published with the right formats, timing and targeting.', 'သင့်တော်သော Format၊ Timing နှင့် Targeting ဖြင့် Content နှင့် Campaign များကို ထုတ်လွှင့်ပါသည်။')],
                ['04', t('Analyze & Grow', 'Analyze & Grow'), t('We review results, identify useful signals and refine the next round of work.', 'ရလဒ်များကို သုံးသပ်ပြီး အသုံးဝင်သော Signal များကို ရှာဖွေကာ နောက်အဆင့်အတွက် ပိုကောင်းအောင် ပြင်ဆင်ပါသည်။')],
              ].map(([number, title, copy]) => (
                <div className="mc-step" key={number}>
                  <div className="mc-step-number">{number}</div>
                  <div><h3>{title}</h3><p>{copy}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mc-go-digital">
          <div className="mc-go-copy">
            <span className="mc-eyebrow light">{t('GO DIGITAL · GROW SMARTER', 'DIGITAL သို့ ပြောင်း · ပိုမိုကောင်းမွန်စွာ တိုးတက်')}</span>
            <h2>{t('Build a marketing system your business can actually use.', 'သင့်လုပ်ငန်းမှာ အမှန်တကယ် အသုံးချနိုင်တဲ့ Marketing System တစ်ခု တည်ဆောက်ပါ။')}</h2>
            <p>{t('Bring strategy, content, design, paid promotion and ongoing support into one clearer workflow.', 'မဟာဗျူဟာ၊ Content၊ Design၊ Paid Promotion နှင့် ဆက်လက်ပံ့ပိုးမှုတို့ကို ရှင်းလင်းသော Workflow တစ်ခုထဲတွင် ပေါင်းစပ်ပါ။')}</p>
            <div className="mc-chip-row"><span>Strategy</span><span>Creative</span><span>Social Media</span><span>Paid Campaigns</span><span>Video</span></div>
            <button className="mc-btn white" onClick={() => navigate('/contact')}>{t('Get a Free Consultation', 'အခမဲ့ တိုင်ပင်ဆွေးနွေးရန်')} <ArrowUpRight size={18} /></button>
          </div>
          <div className="mc-go-visual">
            <div className="mc-rotating-copy"><span>MARKETING • CAPSULE • GROWTH • CREATIVE • </span></div>
            <div className="mc-go-center"><TrendingUp size={64} /><strong>{t('Grow', 'ပိုမိုကောင်းမွန်စွာ')}<br />{t('smarter', 'တိုးတက်ပါ')}</strong></div>
          </div>
        </section>

        <section className="mc-section mc-impact">
          <div className="mc-impact-grid">
            {[
              ['2000+', t('Creative assets', 'Creative Assets')],
              ['5000+', t('Client registrations', 'ဖောက်သည်မှတ်ပုံတင်မှု')],
              ['300+', t('Licensing support', 'License ပံ့ပိုးမှု')],
              ['3500+', t('Happy clients', 'ကျေနပ်သော ဖောက်သည်များ')],
            ].map(([value, label]) => (
              <div key={label}><strong>{value}</strong><span>{label}</span></div>
            ))}
          </div>
        </section>

        <section className="mc-testimonial-section">
          <div className="mc-section-heading mc-testimonial-heading">
            <div><span className="mc-eyebrow">{t('TESTIMONIALS', 'ဖောက်သည်များ၏ အမြင်')}</span><h2>{t('What our clients say', 'ဖောက်သည်များ ဘာပြောကြသလဲ')}</h2></div>
            <p>{t('Long-term growth comes from good work and a working relationship that stays clear, responsive and practical.', 'ရေရှည်တိုးတက်မှုသည် အရည်အသွေးကောင်းသော လုပ်ဆောင်မှုနှင့် ရှင်းလင်း၊ တုံ့ပြန်မြန်ဆန်ပြီး လက်တွေ့ကျသော ပူးပေါင်းဆက်ဆံရေးမှ ဖြစ်ပေါ်လာပါသည်။')}</p>
          </div>
          <div className="mc-testimonial-window">
            <div className="mc-testimonial-track">
              {[...testimonials, ...testimonials].map((item, index) => (
                <article className="mc-testimonial-card" key={`${item.name}-${index}`}>
                  <Quote size={31} />
                  <p>“{item.text}”</p>
                  <div><strong>{item.name}</strong><span>{item.role}</span></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mc-section mc-faq-contact">
          <div className="mc-faq-panel">
            <span className="mc-eyebrow">{t('FAQS', 'မေးလေ့ရှိသော မေးခွန်းများ')}</span>
            <h2>{t('Your questions answered', 'သင်မေးချင်တာများအတွက် အဖြေများ')}</h2>
            <div className="mc-faq-list">
              {activeFaqs.map(([question, answer], index) => (
                <button key={question} className={`mc-faq-item ${openFaq === index ? 'open' : ''}`} onClick={() => setOpenFaq(openFaq === index ? -1 : index)}>
                  <div><strong>{question}</strong><ChevronDown size={19} /></div>
                  <p>{answer}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="mc-contact-card">
            <span className="mc-eyebrow light">{t("LET'S TALK", 'ဆွေးနွေးကြရအောင်')}</span>
            <h2>{t('Tell us what you want to grow.', 'သင် တိုးတက်ချင်တဲ့ အရာကို ပြောပြပါ။')}</h2>
            <p>{t('Share your goals and we’ll help identify the marketing support that fits your next step.', 'သင့်ရည်မှန်းချက်များကို မျှဝေပါ။ နောက်တစ်ဆင့်အတွက် သင့်တော်သော Marketing Support ကို ရွေးချယ်ပေးပါမည်။')}</p>
            <ul>
              <li><Check size={17} /> {t('Clear starting recommendations', 'စတင်ရန် ရှင်းလင်းသော အကြံပြုချက်များ')}</li>
              <li><Check size={17} /> {t('Service mix based on your needs', 'သင့်လိုအပ်ချက်အပေါ် အခြေခံသော ဝန်ဆောင်မှုပေါင်းစပ်မှု')}</li>
              <li><Check size={17} /> {t('No unnecessary complexity', 'မလိုအပ်သော ရှုပ်ထွေးမှု မရှိ')}</li>
            </ul>
            <button className="mc-btn white" onClick={() => navigate('/contact')}>{t('Contact Marketing Capsule', 'Marketing Capsule ကို ဆက်သွယ်ရန်')} <ArrowUpRight size={18} /></button>
          </div>
        </section>
      </div>
    </>
  );
}
