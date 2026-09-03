import React, { useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Laptop2, Monitor, Server, Cpu, ArrowRight } from 'lucide-react';
import { Section, SectionHeading, useGsapScope, GlassCard } from './shared';
import { dashboardCtaHref } from '../../lib/auth-nav';

type MeshNode = { id: string; label: string; icon: typeof Laptop2; x: number; y: number; storage: string; activity: string };

const NODES: MeshNode[] = [
  { id: 'laptop', label: 'Laptop', icon: Laptop2, x: 90, y: 70, storage: '312 GB free of 500 GB', activity: '1 active transfer' },
  { id: 'desktop', label: 'Desktop', icon: Monitor, x: 310, y: 70, storage: '640 GB free of 1 TB', activity: 'Idle' },
  { id: 'server', label: 'Home Server', icon: Server, x: 310, y: 250, storage: '2.1 TB free of 4 TB', activity: 'Idle' },
  { id: 'workstation', label: 'Workstation', icon: Cpu, x: 90, y: 250, storage: '128 GB free of 250 GB', activity: '1 active transfer' },
];

const EDGES: [string, string][] = [
  ['laptop', 'desktop'],
  ['desktop', 'server'],
  ['server', 'workstation'],
  ['workstation', 'laptop'],
  ['laptop', 'server'],
  ['desktop', 'workstation'],
];

const nodeById = (id: string) => NODES.find((n) => n.id === id)!;

/**
 * The large "device mesh" visualizer: every device can reach every other, clicking a node
 * highlights its own links, nodes drift subtly, and a couple of particles travel active edges — all
 * paused when the section scrolls out of view. Mobile gets a simplified stacked list instead of the
 * same SVG shrunk down, per the brief.
 */
