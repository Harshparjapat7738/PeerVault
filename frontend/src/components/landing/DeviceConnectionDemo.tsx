import React, { useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Laptop2, Monitor, HardDrive, ScanLine, Fingerprint, KeyRound, CheckCircle2, RotateCcw, ArrowRight } from 'lucide-react';
import { Section, SectionHeading, useGsapScope, GlassCard, StatusPill } from './shared';
import { dashboardCtaHref } from '../../lib/auth-nav';

const SEQUENCE = [
  { label: 'Device discovered', icon: ScanLine },
  { label: 'Authentication', icon: Fingerprint },
  { label: 'Storage permission', icon: KeyRound },
  { label: 'Device connected', icon: CheckCircle2 },
] as const;

/**
 * The pseudo-dashboard + "Connect Device" flow from the brief. This is a demonstration of the real
 * QR-pairing sequence (`QrPairingModal.tsx` / `DevicePermissionDialog.tsx`) — scan, confirm identity,
 * grant permissions, done — not a live call into the backend from the public landing page.
 */
export const DeviceConnectionDemo: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [autoPlayed, setAutoPlayed] = useState(false);

  const scopeRef = useGsapScope<HTMLDivElement>((el, reduced) => {
    if (reduced) return;
    // Autoplay once when the demo scrolls into view, matching every other "plays once" section.
    ScrollTrigger.create({
      trigger: el,
      start: 'top 70%',
      once: true,
      onEnter: () => {
        const btn = el.querySelector<HTMLButtonElement>('.connect-btn');
        btn?.click();
      },
    });
  }, []);

  const runSequence = (el: HTMLElement, reduced: boolean) => {
    const steps = gsap.utils.toArray<HTMLElement>('.seq-step', el);
    const newNode = el.querySelector('.new-device-node') as HTMLElement | null;
    const newLine = el.querySelector('.new-device-line') as SVGLineElement | null;

    if (reduced) {
      gsap.set(steps, { opacity: 1 });
      steps.forEach((s) => s.classList.add('is-done'));
      if (newNode) gsap.set(newNode, { opacity: 1, scale: 1 });
      if (newLine) gsap.set(newLine, { opacity: 1 });
      setConnected(true);
      setRunning(false);
      return;
    }

    gsap.set(steps, { opacity: 0.35 });
    steps.forEach((s) => s.classList.remove('is-done'));
    if (newNode) gsap.set(newNode, { opacity: 0, scale: 0.5, transformOrigin: '50% 50%' });
    if (newLine) gsap.set(newLine, { opacity: 0 });

    const tl = gsap.timeline({
      onComplete: () => setRunning(false),
    });
    steps.forEach((s, i) => {
      tl.to(s, { opacity: 1, duration: 0.3 }, i * 0.55)
        .add(() => s.classList.add('is-done'), i * 0.55 + 0.15);
    });
    tl.to(newLine, { opacity: 1, duration: 0.4 }, '-=0.3')
      .to(newNode, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' }, '-=0.3')
      .add(() => setConnected(true));
  };

  const handleConnect = () => {
    if (running) return;
    setRunning(true);
    setConnected(false);
    setAutoPlayed(true);
    const el = document.getElementById('device-connection-demo');
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (el) runSequence(el, reduced);
  };

  // The demo above replays a client-side animation only (per the brief: a product demonstration,
  // never a fake backend call) — this is the real action: it opens the actual QR-pairing modal
  // (`QrPairingModal.tsx`) once inside the dashboard, or sends a signed-out visitor to sign up first.
  const realConnectHref = dashboardCtaHref('devices', { openPairing: true, signupIfSignedOut: true });

  return (
    <Section id="connect-device" className="bg-slate-900/40">
      <SectionHeading
        eyebrow="See it happen"
        title="Connecting a new device to your mesh"
        subtitle="This walks through the same QR-pairing sequence used inside the app — discover, authenticate, grant permission, connect."
      />
      <div ref={scopeRef} id="device-connection-demo" className="grid lg:grid-cols-2 gap-8 items-start">
        <GlassCard className="p-6 sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-widest text-slate-500 mb-4">Your Storage Mesh</p>
          <ul className="space-y-2.5 mb-6">
            <li className="flex items-center justify-between text-sm text-slate-200 bg-slate-950 border border-slate-800 rounded-md px-3 py-2.5">
              <span className="flex items-center gap-2"><Laptop2 className="w-4 h-4 text-slate-400" aria-hidden="true" /> Laptop</span>
              <StatusPill online />
            </li>
            <li className="flex items-center justify-between text-sm text-slate-200 bg-slate-950 border border-slate-800 rounded-md px-3 py-2.5">
              <span className="flex items-center gap-2"><Monitor className="w-4 h-4 text-slate-400" aria-hidden="true" /> Desktop</span>
              <StatusPill online />
            </li>
            <li className="flex items-center justify-between text-sm text-slate-400 bg-slate-950 border border-slate-800 rounded-md px-3 py-2.5">
              <span className="flex items-center gap-2"><HardDrive className="w-4 h-4 text-slate-500" aria-hidden="true" /> Old Laptop</span>
              <StatusPill online={false} />
            </li>
          </ul>

          <button
            type="button"
            onClick={handleConnect}
            disabled={running}
            className="connect-btn w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-slate-950 bg-cyan-300 hover:bg-cyan-200 disabled:opacity-60 transition-colors px-4 py-3 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            {connected ? (
              <><RotateCcw className="w-4 h-4" aria-hidden="true" /> Replay Connect Device</>
            ) : running ? (
              'Connecting…'
            ) : (
              'Connect Device'
            )}
          </button>

          <ol className="mt-6 space-y-3">
            {SEQUENCE.map(({ label, icon: Icon }) => (
              <li key={label} className="seq-step flex items-center gap-3 text-sm text-slate-300">
                <span className="seq-dot w-6 h-6 rounded-full border border-slate-700 flex items-center justify-center shrink-0 [.is-done_&]:bg-cyan-400/20 [.is-done_&]:border-cyan-400/60 [.is-done_&]:text-cyan-300">
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
                {label}
              </li>
            ))}
          </ol>
          {!autoPlayed && <span className="sr-only" role="status">Connect Device demo ready to play</span>}
        </GlassCard>

        <GlassCard className="p-6 sm:p-8 flex items-center justify-center min-h-[320px]">
          <svg viewBox="0 0 300 240" className="w-full max-w-xs" role="img" aria-label="A new device animates into the mesh network once connected">
            <line x1="150" y1="120" x2="90" y2="60" stroke="#334155" strokeWidth="1.5" />
            <line x1="150" y1="120" x2="210" y2="60" stroke="#334155" strokeWidth="1.5" />
            <line className="new-device-line" x1="150" y1="120" x2="150" y2="200" stroke="#22d3ee" strokeWidth="1.5" opacity="0" />

            <g transform="translate(90,60)">
              <rect x="-40" y="-22" width="80" height="44" rx="8" fill="#0f172a" stroke="#334155" />
              <text textAnchor="middle" y="5" className="fill-slate-300 text-[11px]">Laptop</text>
            </g>
            <g transform="translate(210,60)">
              <rect x="-40" y="-22" width="80" height="44" rx="8" fill="#0f172a" stroke="#334155" />
              <text textAnchor="middle" y="5" className="fill-slate-300 text-[11px]">Desktop</text>
            </g>
            <g transform="translate(150,120)">
              <rect x="-56" y="-24" width="112" height="48" rx="8" fill="#0e2230" stroke="#22d3ee" strokeOpacity="0.5" />
              <text textAnchor="middle" y="-2" className="fill-white text-[11px] font-bold">STORAGE MESH</text>
              <text textAnchor="middle" y="14" className="fill-cyan-300 font-mono text-[9px] tracking-widest">CONTROL</text>
            </g>
            <g className="new-device-node" transform="translate(150,200)">
              <rect x="-44" y="-22" width="88" height="44" rx="8" fill="#0f172a" stroke="#67e8f9" />
              <text textAnchor="middle" y="5" className="fill-cyan-200 text-[11px]">New Device</text>
            </g>
          </svg>
        </GlassCard>
      </div>

      <div className="mt-8 flex justify-center">
        <a
          href={realConnectHref}
          className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200 transition-colors"
        >
          Connect your own devices <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </a>
      </div>
    </Section>
  );
};
