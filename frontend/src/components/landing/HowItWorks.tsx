import React from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown, Check, FolderOpen, ShieldCheck } from 'lucide-react';
import { Section, SectionHeading, useGsapScope, GlassCard } from './shared';
import { scrollToId } from '../../lib/url';

type FlowStep = { kind: 'flow'; items: string[] };
type PermissionStep = { kind: 'permission' };
type ConvergeStep = { kind: 'converge'; a: string; b: string; label: string };
type TransferStep = { kind: 'transfer' };

type Step = {
  id: string;
  n: string;
  title: string;
  description: string;
  diagram: FlowStep | PermissionStep | ConvergeStep | TransferStep;
};

const STEPS: Step[] = [
  {
    id: 'step-create-account',
    n: '01',
    title: 'Create Account',
    description: 'Register with an email and password to get an authenticated session for your mesh.',
    diagram: { kind: 'flow', items: ['User', 'Storage Mesh', 'Authenticated Session'] },
  },
  {
    id: 'step-connect-device',
    n: '02',
    title: 'Connect Device',
    description: 'Pair a device by scanning a one-time QR code — it gets a real cryptographic identity and is registered to your mesh.',
    diagram: { kind: 'flow', items: ['Laptop', 'Storage Mesh', 'Device Registered'] },
  },
  {
    id: 'step-grant-permission',
    n: '03',
    title: 'Grant Storage Permission',
    description: 'Choose which folder the device shares, and decide — explicitly — whether it can be written to, deleted from, or shared further.',
    diagram: { kind: 'permission' },
  },
  {
    id: 'step-connect-second-device',
    n: '04',
    title: 'Connect Another Device',
    description: 'Pair a second device the same way. It joins the same mesh alongside the first, each with its own permissions.',
    diagram: { kind: 'converge', a: 'Laptop', b: 'Desktop', label: 'secure session' },
  },
  {
    id: 'step-transfer-data',
    n: '05',
    title: 'Transfer Data',
    description: 'Move a file from one connected device to another. Bytes are chunked, and a SHA-256 hash is computed as they move.',
    diagram: { kind: 'transfer' },
  },
  {
    id: 'step-verify-audit',
    n: '06',
    title: 'Verify & Audit',
    description: 'Once transferred, the hash is checked and the outcome is appended to the audit ledger — visible in your security view.',
    diagram: { kind: 'flow', items: ['Transfer Completed', 'Integrity Check', 'Audit Event'] },
  },
];

const FlowDiagram: React.FC<{ items: string[] }> = ({ items }) => (
  <div className="flow-diagram flex flex-col items-center gap-2">
    {items.map((item, i) => (
      <React.Fragment key={item}>
        <div className="diagram-item text-xs sm:text-sm text-slate-100 bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-center min-w-[160px]">
          {item}
        </div>
        {i < items.length - 1 && <ArrowDown className="diagram-item w-3.5 h-3.5 text-cyan-400/70" aria-hidden="true" />}
      </React.Fragment>
    ))}
  </div>
);

const PermissionDiagram: React.FC = () => (
  <div className="flow-diagram flex flex-col items-center gap-2">
    <div className="diagram-item text-xs sm:text-sm text-slate-100 bg-slate-950 border border-slate-700 rounded-md px-3 py-2 flex items-center gap-2 min-w-[180px] justify-center">
      <FolderOpen className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" /> Choose Folder
    </div>
    <ArrowDown className="diagram-item w-3.5 h-3.5 text-cyan-400/70" aria-hidden="true" />
    <div className="diagram-item text-xs sm:text-sm text-slate-100 bg-slate-950 border border-slate-700 rounded-md px-3 py-2 min-w-[180px] text-center">
      Request Access
    </div>
    <ArrowDown className="diagram-item w-3.5 h-3.5 text-cyan-400/70" aria-hidden="true" />
    <div className="permission-approve diagram-item text-xs sm:text-sm font-semibold rounded-md px-3 py-2 min-w-[180px] flex items-center justify-center gap-2 border transition-colors duration-300 bg-slate-950 border-slate-700 text-slate-100">
      <span className="approve-check w-4 h-4 rounded-full border border-slate-500 flex items-center justify-center shrink-0">
        <Check className="w-2.5 h-2.5" aria-hidden="true" />
      </span>
      Approve
    </div>
    <ArrowDown className="diagram-item w-3.5 h-3.5 text-cyan-400/70" aria-hidden="true" />
    <div className="diagram-item text-xs sm:text-sm font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-3 py-2 min-w-[180px] text-center">
      Storage Available
    </div>
  </div>
);