export const MeshVisualizer: React.FC = () => {
  const [selected, setSelected] = useState<string | null>(null);

  const scopeRef = useGsapScope<HTMLDivElement>((el, reduced) => {
    const nodeEls = gsap.utils.toArray<SVGGElement>('.viz-node', el);
    const particles = gsap.utils.toArray<SVGCircleElement>('.viz-particle', el);

    if (reduced) return;

    const floatTweens = nodeEls.map((n, i) =>
      gsap.to(n, {
        y: '+=6',
        duration: 2.4 + (i % 3) * 0.4,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      })
    );

    const particleLoop = gsap.timeline({ repeat: -1 });
    particles.forEach((p, i) => {
      const [aId, bId] = EDGES[i % EDGES.length];
      const a = nodeById(aId);
      const b = nodeById(bId);
      particleLoop.fromTo(
        p,
        { attr: { cx: a.x, cy: a.y }, opacity: 0 },
        { attr: { cx: b.x, cy: b.y }, opacity: 1, duration: 1.1, ease: 'power1.inOut' },
        i * 0.9
      ).to(p, { opacity: 0, duration: 0.25 }, i * 0.9 + 0.85);
    });

    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      onLeave: () => { floatTweens.forEach((t) => t.pause()); particleLoop.pause(); },
      onEnter: () => { floatTweens.forEach((t) => t.play()); particleLoop.play(); },
      onEnterBack: () => { floatTweens.forEach((t) => t.play()); particleLoop.play(); },
      onLeaveBack: () => { floatTweens.forEach((t) => t.pause()); particleLoop.pause(); },
    });

    return () => {
      st.kill();
      floatTweens.forEach((t) => t.kill());
      particleLoop.kill();
    };
  }, []);

  const isEdgeActive = (a: string, b: string) => !selected || selected === a || selected === b;
  const isNodeActive = (id: string) => !selected || selected === id;

  return (
    <Section id="mesh-visualizer" className="bg-slate-900/40">
      <SectionHeading
        eyebrow="Live view"
        title="Every device is a visible, reachable node"
        subtitle="Click a device to highlight its own connections. In the app, this view reflects real device status and transfer activity."
      />

      {/* Desktop/tablet: full interactive mesh */}
      <div ref={scopeRef} className="hidden sm:grid md:grid-cols-[1fr_260px] gap-6 items-start">
        <GlassCard className="p-4 sm:p-6">
          <svg viewBox="0 0 400 320" className="w-full h-auto" role="img" aria-label="Four devices connected in a mesh; select a device to see its connections">
            {EDGES.map(([a, b]) => {
              const na = nodeById(a);
              const nb = nodeById(b);
              const active = isEdgeActive(a, b);
              return (
                <line
                  key={`${a}-${b}`}
                  x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                  stroke="#22d3ee"
                  strokeWidth={active ? 1.75 : 1}
                  strokeOpacity={active ? 0.55 : 0.12}
                  style={{ transition: 'stroke-opacity 300ms ease, stroke-width 300ms ease' }}
                />
              );
            })}
            {EDGES.slice(0, 2).map(([a, b]) => {
              const start = nodeById(a);
              return <circle key={`p-${a}-${b}`} className="viz-particle" cx={start.x} cy={start.y} r="3.5" fill="#67e8f9" opacity="0" />;
            })}
            {NODES.map((node) => {
              const Icon = node.icon;
              const active = isNodeActive(node.id);
              return (
                <g
                  key={node.id}
                  className="viz-node cursor-pointer"
                  transform={`translate(${node.x},${node.y})`}
                  tabIndex={0}
                  role="button"
                  aria-pressed={selected === node.id}
                  aria-label={`${node.label}, show its connections`}
                  onClick={() => setSelected((cur) => (cur === node.id ? null : node.id))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected((cur) => (cur === node.id ? null : node.id));
                    }
                  }}
                  style={{ opacity: active ? 1 : 0.45, transition: 'opacity 300ms ease' }}
                >
                  <circle r="30" fill="#0f172a" stroke={selected === node.id ? '#67e8f9' : '#334155'} strokeWidth={selected === node.id ? 2 : 1.5} />
                  <foreignObject x="-9" y="-22" width="18" height="18">
                    <Icon className="w-[18px] h-[18px] text-cyan-300" aria-hidden="true" />
                  </foreignObject>
                  <text textAnchor="middle" y="20" className="fill-slate-200 text-[10px] font-semibold">{node.label}</text>
                </g>
              );
            })}
          </svg>
        </GlassCard>

        <GlassCard className="p-5">
          {selected ? (
            (() => {
              const n = nodeById(selected);
              const Icon = n.icon;
              return (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-5 h-5 text-cyan-300" aria-hidden="true" />
                    <h3 className="font-semibold text-white text-sm">{n.label}</h3>
                  </div>
                  <dl className="space-y-2 text-xs">
                    <div>
                      <dt className="text-slate-500 font-mono uppercase tracking-widest text-[10px]">Storage</dt>
                      <dd className="text-slate-200 mt-0.5">{n.storage}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 font-mono uppercase tracking-widest text-[10px]">Activity</dt>
                      <dd className="text-slate-200 mt-0.5">{n.activity}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 font-mono uppercase tracking-widest text-[10px]">Connections</dt>
                      <dd className="text-slate-200 mt-0.5">
                        {EDGES.filter(([a, b]) => a === selected || b === selected)
                          .map(([a, b]) => nodeById(a === selected ? b : a).label)
                          .join(', ')}
                      </dd>
                    </div>
                  </dl>
                </div>
              );
            })()
          ) : (
            <p className="text-xs text-slate-500 leading-relaxed">Select any device in the diagram to see its storage, activity, and which other devices it can reach.</p>
          )}
        </GlassCard>
      </div>

      {/* Mobile: simplified stacked list — no overlapping SVG lines on a narrow viewport */}
      <div className="sm:hidden space-y-3">
        {NODES.map((n) => {
          const Icon = n.icon;
          return (
            <GlassCard key={n.id} className="p-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-slate-900 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0">
                <Icon className="w-4 h-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{n.label}</p>
                <p className="text-[11px] text-slate-500 truncate">{n.storage} · {n.activity}</p>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <div className="mt-10 flex justify-center">
        <a
          href={dashboardCtaHref('topology', { signupIfSignedOut: true })}
          className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200 transition-colors"
        >
          View your own mesh live <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </a>
      </div>
    </Section>
  );
};
