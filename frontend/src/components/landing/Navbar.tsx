import React, { useEffect, useState } from 'react';
import { Lock, Menu, X } from 'lucide-react';
import { scrollToId } from '../../lib/url';
import { dashboardCtaHref } from '../../lib/auth-nav';

const NAV_LINKS = [
  { href: '#product', label: 'Product' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#why-storage-mesh', label: 'Why Storage Mesh' },
  { href: '#security', label: 'Security' },
  { href: '#features', label: 'Features' },
];

/**
 * Sticky/transparent nav for the public landing page. Plain scroll + click-handler behavior on
 * purpose — this is UI chrome, not one of the animations the brief asks GSAP for. Anchor links are
 * smooth-scrolled manually (rather than relying on CSS `scroll-behavior`) so reduced-motion visitors
 * still get an instant jump instead of a forced smooth scroll.
 */
export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // "Connect Your Devices" is this page's real device-pairing CTA — signed out, it's the sign-up
  // route; signed in (defensive: see lib/auth-nav.ts), it opens the real QR-pairing modal on the
  // devices tab, not just a generic dashboard landing.
  const connectDevicesHref = dashboardCtaHref('devices', { openPairing: true, signupIfSignedOut: true });

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileOpen(false);
    scrollToId(href.replace('#', ''));
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${
        scrolled ? 'bg-slate-950/80 backdrop-blur-md border-b border-white/10' : 'bg-transparent border-b border-transparent'
      }`}
    >
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between" aria-label="Landing page navigation">
        <a href="/" className="flex items-center gap-2.5 shrink-0" aria-label="PeerVault Storage Mesh home">
          <span className="h-8 w-8 bg-white text-slate-950 flex items-center justify-center rounded-md">
            <Lock className="w-4 h-4" aria-hidden="true" />
          </span>
          <span className="font-serif font-bold text-lg text-white tracking-tight">
            PeerVault<span className="text-cyan-400">.</span>
          </span>
          <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-widest text-slate-400 border border-white/15 rounded px-1.5 py-0.5">
            Storage Mesh
          </span>
        </a>

        <ul className="hidden lg:flex items-center gap-7">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={(e) => handleAnchorClick(e, link.href)}
                className="text-sm text-slate-300 hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 focus-visible:outline-offset-4 rounded-sm"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden lg:flex items-center gap-3">
          <a
            href="/login"
            className="text-sm text-slate-300 hover:text-white transition-colors px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 rounded-md"
          >
            Login
          </a>
          <a
            href={connectDevicesHref}
            className="text-sm font-semibold text-slate-950 bg-white hover:bg-cyan-300 transition-colors px-4 py-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 focus-visible:outline-offset-2"
          >
            Connect Your Devices
          </a>
        </div>

        <button
          type="button"
          className="lg:hidden p-2 text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 rounded-md"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          aria-controls="landing-mobile-menu"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {mobileOpen && (
        <div id="landing-mobile-menu" className="lg:hidden bg-slate-950/95 backdrop-blur-md border-b border-white/10 px-4 py-4">
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={(e) => handleAnchorClick(e, link.href)}
                  className="block py-2.5 text-sm text-slate-200 hover:text-white"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
            <a href="/login" className="text-center text-sm text-slate-200 py-2.5 border border-white/15 rounded-md">
              Login
            </a>
            <a
              href={connectDevicesHref}
              className="text-center text-sm font-semibold text-slate-950 bg-white py-2.5 rounded-md"
            >
              Connect Your Devices
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
