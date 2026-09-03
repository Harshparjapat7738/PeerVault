import React, { useEffect } from 'react';
import { Navbar } from '../components/landing/Navbar';
import { HeroMesh } from '../components/landing/HeroMesh';
import { CloudComparison } from '../components/landing/CloudComparison';
import { Benefits } from '../components/landing/Benefits';
import { HowItWorks } from '../components/landing/HowItWorks';
import { DeviceConnectionDemo } from '../components/landing/DeviceConnectionDemo';
import { TransferDemo } from '../components/landing/TransferDemo';
import { MeshExpansion } from '../components/landing/MeshExpansion';
import { SecurityFlow } from '../components/landing/SecurityFlow';
import { MeshVisualizer } from '../components/landing/MeshVisualizer';
import { UseCases } from '../components/landing/UseCases';
import { ProductWorkflow } from '../components/landing/ProductWorkflow';
import { FinalCTA } from '../components/landing/FinalCTA';
import { Footer } from '../components/landing/Footer';

/**
 * Public, unauthenticated landing page — served at `/` when there's no session (see `App.tsx`).
 * Dark-first, distinct from the light "editorial" dashboard theme, matching the dark/cyan
 * visualization language `NetworkTopology.tsx` already uses elsewhere in this app for anything that
 * depicts the mesh itself. Every section here is a self-contained component under
 * `components/landing/` with its own GSAP `gsap.context()` cleanup (see `shared.tsx`), so nothing
 * leaks ScrollTriggers or timelines if this page unmounts (e.g. a signed-in visitor navigating away).
 */
export const LandingPage: React.FC = () => {
  // Deep-link support (brief §22): a direct load of e.g. `/#how-it-works`, `/#connect-device`,
  // `/#transfer`, `/#security` should land the visitor on that section, not just the top of the
  // page. The router (`App.tsx`) only ever inspects `pathname`, never `hash`, so this is inert to
  // it — no route was invented, this is a plain in-page anchor jump run once after mount (the
  // browser can't do this on its own for a hash that arrives with the initial HTML, since the
  // target element doesn't exist until React renders it).
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    // Give the section components' own layout a frame to settle before jumping.
    requestAnimationFrame(() => {
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      document.getElementById(hash)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-400 selection:text-slate-950">
      <Navbar />
      <main>
        <HeroMesh />
        <CloudComparison />
        <Benefits />
        <HowItWorks />
        <DeviceConnectionDemo />
        <TransferDemo />
        <MeshExpansion />
        <SecurityFlow />
        <MeshVisualizer />
        <UseCases />
        <ProductWorkflow />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
