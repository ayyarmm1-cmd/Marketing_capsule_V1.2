import {
  Paintbrush,
  FileText,
  Video,
  Target,
  ShieldCheck,
  MessageSquare,
  LucideIcon,
} from 'lucide-react';

export interface ServiceDetail {
  id: string;
  name: string;
  icon: LucideIcon;
  tagline: string;
  headline: string;
  subheadline: string;
  description: string;
  features: string[];
  deliverables: string[];
  outcomes: { value: string; label: string }[];
  process: { title: string; description: string }[];
  color: string;
}

export const serviceDetails: ServiceDetail[] = [
  {
    id: 'logo-social-media-design',
    name: 'Social Media Creative Service',
    icon: Paintbrush,
    tagline: 'Visual Identities People Remember',
    headline: 'Social Media Creative Service',
    subheadline:
      'Custom-crafted logos and social visuals that elevate your brand image, boost engagement, and keep every channel cohesive.',
    description:
      'From brand logos to feed posts, stories, and carousels, we design scroll-stopping creatives that honour your brand voice while optimising for each platform. Our team has delivered over 500 design suites, tailoring format, size, layout, and motion for peak performance.',
    features: [
      'Logo design and brand identity systems',
      'Platform-specific templates for Facebook, Instagram, TikTok, and more',
      'Brand-aligned colour, typography, and iconography systems',
      'Editable source files for internal reuse and quick iteration',
      'Content-ready layouts that maximise readability and click-through',
    ],
    deliverables: [
      'Logo design packages (primary and alternate lockups)',
      'Monthly social design packs (static + animated)',
      'Story, reel, and short-video cover templates',
      'Brand visual guidelines for social media teams',
      'Performance review and optimisation recommendations',
    ],
    outcomes: [
      { value: '500+', label: 'Design suites delivered' },
      { value: '65%', label: 'Average engagement lift' },
      { value: '6 yr', label: 'Experience crafting social visuals' },
    ],
    process: [
      {
        title: 'Brand Discovery',
        description:
          'Understand your brand, tone, and campaign goals through collaborative workshops.',
      },
      {
        title: 'Creative Exploration',
        description:
          'Design mood boards and creative directions aligned to your aesthetic and target audience.',
      },
      {
        title: 'Production & Delivery',
        description:
          'Build multi-format assets, hand off organised files, and iterate based on performance insights.',
      },
    ],
    color: 'from-indigo-500 to-cyan-500',
  },
  {
    id: 'talent-video-editing',
    name: 'Media Production Service',
    icon: Video,
    tagline: 'Professional Video Production',
    headline: 'Media Production Service',
    subheadline:
      'Complete video production services with professional talent, expert editing, and platform-optimized delivery.',
    description:
      'From concept to final cut, we provide end-to-end video production services. Our team includes professional talent, experienced videographers, and skilled editors who create engaging video content optimized for social media platforms.',
    features: [
      'Professional talent casting and coordination',
      'Video shooting and production services',
      'Expert video editing and post-production',
      'Platform-specific optimization (Instagram, TikTok, YouTube)',
      'Motion graphics and animation integration',
    ],
    deliverables: [
      'Raw footage and edited video files',
      'Multiple format exports for different platforms',
      'Thumbnail designs and cover images',
      'Video scripts and storyboards',
      'Performance analytics and recommendations',
    ],
    outcomes: [
      { value: '200+', label: 'Video projects completed' },
      { value: '85%', label: 'Client retention rate' },
      { value: '4.8★', label: 'Average satisfaction score' },
    ],
    process: [
      {
        title: 'Concept & Planning',
        description:
          'Develop video concepts, scripts, and production plans aligned with your brand and goals.',
      },
      {
        title: 'Production & Shooting',
        description:
          'Coordinate talent, shoot footage, and capture all necessary content for your project.',
      },
      {
        title: 'Editing & Delivery',
        description:
          'Edit, enhance, and optimize videos for maximum impact across all platforms.',
      },
    ],
    color: 'from-cyan-500 to-indigo-600',
  },
  {
    id: 'boosting-service',
    name: 'Boosting Service',
    icon: Target,
    tagline: 'Performance That Pays Off',
    headline: 'Paid Boosting & Campaign Management',
    subheadline:
      'Data-driven boosting campaigns with precise targeting, transparent reporting, and ROI accountability.',
    description:
      'We plan and run ad campaigns that stretch every dollar. From audience selection to creative testing, our boosting specialists keep you informed with real-time updates, clear performance dashboards, and actionable optimisation recommendations.',
    features: [
      'Audience research and targeting framework',
      'Budget modelling and pacing controls',
      'Creative and copy testing for conversion lift',
      'Performance dashboards with ROI tracking',
      'Multi-platform boosting (Facebook, Instagram, TikTok)',
    ],
    deliverables: [
      'Boosting strategy deck with funnel objectives',
      'Weekly campaign reports and optimisation logs',
      'Creative testing matrix and recommendations',
      'Post-campaign insights + growth roadmap',
    ],
    outcomes: [
      { value: '4500+', label: 'Campaigns managed' },
      { value: '4.2x', label: 'Average return on ad spend' },
      { value: '30%', label: 'Savings from budget optimisation' },
    ],
    process: [
      {
        title: 'Campaign Blueprint',
        description:
          'Clarify goals, map the funnel, and define KPIs with your internal team.',
      },
      {
        title: 'Launch & Optimise',
        description:
          'Deploy campaigns, monitor audience response, and iterate creative and spend in real time.',
      },
      {
        title: 'Report & Scale',
        description:
          'Share digestible insights, recommend next steps, and scale what works across channels.',
      },
    ],
    color: 'from-cyan-500 to-indigo-500',
  },
  {
    id: 'online-license',
    name: 'Online License',
    icon: ShieldCheck,
    tagline: 'Build Trust, Stay Compliant',
    headline: 'Online Business Licensing',
    subheadline:
      'Legal and operational support that legitimises your online business, boosts credibility, and simplifies compliance.',
    description:
      'Our specialists guide you through the paperwork, approvals, and renewals needed to operate confidently online. We help define the right licence package, prepare documents, and provide ongoing support so your brand is protected.',
    features: [
      'Licence requirements assessment based on business model',
      'Document preparation, submission, and follow-up',
      'Advisory on branding, packaging, and compliance labelling',
      'Annual renewal reminders and support services',
    ],
    deliverables: [
      'Custom licensing roadmap and checklist',
      'Completed forms and submission tracking sheets',
      'Brand compliance review and recommendations',
      'Support hotline for questions post-approval',
    ],
    outcomes: [
      { value: '300+', label: 'Licenses processed' },
      { value: '100%', label: 'Licence approval success rate' },
      { value: '40%', label: 'Time saved vs DIY processes' },
    ],
    process: [
      {
        title: 'Assess & Plan',
        description:
          'Evaluate your business structure and identify the licences, permits, and documentation required.',
      },
      {
        title: 'Prepare & Submit',
        description:
          'Gather paperwork, complete applications, and liaise with authorities on your behalf.',
      },
      {
        title: 'Enable & Support',
        description:
          'Deliver approvals, confirm compliance usage, and remain on standby for renewals or new ventures.',
      },
    ],
    color: 'from-indigo-600 to-cyan-500',
  },
  {
    id: 'content-script',
    name: 'Social Media Operation & Maintenance Service',
    icon: FileText,
    tagline: 'Complete Social Media Management',
    headline: 'Social Media Operation & Maintenance Service',
    subheadline:
      'Comprehensive social media operation and maintenance services that keep your channels active, engaged, and optimized for growth.',
    description:
      'We handle the day-to-day operations of your social media presence, from content creation and scheduling to community management and performance optimization. Our team ensures your social media channels stay active, engaging, and aligned with your brand while you focus on running your business. We manage posting schedules, respond to comments and messages, monitor performance metrics, and continuously optimize your strategy for better results.',
    features: [
      'Daily content creation, scheduling, and publishing across all platforms',
      'Community management including comment moderation and engagement',
      'Performance monitoring, analytics tracking, and monthly reporting',
      'Content strategy development and editorial calendar management',
      'Platform optimization and algorithm compliance updates',
      'Crisis management and reputation monitoring',
      'Hashtag research and trend analysis',
      'Regular account maintenance and security updates',
    ],
    deliverables: [
      'Monthly content calendars with strategic posting schedules',
      'Daily social media posts across Facebook, Instagram, TikTok, and more',
      'Weekly engagement reports and community management summaries',
      'Monthly performance analytics and optimization recommendations',
      'Regular content creation (posts, stories, reels, videos)',
      '24/7 community monitoring and response management',
      'Platform-specific optimization and best practices implementation',
      'Ongoing strategy refinement based on performance data',
    ],
    outcomes: [
      { value: '500+', label: 'Active social media accounts managed' },
      { value: '4.9★', label: 'Average client satisfaction score' },
      { value: '85%', label: 'Average engagement rate increase' },
    ],
    process: [
      {
        title: 'Account Setup & Strategy',
        description:
          'Audit your existing social media presence, establish brand voice guidelines, and develop a comprehensive operation strategy tailored to your business goals.',
      },
      {
        title: 'Daily Operations & Management',
        description:
          'Execute daily posting schedules, engage with your audience, monitor conversations, and maintain consistent brand presence across all platforms.',
      },
      {
        title: 'Optimization & Growth',
        description:
          'Continuously analyze performance metrics, optimize content strategies, implement platform updates, and refine approaches to drive sustained growth and engagement.',
      },
    ],
    color: 'from-indigo-600 to-indigo-500',
  },
  {
    id: 'consultation',
    name: 'Digital Marketing Consultation',
    icon: MessageSquare,
    tagline: 'Strategic Guidance for Growth',
    headline: 'Digital Marketing Consultation',
    subheadline:
      'Expert marketing consultation to help you make informed decisions and develop effective strategies for your business.',
    description:
      'Get personalized marketing advice from our experienced team. Whether you need help with strategy, campaign planning, or general marketing guidance, our consultation services provide the insights you need to succeed.',
    features: [
      'One-on-one strategy sessions',
      'Marketing audit and analysis',
      'Campaign planning and roadmap development',
      'Best practices and industry insights',
      'Ongoing support and guidance',
    ],
    deliverables: [
      'Comprehensive marketing assessment report',
      'Strategic recommendations and action plans',
      'Customized marketing roadmap',
      'Follow-up consultation sessions',
    ],
    outcomes: [
      { value: '150+', label: 'Businesses consulted' },
      { value: '95%', label: 'Client satisfaction rate' },
      { value: '4.9★', label: 'Average consultation rating' },
    ],
    process: [
      {
        title: 'Discovery & Analysis',
        description:
          'Review your current marketing efforts, business goals, and challenges.',
      },
      {
        title: 'Strategy Development',
        description:
          'Develop customized recommendations and action plans based on your unique needs.',
      },
      {
        title: 'Implementation Support',
        description:
          'Provide guidance and support as you implement the recommended strategies.',
      },
    ],
    color: 'from-indigo-500 to-cyan-600',
  },
];
