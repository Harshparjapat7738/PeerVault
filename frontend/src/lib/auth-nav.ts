import { getToken } from '../api/client';

/**
 * The dashboard has always been tab-based, not route-based (see `App.tsx`'s `Dashboard` /
 * `Header.tsx`'s `navItems`) — there is no `/devices`, `/transfers`, etc. These are the real tab
 * ids that already exist today; nothing here invents a new one.
 */
export type DashboardTab = 'devices' | 'files' | 'transfers' | 'sharing' | 'security' | 'topology';

export interface DashboardCtaOptions {
  /** Also auto-open the real "Connect Device" pairing modal once the dashboard mounts (the actual
   *  QR-pairing flow in `QrPairingModal.tsx` — real `pair/init`/`pair/confirm` calls, nothing
   *  fabricated) — for CTAs whose whole point is starting that flow, not just landing on the tab. */
  openPairing?: boolean;
  /** Send a signed-out visitor to the login screen's Sign Up tab instead of its default Login tab. */
  signupIfSignedOut?: boolean;
}

/**
 * The one function every "do this in your account" CTA on the public landing page calls to decide
 * where a click goes — using the *same* auth check `App.tsx`'s router already makes (`getToken()`),
 * not a second, parallel auth system (see `frontend/CLAUDE.md`'s landing-page navigation audit for
 * why one shared function beats duplicating this branch in every component).
 *
 * Signed out -> the real `/login` screen (optionally its Sign Up tab via `?mode=signup`, which
 * `LoginPage.tsx` already reads). Signed in -> the real `Dashboard` at `/`, deep-linked to the
 * relevant tab via `?tab=`/`?action=`, which `Dashboard`'s own state initializers read on mount.
 *
 * In practice, `LandingPage` only ever renders for a signed-out visitor — `App.tsx` sends anyone
 * with a token straight to `Dashboard` before this page would mount at all — so the "signed in"
 * branch below is defensive rather than a path a real click on this page normally takes today. It's
 * kept anyway so the function stays correct if that ever changes, and so every CTA shares one
 * implementation instead of five near-identical `getToken() ? ... : ...` checks.
 */
export function dashboardCtaHref(tab: DashboardTab, options: DashboardCtaOptions = {}): string {
  if (getToken()) {
    const params = new URLSearchParams({ tab });
    if (options.openPairing) params.set('action', 'pair');
    return `/?${params.toString()}`;
  }
  return options.signupIfSignedOut ? '/login?mode=signup' : '/login';
}
