import React from 'react';
import gsap from 'gsap';
import { Archive, Boxes, Code2, Laptop2, ServerCog, FileStack } from 'lucide-react';
import { Section, SectionHeading, useGsapScope, GlassCard } from './shared';

const USE_CASES = [
  { icon: Archive, title: 'Personal Backup', body: 'Keep a second copy of important files on another device you own, without a subscription tier.' },
  { icon: Boxes, title: 'Home Lab', body: 'Bring NAS boxes, mini servers, and spare machines into one coordinated storage view.' },
  { icon: Code2, title: 'Developer Workstations', body: 'Move build artifacts and datasets between machines you actually work on.' },
  { icon: Laptop2, title: 'Multiple Computers', body: 'Stop emailing files to yourself between a work laptop and a personal desktop.' },
  { icon: ServerCog, title: 'Home Server', body: 'Turn an always-on machine into a standing node other devices can reach.' },
  { icon: FileStack, title: 'Large File Transfer', body: 'Send large files device-to-device with chunked, verifiable transfer instead of an inbox attachment limit.' },
] as const;

export const UseCases: React.FC = () => {
  const scopeRef = useGsapScope<HTMLDivElement>((el, reduced) => {
    const cards = gsap.utils.toArray<HTMLElement>('.usecase-card', el);
    if (reduced) {
      gsap.set(cards, { opacity: 1, y: 0 });
      return;
    }
    gsap.set(cards, { opacity: 0, y: 20 });
    gsap.to(cards, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: 'power2.out',
      stagger: 0.08,
      scrollTrigger: { trigger: el, start: 'top 82%', once: true },
    });
  }, []);

  return (
    <Section className="bg-slate-950">
      <SectionHeading eyebrow="Where it fits" title="Built for the devices people actually have" />
      <div ref={scopeRef} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {USE_CASES.map(({ icon: Icon, title, body }) => (
          <GlassCard key={title} className="usecase-card p-6">
            <span className="inline-flex w-10 h-10 rounded-lg bg-cyan-400/10 border border-cyan-400/20 items-center justify-center text-cyan-300 mb-4">
              <Icon className="w-5 h-5" aria-hidden="true" />
            </span>
            <h3 className="font-semibold text-white text-sm mb-1.5">{title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
          </GlassCard>
        ))}
      </div>
    </Section>
  );
};
