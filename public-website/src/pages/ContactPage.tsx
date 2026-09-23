import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Seo from '../components/Seo';
import { BASE_URL } from '../utils/seo';
import { trackFormSubmit } from '../utils/analytics';

export default function ContactPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    message: '',
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      // Track successful form submission
      trackFormSubmit('contact_form', true);

      setIsSubmitted(true);
      setFormData({ name: '', email: '', company: '', phone: '', message: '' });
      setTimeout(() => {
        setIsSubmitted(false);
      }, 5000);
    } catch (err) {
      // Track failed form submission
      trackFormSubmit('contact_form', false);
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
      console.error('Error submitting form:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const officeLocation = {
    address: 'No.(2), Thuzar St, Pabaedan Qtr, Mawlamyine',
    embedUrl: 'https://maps.google.com/maps?q=Mawlamyine,+Myanmar&z=15&output=embed',
    directionsUrl: 'https://www.google.com/maps/search/?api=1&query=No.2+Thuzar+St,+Pabaedan+Qtr,+Mawlamyine',
  };

  const contactInfo = [
    {
      icon: Mail,
      title: 'Email',
      detail: 'info@marketingcapsulemm.com',
      link: 'mailto:info@marketingcapsulemm.com',
    },
    {
      icon: Phone,
      title: 'Phone',
      detail: '09 450 510 920 / 09 450 510 930',
      link: 'tel:+959450510920',
    },
    {
      icon: MapPin,
      title: 'Office',
      detail: officeLocation.address,
      link: officeLocation.directionsUrl,
    },
  ];

  const contactSchema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    url: `${BASE_URL}/contact`,
    mainEntity: {
      '@type': 'Organization',
      name: 'Marketing Capsule',
      contactPoint: [
        {
          '@type': 'ContactPoint',
          telephone: '+959450510920',
          contactType: 'sales',
          email: 'info@marketingcapsulemm.com',
          areaServed: 'Worldwide',
          availableLanguage: ['English', 'Myanmar'],
        },
      ],
    },
  };

  return (
    <>
      <Seo
        title="Contact Us | Marketing Capsule - Get Free Marketing Consultation & Quote"
        description="Ready to accelerate your marketing? Contact Marketing Capsule for tailored design, boosting, TikTok campaigns, and licensing support. Get in touch today for a free consultation."
        canonical={`${BASE_URL}/contact`}
        keywords="contact Marketing Capsule, marketing consultation, get quote, marketing agency contact, Myanmar marketing contact"
        jsonLd={contactSchema}
      />
      <div className="pt-20 bg-black overflow-x-hidden w-full">
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 tech-grid opacity-20"></div>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-indigo-600/20 to-transparent rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 px-6 py-3 glass-effect neon-border rounded-full mb-10 animate-slide-down scan-line">
            <Mail className="h-4 w-4 text-cyan-400 animate-pulse" />
            <span className="text-sm font-bold text-cyan-400 tracking-wider uppercase">
              Get In Touch
            </span>
          </div>

          <h1 className="text-6xl sm:text-7xl font-bold mb-6 animate-slide-up tracking-tight">
            <span className="gradient-text glow-text">Contact Us</span>
          </h1>

          <p className="text-xl text-gray-300 max-w-3xl mx-auto animate-slide-up leading-relaxed" style={{ animationDelay: '0.1s' }}>
            Ready to transform your marketing? Let's start a <span className="text-cyan-400">conversation</span> about your goals.
          </p>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black relative">
        <div className="absolute inset-0 tech-grid opacity-5"></div>
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
                  Let's Work
                  <br />
                  <span className="gradient-text">Together</span>
                </h2>
                <p className="text-lg text-gray-400 leading-relaxed">
                  Have a project in mind? We'd love to hear about it. Fill out the form and we'll get back to you within <span className="text-cyan-400">24 hours</span>.
                </p>
              </div>

              <div className="space-y-4">
                {contactInfo.map((info, index) => (
                  <a
                    key={index}
                    href={info.link}
                    className="group flex items-start space-x-4 p-6 futuristic-card rounded-3xl hover:scale-105 active:scale-100 transition-all duration-300 cyber-border"
                  >
                    <div className="flex-shrink-0 w-14 h-14 neon-border rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 animate-glow">
                      <info.icon className="h-6 w-6 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors text-lg">
                        {info.title}
                      </h3>
                      <p className="text-gray-400 group-hover:text-gray-300 transition-colors">{info.detail}</p>
                    </div>
                  </a>
                ))}
              </div>

              <div className="relative futuristic-card p-8 rounded-3xl overflow-hidden cyber-border">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-cyan-600 opacity-95"></div>
                <div className="absolute inset-0 tech-grid opacity-10"></div>
                <div className="relative flex items-center space-x-4 text-white">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Business Hours</h3>
                    <div className="space-y-1 text-indigo-50 text-sm">
                      <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
                      <p>Saturday: 10:00 AM - 4:00 PM</p>
                      <p>Sunday: Closed</p>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-6 -left-6 w-40 h-40 bg-indigo-600/20 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-6 -right-6 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl"></div>

              <form onSubmit={handleSubmit} className="relative futuristic-card rounded-4xl p-10 space-y-6 cyber-border">
                {isSubmitted ? (
                  <div className="py-16 text-center animate-scale-in">
                    <div className="w-24 h-24 neon-border rounded-full flex items-center justify-center mx-auto mb-6 animate-glow-intense">
                      <CheckCircle2 className="h-12 w-12 text-cyan-400" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-3">Thank You!</h3>
                    <p className="text-lg text-gray-400">
                      We've received your message and will get back to you soon.
                    </p>
                  </div>
                ) : (
                  <>
                    {error && (
                      <div className="p-4 bg-red-500/10 border-2 border-red-500/50 rounded-2xl">
                        <p className="text-red-400 text-sm">{error}</p>
                      </div>
                    )}
                    <div>
                      <label htmlFor="name" className="block text-sm font-semibold text-gray-300 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-5 py-4 bg-black/50 border-2 border-cyan-500/30 rounded-2xl focus:border-cyan-500 focus:ring-0 outline-none transition-all duration-300 text-white placeholder-gray-500"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-300 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-5 py-4 bg-black/50 border-2 border-cyan-500/30 rounded-2xl focus:border-cyan-500 focus:ring-0 outline-none transition-all duration-300 text-white placeholder-gray-500"
                        placeholder="john@example.com"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="company" className="block text-sm font-semibold text-gray-300 mb-2">
                          Company
                        </label>
                        <input
                          type="text"
                          id="company"
                          name="company"
                          value={formData.company}
                          onChange={handleChange}
                          className="w-full px-5 py-4 bg-black/50 border-2 border-cyan-500/30 rounded-2xl focus:border-cyan-500 focus:ring-0 outline-none transition-all duration-300 text-white placeholder-gray-500"
                          placeholder="Company Name"
                        />
                      </div>

                      <div>
                        <label htmlFor="phone" className="block text-sm font-semibold text-gray-300 mb-2">
                          Phone
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full px-5 py-4 bg-black/50 border-2 border-cyan-500/30 rounded-2xl focus:border-cyan-500 focus:ring-0 outline-none transition-all duration-300 text-white placeholder-gray-500"
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-semibold text-gray-300 mb-2">
                        Message *
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        required
                        value={formData.message}
                        onChange={handleChange}
                        rows={5}
                        className="w-full px-5 py-4 bg-black/50 border-2 border-cyan-500/30 rounded-2xl focus:border-cyan-500 focus:ring-0 outline-none transition-all duration-300 resize-none text-white placeholder-gray-500"
                        placeholder="Tell us about your project..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="group w-full px-8 py-5 neon-border rounded-2xl font-bold text-lg text-white hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center space-x-2 animate-glow-intense disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {isLoading ? (
                        <>
                          <span>Sending...</span>
                          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                        </>
                      ) : (
                        <>
                          <span>Send Message</span>
                          <Send className="h-5 w-5 group-hover:translate-x-2 transition-transform" />
                        </>
                      )}
                    </button>
                  </>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black relative">
        <div className="absolute inset-0 tech-grid opacity-5"></div>
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 px-6 py-3 glass-effect neon-border rounded-full mb-6 animate-slide-down">
              <MapPin className="h-4 w-4 text-cyan-400 animate-pulse" />
              <span className="text-sm font-bold text-cyan-400 tracking-wider uppercase">
                Find Us
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
              <span className="gradient-text">Our Location</span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Visit us at our office or get directions to plan your visit
            </p>
          </div>

          <div className="relative futuristic-card rounded-4xl overflow-hidden cyber-border">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-cyan-500/5 to-indigo-600/10"></div>
            <div className="relative">
              <div className="aspect-video w-full bg-black/50">
                <iframe
                  src={officeLocation.embedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0, filter: 'grayscale(20%) brightness(0.9) contrast(1.1)' }}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full rounded-4xl"
                  title="Marketing Capsule office location map"
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <a
              href={officeLocation.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-6 py-3 glass-effect text-cyan-400 rounded-2xl font-semibold border border-cyan-500/50 hover:scale-105 active:scale-95 transition-all duration-300"
            >
              <MapPin className="h-5 w-5" />
              <span>Get Directions</span>
            </a>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black relative">
        <div className="absolute inset-0 tech-grid opacity-10"></div>
        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-4xl font-bold text-white mb-6 tracking-tight">
            Not Ready to Commit?
            <br />
            <span className="gradient-text">That's Okay!</span>
          </h2>
          <p className="text-lg text-gray-400 mb-8 leading-relaxed">
            Explore our services and learn more about how we can help your business <span className="text-cyan-400">grow</span>.
          </p>
          <button
            onClick={() => navigate('/services')}
            className="px-10 py-4 glass-effect text-cyan-400 rounded-2xl font-semibold border border-cyan-500/50 hover:scale-105 active:scale-95 transition-all duration-300"
          >
            Explore Our Services
          </button>
        </div>
      </section>
    </div>
    </>
  );
}

