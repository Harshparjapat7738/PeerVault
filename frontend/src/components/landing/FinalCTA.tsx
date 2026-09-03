import React from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight } from 'lucide-react';
import { useGsapScope } from './shared';
import { dashboardCtaHref } from '../../lib/auth-nav';

/** Final call-to-action with a quiet, looping mesh backdrop — paused off-screen like every other
 *  looping animation on this page. */
export const FinalCTA: React.FC = () => {
  const scopeRef = useGsapScope<HTMLDivElement>((el, reduced) => {
    const dots = gsap.utils.toArray<SVGCircleElement>('.cta-dot', el);
    if (reduced) return;

    const loop = gsap.timeline({ repeat: -1 });
    dots.forEach((dot, i) => {
      loop.to(dot, { opacity: 0.9, duration: 1.2, ease: 'sine.inOut' }, i * 0.3)
        .to(dot, { opacity: 0.15, duration: 1.2, ease: 'sine.inOut' }, i * 0.3 + 1.2);
    });

    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      onEnter: () => loop.play(),
      onLeave: () => loop.pause(),
      onEnterBack: () => loop.play(),
      onLeaveBack: () => loop.pause(),
    });
    return () => { st.kill(); loop.kill(); };
  }, []);

  return (
    <section className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden bg-slate-950 border-y border-white/5">
      <div ref={scopeRef} className="absolute inset-0 -z-10 flex items-center justify-center opacity-60" aria-hidden="true">
        <svg viewBox="0 0 400 200" className="w-full max-w-3xl">
          {Array.from({ length: 18 }).map((_, i) => (
            <circle
              key={i}
              className="cta-dot"
              cx={20 + (i % 6) * 72}
              cy={20 + Math.floor(i / 6) * 70}
              r="2.5"
              fill="#22d3ee"
              opacity={0.3}
            />
          ))}
        </svg>
      </div>

      <div className="max-w-2xl mx-auto text-center relative">
        <h2 className="font-serif font-bold text-3xl sm:text-4xl text-white tracking-tight text-balance">
          Build your own storage mesh.
        </h2>
        <p className="mt-4 text-base text-slate-400 leading-relaxed">
          Connect the devices you already own and turn them into a coordinated personal storage network.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <a
            href={dashboardCtaHref('devices', { signupIfSignedOut: true })}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950 bg-white hover:bg-cyan-300 transition-colors px-6 py-3 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 focus-visible:outline-offset-2"
          >
            Get Started <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </a>
          <a
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200 border border-white/15 hover:border-white/40 transition-colors px-6 py-3 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            Login
          </a>
        </div>
      </div>
    </section>
  );
};
