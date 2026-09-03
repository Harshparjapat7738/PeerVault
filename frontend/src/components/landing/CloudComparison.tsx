import React from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown } from 'lucide-react';
import { Section, SectionHeading, useGsapScope, GlassCard } from './shared';

const CLOUD_STEPS = ['Your Device', 'Internet', 'Cloud Provider', 'Provider Storage'];
const MESH_DEVICES = ['Laptop', 'Desktop', 'Phone'];

/**
 * The "not another cloud drive" comparison: a single linear upload path on the left vs. several of
 * your own devices meeting at a personal mesh on the right. Wording stays factual — Storage Mesh
 * still has a coordinating control plane, it just isn't where the bytes have to live.
 */
export const CloudComparison: React.FC = () => {
  const scopeRef = useGsapScope<HTMLDivElement>((el, reduced) => {
    const cloudDot = el.querySelector('.cloud-dot') as SVGCircleElement | null;
    const cloudBoxes = gsap.utils.toArray<HTMLElement>('.cloud-step', el);
    const meshDevices = gsap.utils.toArray<SVGGElement>('.mesh-device', el);
    const meshLines = gsap.utils.toArray<SVGLineElement>('.mesh-line', el);
    const meshParticles = gsap.utils.toArray<SVGCircleElement>('.mesh-particle', el);
    const meshCenter = el.querySelector('.mesh-center') as SVGGElement | null;

    if (reduced) {
      gsap.set([...cloudBoxes, ...meshDevices, meshCenter].filter(Boolean), { opacity: 1, y: 0 });
      gsap.set(meshLines, { opacity: 1 });
      gsap.set([cloudDot, ...meshParticles].filter(Boolean), { opacity: 0 });
      return;
    }

    gsap.set(cloudBoxes, { opacity: 0, y: 16 });
    gsap.set([...meshDevices, meshCenter].filter(Boolean), { opacity: 0, y: 16 });
    gsap.set(meshLines, { opacity: 0 });
    gsap.set([cloudDot, ...meshParticles].filter(Boolean), { opacity: 0 });

    let particleLoop: gsap.core.Timeline | null = null;

    const tl = gsap.timeline({
      scrollTrigger: { trigger: el, start: 'top 70%', once: true },
    });

    tl.to(cloudBoxes, { opacity: 1, y: 0, duration: 0.5, stagger: 0.18, ease: 'power2.out' })
      .add(() => {
        if (!cloudDot) return;
        gsap.set(cloudDot, { opacity: 1, attr: { cy: 40 } });
        gsap.to(cloudDot, { attr: { cy: 330 }, duration: 1.4, ease: 'power1.inOut', onComplete: () => gsap.to(cloudDot, { opacity: 0, duration: 0.3 }) });
      }, '-=0.1')
      .to(meshCenter, { opacity: 1, y: 0, duration: 0.5 }, '<')
      .to(meshDevices, { opacity: 1, y: 0, duration: 0.5, stagger: 0.15, ease: 'power2.out' }, '-=0.2')
      .to(meshLines, { opacity: 1, duration: 0.4, stagger: 0.1 }, '-=0.25')
      .add(() => {
        particleLoop = gsap.timeline({ repeat: -1 });
        meshParticles.forEach((p, i) => {
          const line = meshLines[i % meshLines.length];
          if (!line) return;
          const x1 = Number(line.getAttribute('x1'));
          const y1 = Number(line.getAttribute('y1'));
          const x2 = Number(line.getAttribute('x2'));
          const y2 = Number(line.getAttribute('y2'));
          particleLoop!.fromTo(
            p,
            { attr: { cx: x1, cy: y1 }, opacity: 0 },
            { attr: { cx: x2, cy: y2 }, opacity: 1, duration: 1, ease: 'power1.inOut' },
            i * 0.35
          ).to(p, { opacity: 0, duration: 0.2 }, i * 0.35 + 0.85);
        });
      });

    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      onLeave: () => particleLoop?.pause(),
      onEnterBack: () => particleLoop?.play(),
      onLeaveBack: () => particleLoop?.pause(),
    });

    return () => st.kill();
  }, []);

  return (
    <Section id="why-storage-mesh" className="bg-slate-950">
      <SectionHeading
        eyebrow="Not another cloud drive"
        title="Storage shouldn't be limited to a single cloud bucket."
        subtitle="Storage Mesh still coordinates through a control plane — it just isn't the destination for your files. Your devices are."
      />
      <div ref={scopeRef} className="grid md:grid-cols-2 gap-8">
        {/* Traditional cloud */}
        <GlassCard className="p-6 sm:p-8 relative">
          <p className="font-mono text-[11px] uppercase tracking-widest text-slate-500 mb-6">Traditional Cloud</p>
          <div className="relative flex flex-col items-center gap-3">
            <svg className="absolute left-1/2 -translate-x-1/2 top-0 h-full w-4 pointer-events-none" aria-hidden="true">
              <circle className="cloud-dot" cx="8" cy="40" r="4" fill="#67e8f9" opacity="0" />
            </svg>
            {CLOUD_STEPS.map((step, i) => (
              <React.Fragment key={step}>
                <div className="cloud-step w-full max-w-[240px] text-center text-sm text-slate-200 bg-slate-900 border border-slate-700 rounded-lg py-3 px-4">
                  {step}
                </div>
                {i < CLOUD_STEPS.length - 1 && <ArrowDown className="w-4 h-4 text-slate-600" aria-hidden="true" />}
              </React.Fragment>
            ))}
          </div>
          <p className="mt-6 text-xs text-slate-500 leading-relaxed">
            One upload path. Your files move off your devices and live wherever the provider decides.
          </p>
        </GlassCard>

        {/* Storage Mesh */}
        <GlassCard className="p-6 sm:p-8 relative overflow-hidden">
          <p className="font-mono text-[11px] uppercase tracking-widest text-cyan-300/80 mb-6">Storage Mesh</p>
          <div className="relative h-[260px]">
            {/* Lines and boxes are both drawn in this one SVG's viewBox coordinate space, rather
                than the box positions living in a separate HTML/CSS-percentage layer — two
                coordinate systems overlaid like that only line up by coincidence at one exact
                container width, and drift apart at every other size. */}
            <svg viewBox="0 0 320 260" className="w-full h-full" aria-hidden="true">
              <line className="mesh-line" x1="60" y1="60" x2="160" y2="180" stroke="#22d3ee" strokeOpacity="0.4" strokeWidth="1.5" />
              <line className="mesh-line" x1="160" y1="40" x2="160" y2="180" stroke="#22d3ee" strokeOpacity="0.4" strokeWidth="1.5" />
              <line className="mesh-line" x1="260" y1="60" x2="160" y2="180" stroke="#22d3ee" strokeOpacity="0.4" strokeWidth="1.5" />
              <circle className="mesh-particle" cx="60" cy="60" r="3.5" fill="#67e8f9" opacity="0" />
              <circle className="mesh-particle" cx="160" cy="40" r="3.5" fill="#67e8f9" opacity="0" />
              <circle className="mesh-particle" cx="260" cy="60" r="3.5" fill="#67e8f9" opacity="0" />

              {/* Each device sits in a static outer <g> that GSAP never touches, wrapping an inner
                  <g> with no transform of its own that GSAP animates opacity/y on. GSAP's x/y
                  tweens fully replace whichever axis they touch on an element's *own* transform —
                  they don't merge with a translate() already sitting in that element's own
                  `transform` attribute — so animating position directly on the positioned node was
                  quietly zeroing its y offset. Splitting "where it is" from "how it animates" into
                  two nested groups sidesteps that entirely. */}
              <g transform="translate(60,60)">
                <g className="mesh-device">
                  <rect x="-42" y="-16" width="84" height="32" rx="8" fill="#0f172a" stroke="#334155" />
                  <text textAnchor="middle" y="4" className="fill-slate-200 text-[11px]">Laptop</text>
                </g>
              </g>
              <g transform="translate(160,40)">
                <g className="mesh-device">
                  <rect x="-46" y="-16" width="92" height="32" rx="8" fill="#0f172a" stroke="#334155" />
                  <text textAnchor="middle" y="4" className="fill-slate-200 text-[11px]">Desktop</text>
                </g>
              </g>
              <g transform="translate(260,60)">
                <g className="mesh-device">
                  <rect x="-38" y="-16" width="76" height="32" rx="8" fill="#0f172a" stroke="#334155" />
                  <text textAnchor="middle" y="4" className="fill-slate-200 text-[11px]">Phone</text>
                </g>
              </g>
              <g transform="translate(160,192)">
                <g className="mesh-center">
                  <rect x="-70" y="-24" width="140" height="48" rx="10" fill="#0e2230" stroke="#22d3ee" strokeOpacity="0.5" />
                  <text textAnchor="middle" y="-3" className="fill-white text-[11px] font-semibold">Personal</text>
                  <text textAnchor="middle" y="14" className="fill-white text-[11px] font-semibold">Storage Mesh</text>
                </g>
              </g>
            </svg>
          </div>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Multiple devices, each holding real storage, coordinated as one network you control.
          </p>
        </GlassCard>
      </div>
    </Section>
  );
};
