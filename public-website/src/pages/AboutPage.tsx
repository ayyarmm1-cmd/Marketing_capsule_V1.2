import { Target, Eye, Rocket, TrendingUp, Calendar, CheckCircle, User, ChevronLeft, ChevronRight, Star, Quote, Globe, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Seo from '../components/Seo';
import { BASE_URL } from '../utils/seo';

function FeedbackCarousel() {
  const [currentFeedbackIndex, setCurrentFeedbackIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const feedbacks = [
    {
      name: 'Sarah Chen',
      company: 'Fashion Boutique',
      role: 'Owner',
      rating: 5,
      text: 'Marketing Capsule transformed our social media presence. Our engagement increased by 300% in just 3 months. Their team is professional, creative, and always responsive.',
    },
    {
      name: 'Michael Tan',
      company: 'Restaurant Chain',
      role: 'Marketing Director',
      rating: 5,
      text: 'The comprehensive marketing solutions they provided helped us expand to 5 new locations. Their strategic approach and creative content are unmatched.',
    },
    {
      name: 'Emily Wong',
      company: 'Beauty Clinic',
      role: 'Founder',
      rating: 5,
      text: 'Working with Marketing Capsule has been a game-changer. They handle everything from content creation to campaign management, allowing us to focus on our clients.',
    },
    {
      name: 'David Lee',
      company: 'Tech Startup',
      role: 'CEO',
      rating: 5,
      text: 'Their data-driven approach and attention to detail have significantly improved our ROI. Marketing Capsule is truly a partner in our growth journey.',
    },
    {
      name: 'Lisa Park',
      company: 'E-commerce Store',
      role: 'Operations Manager',
      rating: 5,
      text: 'The team at Marketing Capsule understands our brand perfectly. Their creative designs and strategic campaigns have helped us reach new audiences.',
    },
  ];

  const feedbacksPerView = 3;
  const totalFeedbackSlides = Math.ceil(feedbacks.length / feedbacksPerView);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentFeedbackIndex((prev) => (prev + 1) % totalFeedbackSlides);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, totalFeedbackSlides]);

  const goToFeedbackSlide = (index: number) => {
    setCurrentFeedbackIndex(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const nextFeedbackSlide = () => {
    goToFeedbackSlide((currentFeedbackIndex + 1) % totalFeedbackSlides);
  };

  const prevFeedbackSlide = () => {
    goToFeedbackSlide((currentFeedbackIndex - 1 + totalFeedbackSlides) % totalFeedbackSlides);
  };

  const getVisibleFeedbacks = () => {
    const start = currentFeedbackIndex * feedbacksPerView;
    return feedbacks.slice(start, start + feedbacksPerView);
  };

  return (
    <div className="relative">
      <button
        onClick={prevFeedbackSlide}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-12 h-12 neon-border rounded-full flex items-center justify-center bg-black/80 hover:bg-cyan-500/20 transition-all duration-300 hover:scale-110 active:scale-95"
        aria-label="Previous feedback"
      >
        <ChevronLeft className="h-6 w-6 text-cyan-400" />
      </button>
      <button
        onClick={nextFeedbackSlide}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-12 h-12 neon-border rounded-full flex items-center justify-center bg-black/80 hover:bg-cyan-500/20 transition-all duration-300 hover:scale-110 active:scale-95"
        aria-label="Next feedback"
      >
        <ChevronRight className="h-6 w-6 text-cyan-400" />
      </button>

      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(-${currentFeedbackIndex * 100}%)`,
          }}
        >
          {Array.from({ length: totalFeedbackSlides }).map((_, slideIndex) => {
            const startIndex = slideIndex * feedbacksPerView;
            const slideFeedbacks = feedbacks.slice(startIndex, startIndex + feedbacksPerView);

            return (
              <div
                key={slideIndex}
                className="min-w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-2"
              >
                {slideFeedbacks.map((feedback, feedbackIndex) => (
                  <div
                    key={startIndex + feedbackIndex}
                    className="group futuristic-card p-8 rounded-3xl hover:scale-105 active:scale-100 transition-all duration-500 cyber-border overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/0 via-cyan-500/0 to-indigo-600/0 group-hover:from-indigo-600/10 group-hover:via-cyan-500/5 group-hover:to-indigo-600/10 transition-all duration-500"></div>

                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all duration-500"></div>

                    <div className="relative z-10">
                      <div className="flex items-center mb-4">
                        {[...Array(feedback.rating)].map((_, i) => (
                          <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>

                      <div className="mb-6">
                        <Quote className="h-8 w-8 text-cyan-400/50 mb-4" />
                        <p className="text-gray-300 leading-relaxed text-base italic">
                          "{feedback.text}"
                        </p>
                      </div>

                      <div className="border-t border-cyan-500/20 pt-4">
                        <h4 className="text-white font-bold text-lg mb-1">{feedback.name}</h4>
                        <p className="text-cyan-400 text-sm">{feedback.role}</p>
                        <p className="text-gray-400 text-sm">{feedback.company}</p>
                      </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                ))}
                {slideFeedbacks.length < feedbacksPerView &&
                  Array.from({ length: feedbacksPerView - slideFeedbacks.length }).map((_, emptyIndex) => (
                    <div key={`empty-${emptyIndex}`} className="hidden lg:block" />
                  ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-center items-center space-x-3 mt-12">
        {Array.from({ length: totalFeedbackSlides }).map((_, index) => (
          <button
            key={index}
            onClick={() => goToFeedbackSlide(index)}
            className={`transition-all duration-300 rounded-full ${
              index === currentFeedbackIndex
                ? 'w-12 h-3 bg-cyan-400 shadow-lg shadow-cyan-400/50'
                : 'w-3 h-3 bg-gray-600 hover:bg-cyan-500/50'
            }`}
            aria-label={`Go to feedback slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function AboutPage() {
  const navigate = useNavigate();
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Team members data - expand this with actual team member information
  const teamMembers = [
    {
      name: 'Team Member 1',
      nameMy: 'အဖွဲ့ဝင် ၁',
      role: 'Creative Director',
      roleMy: 'ဖန်တီးမှု ညွှန်ကြားရေးမှူး',
      description: 'Leading our creative vision and ensuring exceptional design quality.',
      descriptionMy: 'ကျွန်တော်တို့ရဲ့ ဖန်တီးမှု ရှုထောင့်ကို ဦးဆောင်ပြီး အရည်အသွေး မြင့်မားတဲ့ ဒီဇိုင်းများကို သေချာစေပါတယ်။',
    },
    {
      name: 'Team Member 2',
      nameMy: 'အဖွဲ့ဝင် ၂',
      role: 'Marketing Strategist',
      roleMy: 'မားကတ်တင်း ဗျူဟာရေးဆွဲသူ',
      description: 'Developing data-driven marketing strategies that deliver results.',
      descriptionMy: 'ဒေတာအခြေခံပြီး ရလဒ်ကောင်းများ ရရှိစေတဲ့ မားကတ်းတင်း ဗျူဟာများကို ရေးဆွဲပါတယ်။',
    },
    {
      name: 'Team Member 3',
      nameMy: 'အဖွဲ့ဝင် ၃',
      role: 'Content Specialist',
      roleMy: 'အကြောင်းအရာ ကျွမ်းကျင်သူ',
      description: 'Creating engaging content that resonates with target audiences.',
      descriptionMy: 'ပရိသတ်များနဲ့ ဆက်သွယ်နိုင်တဲ့ စွဲမက်ဖွယ် အကြောင်းအရာများကို ဖန်တီးပါတယ်။',
    },
    {
      name: 'Team Member 4',
      nameMy: 'အဖွဲ့ဝင် ၄',
      role: 'Social Media Manager',
      roleMy: 'လူမှုမီဒီယာ စီမံခန့်ခွဲသူ',
      description: 'Managing social media presence and engaging with our community.',
      descriptionMy: 'လူမှုမီဒီယာ ရှေ့ဆောင်မှုကို စီမံခန့်ခွဲပြီး ကျွန်တော်တို့ရဲ့ အသိုင်းအဝိုင်းနဲ့ ဆက်သွယ်ပါတယ်။',
    },
    {
      name: 'Team Member 5',
      nameMy: 'အဖွဲ့ဝင် ၅',
      role: 'Graphic Designer',
      roleMy: 'ဂရပ်ဖစ် ဒီဇိုင်းနာ',
      description: 'Designing visually stunning graphics that capture brand essence.',
      descriptionMy: 'အမှတ်တံဆိပ်၏ အနှစ်သာရကို ဖမ်းယူသော မျက်စိကျွမ်းကျင်သော ဂရပ်ဖစ်များကို ဒီဇိုင်းဆွဲပါတယ်။',
    },
    {
      name: 'Team Member 6',
      nameMy: 'အဖွဲ့ဝင် ၆',
      role: 'Video Producer',
      roleMy: 'ဗီဒီယို ထုတ်လုပ်သူ',
      description: 'Producing high-quality video content that tells compelling stories.',
      descriptionMy: 'စွဲမက်ဖွယ် ဇာတ်လမ်းများကို ပြောပြသော အရည်အသွေး မြင့်မားသော ဗီဒီယို အကြောင်းအရာများကို ထုတ်လုပ်ပါတယ်။',
    },
    {
      name: 'Team Member 7',
      nameMy: 'အဖွဲ့ဝင် ၇',
      role: 'Account Manager',
      roleMy: 'အကောင့် စီမံခန့်ခွဲသူ',
      description: 'Building strong client relationships and ensuring satisfaction.',
      descriptionMy: 'ခိုင်မာသော ဖောက်သည်ဆက်ဆံရေးကို တည်ဆောက်ပြီး ကျေနပ်မှုကို သေချာစေပါတယ်။',
    },
    {
      name: 'Team Member 8',
      nameMy: 'အဖွဲ့ဝင် ၈',
      role: 'SEO Specialist',
      roleMy: 'SEO ကျွမ်းကျင်သူ',
      description: 'Optimizing online presence to maximize visibility and reach.',
      descriptionMy: 'မြင်သာမှုနှင့် ရောက်ရှိမှုကို အမြင့်ဆုံးဖြစ်စေရန် အွန်လိုင်း ရှေ့ဆောင်မှုကို အကောင်းဆုံးဖြစ်အောင် လုပ်ဆောင်ပါတယ်။',
    },
    {
      name: 'Team Member 9',
      nameMy: 'အဖွဲ့ဝင် ၉',
      role: 'Data Analyst',
      roleMy: 'ဒေတာ ခွဲခြမ်းစိတ်ဖြာသူ',
      description: 'Analyzing performance metrics to drive data-informed decisions.',
      descriptionMy: 'ဒေတာအခြေခံ ဆုံးဖြတ်ချက်များကို မောင်းနှင်ရန် စွမ်းဆောင်ရည် ကိန်းဂဏန်းများကို ခွဲခြမ်းစိတ်ဖြာပါတယ်။',
    },
    {
      name: 'Team Member 10',
      nameMy: 'အဖွဲ့ဝင် ၁၀',
      role: 'Project Coordinator',
      roleMy: 'စီမံကိန်း ညှိနှိုင်းသူ',
      description: 'Coordinating projects to ensure timely delivery and quality.',
      descriptionMy: 'အချိန်မီ ပေးပို့မှုနှင့် အရည်အသွေးကို သေချာစေရန် စီမံကိန်းများကို ညှိနှိုင်းပါတယ်။',
    },
    {
      name: 'Team Member 11',
      nameMy: 'အဖွဲ့ဝင် ၁၁',
      role: 'Copywriter',
      roleMy: 'စာရေးဆရာ',
      description: 'Crafting compelling copy that engages and converts audiences.',
      descriptionMy: 'ပရိသတ်များကို စွဲမက်စေပြီး ပြောင်းလဲစေသော စွဲမက်ဖွယ် စာသားများကို ရေးသားပါတယ်။',
    },
    {
      name: 'Team Member 12',
      nameMy: 'အဖွဲ့ဝင် ၁၂',
      role: 'Client Success Manager',
      roleMy: 'ဖောက်သည် အောင်မြင်မှု စီမံခန့်ခွဲသူ',
      description: 'Ensuring client success and fostering long-term partnerships.',
      descriptionMy: 'ဖောက်သည်အောင်မြင်မှုကို သေချာစေပြီး ရေရှည် မိတ်ဖက်များကို အားပေးပါတယ်။',
    },
  ];

  const membersPerView = 3; // Show 3 members at a time on desktop
  const totalSlides = Math.ceil(teamMembers.length / membersPerView);

  // Auto-rotate carousel
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentTeamIndex((prev) => (prev + 1) % totalSlides);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying, totalSlides]);

  const goToSlide = (index: number) => {
    setCurrentTeamIndex(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const nextSlide = () => {
    goToSlide((currentTeamIndex + 1) % totalSlides);
  };

  const prevSlide = () => {
    goToSlide((currentTeamIndex - 1 + totalSlides) % totalSlides);
  };

  const getVisibleMembers = () => {
    const start = currentTeamIndex * membersPerView;
    return teamMembers.slice(start, start + membersPerView);
  };

  const missionPillars = [
    {
      icon: Target,
      title: 'Client Success',
      titleMy: 'Client Success',
      description: 'To support every client\'s business growth by providing the right digital marketing strategies and helping them achieve long-term success.',
      descriptionMy: 'Client တွေအတွက်လိုအပ်တဲ့ ဒစ်ဂျစ်တယ်မားကတ်တင်း Strategies တွေနဲ့ Client တိုင်းရဲ့ လုပ်ငန်းကို အောင်မြင်အောင် ကူညီဖို့။',
    },
    {
      icon: Rocket,
      title: 'Innovation',
      titleMy: 'Innovation',
      description: 'To deliver effective marketing solutions by embracing new trends, creative approaches, and emerging technologies within the digital marketing industry.',
      descriptionMy: 'Marketing ဈေးကွက်ရဲ့ အသစ်အသစ်သော၊ Trends တွေ၊ တိုးတက်နေတဲ့နည်းပညာတွေကို အသုံးပြုပြီး ထိရောက်တဲ့ မားကတ်တင်း Strategies တွေ ချပြနိုင်ဖို့။',
    },
    {
      icon: TrendingUp,
      title: 'Results Orientation',
      titleMy: 'Results Orientation',
      description: 'To produce the best possible outcomes by relying on data-driven decisions and maximizing ROI for every campaign we manage.',
      descriptionMy: 'ဒေတာအချက်အလက်တွေကို အခြေခံပြီး အကောင်ဆုံး Result တွေနဲ့ ROI ရအောင်ကြိုးစားဖို့။',
    },
    {
      icon: CheckCircle,
      title: 'Ethics and Values',
      titleMy: 'Ethics and Values',
      description: 'To operate with honesty, transparency, and strong professional ethics—ensuring that we remain a trustworthy and reliable agency for all our clients.',
      descriptionMy: 'ရိုးသားမှု၊ ပွင့်လင်းမြင်သာမှုနဲ့ ကျင့်ဝတ်ပြည့်ပြီး ယုံကြည်စိတ်ချရတဲ့ လုပ်ငန်းလည်ပတ်မှုတွေနဲ့ သင့်ကို ယုံကြည်စိတ်ချရတဲ့ Agency တစ်ခုဖြစ်လာဖို့ပဲဖြစ်ပါတယ်။',
    },
  ];

  const aboutSchema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    url: `${BASE_URL}/about`,
    mainEntity: {
      '@type': 'Organization',
      name: 'Marketing Capsule',
      description:
        'Marketing Capsule is a Social Media Marketing Agency providing Boosting Services, Content Calendar & Content Writing, Graphic Design, and Video Production Services.',
      url: BASE_URL,
      foundingDate: '2019',
      areaServed: 'Worldwide',
    },
  };

  return (
    <>
      <Seo
        title="About Us | Marketing Capsule - Leading Digital Marketing Agency Myanmar Since 2019"
        description="Discover Marketing Capsule's mission, vision, and journey as a Social Media Marketing Agency since 2019. Learn about our team, values, and commitment to client success."
        canonical={`${BASE_URL}/about`}
        keywords="about Marketing Capsule, Myanmar marketing agency, digital marketing company, social media agency Myanmar, marketing team, company history"
        jsonLd={aboutSchema}
      />
      <div className="pt-20 bg-black">
        {/* Hero Section */}
        <section className="relative py-24 overflow-hidden">
          <div className="absolute inset-0 tech-grid opacity-20"></div>
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-indigo-600/20 to-transparent rounded-full blur-3xl animate-float"></div>
            <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center space-x-2 px-6 py-3 glass-effect neon-border rounded-full mb-10 animate-slide-down scan-line">
              <Target className="h-4 w-4 text-cyan-400 animate-pulse" />
              <span className="text-sm font-bold text-cyan-400 tracking-wider uppercase">
                About Marketing Capsule
              </span>
            </div>

            <h1 className="text-6xl sm:text-7xl font-bold mb-6 animate-slide-up tracking-tight">
              <span className="gradient-text glow-text">About Marketing Capsule</span>
            </h1>
          </div>
        </section>

        {/* About Marketing Capsule Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black relative">
          <div className="absolute inset-0 tech-grid opacity-5"></div>
          <div className="max-w-7xl mx-auto relative">
            <div className="futuristic-card p-10 rounded-3xl cyber-border space-y-6">
              <h2 className="text-4xl font-bold text-white mb-6 leading-[1.8] pb-4 pt-2">
                <span className="gradient-text block">❝ သင့်အတွက် - Marketing Capsule ❞</span>
              </h2>
              
              <div className="space-y-4 text-gray-300">
                <p className="text-lg leading-[2.3] pb-6 pt-2">
                  ❝ သင့်အတွက် - <span className="text-cyan-400 font-semibold">𝗠𝗮𝗿𝗸𝗲𝘁𝗶𝗻𝗴 𝗖𝗮𝗽𝘀𝘂𝗹𝗲</span> ❞ ဟာဆိုရင် အွန်လိုင်းလုပ်ငန်းတိုင်းအတွက် လိုအပ်တဲ့ Social Media Platform များစွာအတွက် Boosting Service, Content Calendar & Content Writing Service, Graphic Design Service များနဲ့ Video Production Service များကို Client စိတ်တိုင်းကျ ဝန်ဆောင်မှုပေးနေလျက်ရှိတဲ့ Social Media Marketing Agency တစ်ခုဖြစ်ပါတယ်။
                </p>
                
                <p className="text-lg">
                  At ❝ <span className="text-cyan-400 font-semibold">For you - Marketing Capsule</span> ❞, we are a Social Media Marketing Agency dedicated to providing all the essential services your online business needs. We offer a wide range of solutions, including Boosting Services, Content Calendar & Content Writing, Graphic Design, and Video Production Services for multiple social media platforms—all tailored to meet each client's unique preferences and goals.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Vision Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black relative">
          <div className="absolute inset-0 tech-grid opacity-5"></div>
          <div className="max-w-7xl mx-auto relative">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 px-6 py-3 glass-effect neon-border rounded-full mb-6 animate-slide-down">
                <Eye className="h-4 w-4 text-cyan-400 animate-pulse" />
                <span className="text-sm font-bold text-cyan-400 tracking-wider uppercase">
                  Our Vision
                </span>
              </div>
              <h2 className="text-5xl font-bold mb-6 tracking-tight">
                <span className="gradient-text">Our Vision</span>
              </h2>
            </div>

            <div className="futuristic-card p-10 rounded-3xl cyber-border space-y-6">
              <div className="space-y-4 text-gray-300">
                <p className="text-lg leading-[2.3] pb-6 pt-2">
                  ❝ သင့်အတွက် - <span className="text-cyan-400 font-semibold">𝗠𝗮𝗿𝗸𝗲𝘁𝗶𝗻𝗴 𝗖𝗮𝗽𝘀𝘂𝗹𝗲</span> ❞ ရဲ့ Vision ဟာဆိုရင်တော့ Client တိုင်းရဲ့ လုပ်ငန်းမှန်သမျှအတွက် ဒစ်ဂျစ်တယ် မားကတ်တင်း ဝန်ဆောင်မှုများကို အကောင်းဆုံးပေးနိုင်ဖို့ ရည်ရွယ်ထားပါတယ်။ Social Media Marketing Service များကို တစ်နေရာတည်းမှာ One-Stop Service ယူနိုင်မယ့်အပြင် Client-Focused Marketing Agency အဖြစ်လည်း ရည်ရွယ်ပါတယ်။
                </p>
                
                <p className="text-lg">
                  Our vision is to provide the best digital marketing services for every client's business. We aim to become a One-Stop Social Media Marketing Service, where all essential social media services can be accessed in one place. At the same time, we strive to be a truly Client-Focused Marketing Agency, delivering personalized strategies and results that align perfectly with each client's goals.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Mission Statement Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black relative">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black"></div>
          <div className="max-w-7xl mx-auto relative">
            <div className="text-center mb-20">
              <div className="inline-flex items-center space-x-2 px-6 py-3 glass-effect neon-border rounded-full mb-6 animate-slide-down">
                <Rocket className="h-4 w-4 text-cyan-400 animate-pulse" />
                <span className="text-sm font-bold text-cyan-400 tracking-wider uppercase">
                  Mission Statement
                </span>
              </div>
              <h2 className="text-5xl font-bold mb-6 tracking-tight">
                <span className="gradient-text">Mission Statement</span>
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                Marketing Capsule ရဲ့ Mission က အဓိက ၄ ခု အနေနဲ့ပါဝင်ပါတယ်။
              </p>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed mt-2">
                The mission of Marketing Capsule is built on four core pillars:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {missionPillars.map((pillar, index) => (
                <div
                  key={index}
                  className="group futuristic-card p-8 rounded-3xl hover:scale-105 active:scale-100 transition-all duration-500 cyber-border"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/0 via-cyan-500/0 to-indigo-600/0 group-hover:from-indigo-600/10 group-hover:via-cyan-500/5 group-hover:to-indigo-600/10 transition-all duration-500 rounded-3xl"></div>

                  <div className="relative">
                    <div className="w-16 h-16 neon-border rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 animate-glow">
                      <pillar.icon className="h-8 w-8 text-cyan-400" />
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-cyan-400 transition-colors">
                      {pillar.title}
                    </h3>

                    <p className="text-gray-400 leading-[1.9] mb-4 pb-1 group-hover:text-gray-300 transition-colors">
                      {pillar.descriptionMy}
                    </p>
                    
                    <p className="text-gray-300 leading-relaxed text-sm group-hover:text-gray-200 transition-colors">
                      {pillar.description}
                    </p>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Journey Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black relative">
          <div className="absolute inset-0 tech-grid opacity-10"></div>
          <div className="max-w-7xl mx-auto relative">
            <div className="text-center mb-20">
              <div className="inline-flex items-center space-x-2 px-6 py-3 glass-effect neon-border rounded-full mb-6 animate-slide-down">
                <Calendar className="h-4 w-4 text-cyan-400 animate-pulse" />
                <span className="text-sm font-bold text-cyan-400 tracking-wider uppercase">
                  Our Journey
                </span>
              </div>
              <h2 className="text-5xl font-bold mb-6 tracking-tight">
                <span className="gradient-text">Journey (2019-2025)</span>
              </h2>
            </div>

            <div className="futuristic-card p-10 rounded-3xl cyber-border space-y-6">
              <div className="space-y-4 text-gray-300">
                <p className="text-lg leading-[2.3] pb-6 pt-2">
                  ❝ သင့်အတွက် - <span className="text-cyan-400 font-semibold">𝗠𝗮𝗿𝗸𝗲𝘁𝗶𝗻𝗴 𝗖𝗮𝗽𝘀𝘂𝗹𝗲</span> ❞ ဟာ ၂၀၁၉ ခုနှစ်မှာ စတင်ပြီး Meticulous Creations အမည်နဲ့ ဝန်ဆောင်မှုများ စတင်ခဲ့ပါတယ်။ ၂၀၁၉ ခုနှစ်ကနေ ယခု၂၀၂၅ ခုနှစ်အထိ Social Media Agency အဖြစ်ဝန်ဆောင်မှုများပေးလာခဲ့တာ သက်တမ်း ၆ နှစ်တိတိရှိခဲ့ပြီး ၂၀၂၃ ခုနှစ်မှာမှ Marketing Capsule အမည်ကို ပြောင်းလဲခဲ့ပါတယ်။ ပြီးခဲ့တဲ့နှစ်တွေအတွင်းမှာ ကျွန်တော်တို့အနေနဲ့ နယ်ပယ်အစုံမှ လုပ်ငန်းအစုံအလင်နဲ့ လက်တွဲခဲ့ပြီး လုပ်ငန်းပေါင်း ၂၀၀၀ ကျော်အတွက် Digital Marketing ပိုင်းမှာ ဝန်ဆောင်မှုများပေးခဲ့ကာ အခုဆိုရင် ထိုင်းနိုင်ငံအထိ လုပ်ငန်းတိုးချဲ့ထားလျက်ရှိပါတယ်။
                </p>
                
                <p className="text-lg">
                  We ❝ <span className="text-cyan-400 font-semibold">For you - Marketing Capsule</span> ❞ began our journey in 2019 and at first, we started the name with Meticulous Creations. For the past six years, from 2019 to 2025, we have been providing services as a Social Media Agency. In 2023, we rebranded to Marketing Capsule to better represent our vision and approach. In the past years, we have worked with a variety of businesses from various fields and provided digital marketing services to more than 2,000 businesses, and now we have expanded our business to Thailand.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Future Plans Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black relative">
          <div className="absolute inset-0 tech-grid opacity-5"></div>
          <div className="max-w-7xl mx-auto relative">
            <div className="text-center mb-20">
              <div className="inline-flex items-center space-x-2 px-6 py-3 glass-effect neon-border rounded-full mb-6 animate-slide-down">
                <TrendingUp className="h-4 w-4 text-cyan-400 animate-pulse" />
                <span className="text-sm font-bold text-cyan-400 tracking-wider uppercase">
                  Future Plans
                </span>
              </div>
              <h2 className="text-5xl font-bold mb-6 tracking-tight">
                <span className="gradient-text">Looking Ahead (2025-2030)</span>
              </h2>
            </div>

            <div className="space-y-8">
              <div className="futuristic-card p-8 rounded-3xl cyber-border">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 neon-border rounded-xl flex items-center justify-center bg-cyan-500/10">
                    <span className="text-2xl font-bold text-cyan-400">2025</span>
                  </div>
                  <div className="flex-grow space-y-3">
                    <h3 className="text-2xl font-bold text-white">2025</h3>
                    <p className="text-gray-300 leading-relaxed">
                      ယခု ၂၀၂၅ ခုနှစ်ဟာဆိုရင် ကုမ္ပဏီကိုပိုတိုးချဲ့ခဲ့ပြီး ဝန်ထမ်းအသစ်များခန့်အပ်ခြင်း၊ Employee Handbook များရေးဆွဲကာ စနစ်တကျစီစဉ်ခြင်းနှင့် Tik Tok Channel များအထိပါထပ်မံတိုးချဲ့ခဲ့တဲ့ကာလဖြစ်သလို
                    </p>
                    <p className="text-gray-300 leading-relaxed">
                      In 2025, Marketing Capsule expanded further by hiring new team members, developing a complete Employee Handbook, establishing structured internal systems, and extending our services to include TikTok channel management.
                    </p>
                  </div>
                </div>
              </div>

              <div className="futuristic-card p-8 rounded-3xl cyber-border">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 neon-border rounded-xl flex items-center justify-center bg-cyan-500/10">
                    <span className="text-2xl font-bold text-cyan-400">2027</span>
                  </div>
                  <div className="flex-grow space-y-3">
                    <h3 className="text-2xl font-bold text-white">2027</h3>
                    <p className="text-gray-300 leading-relaxed">
                     ၂၀၂၇ ခုနှစ်မှာဆိုရင် Client Database စနစ်တကျတည်ဆောက်ပြီး Marketing Capsule Website နှင့် Application များကိုပါ စီစဉ်ပေးသွားဖို့ ရည်ရွယ်ထားပြီး
                    </p>
                    <p className="text-gray-300 leading-relaxed">
                      By 2027, we aim to build a fully organized Client Database System and launch both the Marketing Capsule Website and Mobile Application.
                    </p>
                  </div>
                </div>
              </div>

              <div className="futuristic-card p-8 rounded-3xl cyber-border">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 neon-border rounded-xl flex items-center justify-center bg-cyan-500/10">
                    <span className="text-2xl font-bold text-cyan-400">2030</span>
                  </div>
                  <div className="flex-grow space-y-3">
                    <h3 className="text-2xl font-bold text-white">2030</h3>
                    <p className="text-gray-300 leading-relaxed">
                     ၂၀၃၀ မှာဆိုရင်တော့ Google Ads, Youtube Ads, Website Ads များနှင့် UI/ UX Service များအထိပါ ပေးသွားဖို့အတွက် ရည်ရွယ်ဆောင်ရွက်နေလျက်ရှိပါတယ်။
                    </p>
                    <p className="text-gray-300 leading-relaxed">
                      Looking ahead to 2030, our goal is to provide a broader range of services—including Google Ads, YouTube Ads, Website Advertising, as well as UI/UX Design Services—as part of our long-term growth and development plan.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Founder Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black relative">
          <div className="absolute inset-0 tech-grid opacity-5"></div>
          <div className="max-w-7xl mx-auto relative">
            <div className="text-center mb-20">
              <div className="inline-flex items-center space-x-2 px-6 py-3 glass-effect neon-border rounded-full mb-6 animate-slide-down">
                <User className="h-4 w-4 text-cyan-400 animate-pulse" />
                <span className="text-sm font-bold text-cyan-400 tracking-wider uppercase">
                  Our Founder
                </span>
              </div>
              <h2 className="text-5xl font-bold mb-6 tracking-tight leading-[1.8] pb-6 pt-3">
                <span className="gradient-text block">လုပ်ငန်းတည်ထောင်ခဲ့သူ</span>
              </h2>
              <h2 className="text-5xl font-bold mb-6 tracking-tight">
                <span className="gradient-text">Our Founder</span>
              </h2>
            </div>

            <div className="futuristic-card p-10 rounded-3xl cyber-border">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-3xl font-bold text-white mb-2 leading-[1.8] pb-3 pt-2">
                      <span className="gradient-text block">ခန့်ကိုကိုထက်</span>
                    </h3>
                    <h3 className="text-3xl font-bold text-white mb-4">
                      <span className="gradient-text">KHANT KO KO HTET</span>
                    </h3>
                    <p className="text-xl font-semibold text-cyan-400 mb-6">
                      CHIEF EXECUTIVE OFFICER
                    </p>
                  </div>

                  <div className="space-y-4 text-gray-300">
                    <p className="text-lg leading-[2.3] pb-6 pt-2">
                      Marketing Capsule ကို စတင်တည်ထောင်ခဲ့သူဖြစ်တဲ့ ကိုခန့်ကိုကိုထက်သည် (၂၀၁၉) ခုနှစ်မှာ Digital Marketing ကို ကိုယ်တိုင် Self Study လုပ်ပြီးစတင်ခဲ့ပါတယ်။ အခုဆိုရင် Digital Marketing လုပ်ခဲ့တဲ့ သက်တမ်းအတွေ့အကြုံပေါင်း (၆) နှစ်ကျော်ရှိခဲ့ပြီဖြစ်ပြီး လုပ်ငန်းပေါင်း (၄၅၀၀) ကျော်ကို Service ပေးခဲ့ပါတယ်။ လုပ်ငန်းတည်ထောင်ခဲ့ခြင်းရဲ့ ရည်ရွယ်ချက်ကတော့ Online Digital Marketing လုပ်လျက်ရှိတဲ့ လုပ်ငန်းရှင်တွေရဲ့ အခက်အခဲနဲ့ပြဿနာများကို ကူညီဖြေရှင်းပေးနိုင်ရန်အတွက် Marketing Capsule ကို စတင်ခဲ့တာပဲဖြစ်ပါတယ်။
                    </p>
                    
                    <p className="text-lg leading-relaxed">
                      Mr. Khant Ko Ko Htet, the founder of Marketing Capsule, began his Digital Marketing career in 2019 through dedicated self-study and now he brings over six years of industry experience and has successfully provided digital marketing services to more than 4,500 businesses. Marketing Capsule was established with the objective of supporting business owners in the online digital marketing space by helping them overcome their challenges and providing effective, results-driven solutions.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="relative futuristic-card rounded-4xl overflow-hidden transform hover:scale-105 transition-all duration-500 cyber-border">
                    <div className="aspect-square bg-gradient-to-br from-indigo-600 via-indigo-700 to-cyan-600 p-16 flex items-center justify-center">
                      <div className="text-center text-white space-y-6">
                        <div className="w-32 h-32 mx-auto neon-border rounded-full flex items-center justify-center bg-cyan-500/20 animate-glow">
                          <User className="h-20 w-20 text-cyan-400" />
                        </div>
                        <h3 className="text-3xl font-bold">Founder & CEO</h3>
                        <p className="text-lg text-indigo-50 leading-relaxed">
                          6+ Years Experience
                        </p>
                        <p className="text-lg text-indigo-50 leading-relaxed">
                          4,500+ Businesses Served
                        </p>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
                  </div>
                  <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-cyan-500/30 rounded-full blur-3xl animate-pulse"></div>
                  <div className="absolute -top-8 -left-8 w-40 h-40 bg-indigo-600/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Meet Our Team Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black relative">
          <div className="absolute inset-0 tech-grid opacity-5"></div>
          <div className="max-w-7xl mx-auto relative">
            <div className="text-center mb-20">
              <div className="inline-flex items-center space-x-2 px-6 py-3 glass-effect neon-border rounded-full mb-6 animate-slide-down">
                <User className="h-4 w-4 text-cyan-400 animate-pulse" />
                <span className="text-sm font-bold text-cyan-400 tracking-wider uppercase">
                  Our Team
                </span>
              </div>
              <h2 className="text-5xl font-bold mb-6 tracking-tight leading-[1.8] pb-6 pt-3">
                <span className="gradient-text block">ကျွန်တော်တို့ရဲ့ အဖွဲ့ဝင်များ</span>
              </h2>
              <h2 className="text-5xl font-bold mb-6 tracking-tight">
                <span className="gradient-text">Meet Our Team Members</span>
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed mt-4">
                The talented individuals who make Marketing Capsule's success possible
              </p>
            </div>

            {/* Carousel Container */}
            <div className="relative">
              {/* Navigation Arrows */}
              <button
                onClick={prevSlide}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-12 h-12 neon-border rounded-full flex items-center justify-center bg-black/80 hover:bg-cyan-500/20 transition-all duration-300 hover:scale-110 active:scale-95"
                aria-label="Previous team members"
              >
                <ChevronLeft className="h-6 w-6 text-cyan-400" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-12 h-12 neon-border rounded-full flex items-center justify-center bg-black/80 hover:bg-cyan-500/20 transition-all duration-300 hover:scale-110 active:scale-95"
                aria-label="Next team members"
              >
                <ChevronRight className="h-6 w-6 text-cyan-400" />
              </button>

              {/* Carousel Slides */}
              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{
                    transform: `translateX(-${currentTeamIndex * 100}%)`,
                  }}
                >
                  {Array.from({ length: totalSlides }).map((_, slideIndex) => {
                    const startIndex = slideIndex * membersPerView;
                    const slideMembers = teamMembers.slice(startIndex, startIndex + membersPerView);
                    
                    return (
                      <div
                        key={slideIndex}
                        className="min-w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-2"
                      >
                        {slideMembers.map((member, memberIndex) => (
                          <div
                            key={startIndex + memberIndex}
                            className="group futuristic-card p-8 rounded-3xl hover:scale-105 active:scale-100 transition-all duration-500 cyber-border text-center"
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/0 via-cyan-500/0 to-indigo-600/0 group-hover:from-indigo-600/10 group-hover:via-cyan-500/5 group-hover:to-indigo-600/10 transition-all duration-500 rounded-3xl"></div>

                            <div className="relative">
                              <div className="w-24 h-24 mx-auto mb-6 neon-border rounded-full flex items-center justify-center bg-cyan-500/10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 animate-glow">
                                <User className="h-12 w-12 text-cyan-400" />
                              </div>

                              <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                                {member.nameMy}
                              </h3>
                              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                                {member.name}
                              </h3>
                              <p className="text-cyan-400 font-semibold mb-4">
                                {member.roleMy} / {member.role}
                              </p>
                              <p className="text-gray-400 leading-relaxed text-sm group-hover:text-gray-300 transition-colors mb-2">
                                {member.descriptionMy}
                              </p>
                              <p className="text-gray-300 leading-relaxed text-sm group-hover:text-gray-200 transition-colors">
                                {member.description}
                              </p>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                          </div>
                        ))}
                        {/* Fill empty slots if needed */}
                        {slideMembers.length < membersPerView &&
                          Array.from({ length: membersPerView - slideMembers.length }).map((_, emptyIndex) => (
                            <div key={`empty-${emptyIndex}`} className="hidden lg:block" />
                          ))}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Carousel Indicators */}
              <div className="flex justify-center items-center space-x-3 mt-12">
                {Array.from({ length: totalSlides }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`transition-all duration-300 rounded-full ${
                      index === currentTeamIndex
                        ? 'w-12 h-3 bg-cyan-400 shadow-lg shadow-cyan-400/50'
                        : 'w-3 h-3 bg-gray-600 hover:bg-cyan-500/50'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>

              {/* Team Member Counter */}
              <div className="text-center mt-6 text-gray-400 text-sm">
                Showing {currentTeamIndex * membersPerView + 1}-{Math.min((currentTeamIndex + 1) * membersPerView, teamMembers.length)} of {teamMembers.length} team members
              </div>
            </div>
          </div>
        </section>

        {/* Our Feedback and Review Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black relative">
          <div className="absolute inset-0 tech-grid opacity-5"></div>
          <div className="max-w-7xl mx-auto relative">
            <div className="text-center mb-20">
              <div className="inline-flex items-center space-x-2 px-6 py-3 glass-effect neon-border rounded-full mb-6 animate-slide-down">
                <Star className="h-4 w-4 text-cyan-400 animate-pulse" />
                <span className="text-sm font-bold text-cyan-400 tracking-wider uppercase">
                  Client Feedback
                </span>
              </div>
              <h2 className="text-5xl font-bold mb-6 tracking-tight">
                <span className="gradient-text">Our Feedback and Review</span>
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                What our clients say about working with Marketing Capsule
              </p>
            </div>

            <FeedbackCarousel />
          </div>
        </section>

        {/* Our Achievement Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black relative">
          <div className="absolute inset-0 tech-grid opacity-5"></div>
          <div className="max-w-7xl mx-auto relative">
            <div className="text-center mb-20">
              <div className="inline-flex items-center space-x-2 px-6 py-3 glass-effect neon-border rounded-full mb-6 animate-slide-down">
                <Award className="h-4 w-4 text-cyan-400 animate-pulse" />
                <span className="text-sm font-bold text-cyan-400 tracking-wider uppercase">
                  Our Achievements
                </span>
              </div>
              <h2 className="text-5xl font-bold mb-6 tracking-tight">
                <span className="gradient-text">Our Achievement</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Client Served', value: '4500+', icon: User },
                { label: 'Countries Served', value: '15+', icon: Globe },
                { label: 'Ad Campaign', value: '500000+', icon: Target },
                { label: 'Experiences', value: '6 Years+', icon: Award },
              ].map((achievement, index) => (
                <div
                  key={index}
                  className="group futuristic-card p-8 rounded-3xl hover:scale-105 active:scale-100 transition-all duration-500 cyber-border text-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/0 via-cyan-500/0 to-indigo-600/0 group-hover:from-indigo-600/10 group-hover:via-cyan-500/5 group-hover:to-indigo-600/10 transition-all duration-500 rounded-3xl"></div>

                  <div className="relative">
                    <div className="w-16 h-16 neon-border rounded-3xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 animate-glow">
                      <achievement.icon className="h-8 w-8 text-cyan-400" />
                    </div>

                    <div className="text-5xl sm:text-6xl font-bold gradient-text glow-text mb-4 group-hover:scale-110 transition-transform inline-block">
                      {achievement.value}
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                      {achievement.label}
                    </h3>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-40 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-black to-cyan-900/20"></div>
          <div className="absolute inset-0 tech-grid opacity-20"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>

          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <TrendingUp className="h-20 w-20 mx-auto mb-8 text-cyan-400 animate-bounce-subtle" />
            <h2 className="text-5xl sm:text-7xl font-bold mb-8 text-white tracking-tight glow-text">Ready to Grow Together?</h2>
            <p className="text-xl mb-14 text-gray-300 leading-relaxed max-w-3xl mx-auto">
              Partner with us to unlock your brand's <span className="text-cyan-400 font-semibold">full potential</span> and achieve extraordinary results
            </p>
            <button
              onClick={() => {
                window.location.hash = '#/login';
              }}
              className="px-14 py-6 neon-border rounded-2xl font-bold text-xl text-white hover:scale-110 active:scale-95 transition-all duration-300 animate-glow-intense"
            >
              Get Started
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
