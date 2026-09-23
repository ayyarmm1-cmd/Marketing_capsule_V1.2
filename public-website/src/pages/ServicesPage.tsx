import { CheckCircle2, ArrowRight, Rocket, Users, Award, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Seo from '../components/Seo';
import { BASE_URL } from '../utils/seo';
import { serviceDetails } from './services/serviceData';

export default function ServicesPage() {
  const navigate = useNavigate();
  const industries = [
    'Restaurants',
    'Fashion Accessories',
    'Aesthetic Clinics',
    'Cosmetics',
    'Jewellery',
    'Real Estate',
    'Travel & Tour',
    'Schools',
    'Clothing Brands',
  ];

  const overviewStats = [
    {
      icon: Users,
      label: 'Clients Served',
      value: '3000+',
      description: 'Businesses elevated with end-to-end digital marketing support.',
    },
    {
      icon: Award,
      label: 'Portfolio Year',
      value: '2025',
      description: 'Continuous innovation with new channels, services, and teams.',
    },
    {
      icon: Briefcase,
      label: 'Mission',
      value: 'Success for Every Client',
      description:
        'Deliver necessary strategies, measurable results, and partnerships built on trust.',
    },
  ];

  const roadmap = [
    {
      year: '2019',
      title: 'Freelance Foundations',
      description: 'Launched Marketing Capsule as a dedicated boosting specialist for SMEs.',
    },
    {
      year: '2023',
      title: 'Service Expansion',
      description:
        'Grew into a multi-disciplinary agency adding content & design and online licensing services.',
    },
    {
      year: '2025',
      title: 'Systemised Growth',
      description:
        'Scaled operations with new hires, employee handbooks, and a full TikTok channel build.',
    },
    {
      year: '2027',
      title: 'Digital Ecosystem',
      description:
        'Build a client database, launch an integrated application, and streamline service delivery.',
    },
    {
      year: '2030',
      title: 'Full-Funnel Innovators',
      description:
        'Expand into Google Ads, YouTube Ads, and UX-focused web design for truly holistic marketing.',
    },
  ];

  const servicesSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Marketing Capsule Services',
    itemListElement: serviceDetails.map((service, index) => ({
      '@type': 'Service',
      position: index + 1,
      name: service.name,
      description: service.subheadline,
      provider: {
        '@type': 'Organization',
        name: 'Marketing Capsule',
        url: BASE_URL,
      },
    })),
  };

  return (
    <>
      <Seo
        title="Digital Marketing Services | Marketing Capsule - Social Media, Design, Boosting & More"
        description="Explore Marketing Capsule's all-in-one digital marketing services: social media design, content creation, logo development, boosting campaigns, TikTok growth, and online licensing."
        canonical={`${BASE_URL}/services`}
        keywords="digital marketing services, social media marketing services, logo design services, content creation services, boosting services, TikTok marketing, online licensing services, Myanmar marketing services"
        jsonLd={servicesSchema}
      />
      <div className="min-h-screen pt-20 bg-black">
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 tech-grid opacity-20"></div>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-indigo-600/20 to-transparent rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 px-6 py-3 glass-effect neon-border rounded-full mb-10 animate-slide-down scan-line">
            <Rocket className="h-4 w-4 text-cyan-400 animate-pulse" />
            <span className="text-sm font-bold text-cyan-400 tracking-wider uppercase">
              Marketing Capsule
            </span>
          </div>

          <h1 className="text-6xl sm:text-7xl font-bold mb-6 animate-slide-up tracking-tight">
            <span className="gradient-text glow-text">Our Services & Impact</span>
          </h1>

          <p className="text-xl text-gray-300 max-w-3xl mx-auto animate-slide-up leading-relaxed" style={{ animationDelay: '0.1s' }}>
            We deliver all-in-one digital marketing solutions—from design and content to boosting, TikTok growth, and licensing—so ambitious brands stay visible, credible, and profitable.
          </p>
        </div>
      </section>

      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-black overflow-hidden">
        <div className="absolute inset-0 tech-grid opacity-5"></div>
        <div className="max-w-7xl mx-auto relative">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            {overviewStats.map((stat) => (
              <div
                key={stat.label}
                className="futuristic-card p-8 rounded-3xl cyber-border relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-cyan-500/5 to-transparent opacity-80"></div>
                <div className="relative space-y-4">
                  <div className="w-14 h-14 neon-border rounded-2xl flex items-center justify-center">
                    <stat.icon className="h-7 w-7 text-cyan-400" />
                  </div>
                  <p className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">{stat.label}</p>
                  <h3 className="text-3xl font-bold text-white">{stat.value}</h3>
                  <p className="text-gray-300 leading-relaxed">{stat.description}</p>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
              </div>
            ))}
          </div>

          <div className="futuristic-card p-10 rounded-4xl cyber-border relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-cyan-500/10 to-transparent opacity-80"></div>
            <div className="relative grid lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <h2 className="text-4xl font-bold text-white">Vision for 2025 and Beyond</h2>
                <p className="text-lg text-gray-300 leading-relaxed">
                  Our vision is to become the most trusted digital marketing agency offering a truly <span className="text-cyan-400 font-semibold">all-in-one solution</span>.
                  From content and design to boosting and web experiences, we innovate so every client moves faster with less friction.
                </p>
                <p className="text-lg text-gray-300 leading-relaxed">
                  We believe long-term partnerships are built by combining <span className="text-cyan-400 font-semibold">measurable performance, transparent communication, and forward-looking strategy</span>.
                </p>
              </div>
              <div className="bg-black/40 border border-cyan-500/20 rounded-3xl p-8 space-y-4">
                <h3 className="text-2xl font-bold text-white">Client Base</h3>
                <p className="text-gray-300">
                  Marketing Capsule has supported more than 3000 businesses across diverse verticals, delivering tailored digital strategies for each market.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 text-gray-300">
                  {industries.map((industry) => (
                    <div key={industry} className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
                      <span>{industry}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black relative">
        <div className="absolute inset-0 tech-grid opacity-5"></div>
        <div className="max-w-7xl mx-auto relative space-y-20">
          <div className="text-center">
            <h2 className="text-5xl font-bold mb-6 tracking-tight">
              <span className="gradient-text">Services We Deliver</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Choose the exact blend of creative, paid, and operational support your brand needs. Every service is available stand-alone or as part of a bundled growth programme.
            </p>
          </div>

          <div className="space-y-24">
            {serviceDetails.map((service, index) => (
              <div
                key={service.id}
                className={`grid gap-10 ${index % 2 === 0 ? 'lg:grid-cols-[1.1fr_1fr]' : 'lg:grid-cols-[1fr_1.1fr] lg:flex-row-reverse'}`}
              >
                <div className="space-y-6">
                  <div className="inline-flex items-center space-x-3 px-5 py-2 glass-effect border border-cyan-500/20 rounded-2xl">
                    <service.icon className="h-6 w-6 text-cyan-400" />
                    <span className="text-sm font-semibold tracking-wider uppercase text-cyan-400">
                      {service.tagline}
                    </span>
                  </div>
                  <h3 className="text-4xl font-bold text-white">{service.headline}</h3>
                  <p className="text-lg text-gray-300 leading-relaxed">{service.subheadline}</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {service.features.map((feature) => (
                      <div key={feature} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-7 h-7 neon-border rounded-full flex items-center justify-center mt-0.5">
                          <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                        </div>
                        <span className="text-gray-300 leading-relaxed">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {service.outcomes.map((outcome) => (
                      <div key={outcome.label} className="text-center glass-effect border border-cyan-500/20 rounded-3xl px-4 py-6">
                        <div className="text-2xl font-bold gradient-text glow-text">{outcome.value}</div>
                        <p className="text-xs uppercase tracking-wider text-gray-400 mt-2">{outcome.label}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => navigate(`/services/${service.id}`)}
                    className="group inline-flex items-center space-x-2 px-8 py-4 neon-border rounded-2xl font-bold text-white hover:scale-105 active:scale-95 transition-all duration-300 animate-glow"
                  >
                    <span>Explore Service Details</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-transform" />
                  </button>
                </div>

                <div className="relative futuristic-card p-10 rounded-4xl cyber-border overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-20`}></div>
                  <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl"></div>
                  <div className="relative space-y-6 text-white">
                    <h4 className="text-2xl font-bold">Deliverables Snapshot</h4>
                    <ul className="space-y-3 text-gray-200 leading-relaxed">
                      {service.deliverables.map((deliverable) => (
                        <li key={deliverable} className="flex items-start space-x-3">
                          <span className="text-cyan-400 font-semibold">•</span>
                          <span>{deliverable}</span>
                        </li>
                      ))}
                    </ul>
                    <h4 className="text-2xl font-bold pt-4">Our Process</h4>
                    <div className="space-y-4">
                      {service.process.map((step, idx) => (
                        <div key={step.title} className="glass-effect border border-cyan-500/20 rounded-2xl p-4">
                          <div className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
                            Step {idx + 1}
                          </div>
                          <h5 className="text-lg font-semibold text-white mt-1">{step.title}</h5>
                          <p className="text-sm text-gray-300 leading-relaxed">{step.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-black to-cyan-900/20"></div>
        <div className="absolute inset-0 tech-grid opacity-20"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>

        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-sm font-semibold uppercase tracking-wider text-cyan-400 mb-3">
            Agency Roadmap
          </div>
          <h2 className="text-5xl sm:text-7xl font-bold mb-10 text-white tracking-tight glow-text">
            From Freelance Roots to Full-Service Partner
          </h2>
          <div className="space-y-10">
            {roadmap.map((milestone) => (
              <div
                key={milestone.year}
                className="futuristic-card glass-effect border border-cyan-500/20 rounded-3xl px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between text-left"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 neon-border rounded-2xl flex items-center justify-center text-2xl font-bold text-cyan-400">
                    {milestone.year}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{milestone.title}</h3>
                    <p className="text-gray-300 leading-relaxed">{milestone.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 inline-flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={() => navigate('/contact')}
              className="group px-14 py-6 neon-border rounded-2xl font-bold text-xl text-white hover:scale-110 active:scale-95 transition-all duration-300 inline-flex items-center space-x-3 animate-glow-intense"
            >
              <span>Start Your Project</span>
              <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/portfolio')}
              className="px-12 py-6 glass-effect rounded-2xl font-bold text-lg text-cyan-400 border border-cyan-500/50 hover:scale-105 active:scale-95 transition-all duration-300"
            >
              View Portfolio
            </button>
          </div>
        </div>
      </section>

      <section className="relative py-32 bg-black overflow-hidden">
        <div className="absolute inset-0 tech-grid opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black"></div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-10">
          <div className="inline-block p-1 neon-border rounded-3xl mb-8 animate-glow">
            <div className="bg-black px-8 py-3 rounded-3xl">
              <span className="text-cyan-400 font-bold uppercase tracking-wider text-sm">Ready to Get Started?</span>
            </div>
          </div>

          <h2 className="text-5xl sm:text-7xl font-bold mb-8 text-white tracking-tight glow-text">
            Transform Your Marketing
          </h2>
          <p className="text-xl mb-14 text-gray-300 leading-relaxed max-w-3xl mx-auto">
            Let's discuss how our <span className="text-cyan-400 font-semibold">cutting-edge services</span> can help transform your marketing strategy and drive exponential growth
          </p>
          <button
            onClick={() => navigate('/contact')}
            className="group px-14 py-6 neon-border rounded-2xl font-bold text-xl text-white hover:scale-110 active:scale-95 transition-all duration-300 inline-flex items-center space-x-3 animate-glow-intense"
          >
            <span>Contact Us Today</span>
            <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
          </button>
        </div>
      </section>
    </div>
    </>
  );
}

