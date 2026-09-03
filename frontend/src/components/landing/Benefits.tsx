import React from 'react';
import gsap from 'gsap';
import { HardDrive, Laptop2, KeyRound, ArrowLeftRight, Eye, ScrollText } from 'lucide-react';
import { Section, SectionHeading, useGsapScope, GlassCard } from './shared';
import { scrollToId } from '../../lib/url';

// Each card jumps to the section that actually backs its claim — never decorative. "Controlled
// Access" and "Auditable" both point at the security walkthrough since that section literally
// covers permission checks (layer 3) and the audit ledger (layer 6) as two of its steps.
const BENEFITS = [
  {
    icon: HardDrive,
    title: 'Personal Storage',
    body: 'Use storage you already have across your devices, instead of renting more of it from a provider.',
    target: 'why-storage-mesh',
  },
  {
    icon: Laptop2,
    title: 'Multi-Device',
    body: 'Connect laptops, desktops, servers, and other supported devices into the same mesh.',
    target: 'connect-device',
  },
  {
    icon: KeyRound,
    title: 'Controlled Access',
    body: 'Explicitly decide which device can access which storage — write, delete, and further-sharing are separate, granted permissions.',
    target: 'security',
  },
  {
    icon: ArrowLeftRight,
    title: 'Device-to-Device Transfer',
    body: 'Move data between connected devices through the mesh, without a single storage bucket sitting in the middle.',
    target: 'transfer',
  },
  {
    icon: Eye,
    title: 'Visibility',
    body: 'See connected devices, their availability, in-progress transfers, and storage state as it changes.',
    target: 'mesh-visualizer',
  },
  {
    icon: ScrollText,
    title: 'Auditable',
    body: 'Sensitive actions are appended to a hash-chained audit ledger, so device and storage events can be traced back.',
    target: 'security',
  },
] as const;

export const Benefits: React.FC = () => {
  const scopeRef = useGsapScope<HTMLDivElement>((el, reduced) => {
    const cards = gsap.utils.toArray<HTMLElement>('.benefit-card', el);
    const rings = gsap.utils.toArray<SVGCircleElement>('.benefit-ring', el);

    rings.forEach((ring) => {
      const len = ring.getTotalLength ? ring.getTotalLength() : 2 * Math.PI * 22;
      gsap.set(ring, { strokeDasharray: len, strokeDashoffset: reduced ? 0 : len });
    });

    if (reduced) {
      gsap.set(cards, { opacity: 1, y: 0 });
      return;
    }

    gsap.set(cards, { opacity: 0, y: 24 });

    cards.forEach((card, i) => {
      const ring = rings[i];
      gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 88%', once: true } })
        .to(card, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' })
        .to(ring, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.out' }, '-=0.35');
    });
  }, []);

  return (
    <Section id="features" className="bg-slate-900/40">
      <SectionHeading
        eyebrow="Why it's different"
        title="Six things a single cloud bucket can't give you"
        subtitle="Storage Mesh treats every device you own as part of the same coordinated network."
      />
      <div ref={scopeRef} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {BENEFITS.map(({ icon: Icon, title, body, target }) => (
          <GlassCard
            key={title}
            className="benefit-card p-6"
            onClick={() => scrollToId(target)}
            aria-label={`${title} — jump to where this is explained`}
          >
            <div className="relative w-14 h-14 mb-4">
              <svg viewBox="0 0 48 48" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden="true">
                <circle cx="24" cy="24" r="21" fill="none" stroke="#1e293b" strokeWidth="2" />
                <circle className="benefit-ring" cx="24" cy="24" r="21" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-cyan-300">
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>
            <h3 className="font-semibold text-white text-base mb-1.5">{title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
          </GlassCard>
        ))}
      </div>
    </Section>
  );
};
