/** Tiny query-param reader shared by anything that needs one — `pages/LoginPage.tsx` (`?mode=`,
 *  `?reason=`) and `App.tsx`'s `Dashboard` (`?tab=`, `?action=`) both used to keep a private copy
 *  of this; pulled out once a second caller needed the same logic rather than duplicating it again. */
export function readQueryParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
}

/** Smooth-scrolls to an in-page element by id, respecting `prefers-reduced-motion` (jumps instantly
 *  instead of animating). Shared by the landing page's navbar/footer anchors, its own section-level
 *  deep links (`/#how-it-works`, `/#connect-device`, ...), and its clickable diagram nodes/cards —
 *  every one of them needs the exact same "find the element, scroll to it, don't fight reduced
 *  motion" behavior, so it lives here instead of being re-implemented per component.
 */
export function scrollToId(id: string, options: { updateHash?: boolean } = {}): boolean {
  if (typeof document === 'undefined') return false;
  const target = document.getElementById(id);
  if (!target) return false;
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  if (options.updateHash !== false && typeof history !== 'undefined') {
    history.replaceState(null, '', `#${id}`);
  }
  return true;
}