const ConvergeDiagram: React.FC<{ a: string; b: string; label: string }> = ({ a, b, label }) => (
  <div className="flow-diagram flex flex-col items-center gap-1">
    <div className="flex items-center gap-6">
      <div className="diagram-item text-xs sm:text-sm text-slate-100 bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-center">{a}</div>
      <div className="diagram-item text-xs sm:text-sm text-slate-100 bg-slate-950 border border-cyan-400/40 rounded-md px-3 py-2 text-center">{b}<span className="ml-1 text-[10px] text-cyan-300 font-mono">NEW</span></div>
    </div>
    <span className="diagram-item text-[10px] font-mono uppercase tracking-widest text-slate-500 my-0.5">{label}</span>
    <ArrowDown className="diagram-item w-3.5 h-3.5 text-cyan-400/70" aria-hidden="true" />
    <div className="diagram-item text-xs sm:text-sm font-semibold text-white bg-cyan-500/10 border border-cyan-400/40 rounded-md px-3 py-2 text-center">Storage Mesh</div>
  </div>
);

const TransferDiagram: React.FC = () => (
  <div className="flow-diagram flex flex-col items-center gap-3 w-full max-w-[260px]">
    <div className="flex items-center justify-between w-full text-xs text-slate-200">
      <span className="diagram-item bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5">Laptop</span>
      <span className="diagram-item bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5">Desktop</span>
    </div>
    <div className="diagram-item w-full h-2 rounded-full bg-slate-800 overflow-hidden">
      <div className="transfer-progress-fill h-full bg-cyan-400 rounded-full" style={{ width: '0%' }} />
    </div>
    <div className="diagram-item transfer-progress-label font-mono text-xs text-cyan-300">0%</div>
    <div className="diagram-item transfer-verified opacity-0 flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
      <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Integrity Verified
    </div>
  </div>
);

