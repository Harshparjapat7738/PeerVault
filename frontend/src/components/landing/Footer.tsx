import React from 'react';
import { Lock } from 'lucide-react';
import { scrollToId } from '../../lib/url';
import { dashboardCtaHref, DashboardTab } from '../../lib/auth-nav';

const PRODUCT_LINKS = [
  { id: 'product', label: 'Product' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'security', label: 'Security' },
  { id: 'features', label: 'Features' },
];

// "Explore the App" — real dashboard tabs (see Header.tsx's navItems), routed through the same
// auth-aware helper every other protected CTA on this page uses: signed out -> sign up first,
// signed in -> straight to that tab.
const APP_LINKS: { tab: DashboardTab; label: string }[] = [
  { tab: 'devices', label: 'Device Management' },
  { tab: 'files', label: 'Storage' },
  { tab: 'transfers', label: 'Transfers' },
  { tab: 'sharing', label: 'Sharing' },
  { tab: 'security', label: 'Audit' },
];

/**
 * Only links that actually resolve somewhere in this app are included. There is no public GitHub
 * repository or hosted documentation site for this project, so those two links from the original
 * brief are deliberately omitted rather than pointed at an invented URL — see
 * `LANDING_PAGE_AUDIT.md` / `backend/CLAUDE.md` for that decision.
 */
export const Footer: React.FC = () => {
  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    scrollToId(id);
  };

  return (
    <footer className="bg-slate-950 border-t border-white/10 py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-8 w-8 bg-white text-slate-950 flex items-center justify-center rounded-md">
              <Lock className="w-4 h-4" aria-hidden="true" />
            </span>
            <div>
              <p className="font-serif font-bold text-white text-base">PeerVault<span className="text-cyan-400">.</span></p>
              <p className="text-[11px] font-mono uppercase tracking-widest text-slate-500">Personal Storage Mesh</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500 leading-relaxed max-w-[220px]">
            A personal, multi-device storage network you configure and control.
          </p>
        </div>

        <nav aria-label="Product">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-3">Product</p>
          <ul className="space-y-2 text-sm text-slate-400">
            {PRODUCT_LINKS.map((link) => (
              <li key={link.id}>
                <a href={`#${link.id}`} onClick={(e) => handleAnchorClick(e, link.id)} className="hover:text-white transition-colors">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Explore the app">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-3">Explore the App</p>
          <ul className="space-y-2 text-sm text-slate-400">
            {APP_LINKS.map((link) => (
              <li key={link.tab}>
                <a href={dashboardCtaHref(link.tab, { signupIfSignedOut: true })} className="hover:text-white transition-colors">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-3">Account</p>
          <div className="flex flex-col items-start gap-3">
            <a href="/login" className="text-sm text-slate-300 hover:text-white transition-colors">Login</a>
            <a
              href={dashboardCtaHref('devices', { signupIfSignedOut: true })}
              className="text-sm font-semibold text-slate-950 bg-white hover:bg-cyan-300 transition-colors px-4 py-2 rounded-md"
            >
              Get Started
            </a>
          </div>
        </div>
      </div>

      <p className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/5 text-[11px] text-slate-600 font-mono">
        PeerVault Storage Mesh — a personal, multi-device storage network you configure and control.
      </p>
    </footer>
  );
};
