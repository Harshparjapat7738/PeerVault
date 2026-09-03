import React from 'react';
import gsap from 'gsap';
import { UserCheck, Fingerprint, KeyRound, ShieldCheck, FileCheck2, ScrollText, ArrowRight } from 'lucide-react';
import { Section, SectionHeading, useGsapScope, GlassCard } from './shared';
import { dashboardCtaHref } from '../../lib/auth-nav';

const LAYERS = [
  {
    icon: UserCheck,
    title: 'Identity',
    body: 'Accounts are authenticated with a password (hashed, never stored in plain text) and a signed session token.',
  },
  {
    icon: Fingerprint,
    title: 'Device Authentication',
    body: 'Pairing a device generates a real EC (P-256) keypair and a SHA-256 fingerprint used to identify it going forward.',
  },
  {
    icon: KeyRound,
    title: 'Permission Check',
    body: 'Each device carries explicit, granted permissions — whether it can write, delete, or share storage further.',
  },
  {
    icon: ShieldCheck,
    title: 'Transfer Authorization',
    body: 'Moving data between devices requires an authenticated session tied to a registered device — not an open endpoint.',
  },
  {
    icon: FileCheck2,
    title: 'Integrity Verification',
    body: 'Relay transfers compute a SHA-256 hash from the actual bytes as they move, so a completed transfer can be checked, not assumed.',
  },
  {
    icon: ScrollText,
    title: 'Audit',
    body: 'Security-relevant actions are appended to a SHA-256 hash-chained ledger — each entry links to the one before it.',
  },
] as const;

export const SecurityFlow: React.FC = () => {
  const scopeRef = useGsapScope<HTMLDivElement>((el, reduced) => {
    const items = gsap.utils.toArray<HTMLElement>('.security-layer', el);
    const line = el.querySelector('.security-line-fill') as HTMLElement | null;

    if (reduced) {
      gsap.set(items, { opacity: 1, x: 0 });
      if (line) gsap.set(line, { scaleY: 1 });
      return;
    }

    gsap.set(items, { opacity: 0, x: -16 });
    if (line) gsap.set(line, { scaleY: 0, transformOrigin: 'top' });

    const tl = gsap.timeline({
      scrollTrigger: { trigger: el, start: 'top 70%', end: 'bottom 60%', scrub: 0.5 },
    });
    if (line) tl.to(line, { scaleY: 1, duration: items.length }, 0);
    items.forEach((item, i) => {
      tl.to(item, { opacity: 1, x: 0, duration: 0.8 }, i);
    });
  }, []);

  return (
    <Section id="security" className="bg-slate-950">
      <SectionHeading
        eyebrow="Security & trust"
        title="What actually happens between a request and a device"
        subtitle="Described plainly, without overstating what isn't built yet: no step here claims the mesh is unhackable or risk-free."
      />
      <div ref={scopeRef} className="relative max-w-xl mx-auto">
        <div className="absolute left-[27px] top-2 bottom-2 w-px bg-slate-800" aria-hidden="true">
          <div className="security-line-fill w-full h-full bg-cyan-400/60" />
        </div>
        <div className="space-y-5">
          {LAYERS.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="security-layer flex gap-5 items-start">
              <div className="relative z-10 w-14 h-14 shrink-0 rounded-full bg-slate-900 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
              <GlassCard className="flex-1 p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-1">Layer {i + 1}</p>
                <h3 className="font-semibold text-white text-sm mb-1">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
              </GlassCard>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 flex justify-center">
        <a
          href={dashboardCtaHref('security', { signupIfSignedOut: true })}
          className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200 transition-colors"
        >
          See the real audit ledger <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </a>
      </div>
    </Section>
  );
};