export const HowItWorks: React.FC = () => {
  const scopeRef = useGsapScope<HTMLDivElement>((el, reduced) => {
    const stepEls = gsap.utils.toArray<HTMLElement>('.hiw-step', el);

    stepEls.forEach((stepEl) => {
      const items = gsap.utils.toArray<HTMLElement>('.diagram-item', stepEl);

      if (reduced) {
        gsap.set(stepEl, { opacity: 1 });
        gsap.set(items, { opacity: 1, y: 0 });
        const fill = stepEl.querySelector('.transfer-progress-fill');
        const label = stepEl.querySelector('.transfer-progress-label');
        const verified = stepEl.querySelector('.transfer-verified');
        if (fill) gsap.set(fill, { width: '100%' });
        if (label) label.textContent = '100%';
        if (verified) gsap.set(verified, { opacity: 1 });
        const approve = stepEl.querySelector('.permission-approve');
        if (approve) approve.classList.add('!bg-emerald-500/10', '!border-emerald-500/40', '!text-emerald-300');
        return;
      }

      gsap.set(stepEl, { opacity: 0.4, y: 20 });
      gsap.set(items, { opacity: 0, y: 10 });

      const revealTl = gsap.timeline({ scrollTrigger: { trigger: stepEl, start: 'top 75%', once: true } });
      revealTl.to(stepEl, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' })
        .to(items, { opacity: 1, y: 0, duration: 0.4, stagger: 0.12, ease: 'power2.out' }, '-=0.2');

      const approve = stepEl.querySelector('.permission-approve');
      if (approve) {
        revealTl.to(approve, { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.4)', color: '#6ee7b7', duration: 0.35 }, '+=0.2');
        const check = stepEl.querySelector('.approve-check');
        if (check) revealTl.to(check, { backgroundColor: '#10b981', borderColor: '#10b981', color: '#0f172a', duration: 0.3 }, '<');
      }

      const fill = stepEl.querySelector('.transfer-progress-fill');
      const label = stepEl.querySelector('.transfer-progress-label');
      const verified = stepEl.querySelector('.transfer-verified');
      if (fill && label) {
        const counter = { val: 0 };
        revealTl.to(counter, {
          val: 100,
          duration: 1.4,
          ease: 'power1.inOut',
          onUpdate: () => {
            const v = Math.round(counter.val);
            (fill as HTMLElement).style.width = `${v}%`;
            (label as HTMLElement).textContent = `${v}%`;
          },
        }, '+=0.1');
        if (verified) revealTl.to(verified, { opacity: 1, duration: 0.4 });
      }
    });

    if (reduced) return;

    // Active-step emphasis while scrolling: the step nearest the center of the viewport gets full
    // opacity/scale, the rest dim — this is what makes "only the active step is emphasized" visible
    // as the visitor scrolls, driven by real GSAP tweens on ScrollTrigger enter/leave rather than a
    // CSS-only transition.
    stepEls.forEach((stepEl) => {
      ScrollTrigger.create({
        trigger: stepEl,
        start: 'top 62%',
        end: 'bottom 38%',
        onEnter: () => gsap.to(stepEl, { opacity: 1, scale: 1, duration: 0.4, overwrite: 'auto' }),
        onLeave: () => gsap.to(stepEl, { opacity: 0.45, scale: 0.99, duration: 0.4, overwrite: 'auto' }),
        onEnterBack: () => gsap.to(stepEl, { opacity: 1, scale: 1, duration: 0.4, overwrite: 'auto' }),
        onLeaveBack: () => gsap.to(stepEl, { opacity: 0.45, scale: 0.99, duration: 0.4, overwrite: 'auto' }),
      });
    });
  }, []);

  return (
    <Section id="how-it-works" className="bg-slate-950">
      <SectionHeading
        eyebrow="From zero to mesh"
        title="How Storage Mesh works"
        subtitle="Six steps take a device from disconnected to an active, permissioned member of your mesh."
      />
      <div ref={scopeRef} className="space-y-5">
        {STEPS.map((step) => (
          <GlassCard
            key={step.n}
            id={step.id}
            className="hiw-step p-6 sm:p-8 grid sm:grid-cols-[auto_1fr_auto] gap-6 items-center transition-opacity duration-500 scroll-mt-24"
            onClick={() => scrollToId(step.id)}
            aria-label={`Step ${step.n}: ${step.title}`}
          >
            <div className="font-mono text-3xl sm:text-4xl font-bold text-cyan-400/60 tabular-nums">{step.n}</div>
            <div>
              <h3 className="font-semibold text-white text-lg mb-1.5">{step.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed max-w-md">{step.description}</p>
            </div>
            <div className="justify-self-center sm:justify-self-end">
              {step.diagram.kind === 'flow' && <FlowDiagram items={step.diagram.items} />}
              {step.diagram.kind === 'permission' && <PermissionDiagram />}
              {step.diagram.kind === 'converge' && <ConvergeDiagram a={step.diagram.a} b={step.diagram.b} label={step.diagram.label} />}
              {step.diagram.kind === 'transfer' && <TransferDiagram />}
            </div>
          </GlassCard>
        ))}
      </div>
    </Section>
  );
};
