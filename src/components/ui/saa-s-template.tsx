'use client';

import React from 'react';
import Link from 'next/link';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  children: React.ReactNode;
  href?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'default', className = '', children, href, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
    const variants = {
      default: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
      secondary: 'bg-gray-900 text-white hover:bg-gray-800',
      ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
      outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
    };
    const sizes = {
      default: 'h-10 px-4 py-2 text-sm',
      sm: 'h-9 px-4 text-sm',
      lg: 'h-12 px-8 text-base',
    };
    const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;
    if (href) {
      return (
        <Link href={href} className={classes}>
          {children}
        </Link>
      );
    }
    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

const ArrowRight = ({ className = '', size = 16 }: { className?: string; size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

const Menu = ({ className = '', size = 24 }: { className?: string; size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </svg>
);

const X = ({ className = '', size = 24 }: { className?: string; size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

// SaasAble-style: light navbar, center links, Sign in + Dashboard
const Navigation = React.memo(() => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="fixed top-0 w-full z-50 border-b border-gray-200 bg-white/95 backdrop-blur-md">
      <nav className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold text-gray-900">
            Attendance Manager
          </Link>

          <div className="hidden md:flex items-center justify-center gap-8 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <a href="#getting-started" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Getting started
            </a>
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Features
            </a>
            <a href="#documentation" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Documentation
            </a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button type="button" variant="ghost" size="sm" href="/admin/dashboard">
              Sign in
            </Button>
            <Button type="button" variant="default" size="sm" href="/admin/dashboard">
              Dashboard
            </Button>
          </div>

          <button
            type="button"
            className="md:hidden text-gray-700 p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
          <div className="px-6 py-4 flex flex-col gap-1">
            <a href="#getting-started" className="text-sm text-gray-600 hover:text-gray-900 py-3 border-b border-gray-100" onClick={() => setMobileMenuOpen(false)}>
              Getting started
            </a>
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 py-3 border-b border-gray-100" onClick={() => setMobileMenuOpen(false)}>
              Features
            </a>
            <a href="#documentation" className="text-sm text-gray-600 hover:text-gray-900 py-3 border-b border-gray-100" onClick={() => setMobileMenuOpen(false)}>
              Documentation
            </a>
            <div className="flex flex-col gap-2 pt-4">
              <Button type="button" variant="outline" size="sm" href="/admin/dashboard">
                Sign in
              </Button>
              <Button type="button" variant="default" size="sm" href="/admin/dashboard">
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
});
Navigation.displayName = 'Navigation';

// SaasAble-style hero: overline, two-line headline, subtitle, tech badges, CTA
const Hero = React.memo(() => (
  <section id="getting-started" className="relative pt-24 pb-16 md:pt-32 md:pb-24 px-6">
    <style>{`
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `}</style>

    <div className="max-w-4xl mx-auto text-center">
      <p className="text-sm font-medium text-indigo-600 mb-4" style={{ animation: 'fadeIn 0.5s ease-out' }}>
        One platform, endless possibilities
      </p>
      <h1
        className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight mb-6 leading-tight"
        style={{ animation: 'fadeIn 0.5s ease-out 0.1s both' }}
      >
        Multipurpose attendance & notification system
      </h1>
      <p
        className="text-lg text-gray-600 max-w-2xl mx-auto mb-10"
        style={{ animation: 'fadeIn 0.5s ease-out 0.2s both' }}
      >
        Design attendance flows and powerful admin dashboards with ease. Biometric attendance, parent linking, and real WhatsApp notifications—built for schools and multi-campus setups.
      </p>

      <div
        className="flex flex-wrap items-center justify-center gap-3 mb-10 text-sm text-gray-500"
        style={{ animation: 'fadeIn 0.5s ease-out 0.25s both' }}
      >
        <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 font-medium">Multi-campus</span>
        <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 font-medium">WhatsApp</span>
        <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 font-medium">Real-time</span>
        <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 font-medium">Dashboard</span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4" style={{ animation: 'fadeIn 0.5s ease-out 0.3s both' }}>
        <Button variant="default" size="lg" href="/admin/dashboard" className="rounded-lg">
          Go to Dashboard
        </Button>
        <Button variant="outline" size="lg" href="/admin/dashboard" className="rounded-lg">
          Sign in
        </Button>
      </div>
    </div>

    <div className="max-w-5xl mx-auto mt-16 md:mt-24">
      <div className="relative rounded-xl border border-gray-200 bg-gray-50/50 overflow-hidden shadow-xl">
        <img
          src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80"
          alt="Dashboard preview"
          className="w-full h-auto max-h-[420px] object-cover"
          loading="lazy"
        />
      </div>
    </div>
  </section>
));
Hero.displayName = 'Hero';

// SaasAble-style: "Comprehensive ... Tailored to your Need" → 6 feature cards
const FEATURES = [
  {
    title: 'Multi-campus ready',
    description: 'Switch between Delhi, Mumbai, Bangalore—separate logs and stats per campus.',
  },
  {
    title: 'Real WhatsApp delivery',
    description: 'Send actual WhatsApp messages via Meta Cloud API. No simulation required.',
  },
  {
    title: 'Live status flow',
    description: 'See pending → sent → delivered in real time with auto-refresh every 2 seconds.',
  },
  {
    title: 'Simulate attendance',
    description: 'Demo mode: one-click random student and WhatsApp send for any campus.',
  },
  {
    title: 'Parent linking',
    description: 'Link students to parent contacts and send attendance notifications instantly.',
  },
  {
    title: 'Dashboard & reports',
    description: 'Total events, sent, delivered, failed—filtered by campus. Ready for live demos.',
  },
];

const Features = React.memo(() => (
  <section id="features" className="py-20 md:py-28 px-6 bg-gray-50/50">
    <div className="max-w-6xl mx-auto">
      <p className="text-sm font-medium text-indigo-600 text-center mb-2">
        Comprehensive system tailored to your need
      </p>
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-4">
        Everything you need for school attendance & notifications
      </h2>
      <p className="text-gray-600 text-center max-w-2xl mx-auto mb-16">
        One dashboard to manage attendance, parents, and WhatsApp notifications across multiple campuses.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {FEATURES.map((f, i) => (
          <div
            key={i}
            className="p-6 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
            <p className="text-sm text-gray-600">{f.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
));
Features.displayName = 'Features';

// SaasAble-style bottom CTA
const Cta = React.memo(() => (
  <section id="documentation" className="py-20 md:py-28 px-6">
    <div className="max-w-3xl mx-auto text-center">
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
        Ready to run your attendance system?
      </h2>
      <p className="text-gray-600 mb-8">
        Open the dashboard, pick a campus, and send a real WhatsApp in one click.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button variant="default" size="lg" href="/admin/dashboard" className="rounded-lg">
          Go to Dashboard
        </Button>
        <Button variant="outline" size="lg" href="/admin/dashboard" className="rounded-lg">
          Sign in
        </Button>
      </div>
    </div>
  </section>
));
Cta.displayName = 'Cta';

const Footer = React.memo(() => (
  <footer className="border-t border-gray-200 bg-white py-8 px-6">
    <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
      <Link href="/" className="text-sm font-semibold text-gray-900">
        Attendance Manager
      </Link>
      <div className="flex items-center gap-6 text-sm text-gray-500">
        <a href="#getting-started" className="hover:text-gray-900">Getting started</a>
        <a href="#features" className="hover:text-gray-900">Features</a>
        <a href="#documentation" className="hover:text-gray-900">Documentation</a>
        <Link href="/admin/dashboard" className="hover:text-gray-900">Dashboard</Link>
      </div>
    </div>
  </footer>
));
Footer.displayName = 'Footer';

export default function LandingComponent() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navigation />
      <Hero />
      <Features />
      <Cta />
      <Footer />
    </main>
  );
}
