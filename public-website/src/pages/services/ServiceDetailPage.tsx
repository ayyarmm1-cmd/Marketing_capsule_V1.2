import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles, TrendingUp } from 'lucide-react';
import Seo from '../../components/Seo';
import { BASE_URL } from '../../utils/seo';
import { serviceDetails } from './serviceData';

export default function ServiceDetailPage() {
  const navigate = useNavigate();
  const { serviceId } = useParams<{ serviceId: string }>();

  const service = useMemo(() => serviceDetails.find((detail) => detail.id === serviceId), [serviceId]);

  const detailSchema = service
    ? {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: service.name,
        description: service.subheadline,
        areaServed: 'Worldwide',
        provider: {
          '@type': 'Organization',
          name: 'Marketing Capsule',
          url: BASE_URL,
        },
        serviceType: service.headline,
      }
    : null;

  if (!service) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-black text-center text-white px-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center space-x-2 px-6 py-3 glass-effect neon-border rounded-full mb-4">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-bold uppercase tracking-wider text-cyan-400">Service Not Found</span>
          </div>
          <h1 className="text-5xl font-bold">We couldn’t find that service.</h1>
          <p className="text-gray-300 text-lg">
            Please head back to our services overview to explore everything Marketing Capsule offers.
          </p>
          <button
            onClick={() => navigate('/services')}
            className="inline-flex items-center space-x-3 px-8 py-4 neon-border rounded-2xl font-semibold hover:scale-105 active:scale-95 transition-all duration-300"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Services</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Seo
        title={`${service.headline} | Marketing Capsule - ${service.name} Services`}
        description={`${service.subheadline} ${service.description.substring(0, 100)}...`}
        canonical={`${BASE_URL}/services/${service.id}`}
        keywords={`${service.name}, ${service.tagline}, digital marketing, Myanmar marketing, ${service.features.slice(0, 3).join(', ')}, Marketing Capsule ${service.name}`}
        jsonLd={detailSchema || undefined}
      />
      <div className="pt-20 bg-black overflow-x-hidden w-full">
        <section className="relative py-24 overflow-hidden">
          <div className="absolute inset-0 tech-grid opacity-20"></div>
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-indigo-600/20 to-transparent rounded-full blur-3xl animate-float"></div>
            <div
              className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-3xl animate-float"
              style={{ animationDelay: '3s' }}
            ></div>
          </div>

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
            <div className="inline-flex items-center space-x-3 px-5 py-2 glass-effect border border-cyan-500/20 rounded-2xl">
              <service.icon className="h-6 w-6 text-cyan-400" />
              <span className="text-sm font-semibold tracking-wider uppercase text-cyan-400">{service.tagline}</span>
            </div>
            <h1 className="text-6xl font-bold text-white tracking-tight">
              <span className="gradient-text glow-text">{service.headline}</span>
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed">{service.subheadline}</p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => navigate('/services')}
                className="inline-flex items-center space-x-2 px-6 py-3 glass-effect text-cyan-400 rounded-2xl font-semibold border border-cyan-500/50 hover:scale-105 active:scale-95 transition-all duration-300"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to all services</span>
              </button>
              <button
                onClick={() => navigate('/contact')}
                className="group inline-flex items-center space-x-2 px-8 py-4 neon-border rounded-2xl font-bold text-white hover:scale-105 active:scale-95 transition-all duration-300 animate-glow"
              >
                <span>Start a project</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* Why This Service Matters Section - Expanded */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black relative">
          <div className="absolute inset-0 tech-grid opacity-5"></div>
          <div className="max-w-7xl mx-auto relative">
            <div className="futuristic-card p-12 rounded-4xl cyber-border relative overflow-hidden mb-16">
              <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-20`}></div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl"></div>
              <div className="relative space-y-8 text-white">
                <div>
                  <h2 className="text-5xl font-bold mb-6">Why this service matters</h2>
                  <p className="text-xl text-gray-300 leading-relaxed max-w-4xl">{service.description}</p>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
            </div>

            {/* Key Outcomes - Expanded */}
            <div className="grid gap-8 md:grid-cols-3 mb-16">
              {service.outcomes.map((outcome) => (
                <div key={outcome.label} className="futuristic-card p-8 rounded-3xl text-center border border-cyan-500/20 hover:scale-105 transition-all duration-300">
                  <div className="text-5xl font-bold gradient-text glow-text mb-4">{outcome.value}</div>
                  <p className="text-base uppercase tracking-wider text-gray-400">{outcome.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section - Separate */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black relative">
          <div className="absolute inset-0 tech-grid opacity-5"></div>
          <div className="max-w-7xl mx-auto relative">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">
                <span className="gradient-text">Key Features</span>
              </h2>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Everything you need to succeed with this service
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {service.features.map((feature, index) => (
                <div key={feature} className="futuristic-card p-6 rounded-3xl cyber-border hover:scale-105 transition-all duration-300">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 neon-border rounded-2xl flex items-center justify-center bg-cyan-500/10">
                      <CheckCircle2 className="h-6 w-6 text-cyan-400" />
                    </div>
                    <span className="text-gray-200 leading-relaxed text-base">{feature}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Packages & Pricing Section - Comprehensive */}
        {service.id === 'logo-social-media-design' && (
          <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black relative">
            <div className="absolute inset-0 tech-grid opacity-10"></div>
            <div className="max-w-7xl mx-auto relative">
              <div className="text-center mb-16">
                <div className="inline-flex items-center space-x-2 px-6 py-3 glass-effect neon-border rounded-full mb-6">
                  <TrendingUp className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-bold text-cyan-400 tracking-wider uppercase">📸 Social Media Creative Service</span>
                </div>
                <h2 className="text-4xl font-bold text-white mb-4">
                  <span className="gradient-text">Recommendation Packages</span>
                </h2>
                <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                  Packages with varying durations and inclusions. All prices in MMK (Myanmar Kyat).
                </p>
              </div>
              
              {/* Recommendation Packages */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                {/* Bronze Package */}
                <div className="futuristic-card p-6 rounded-3xl cyber-border relative overflow-hidden hover:scale-105 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 via-transparent to-transparent"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-white">🥉 Bronze</h3>
                      <span className="text-xs text-gray-400">2 Weeks</span>
                    </div>
                    <div className="mb-4">
                      <span className="text-3xl font-bold gradient-text">239,900</span>
                      <span className="text-sm text-gray-400 ml-2">MMK</span>
                    </div>
                    <ul className="space-y-2 mb-6 text-sm">
                      <li className="flex items-start space-x-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Design: 5</span>
                      </li>
                      <li className="flex items-start space-x-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Content: 5</span>
                      </li>
                      <li className="flex items-start space-x-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Content Calendar: 1</span>
                      </li>
                      <li className="flex items-start space-x-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Meeting: 1 time</span>
                      </li>
                    </ul>
                    <button
                      onClick={() => navigate('/contact')}
                      className="w-full px-4 py-2 glass-effect border border-cyan-500/50 rounded-xl font-semibold text-cyan-400 hover:bg-cyan-500/20 transition-all duration-300 text-sm"
                    >
                      Get Started
                    </button>
                  </div>
                </div>

                {/* Silver Package */}
                <div className="futuristic-card p-6 rounded-3xl cyber-border relative overflow-hidden hover:scale-105 transition-all duration-300 border-2 border-cyan-500/30">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-400/10 via-transparent to-transparent"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-white">🥈 Silver</h3>
                      <span className="text-xs text-gray-400">1 Month</span>
                    </div>
                    <div className="mb-4">
                      <span className="text-3xl font-bold gradient-text">469,900</span>
                      <span className="text-sm text-gray-400 ml-2">MMK</span>
                    </div>
                    <ul className="space-y-2 mb-6 text-sm">
                      <li className="flex items-start space-x-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Design: 10</span>
                      </li>
                      <li className="flex items-start space-x-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Content: 10</span>
                      </li>
                      <li className="flex items-start space-x-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Content Calendar: 1</span>
                      </li>
                      <li className="flex items-start space-x-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Design: (C+1 Free)</span>
                      </li>
                      <li className="flex items-start space-x-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Content: (C+1 Free)</span>
                      </li>
                      <li className="flex items-start space-x-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Meeting: 1 time</span>
                      </li>
                    </ul>
                    <button
                      onClick={() => navigate('/contact')}
                      className="w-full px-4 py-2 neon-border rounded-xl font-semibold text-white hover:scale-105 transition-all duration-300 text-sm"
                    >
                      Get Started
                    </button>
                  </div>
                </div>

                {/* Gold Package */}
                <div className="futuristic-card p-6 rounded-3xl cyber-border relative overflow-hidden hover:scale-105 transition-all duration-300 border-2 border-cyan-500/50">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-transparent"></div>
                  <div className="absolute top-4 right-4 px-2 py-1 glass-effect border border-cyan-500/50 rounded-full z-10">
                    <span className="text-xs font-bold text-cyan-400 uppercase">Popular</span>
                  </div>
                  <div className="relative">
                    <div className="mb-2">
                      <h3 className="text-xl font-bold text-white">🥇 Gold</h3>
                    </div>
                    <div className="mb-4">
                      <span className="text-xs text-gray-400">2 Months</span>
                    </div>
                    <div className="mb-4">
                      <div className="flex items-baseline space-x-2">
                        <span className="text-lg line-through text-gray-500">889,900</span>
                        <span className="text-3xl font-bold gradient-text">849,900</span>
                      </div>
                      <span className="text-sm text-gray-400 ml-2">MMK</span>
                    </div>
                    <ul className="space-y-2 mb-6 text-sm">
                      <li className="flex items-start space-x-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Design: 20</span>
                      </li>
                      <li className="flex items-start space-x-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Content: 20</span>
                      </li>
                      <li className="flex items-start space-x-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Content Calendar: 2</span>
                      </li>
                      <li className="flex items-start space-x-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Design: (C+2 Free)</span>
                      </li>
                      <li className="flex items-start space-x-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Content: (C+2 Free)</span>
                      </li>
                      <li className="flex items-start space-x-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Meeting: 2 times</span>
                      </li>
                    </ul>
                    <button
                      onClick={() => navigate('/contact')}
                      className="w-full px-4 py-2 neon-border rounded-xl font-semibold text-white hover:scale-105 transition-all duration-300 text-sm"
                    >
                      Get Started
                    </button>
                  </div>
                </div>

                {/* Diamond Package */}
                <div className="futuristic-card p-6 rounded-3xl cyber-border relative overflow-hidden hover:scale-105 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-white">💎 Diamond</h3>
                      <span className="text-xs text-gray-400">3 Months</span>
                    </div>
                    <div className="mb-4">
                      <span className="text-3xl font-bold gradient-text">1,049,900</span>
                      <span className="text-sm text-gray-400 ml-2">MMK</span>
                    </div>
                    <ul className="space-y-2 mb-6 text-sm">
                      <li className="flex items-start space-x-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Design: 30</span>
                      </li>
                      <li className="flex items-start space-x-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Content: 30</span>
                      </li>
                      <li className="flex items-start space-x-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Content Calendar: 2</span>
                      </li>
                      <li className="flex items-start space-x-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Design: (C+2 Free)</span>
                      </li>
                      <li className="flex items-start space-x-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Content: (C+2 Free)</span>
                      </li>
                      <li className="flex items-start space-x-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Content Calendar: (C+1 Free)</span>
                      </li>
                      <li className="flex items-start space-x-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Meeting: 3 times</span>
                      </li>
                    </ul>
                    <button
                      onClick={() => navigate('/contact')}
                      className="w-full px-4 py-2 glass-effect border border-cyan-500/50 rounded-xl font-semibold text-cyan-400 hover:bg-cyan-500/20 transition-all duration-300 text-sm"
                    >
                      Get Started
                    </button>
                  </div>
                </div>
              </div>

              {/* Refinement Note */}
              <div className="futuristic-card p-6 rounded-3xl cyber-border mb-12 bg-gradient-to-r from-indigo-600/10 to-cyan-500/10">
                <p className="text-gray-300 text-sm">
                  <span className="font-semibold text-cyan-400">Refinement Note (Applies to all Packages):</span> 2 times Free Refinement. If you edit One More time: (+1,500 MMK)
                </p>
              </div>

              {/* Special Design & Content Service Packages */}
              <div className="mb-12">
                <h3 className="text-2xl font-bold text-white mb-6 text-center">
                  <span className="gradient-text">🛠️ Special Design & Content Service Packages</span>
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Special Design Service Package */}
                  <div className="futuristic-card p-6 rounded-3xl cyber-border relative overflow-hidden hover:scale-105 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-transparent to-transparent"></div>
                    <div className="relative">
                      <h4 className="text-xl font-bold text-white mb-4">Special Design Service Package</h4>
                      <div className="mb-4">
                        <span className="text-2xl font-bold gradient-text">180,000</span>
                        <span className="text-sm text-gray-400 ml-2">MMK</span>
                      </div>
                      <ul className="space-y-2 mb-4 text-sm">
                        <li className="flex items-start space-x-2 text-gray-300">
                          <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <span>Design: 10 post</span>
                        </li>
                        <li className="flex items-start space-x-2 text-gray-300">
                          <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <span>Gift: (C+1 post Seasonal Wish)</span>
                        </li>
                        <li className="flex items-start space-x-2 text-gray-300">
                          <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <span>Meeting: (1) times</span>
                        </li>
                      </ul>
                      <p className="text-xs text-gray-400 mb-4">2 times Free Refinement. If you edit One More time: +1,500 MMK</p>
                      <button
                        onClick={() => navigate('/contact')}
                        className="w-full px-4 py-2 glass-effect border border-cyan-500/50 rounded-xl font-semibold text-cyan-400 hover:bg-cyan-500/20 transition-all duration-300 text-sm"
                      >
                        Get Started
                      </button>
                    </div>
                  </div>

                  {/* Special Content Service Package */}
                  <div className="futuristic-card p-6 rounded-3xl cyber-border relative overflow-hidden hover:scale-105 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent"></div>
                    <div className="relative">
                      <h4 className="text-xl font-bold text-white mb-4">Special Content Service Package</h4>
                      <div className="mb-4">
                        <span className="text-2xl font-bold gradient-text">180,000</span>
                        <span className="text-sm text-gray-400 ml-2">MMK</span>
                      </div>
                      <ul className="space-y-2 mb-4 text-sm">
                        <li className="flex items-start space-x-2 text-gray-300">
                          <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <span>Content: 10 post</span>
                        </li>
                        <li className="flex items-start space-x-2 text-gray-300">
                          <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <span>Gift: (C+1 post Seasonal Wish)</span>
                        </li>
                        <li className="flex items-start space-x-2 text-gray-300">
                          <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <span>Meeting: (1) times</span>
                        </li>
                      </ul>
                      <p className="text-xs text-gray-400 mb-4">2 times Free Refinement. If you edit One More time: +1,500 MMK</p>
                      <button
                        onClick={() => navigate('/contact')}
                        className="w-full px-4 py-2 glass-effect border border-cyan-500/50 rounded-xl font-semibold text-cyan-400 hover:bg-cyan-500/20 transition-all duration-300 text-sm"
                      >
                        Get Started
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Media Quotations */}
              <div className="mb-12">
                <h3 className="text-2xl font-bold text-white mb-6 text-center">
                  <span className="gradient-text">💰 Social Media Quotations (Itemized Pricing)</span>
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Social Media Content Quotation */}
                  <div className="futuristic-card p-6 rounded-3xl cyber-border">
                    <h4 className="text-lg font-bold text-white mb-4">Social Media Content Quotation</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-gray-300">
                        <span>Content:</span>
                        <span className="text-cyan-400 font-semibold">8,000 MMK</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Copy writing:</span>
                        <span className="text-cyan-400 font-semibold">20,000 MMK</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Script:</span>
                        <span className="text-cyan-400 font-semibold">25,000 MMK</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Content Calendar:</span>
                        <span className="text-cyan-400 font-semibold">50,000 MMK</span>
                      </div>
                    </div>
                  </div>

                  {/* Social Media Design Quotation */}
                  <div className="futuristic-card p-6 rounded-3xl cyber-border">
                    <h4 className="text-lg font-bold text-white mb-4">Social Media Design Quotation</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-gray-300">
                        <span>Design:</span>
                        <span className="text-cyan-400 font-semibold">20,000 MMK</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Cover:</span>
                        <span className="text-cyan-400 font-semibold">30,000 MMK</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Business Card:</span>
                        <span className="text-cyan-400 font-semibold">30,000 MMK</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Flyers:</span>
                        <span className="text-cyan-400 font-semibold">50,000 MMK</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Payment Card (QR Code):</span>
                        <span className="text-cyan-400 font-semibold">20,000 MMK</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logo Package */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-6 text-center">
                  <span className="gradient-text">🎨 Logo Package</span>
                </h3>
                <div className="futuristic-card p-6 rounded-3xl cyber-border max-w-2xl mx-auto">
                  <div className="space-y-4">
                    <div className="p-4 glass-effect border border-cyan-500/20 rounded-2xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-white">Creative:</span>
                        <span className="text-cyan-400 font-bold">70,000 MMK</span>
                      </div>
                      <p className="text-sm text-gray-400">Logo, PNG File, JPEG File</p>
                    </div>
                    <div className="p-4 glass-effect border border-cyan-500/20 rounded-2xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-white">Design - Focused:</span>
                        <span className="text-cyan-400 font-bold">100,000 MMK</span>
                      </div>
                      <p className="text-sm text-gray-400">Logo, Brand guideline, PNG/JPEG File, PS/AI File, 2 Revisions, 2 Options</p>
                    </div>
                    <div className="p-4 glass-effect border border-cyan-500/20 rounded-2xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-white">Small Business:</span>
                        <span className="text-cyan-400 font-bold">150,000 MMK</span>
                      </div>
                      <p className="text-sm text-gray-400">Logo, Cover, BC, Brand guideline, Payment Card</p>
                      <p className="text-xs text-gray-500 mt-1">Meeting: 1 time</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Digital Marketing Consultation Packages */}
        {service.id === 'consultation' && (
          <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black relative">
            <div className="absolute inset-0 tech-grid opacity-10"></div>
            <div className="max-w-7xl mx-auto relative">
              <div className="text-center mb-16">
                <div className="inline-flex items-center space-x-2 px-6 py-3 glass-effect neon-border rounded-full mb-6">
                  <TrendingUp className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-bold text-cyan-400 tracking-wider uppercase">💬 Digital Marketing Consultation Service</span>
                </div>
                <h2 className="text-4xl font-bold text-white mb-4">
                  <span className="gradient-text">Consultation Packages</span>
                </h2>
                <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                  Choose the consultation package that fits your needs. All prices in MMK (Myanmar Kyat).
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Basic Package */}
                <div className="futuristic-card p-8 rounded-4xl cyber-border relative overflow-hidden hover:scale-105 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-transparent to-transparent"></div>
                  <div className="relative">
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-white mb-2">Basic Package</h3>
                      <span className="text-sm text-gray-400">30 minutes</span>
                    </div>
                    <div className="mb-6">
                      <span className="text-4xl font-bold gradient-text">50,000</span>
                      <span className="text-sm text-gray-400 ml-2">MMK</span>
                    </div>
                    <ul className="space-y-3 mb-8 text-gray-300">
                      <li className="flex items-start space-x-3">
                        <CheckCircle2 className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>30-minute consultation session</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <CheckCircle2 className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Marketing strategy guidance</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <CheckCircle2 className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Quick Q&A session</span>
                      </li>
                    </ul>
                    <button
                      onClick={() => navigate('/contact')}
                      className="w-full px-6 py-3 glass-effect border border-cyan-500/50 rounded-xl font-semibold text-cyan-400 hover:bg-cyan-500/20 transition-all duration-300"
                    >
                      Get Started
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
                </div>

                {/* Special Package - Featured */}
                <div className="futuristic-card p-8 rounded-4xl cyber-border relative overflow-hidden hover:scale-105 transition-all duration-300 border-2 border-cyan-500/50">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-indigo-600/10 to-transparent"></div>
                  <div className="absolute top-4 right-4 px-3 py-1 glass-effect border border-cyan-500/50 rounded-full z-10">
                    <span className="text-xs font-bold text-cyan-400 uppercase">Recommended</span>
                  </div>
                  <div className="relative">
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-white mb-2">Special Package</h3>
                      <span className="text-sm text-gray-400">1:00 hour</span>
                    </div>
                    <div className="mb-6">
                      <span className="text-4xl font-bold gradient-text">100,000</span>
                      <span className="text-sm text-gray-400 ml-2">MMK</span>
                    </div>
                    <ul className="space-y-3 mb-8 text-gray-300">
                      <li className="flex items-start space-x-3">
                        <CheckCircle2 className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>1-hour comprehensive consultation</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <CheckCircle2 className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>In-depth marketing audit</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <CheckCircle2 className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Customized strategy development</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <CheckCircle2 className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Detailed action plan</span>
                      </li>
                    </ul>
                    <button
                      onClick={() => navigate('/contact')}
                      className="w-full px-6 py-3 neon-border rounded-xl font-semibold text-white hover:scale-105 transition-all duration-300"
                    >
                      Get Started
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Media Production Service Packages */}
        {service.id === 'talent-video-editing' && (
          <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black relative">
            <div className="absolute inset-0 tech-grid opacity-10"></div>
            <div className="max-w-7xl mx-auto relative">
              <div className="text-center mb-16">
                <div className="inline-flex items-center space-x-2 px-6 py-3 glass-effect neon-border rounded-full mb-6">
                  <TrendingUp className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-bold text-cyan-400 tracking-wider uppercase">🎬 Media Production Service</span>
                </div>
                <h2 className="text-4xl font-bold text-white mb-4">
                  <span className="gradient-text">Video Production Packages</span>
                </h2>
                <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                  Choose the package that fits your video production needs. All prices in MMK (Myanmar Kyat).
                </p>
              </div>
              
              {/* Media Production Service Packages */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {/* All in one video package */}
                <div className="futuristic-card p-6 rounded-3xl cyber-border relative overflow-hidden hover:scale-105 transition-all duration-300 border-2 border-cyan-500/50">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-indigo-600/10 to-transparent"></div>
                  <div className="absolute top-4 right-4 px-2 py-1 glass-effect border border-cyan-500/50 rounded-full z-10">
                    <span className="text-xs font-bold text-cyan-400 uppercase">Popular</span>
                  </div>
                  <div className="relative">
                    <h3 className="text-xl font-bold text-white mb-4">All in one video package</h3>
                    <div className="mb-4">
                      <span className="text-3xl font-bold gradient-text">100,000</span>
                      <span className="text-sm text-gray-400 ml-2">MMK</span>
                    </div>
                    <ul className="space-y-2 mb-4 text-sm text-gray-300">
                      <li className="flex items-start space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Talent</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Video Editing</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Voice Over</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Sub Title</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>Script</span>
                      </li>
                    </ul>
                    <p className="text-xs text-gray-400 mb-2">Duration: 1 min to 1:30 min</p>
                    <p className="text-xs text-cyan-400 mb-4">Extra minute: +20,000 for 30 second</p>
                    <button
                      onClick={() => navigate('/contact')}
                      className="w-full px-4 py-2 neon-border rounded-xl font-semibold text-white hover:scale-105 transition-all duration-300 text-sm"
                    >
                      Get Started
                    </button>
                  </div>
                </div>

                {/* Video Editing Only */}
                <div className="futuristic-card p-6 rounded-3xl cyber-border relative overflow-hidden hover:scale-105 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-transparent to-transparent"></div>
                  <div className="relative">
                    <h3 className="text-xl font-bold text-white mb-4">Video Editing Only</h3>
                    <div className="mb-4">
                      <span className="text-3xl font-bold gradient-text">30,000</span>
                      <span className="text-sm text-gray-400 ml-2">MMK</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">Duration: 1 minute to 1:30 minute</p>
                    <p className="text-xs text-cyan-400 mb-4">Extra minute: +19,000 for 30 second</p>
                    <button
                      onClick={() => navigate('/contact')}
                      className="w-full px-4 py-2 glass-effect border border-cyan-500/50 rounded-xl font-semibold text-cyan-400 hover:bg-cyan-500/20 transition-all duration-300 text-sm"
                    >
                      Get Started
                    </button>
                  </div>
                </div>

                {/* Video Editing + Sub title + Voice Over */}
                <div className="futuristic-card p-6 rounded-3xl cyber-border relative overflow-hidden hover:scale-105 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent"></div>
                  <div className="relative">
                    <h3 className="text-xl font-bold text-white mb-4">Video Editing + Sub title + Voice Over</h3>
                    <div className="mb-4">
                      <span className="text-3xl font-bold gradient-text">50,000</span>
                      <span className="text-sm text-gray-400 ml-2">MMK</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">Duration: 1 minute to 1:30 minute</p>
                    <p className="text-xs text-cyan-400 mb-4">Extra minute: +15,000 for 30 second</p>
                    <button
                      onClick={() => navigate('/contact')}
                      className="w-full px-4 py-2 glass-effect border border-cyan-500/50 rounded-xl font-semibold text-cyan-400 hover:bg-cyan-500/20 transition-all duration-300 text-sm"
                    >
                      Get Started
                    </button>
                  </div>
                </div>

                {/* Video editing + Voice Over + Sub Title + Script */}
                <div className="futuristic-card p-6 rounded-3xl cyber-border relative overflow-hidden hover:scale-105 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-transparent to-transparent"></div>
                  <div className="relative">
                    <h3 className="text-xl font-bold text-white mb-4">Video editing + Voice Over + Sub Title + Script</h3>
                    <div className="mb-4">
                      <span className="text-3xl font-bold gradient-text">70,000</span>
                      <span className="text-sm text-gray-400 ml-2">MMK</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">Duration: 1 minute to 1:30 minute</p>
                    <p className="text-xs text-cyan-400 mb-4">Extra minute: +20,000 MMK for 30 second</p>
                    <button
                      onClick={() => navigate('/contact')}
                      className="w-full px-4 py-2 glass-effect border border-cyan-500/50 rounded-xl font-semibold text-cyan-400 hover:bg-cyan-500/20 transition-all duration-300 text-sm"
                    >
                      Get Started
                    </button>
                  </div>
                </div>

                {/* Product Video Clip - VO */}
                <div className="futuristic-card p-6 rounded-3xl cyber-border relative overflow-hidden hover:scale-105 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent"></div>
                  <div className="relative">
                    <h3 className="text-xl font-bold text-white mb-4">Product Video Clip - VO</h3>
                    <div className="mb-4">
                      <span className="text-3xl font-bold gradient-text">50,000</span>
                      <span className="text-sm text-gray-400 ml-2">MMK</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">Duration: Ultimate 30 second each</p>
                    <p className="text-xs text-gray-500 mb-4">Extra minute: N/A</p>
                    <button
                      onClick={() => navigate('/contact')}
                      className="w-full px-4 py-2 glass-effect border border-cyan-500/50 rounded-xl font-semibold text-cyan-400 hover:bg-cyan-500/20 transition-all duration-300 text-sm"
                    >
                      Get Started
                    </button>
                  </div>
                </div>
              </div>

              {/* Additional Cost Note */}
              <div className="futuristic-card p-6 rounded-3xl cyber-border mb-12 bg-gradient-to-r from-indigo-600/10 to-cyan-500/10">
                <p className="text-gray-300 text-sm">
                  <span className="font-semibold text-cyan-400">Additional Cost:</span> Production Cost Extra charges: 20,000 MMK
                </p>
              </div>

              {/* Creative Package Section */}
              <div className="mb-12">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center space-x-2 px-6 py-3 glass-effect neon-border rounded-full mb-6">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm font-bold text-cyan-400 tracking-wider uppercase">✨ Creative Package</span>
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-4">
                    <span className="gradient-text">Creative Package Options</span>
                  </h3>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Standard Creative Package */}
                  <div className="futuristic-card p-6 rounded-3xl cyber-border relative overflow-hidden hover:scale-105 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-transparent to-transparent"></div>
                    <div className="relative">
                      <h4 className="text-lg font-bold text-white mb-4">Standard Creative Package</h4>
                      <div className="mb-4">
                        <span className="text-2xl font-bold gradient-text">300,000</span>
                        <span className="text-sm text-gray-400 ml-2">MMK</span>
                      </div>
                      <ul className="space-y-2 mb-4 text-sm text-gray-300">
                        <li className="flex items-start space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <span>Video: (C2 post) - 1:30 minute</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <span>Content: (C3 post)</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <span>Design: (C3 post)</span>
                        </li>
                      </ul>
                      <button
                        onClick={() => navigate('/contact')}
                        className="w-full px-4 py-2 glass-effect border border-cyan-500/50 rounded-xl font-semibold text-cyan-400 hover:bg-cyan-500/20 transition-all duration-300 text-sm"
                      >
                        Get Started
                      </button>
                    </div>
                  </div>

                  {/* Business Creative Package */}
                  <div className="futuristic-card p-6 rounded-3xl cyber-border relative overflow-hidden hover:scale-105 transition-all duration-300 border-2 border-cyan-500/50">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-indigo-600/10 to-transparent"></div>
                    <div className="absolute top-4 right-4 px-2 py-1 glass-effect border border-cyan-500/50 rounded-full z-10">
                      <span className="text-xs font-bold text-cyan-400 uppercase">Popular</span>
                    </div>
                    <div className="relative">
                      <h4 className="text-lg font-bold text-white mb-4">Business Creative Package</h4>
                      <div className="mb-4">
                        <span className="text-2xl font-bold gradient-text">450,000</span>
                        <span className="text-sm text-gray-400 ml-2">MMK</span>
                      </div>
                      <ul className="space-y-2 mb-4 text-sm text-gray-300">
                        <li className="flex items-start space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <span>Video: (C3 post) - 1:30 minute</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <span>Content: (C5 post)</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <span>Design: (C5 post)</span>
                        </li>
                      </ul>
                      <button
                        onClick={() => navigate('/contact')}
                        className="w-full px-4 py-2 neon-border rounded-xl font-semibold text-white hover:scale-105 transition-all duration-300 text-sm"
                      >
                        Get Started
                      </button>
                    </div>
                  </div>

                  {/* Infinite Creative Package */}
                  <div className="futuristic-card p-6 rounded-3xl cyber-border relative overflow-hidden hover:scale-105 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-transparent to-transparent"></div>
                    <div className="relative">
                      <h4 className="text-lg font-bold text-white mb-4">Infinite Creative Package</h4>
                      <div className="mb-4">
                        <span className="text-2xl font-bold gradient-text">600,000</span>
                        <span className="text-sm text-gray-400 ml-2">MMK</span>
                      </div>
                      <ul className="space-y-2 mb-4 text-sm text-gray-300">
                        <li className="flex items-start space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <span>Video: (C4 post) - 1:30 minute</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <span>Content: (C7 post)</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <span>Design: (C7 post)</span>
                        </li>
                      </ul>
                      <button
                        onClick={() => navigate('/contact')}
                        className="w-full px-4 py-2 glass-effect border border-cyan-500/50 rounded-xl font-semibold text-cyan-400 hover:bg-cyan-500/20 transition-all duration-300 text-sm"
                      >
                        Get Started
                      </button>
                    </div>
                  </div>
                </div>

                {/* Extra Charges for Creative Package */}
                <div className="futuristic-card p-6 rounded-3xl cyber-border mt-6 bg-gradient-to-r from-indigo-600/10 to-cyan-500/10">
                  <p className="text-gray-300 text-sm mb-2">
                    <span className="font-semibold text-cyan-400">Extra Charges:</span>
                  </p>
                  <ul className="space-y-1 text-sm text-gray-300">
                    <li>• Video extra minute charges: (+20,000 for 30 second)</li>
                    <li>• Video cost extra charges: (C 20,000 MMK)</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Deliverables Section - Separate */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black relative">
          <div className="absolute inset-0 tech-grid opacity-5"></div>
          <div className="max-w-7xl mx-auto relative">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">
                <span className="gradient-text">What You'll Receive</span>
              </h2>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Comprehensive deliverables included in every package
              </p>
            </div>
            <div className="futuristic-card p-10 rounded-4xl cyber-border relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/10 via-transparent to-indigo-600/10"></div>
              <div className="relative">
                <div className="grid md:grid-cols-2 gap-6">
                  {service.deliverables.map((deliverable, index) => (
                    <div key={deliverable} className="flex items-start space-x-4 p-4 glass-effect border border-cyan-500/20 rounded-2xl">
                      <div className="flex-shrink-0 w-8 h-8 neon-border rounded-xl flex items-center justify-center bg-cyan-500/10">
                        <span className="text-cyan-400 font-bold">{index + 1}</span>
                      </div>
                      <span className="text-gray-200 leading-relaxed text-base">{deliverable}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
            </div>
          </div>
        </section>

        {/* Process Section - Separate */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black relative">
          <div className="absolute inset-0 tech-grid opacity-5"></div>
          <div className="max-w-7xl mx-auto relative">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 px-6 py-3 glass-effect neon-border rounded-full mb-6">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-bold text-cyan-400 tracking-wider uppercase">Our Process</span>
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">
                <span className="gradient-text">How We Work</span>
              </h2>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                A streamlined process designed for efficiency and results
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {service.process.map((step, idx) => (
                <div key={step.title} className="futuristic-card p-8 rounded-4xl cyber-border relative overflow-hidden hover:scale-105 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-cyan-500/10 to-transparent opacity-80"></div>
                  <div className="relative">
                    <div className="inline-flex items-center justify-center w-16 h-16 neon-border rounded-2xl bg-cyan-500/20 mb-6">
                      <span className="text-3xl font-bold text-cyan-400">{idx + 1}</span>
                    </div>
                    <div className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-2">Step {idx + 1}</div>
                    <h4 className="text-2xl font-bold text-white mb-4">{step.title}</h4>
                    <p className="text-base text-gray-300 leading-relaxed">{step.description}</p>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
          <div className="absolute inset-0 tech-grid opacity-10"></div>
          <div className="max-w-5xl mx-auto text-center relative space-y-8">
            <h2 className="text-4xl font-bold text-white tracking-tight">
              <span className="gradient-text">Ready to activate {service.name}?</span>
            </h2>
            <p className="text-lg text-gray-300 leading-relaxed">
              Talk to our strategy team about how this service can plug into your roadmap, timelines, and campaign goals.
            </p>
            <div className="inline-flex flex-col sm:flex-row items-center gap-4 justify-center">
              <button
                onClick={() => navigate('/contact')}
                className="group px-12 py-5 neon-border rounded-2xl font-bold text-lg text-white hover:scale-110 active:scale-95 transition-all duration-300 inline-flex items-center space-x-3 animate-glow-intense"
              >
                <span>Book a strategy call</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-transform" />
              </button>
              <button
                onClick={() => navigate('/services')}
                className="px-10 py-5 glass-effect rounded-2xl font-bold text-lg text-cyan-400 border border-cyan-500/50 hover:scale-105 active:scale-95 transition-all duration-300"
              >
                Browse all services
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
