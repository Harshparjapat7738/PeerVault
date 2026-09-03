import React, { useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FileArchive, RotateCcw, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { Section, SectionHeading, useGsapScope, GlassCard } from './shared';
import { dashboardCtaHref } from '../../lib/auth-nav';

const CHUNK_COUNT = 8;

/**
 * A larger, standalone version of the transfer moment already shown inside "How It Works" — this is
 * a product-demonstration animation only (the brief is explicit about that): no backend call is made
 * from this public page. It models the real relay-transfer mechanism (chunked read/write, a SHA-256
 * hash computed as the bytes move, a verify step) rather than the older, fully-simulated legacy
 * transfer endpoint.
 */
export const TransferDemo: React.FC = () => {
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');

  const scopeRef = useGsapScope<HTMLDivElement>((el, reduced) => {
    if (reduced) return;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 70%',
      once: true,
      onEnter: () => el.querySelector<HTMLButtonElement>('.transfer-start-btn')?.click(),
    });
  }, []);

  const runTransfer = () => {
    const el = document.getElementById('transfer-demo-visual');
    if (!el || phase === 'running') return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    setPhase('running');

    const chunks = gsap.utils.toArray<HTMLElement>('.transfer-chunk', el);
    const label = el.querySelector('.transfer-pct') as HTMLElement | null;
    const bar = el.querySelector('.transfer-bar-fill') as HTMLElement | null;
    const hashCheck = el.querySelector('.transfer-hash-check') as HTMLElement | null;
    const completeCheck = el.querySelector('.transfer-complete-check') as HTMLElement | null;

    if (reduced) {
      gsap.set(chunks, { opacity: 0.15, x: 0 });
      if (bar) bar.style.width = '100%';
      if (label) label.textContent = '100%';
      gsap.set([hashCheck, completeCheck].filter(Boolean), { opacity: 1 });
      setPhase('done');
      return;
    }

    gsap.set(chunks, { opacity: 0, x: 0 });
    if (bar) bar.style.width = '0%';
    if (label) label.textContent = '0%';
    gsap.set([hashCheck, completeCheck].filter(Boolean), { opacity: 0 });

    const tl = gsap.timeline({ onComplete: () => setPhase('done') });
    const counter = { val: 0 };

    chunks.forEach((chunk, i) => {
      tl.fromTo(
        chunk,
        { opacity: 1, x: 0 },
        { x: 210, duration: 0.5, ease: 'power1.inOut' },
        i * 0.16
      ).to(chunk, { opacity: 0.15, duration: 0.15 }, i * 0.16 + 0.45);
    });

    tl.to(counter, {
      val: 100,
      duration: CHUNK_COUNT * 0.16 + 0.5,
      ease: 'power1.inOut',
      onUpdate: () => {
        const v = Math.round(counter.val);
        if (bar) bar.style.width = `${v}%`;
        if (label) label.textContent = `${v}%`;
      },
    }, 0);

    tl.to(hashCheck, { opacity: 1, duration: 0.35 }, '+=0.1')
      .to(completeCheck, { opacity: 1, duration: 0.35 }, '+=0.2');
  };

  // Real destination for "move your own files" — this demo itself stays client-side only, per the
  // brief ("a product demonstration animation only", never a fake backend call from this page).
  const realTransferHref = dashboardCtaHref('transfers', { signupIfSignedOut: true });

  return (
    <Section id="transfer" className="bg-slate-950">
      <SectionHeading
        eyebrow="Moving data through the mesh"
        title="A real transfer, chunk by chunk"
        subtitle="This is a demonstration of the mechanism, not a live transfer — relay-mode transfers in the app really do chunk bytes and hash them as they move."
      />
      <div ref={scopeRef} id="transfer-demo-visual">
        <GlassCard className="p-6 sm:p-10">
          <div className="flex items-center justify-between gap-6 mb-8">
            <div className="flex-1 text-center">
              <div className="mx-auto w-20 h-20 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center mb-2">
                <FileArchive className="w-8 h-8 text-slate-400" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-white">Laptop</p>
              <p className="text-[11px] font-mono text-slate-500">project.zip</p>
            </div>

            <div className="flex-[2] relative h-10 flex items-center">
              <div className="absolute inset-x-0 h-px bg-slate-800" />
              <div className="relative w-full flex justify-start">
                {Array.from({ length: CHUNK_COUNT }).map((_, i) => (
                  <span
                    key={i}
                    className="transfer-chunk absolute w-3 h-3 rounded-sm bg-cyan-400"
                    style={{ left: `${i * 2}px`, opacity: 0 }}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>

            <div className="flex-1 text-center">
              <div className="mx-auto w-20 h-20 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center mb-2">
                <FileArchive className="w-8 h-8 text-slate-600" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-white">Desktop</p>
              <p className="text-[11px] font-mono text-slate-500">receiving…</p>
            </div>
          </div>

          <div className="max-w-md mx-auto">
            <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden mb-2">
              <div className="transfer-bar-fill h-full bg-cyan-400 rounded-full" style={{ width: '0%' }} />
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">Transfer progress</span>
              <span className="transfer-pct text-cyan-300">0%</span>
            </div>

            <div className="mt-5 flex flex-col items-center gap-2">
              <div className="transfer-hash-check flex items-center gap-2 text-sm text-emerald-300" style={{ opacity: 0 }}>
                <ShieldCheck className="w-4 h-4" aria-hidden="true" /> Hash Verified
              </div>
              <div className="transfer-complete-check flex items-center gap-2 text-sm font-semibold text-white" style={{ opacity: 0 }}>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" /> Transfer Complete
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={runTransfer}
              disabled={phase === 'running'}
              className="transfer-start-btn inline-flex items-center gap-2 text-sm font-semibold text-slate-950 bg-white hover:bg-cyan-300 disabled:opacity-60 transition-colors px-5 py-2.5 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
            >
              {phase === 'done' ? <><RotateCcw className="w-4 h-4" aria-hidden="true" /> Replay Transfer</> : phase === 'running' ? 'Transferring…' : 'Start Transfer'}
            </button>
          </div>
        </GlassCard>
      </div>

      <div className="mt-8 flex justify-center">
        <a
          href={realTransferHref}
          className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200 transition-colors"
        >
          Move files between your own devices <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </a>
      </div>
    </Section>
  );
};
