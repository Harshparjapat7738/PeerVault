import React from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useGsapScope, MeshBackdrop } from './shared';
import { scrollToId } from '../../lib/url';
import { dashboardCtaHref } from '../../lib/auth-nav';

/**
 * The hero network diagram from the brief: one device feeding into a central "Storage Mesh
 * Control" node, which fans back out to two more devices — nodes appear one by one, connection
 * lines draw themselves, storage counters count up, and small packets travel the lines on a loop
 * while the hero is in view. This is the first thing a visitor sees, so it teaches the core idea
 * (a network of *your* devices, not one remote bucket) before a single word of copy is read.
 */

type NodeDef = { id: string; x: number; y: number; label: string; capacity: number; unit: 'GB' | 'TB' };

const NODES: NodeDef[] = [
  { id: 'top', x: 300, y: 56, label: 'Laptop', capacity: 500, unit: 'GB' },
  { id: 'left', x: 150, y: 372, label: 'Desktop', capacity: 1, unit: 'TB' },
  { id: 'right', x: 450, y: 372, label: 'Laptop', capacity: 250, unit: 'GB' },
];

const CONTROL = { x: 300, y: 214 };

export const HeroMesh: React.FC = () => {
  const scopeRef = useGsapScope<HTMLDivElement>((el, reduced) => {
    const svg = el.querySelector('svg') as SVGSVGElement | null;
    if (!svg) return;

    const nodeEls = gsap.utils.toArray<SVGGElement>('.hero-node', svg);
    const controlEl = svg.querySelector('.hero-control') as SVGGElement | null;
    const lineEls = gsap.utils.toArray<SVGPathElement>('.hero-line', svg);
    const counters = gsap.utils.toArray<HTMLElement>('.hero-counter', el);
    const packets = gsap.utils.toArray<SVGCircleElement>('.hero-packet', svg);

    lineEls.forEach((line) => {
      const len = line.getTotalLength();
      gsap.set(line, { strokeDasharray: len, strokeDashoffset: reduced ? 0 : len });
    });

    if (reduced) {
      gsap.set([...nodeEls, controlEl].filter(Boolean), { opacity: 1, scale: 1 });
      counters.forEach((c) => {
        const target = Number(c.dataset.value || '0');
        c.textContent = String(target);
      });
      gsap.set(packets, { opacity: 0 });
      return;
    }

    gsap.set([...nodeEls, controlEl].filter(Boolean), { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' });
    gsap.set(packets, { opacity: 0 });

    const intro = gsap.timeline({ defaults: { ease: 'back.out(1.6)' } });
    intro
      .to(nodeEls[0], { opacity: 1, scale: 1, duration: 0.5 })
      .to(lineEls[0], { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out' }, '-=0.1')
      .to(controlEl, { opacity: 1, scale: 1, duration: 0.55 }, '-=0.1')
      .to([lineEls[1], lineEls[2]], { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out', stagger: 0.1 }, '-=0.15')
      .to(nodeEls.slice(1), { opacity: 1, scale: 1, duration: 0.5, stagger: 0.12 }, '-=0.35')
      .add(() => {
        counters.forEach((c) => {
          const target = Number(c.dataset.value || '0');
          const counter = { val: 0 };
          gsap.to(counter, {
            val: target,
            duration: 1,
            ease: 'power1.out',
            onUpdate: () => {
              c.textContent = target % 1 === 0 ? String(Math.round(counter.val)) : counter.val.toFixed(1);
            },
          });
        });
      }, '-=0.3')
      .to(controlEl, {
        keyframes: [{ scale: 1.06 }, { scale: 1 }],
        duration: 1.6,
        repeat: -1,
        ease: 'sine.inOut',
        transformOrigin: '50% 50%',
      });

    // Packets travel top→control→(left/right, alternating) on an infinite loop.
    const packetLoop = gsap.timeline({ repeat: -1, delay: 1.3 });
    const topToControl = { x1: 300, y1: 80, x2: CONTROL.x, y2: CONTROL.y - 18 };
    const controlToLeft = { x1: CONTROL.x, y1: CONTROL.y + 18, x2: 150, y2: 350 };
    const controlToRight = { x1: CONTROL.x, y1: CONTROL.y + 18, x2: 450, y2: 350 };

    if (packets[0]) {
      packetLoop
        .set(packets[0], { attr: { cx: topToControl.x1, cy: topToControl.y1 }, opacity: 1 })
        .to(packets[0], { attr: { cx: topToControl.x2, cy: topToControl.y2 }, duration: 0.7, ease: 'power1.inOut' })
        .set(packets[0], { attr: { cx: controlToLeft.x1, cy: controlToLeft.y1 } })
        .to(packets[0], { attr: { cx: controlToLeft.x2, cy: controlToLeft.y2 }, duration: 0.7, ease: 'power1.inOut' })
        .to(packets[0], { opacity: 0, duration: 0.2 })
        .to({}, { duration: 0.4 });
    }
    if (packets[1]) {
      packetLoop
        .set(packets[1], { attr: { cx: topToControl.x1, cy: topToControl.y1 }, opacity: 1 }, 1.1)
        .to(packets[1], { attr: { cx: topToControl.x2, cy: topToControl.y2 }, duration: 0.7, ease: 'power1.inOut' }, 1.1)
        .set(packets[1], { attr: { cx: controlToRight.x1, cy: controlToRight.y1 } }, 1.8)
        .to(packets[1], { attr: { cx: controlToRight.x2, cy: controlToRight.y2 }, duration: 0.7, ease: 'power1.inOut' }, 1.8)
        .to(packets[1], { opacity: 0, duration: 0.2 }, 2.5);
    }

    // Performance discipline: only run the infinite loops while the hero is actually on screen.
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      onEnter: () => packetLoop.play(),
      onLeave: () => packetLoop.pause(),
      onEnterBack: () => packetLoop.play(),
      onLeaveBack: () => packetLoop.pause(),
    });

    return () => {
      st.kill();
    };
  }, []);

  // A device node in this diagram isn't a real, connected device — clicking one teaches more about
  // *how* a device joins the mesh (the dedicated demo below) rather than pretending to open one.
  const focusOnDeviceConnection = () => scrollToId('connect-device');

  return (
    <section id="product" className="relative min-h-[92vh] flex items-center pt-28 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden scroll-mt-20">
      <MeshBackdrop variant="strong" />
      <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-300/80 mb-6 border border-cyan-400/20 bg-cyan-400/5 rounded-full px-3 py-1.5">
            A personal storage mesh, not a cloud bucket
          </div>
          <h1 className="font-serif font-bold text-4xl sm:text-5xl lg:text-[3.4rem] leading-[1.08] text-white tracking-tight text-balance">
            Your Devices. Your Storage. One Mesh.
          </h1>
          <p className="mt-6 text-base sm:text-lg text-slate-400 leading-relaxed max-w-lg">
            Connect the devices you already own and turn their available storage into a coordinated
            personal storage network — with explicit permissions, visible device state, and auditable
            transfers between the nodes you control.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href={dashboardCtaHref('devices', { signupIfSignedOut: true })}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950 bg-white hover:bg-cyan-300 transition-colors px-5 py-3 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 focus-visible:outline-offset-2"
            >
              Get Started <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={() => scrollToId('how-it-works')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200 border border-white/15 hover:border-white/40 transition-colors px-5 py-3 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
            >
              See How It Works <ChevronDown className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div ref={scopeRef} className="relative mx-auto w-full max-w-md">
          <svg viewBox="0 0 600 460" className="w-full h-auto" role="img" aria-label="Diagram: a laptop and two more devices connect through a central Storage Mesh control node, forming one personal storage network">
            <path className="hero-line" d="M300,80 L300,196" fill="none" stroke="url(#meshLineGrad)" strokeWidth="2" />
            <path className="hero-line" d="M300,232 L150,350" fill="none" stroke="url(#meshLineGrad)" strokeWidth="2" />
            <path className="hero-line" d="M300,232 L450,350" fill="none" stroke="url(#meshLineGrad)" strokeWidth="2" />

            <defs>
              <linearGradient id="meshLineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.25" />
              </linearGradient>
            </defs>

            <circle className="hero-packet" cx="300" cy="80" r="4.5" fill="#67e8f9" opacity="0" />
            <circle className="hero-packet" cx="300" cy="80" r="4.5" fill="#67e8f9" opacity="0" />

            {/* Top device node — clickable: jumps to the real device-connection demo below, not a
                fake "open this device" action. */}
            <g
              className="hero-node cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
              transform={`translate(${NODES[0].x},${NODES[0].y})`}
              role="button"
              tabIndex={0}
              aria-label={`${NODES[0].label} — see how a device like this connects to the mesh`}
              onClick={focusOnDeviceConnection}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); focusOnDeviceConnection(); } }}
            >
              <rect x="-72" y="-30" width="144" height="60" rx="10" fill="#0f172a" stroke="#334155" />
              <text textAnchor="middle" y="-6" className="fill-slate-200 text-[13px] font-semibold" style={{ fontFamily: 'inherit' }}>{NODES[0].label}</text>
              <text textAnchor="middle" y="14" className="fill-cyan-300 font-mono text-[12px]">
                <tspan className="hero-counter" data-value={NODES[0].capacity}>0</tspan> {NODES[0].unit}
              </text>
            </g>

            {/* Control node */}
            <g className="hero-control" transform={`translate(${CONTROL.x},${CONTROL.y})`}>
              <rect x="-92" y="-36" width="184" height="72" rx="12" fill="#0e2230" stroke="#22d3ee" strokeOpacity="0.5" />
              <text textAnchor="middle" y="-6" className="fill-white text-[13px] font-bold" style={{ fontFamily: 'inherit' }}>STORAGE MESH</text>
              <text textAnchor="middle" y="14" className="fill-cyan-300 font-mono text-[10px] tracking-widest">CONTROL PLANE</text>
            </g>

            {/* Bottom-left device node */}
            <g
              className="hero-node cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
              transform={`translate(${NODES[1].x},${NODES[1].y})`}
              role="button"
              tabIndex={0}
              aria-label={`${NODES[1].label} — see how a device like this connects to the mesh`}
              onClick={focusOnDeviceConnection}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); focusOnDeviceConnection(); } }}
            >
              <rect x="-72" y="-30" width="144" height="60" rx="10" fill="#0f172a" stroke="#334155" />
              <text textAnchor="middle" y="-6" className="fill-slate-200 text-[13px] font-semibold" style={{ fontFamily: 'inherit' }}>{NODES[1].label}</text>
              <text textAnchor="middle" y="14" className="fill-cyan-300 font-mono text-[12px]">
                <tspan className="hero-counter" data-value={NODES[1].capacity}>0</tspan> {NODES[1].unit}
              </text>
            </g>

            {/* Bottom-right device node */}
            <g
              className="hero-node cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
              transform={`translate(${NODES[2].x},${NODES[2].y})`}
              role="button"
              tabIndex={0}
              aria-label={`${NODES[2].label} — see how a device like this connects to the mesh`}
              onClick={focusOnDeviceConnection}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); focusOnDeviceConnection(); } }}
            >
              <rect x="-72" y="-30" width="144" height="60" rx="10" fill="#0f172a" stroke="#334155" />
              <text textAnchor="middle" y="-6" className="fill-slate-200 text-[13px] font-semibold" style={{ fontFamily: 'inherit' }}>{NODES[2].label}</text>
              <text textAnchor="middle" y="14" className="fill-cyan-300 font-mono text-[12px]">
                <tspan className="hero-counter" data-value={NODES[2].capacity}>0</tspan> {NODES[2].unit}
              </text>
            </g>
          </svg>
          <p className="text-center text-[11px] font-mono uppercase tracking-widest text-slate-500 mt-2">
            Not one remote bucket — a connected network of your own devices
          </p>
        </div>
      </div>
    </section>
  );
};
