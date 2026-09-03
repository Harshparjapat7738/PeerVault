/**
 * Shared primitives for the public landing page (`src/pages/LandingPage.tsx` and everything under
 * `src/components/landing/`). This page is intentionally a *separate* visual system from the
 * authenticated dashboard: the dashboard is the light "editorial" theme (see `index.css`,
 * `Header.tsx`), while every dashboard surface that actually visualizes the mesh/network
 * (`NetworkTopology.tsx`, `SecurityAndShield.tsx`) already uses a dark, slate/cyan, glowing-node
 * aesthetic — that existing dark visualization language is what the landing page builds on, just
 * applied to the whole page instead of one panel. Fonts are unchanged from the rest of the app
 * (Newsreader serif for display type, Plus Jakarta Sans body, JetBrains Mono for labels/stats) so
 * the landing page still reads as the same product once a visitor logs in.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/** True when the visitor's OS/browser asks for reduced motion. Re-read once per mount — this is a
 *  landing page, not a settings panel, so it doesn't need to react to the user flipping the OS
 *  setting while the page is already open. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

/**
 * Runs a GSAP setup function scoped to a container ref, wrapped in `gsap.context()` for automatic
 * cleanup (kills every tween/ScrollTrigger created inside `fn` on unmount — the cleanup pattern the
 * task brief asks for). `fn` receives the resolved container element and a `reduced` flag; every
 * landing section checks that flag itself and either skips motion or jumps straight to the end
 * state, per the reduced-motion requirement.
 */
export function useGsapScope<T extends HTMLElement = HTMLDivElement>(
  fn: (el: T, reduced: boolean) => void,
  deps: React.DependencyList = []
) {
  const ref = useRef<T | null>(null);
  const reduced = usePrefersReducedMotion();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => fn(el, reduced), el);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, ...deps]);

  return ref;
}

/** Section shell: consistent max-width/padding + an id for the navbar/footer/deep-link anchors.
 *  `scroll-mt-20` gives every anchored section room under the fixed, ~4rem-tall `Navbar` so a jump
 *  (from the navbar, a benefit card, or a direct `/#section-id` load) doesn't land with its heading
 *  hidden behind it. */
export const Section: React.FC<{
  id?: string;
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
}> = ({ id, className = '', children, ariaLabel }) => (
  <section id={id} aria-label={ariaLabel} className={`relative py-20 sm:py-28 px-4 sm:px-6 lg:px-8 scroll-mt-20 ${className}`}>
    <div className="max-w-6xl mx-auto">{children}</div>
  </section>
);

export const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-300/80 mb-4">
    <span className="w-6 h-px bg-cyan-400/60" aria-hidden="true" />
    {children}
  </div>
);

export const SectionHeading: React.FC<{
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: 'left' | 'center';
  as?: 'h2' | 'h3';
}> = ({ eyebrow, title, subtitle, align = 'center', as = 'h2' }) => {
  const Heading = as;
  return (
    <div className={`mb-14 ${align === 'center' ? 'text-center mx-auto max-w-2xl' : 'text-left max-w-2xl'}`}>
      {eyebrow && (align === 'center' ? (
        <div className="flex justify-center"><Eyebrow>{eyebrow}</Eyebrow></div>
      ) : (
        <Eyebrow>{eyebrow}</Eyebrow>
      ))}
      <Heading className="font-serif font-bold text-3xl sm:text-4xl text-white tracking-tight text-balance">
        {title}
      </Heading>
      {subtitle && <p className="mt-4 text-sm sm:text-base text-slate-400 leading-relaxed">{subtitle}</p>}
    </div>
  );
};

/** Restrained radial-gradient + dot-grid backdrop shared by every dark section, so the page doesn't
 *  redraw a bespoke background per component. Pure CSS — no animation cost. */
export const MeshBackdrop: React.FC<{ variant?: 'default' | 'strong' }> = ({ variant = 'default' }) => (
  <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: 'radial-gradient(rgba(148,163,184,0.14) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 90%)',
      }}
    />
    <div
      className={`absolute -top-40 left-1/2 -translate-x-1/2 w-[60rem] h-[30rem] rounded-full blur-3xl ${
        variant === 'strong' ? 'bg-cyan-500/10' : 'bg-cyan-500/5'
      }`}
    />
  </div>
);

/** Small pill used for device status chips ("ONLINE" / "OFFLINE") across the demo sections. */
export const StatusPill: React.FC<{ online: boolean; label?: string }> = ({ online, label }) => (
  <span
    className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 border ${
      online
        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
        : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
    }`}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
    {label ?? (online ? 'ONLINE' : 'OFFLINE')}
  </span>
);

/**
 * A `<div>` by default. Passing `onClick` renders a real `<button type="button">` instead (full
 * width/height, left-aligned text, a hover/focus treatment) rather than making a plain `<div>`
 * clickable — every landing-page card with a genuine destination (see `Benefits.tsx`) goes through
 * this so "clickable card" always means a real, keyboard-operable button, not a div with a handler.
 */
export const GlassCard: React.FC<{
  id?: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  'aria-label'?: string;
}> = ({ id, className = '', children, onClick, ...rest }) => {
  const base = `rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm ${className}`;
  if (onClick) {
    return (
      <button
        type="button"
        id={id}
        onClick={onClick}
        className={`${base} text-left w-full transition-colors hover:bg-white/[0.06] hover:border-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 focus-visible:outline-offset-2 cursor-pointer`}
        {...rest}
      >
        {children}
      </button>
    );
  }
  return <div id={id} className={base}>{children}</div>;
};
