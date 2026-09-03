import React from 'react';
import gsap from 'gsap';
import { Section, SectionHeading, useGsapScope, GlassCard } from './shared';

const MESH_DEVICES = [
  { label: 'Laptop', x: 70, y: 40 },
  { label: 'Desktop', x: 230, y: 30 },
  { label: 'Server', x: 320, y: 90 },
];

/**
 * "Your storage, not just a cloud folder": the mesh side visibly grows as more devices join, tied to
 * scroll position (a scrub timeline, not a one-shot reveal) so the growth itself reads as the point —
 * adding a device adds real capacity and a real node, not just abstract gigabytes.
 */
export const MeshExpansion: React.FC = () => {
  const scopeRef = useGsapScope<HTMLDivElement>((el, reduced) => {
    const nodes = gsap.utils.toArray<SVGGElement>('.expand-node', el);
    const lines = gsap.utils.toArray<SVGLineElement>('.expand-line', el);

    if (reduced) {
      gsap.set([...nodes, ...lines], { opacity: 1, scale: 1 });
      return;
    }

    gsap.set(nodes, { opacity: 0, scale: 0.5, transformOrigin: '50% 50%' });
    gsap.set(lines, { opacity: 0 });

    gsap.timeline({
      scrollTrigger: { trigger: el, start: 'top 75%', end: 'bottom 60%', scrub: 0.6 },
    })
      .to(nodes[0], { opacity: 1, scale: 1, duration: 1 })
      .to(lines[0], { opacity: 1, duration: 1 }, '<')
      .to(nodes[1], { opacity: 1, scale: 1, duration: 1 })
      .to(lines[1], { opacity: 1, duration: 1 }, '<')
      .to(nodes[2], { opacity: 1, scale: 1, duration: 1 })
      .to(lines[2], { opacity: 1, duration: 1 }, '<');
  }, []);

  return (
    <Section className="bg-slate-900/40">
      <SectionHeading eyebrow="Architecture" title="Add devices, not just gigabytes." />
      <div ref={scopeRef} className="grid md:grid-cols-2 gap-8 items-stretch">
        <GlassCard className="p-6 sm:p-8 flex flex-col items-center justify-center text-center">
          <p className="font-mono text-[11px] uppercase tracking-widest text-slate-500 mb-6">Traditional cloud</p>
          <div className="space-y-3">
            <div className="text-sm text-slate-200 bg-slate-950 border border-slate-700 rounded-md px-4 py-2.5">Remote storage provider</div>
            <div className="text-slate-600 text-xs">↓</div>
            <div className="text-sm text-slate-200 bg-slate-950 border border-slate-700 rounded-md px-4 py-2.5">Your files</div>
          </div>
          <p className="mt-6 text-xs text-slate-500 max-w-[220px]">One destination. Growing means buying a bigger plan from the same provider.</p>
        </GlassCard>

        <GlassCard className="p-6 sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-widest text-cyan-300/80 mb-2 text-center">Storage Mesh</p>
          <svg viewBox="0 0 380 200" className="w-full h-auto" role="img" aria-label="Devices join the personal storage mesh one at a time as more are connected">
            <g transform="translate(190,170)">
              <rect x="-70" y="-20" width="140" height="40" rx="8" fill="#0e2230" stroke="#22d3ee" strokeOpacity="0.5" />
              <text textAnchor="middle" y="5" className="fill-white text-[11px] font-semibold">Personal Storage Mesh</text>
            </g>
            {MESH_DEVICES.map((d, i) => (
              <line key={`l-${d.label}`} className="expand-line" x1={d.x} y1={d.y + 20} x2="190" y2="150" stroke="#22d3ee" strokeOpacity="0.35" strokeWidth="1.5" />
            ))}
            {MESH_DEVICES.map((d) => (
              <g key={d.label} className="expand-node" transform={`translate(${d.x},${d.y})`}>
                <rect x="-46" y="-20" width="92" height="40" rx="8" fill="#0f172a" stroke="#334155" />
                <text textAnchor="middle" y="5" className="fill-slate-200 text-[11px]">{d.label}</text>
              </g>
            ))}
          </svg>
          <p className="mt-4 text-xs text-slate-500 text-center max-w-[280px] mx-auto">Every device you connect adds its own real capacity to the same mesh.</p>
        </GlassCard>
      </div>
    </Section>
  );
};
