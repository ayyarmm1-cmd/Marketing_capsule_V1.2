export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-indigo': '#4F46E5',
        'brand-cyan': '#06B6D4',
        'neon-blue': '#00D9FF',
        'neon-purple': '#B24BF3',
        'neon-pink': '#FF006E',
      },
      animation: {
        'float': 'float 8s ease-in-out infinite',
        'slide-up': 'slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slide-down 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'glow': 'glow 3s ease-in-out infinite alternate',
        'glow-intense': 'glow-intense 2s ease-in-out infinite alternate',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'scan': 'scan 4s linear infinite',
        'rotate-slow': 'rotate-slow 20s linear infinite',
        'grid-shift': 'grid-shift 20s linear infinite',
        'holographic': 'holographic 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '50%': { transform: 'translateY(-25px) scale(1.05)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(60px)', opacity: '0', filter: 'blur(10px)' },
          '100%': { transform: 'translateY(0)', opacity: '1', filter: 'blur(0)' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-60px)', opacity: '0', filter: 'blur(10px)' },
          '100%': { transform: 'translateY(0)', opacity: '1', filter: 'blur(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0', filter: 'blur(5px)' },
          '100%': { opacity: '1', filter: 'blur(0)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.85)', opacity: '0', filter: 'blur(10px)' },
          '100%': { transform: 'scale(1)', opacity: '1', filter: 'blur(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(79, 70, 229, 0.3), 0 0 40px rgba(79, 70, 229, 0.1)' },
          '100%': { boxShadow: '0 0 30px rgba(79, 70, 229, 0.5), 0 0 60px rgba(6, 182, 212, 0.3)' },
        },
        'glow-intense': {
          '0%': {
            boxShadow: '0 0 20px rgba(79, 70, 229, 0.6), 0 0 40px rgba(6, 182, 212, 0.4), 0 0 60px rgba(79, 70, 229, 0.2)',
            filter: 'brightness(1)',
          },
          '100%': {
            boxShadow: '0 0 40px rgba(79, 70, 229, 0.8), 0 0 80px rgba(6, 182, 212, 0.6), 0 0 120px rgba(79, 70, 229, 0.3)',
            filter: 'brightness(1.2)',
          },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'pulse-glow': {
          '0%, 100%': {
            opacity: '1',
            boxShadow: '0 0 20px rgba(79, 70, 229, 0.5)',
          },
          '50%': {
            opacity: '0.7',
            boxShadow: '0 0 40px rgba(6, 182, 212, 0.7)',
          },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'rotate-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'grid-shift': {
          '0%': { transform: 'translate(0, 0)' },
          '100%': { transform: 'translate(50px, 50px)' },
        },
        holographic: {
          '0%, 100%': {
            backgroundPosition: '0% 50%',
            filter: 'hue-rotate(0deg)',
          },
          '50%': {
            backgroundPosition: '100% 50%',
            filter: 'hue-rotate(20deg)',
          },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
};
