import { Briefcase, ExternalLink, Award, Paintbrush, FileText, Target, ShieldCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Seo from '../components/Seo';
import { BASE_URL } from '../utils/seo';

export default function PortfolioPage() {
  const navigate = useNavigate();
  const categories = ['All', 'Branding', 'Digital Marketing', 'Social Media', 'Web Design'];

  const projects = [
    {
      title: 'TechFlow Rebranding',
      category: 'Branding',
      description: 'Complete brand identity redesign for a leading tech startup, including logo, color palette, and brand guidelines.',
      image: 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=800',
      results: '+150% brand recognition',
    },
    {
      title: 'EcoLife Campaign',
      category: 'Digital Marketing',
      description: 'Integrated digital marketing campaign for sustainable lifestyle brand targeting millennials and Gen Z.',
      image: 'https://images.pexels.com/photos/4050315/pexels-photo-4050315.jpeg?auto=compress&cs=tinysrgb&w=800',
      results: '+300% engagement rate',
    },
    {
      title: 'FitnessPro Social Strategy',
      category: 'Social Media',
      description: 'Comprehensive social media strategy and content creation for fitness app launch across all major platforms.',
      image: 'https://images.pexels.com/photos/4162491/pexels-photo-4162491.jpeg?auto=compress&cs=tinysrgb&w=800',
      results: '50K+ new followers',
    },
    {
      title: 'Luxury Estates Website',
      category: 'Web Design',
      description: 'Premium real estate website with interactive property tours and advanced search functionality.',
      image: 'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=800',
      results: '+200% lead generation',
    },
    {
      title: 'FreshBite Brand Launch',
      category: 'Branding',
      description: 'End-to-end branding for organic food delivery service including packaging and marketing collateral.',
      image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',
      results: '95% positive feedback',
    },
    {
      title: 'UrbanStyle E-commerce',
      category: 'Digital Marketing',
      description: 'Multi-channel digital marketing strategy for fashion e-commerce platform launch and growth.',
      image: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=800',
      results: '$2M+ in sales',
    },
    {
      title: 'TravelMore Influencer Campaign',
      category: 'Social Media',
      description: 'Strategic influencer partnerships and content creation for travel booking platform.',
      image: 'https://images.pexels.com/photos/1371360/pexels-photo-1371360.jpeg?auto=compress&cs=tinysrgb&w=800',
      results: '10M+ impressions',
    },
    {
      title: 'FinTech Dashboard Redesign',
      category: 'Web Design',
      description: 'User experience overhaul for financial technology platform focusing on usability and accessibility.',
      image: 'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=800',
      results: '+180% user retention',
    },
    {
      title: 'WellnessHub Identity',
      category: 'Branding',
      description: 'Holistic brand development for wellness center including visual identity and brand voice.',
      image: 'https://images.pexels.com/photos/3823488/pexels-photo-3823488.jpeg?auto=compress&cs=tinysrgb&w=800',
      results: '4.9/5 brand rating',
    },
  ];

  const achievements = [
    { service: 'Social Media Creative Service', number: '2000+', icon: Paintbrush },
    { service: 'Clients Registration', number: '5000+', icon: Target },
    { service: 'Online License', number: '300+', icon: ShieldCheck },
    { service: 'Happy Clients', number: '3500+', icon: Users },
  ];

  const portfolioSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    url: `${BASE_URL}/portfolio`,
    name: 'Marketing Capsule Project Portfolio',
    hasPart: projects.map((project) => ({
      '@type': 'CreativeWork',
      name: project.title,
      description: project.description,
      genre: project.category,
      image: project.image,
    })),
  };

  return (
    <>
      <Seo
        title="Portfolio | Marketing Capsule - Our Work & Success Stories"
        description="See Marketing Capsule's portfolio featuring rebrands, digital marketing campaigns, social media growth, and high-converting websites."
        canonical={`${BASE_URL}/portfolio`}
        keywords="Marketing Capsule portfolio, digital marketing portfolio, social media marketing examples, branding portfolio, marketing case studies, Myanmar marketing portfolio"
        jsonLd={portfolioSchema}
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
            <Briefcase className="h-4 w-4 text-cyan-400 animate-pulse" />
            <span className="text-sm font-bold text-cyan-400 tracking-wider uppercase">
              Our Work
            </span>
          </div>

          <h1 className="text-6xl sm:text-7xl font-bold mb-6 animate-slide-up tracking-tight">
            <span className="gradient-text glow-text">Portfolio</span>
          </h1>

          <p className="text-xl text-gray-300 max-w-3xl mx-auto animate-slide-up leading-relaxed" style={{ animationDelay: '0.1s' }}>
            Explore our <span className="text-cyan-400">award-winning</span> projects and the results we've delivered for our clients.
          </p>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black relative">
        <div className="absolute inset-0 tech-grid opacity-5"></div>
        <div className="max-w-7xl mx-auto relative">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {achievements.map((achievement, index) => (
              <div
                key={index}
                className="group futuristic-card p-8 rounded-3xl hover:scale-105 active:scale-100 transition-all duration-500 text-center cyber-border"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/0 via-cyan-500/0 to-indigo-600/0 group-hover:from-indigo-600/10 group-hover:via-cyan-500/5 group-hover:to-indigo-600/10 transition-all duration-500 rounded-3xl"></div>

                <div className="relative">
                  <div className="w-16 h-16 neon-border rounded-3xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 animate-glow">
                    <achievement.icon className="h-8 w-8 text-cyan-400" />
                  </div>

                  <div className="text-4xl sm:text-5xl font-bold gradient-text glow-text mb-4 group-hover:scale-110 transition-transform inline-block">
                    {achievement.number}
                  </div>
                  <h3 className="text-base font-semibold text-white group-hover:text-cyan-400 transition-colors">
                    {achievement.service}
                  </h3>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
            ))}
          </div>

          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6 tracking-tight">
              <span className="gradient-text">Featured Projects</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              A showcase of our most impactful work
            </p>
          </div>

          <div className="flex justify-center gap-3 mb-12">
            {categories.map((category) => (
              <button
                key={category}
                className="px-5 py-2.5 rounded-2xl text-sm font-semibold glass-effect border border-cyan-500/30 text-gray-300 hover:text-cyan-400 transition-all duration-300"
              >
                {category}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
            {projects.map((project, index) => (
              <div
                key={index}
                className="group futuristic-card rounded-3xl overflow-hidden hover:scale-105 active:scale-100 transition-all duration-500 cyber-border h-full flex flex-col"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/0 via-cyan-500/0 to-indigo-600/0 group-hover:from-indigo-600/10 group-hover:via-cyan-500/5 group-hover:to-indigo-600/10 transition-all duration-500"></div>

                <div className="relative flex flex-col h-full">
                  <div className="aspect-[4/3] overflow-hidden flex-shrink-0">
                    <img
                      src={project.image}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-70 group-hover:opacity-80 transition-opacity duration-500"></div>
                    <div className="absolute top-4 right-4">
                      <div className="px-4 py-2 glass-effect rounded-full border border-cyan-500/50">
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                          {project.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-4 flex-grow flex flex-col">
                    <h3 className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors flex-grow">
                      {project.description}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-cyan-500/20 mt-auto">
                      <div className="flex items-center space-x-2">
                        <Award className="h-4 w-4 text-cyan-400" />
                        <span className="text-sm font-semibold text-cyan-400">
                          {project.results}
                        </span>
                      </div>
                      <button className="p-2 rounded-full hover:bg-cyan-500/10 transition-colors group/btn">
                        <ExternalLink className="h-5 w-5 text-gray-400 group-hover/btn:text-cyan-400 transition-colors" />
                      </button>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
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
          <Briefcase className="h-20 w-20 mx-auto mb-8 text-cyan-400 animate-bounce-subtle" />
          <h2 className="text-5xl sm:text-7xl font-bold mb-8 text-white tracking-tight glow-text">Ready to Start Your Project?</h2>
          <p className="text-xl mb-14 text-gray-300 leading-relaxed max-w-3xl mx-auto">
            Let's create something <span className="text-cyan-400 font-semibold">extraordinary</span> together and achieve exceptional results
          </p>
          <button
            onClick={() => navigate('/contact')}
            className="px-14 py-6 neon-border rounded-2xl font-bold text-xl text-white hover:scale-110 active:scale-95 transition-all duration-300 animate-glow-intense"
          >
            Get In Touch
          </button>
        </div>
      </section>
    </div>
    </>
  );
}

