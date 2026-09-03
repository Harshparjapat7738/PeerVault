import React from 'react';
import gsap from 'gsap';
import { Section, SectionHeading, useGsapScope } from './shared';
import { scrollToId } from '../../lib/url';

// Each step re-visits the section that actually explains it — clicking one is a real jump, not
// decoration, and doubles as a recap of the anchors already used earlier on the page.
const WORKFLOW: { label: string; target: string }[] = [
  { label: 'Create Account', target: 'step-create-account' },
  { label: 'Connect Devices', target: 'connect-device' },
  { label: 'Grant Storage', target: 'step-grant-permission' },
  { label: 'Choose Source', target: 'transfer' },
  { label: 'Choose Destination', target: 'transfer' },
  { label: 'Transfer', target: 'transfer' },
  { label: 'Verify', target: 'step-verify-audit' },
];

/** The end-to-end path, drawn as the visitor scrolls — a scrub-tied line fill plus a stagger of the
 *  step labels lighting up in order. */
export const ProductWorkflow: React.FC = () => {
  const scopeRef = useGsapScope<HTMLDivElement>((el, reduced) => {
    const steps = gsap.utils.toArray<HTMLElement>('.workflow-step', el);
    const fill = el.querySelector('.workflow-line-fill') as HTMLElement | null;

    if (reduced) {
      gsap.set(steps, { opacity: 1 });
      if (fill) gsap.set(fill, { scaleY: 1 });
      return;
    }

    gsap.set(steps, { opacity: 0.3 });
    if (fill) gsap.set(fill, { scaleY: 0, transformOrigin: 'top' });

    const tl = gsap.timeline({
      scrollTrigger: { trigger: el, start: 'top 75%', end: 'bottom 55%', scrub: 0.6 },
    });
    if (fill) tl.to(fill, { scaleY: 1, duration: steps.length }, 0);
    steps.forEach((s, i) => tl.to(s, { opacity: 1, duration: 0.9 }, i));
  }, []);

  return (
    <Section className="bg-slate-900/40">
      <SectionHeading eyebrow="End to end" title="The full workflow, in one path" />
      <div ref={scopeRef} className="relative max-w-md mx-auto">
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-800" aria-hidden="true">
          <div className="workflow-line-fill w-full h-full bg-cyan-400/70" />
        </div>
        <ol className="space-y-2">
          {WORKFLOW.map(({ label, target }, i) => (
            <li key={label} className="workflow-step">
              <button
                type="button"
                onClick={() => scrollToId(target)}
                className="flex items-center gap-4 w-full text-left py-2 rounded-md transition-colors hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 cursor-pointer"
                aria-label={`${label} — jump to where this is explained`}
              >
                <span className="relative z-10 w-8 h-8 shrink-0 rounded-full bg-slate-950 border border-cyan-400/40 flex items-center justify-center font-mono text-[11px] text-cyan-300">
                  {i + 1}
                </span>
                <span className="text-sm sm:text-base text-slate-200 font-medium">{label}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
};
