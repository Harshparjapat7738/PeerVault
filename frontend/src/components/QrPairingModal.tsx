import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Scanner } from '@yudiel/react-qr-scanner';
import { ShieldCheck, Clock, RefreshCw, QrCode, Camera, AlertCircle, Info, KeyRound, ChevronDown, ChevronUp } from 'lucide-react';
import { Device, DeviceType, OSType, PairingSession, SharingPermissions } from '../types';
import { initiatePairing, confirmPairing, ApiError, isAuthError } from '../api-client';
import { API_BASE_URL } from '../api/client';
import { DevicePermissionDialog } from './DevicePermissionDialog';

interface QrPairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPairSuccess: (newDevice: Device) => void;
}

interface ScannedPayload {
  sessionId: string;
  fingerprint: string;
}

/**
 * `peervault://pair?session=<id>&fp=<fingerprint>` is a custom URI **scheme**, not an HTTP(S) URL —
 * no browser or OS registers a handler for it, and it is never meant to be navigated to or fetched.
 * It exists purely as a data container the QR code carries: this function is the *only* place that
 * ever reads it, and it only ever reads it — parses `session`/`fp` back out with the WHATWG `URL`
 * parser and returns plain strings. Nothing in this file ever does `window.location.href = raw` or
 * `fetch(raw)`; if either shows up in a diff touching this file, that's a regression, not a feature.
 *
 * Returns `null` for anything that isn't recognizably a PeerVault pairing link at all (wrong scheme,
 * or not a URL-shaped string in the first place) — callers use that to show "not a valid PeerVault
 * pairing code" without even attempting to explain what went wrong. A link that *is* shaped right
 * but is missing one of the two params throws `MissingParamError` instead, so callers can show the
 * more specific "missing session or fingerprint" message.
 */
class MissingParamError extends Error {}

function parsePairingUri(raw: string): ScannedPayload | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null; // not a URL at all — e.g. a random QR code, or plain text
  }
  // `peervault://pair?session=...` parses (WHATWG generic syntax) with "pair" as the *host*, not
  // part of the path — `pair?...` sits right after `//`. Checked as `protocol` + `hostname` rather
  // than a raw `startsWith('peervault://pair?')` string check so equivalent forms (e.g. a scanner
  // library that normalizes a trailing "/" before the "?") still match.
  if (url.protocol !== 'peervault:' || url.hostname !== 'pair') return null;
  const sessionId = url.searchParams.get('session');
  const fingerprint = url.searchParams.get('fp');
  if (!sessionId || !fingerprint) throw new MissingParamError();
  return { sessionId, fingerprint };
}

/** Cheap shape check for enabling the manual-entry submit button — true for anything that at least
 *  *looks* like a `peervault://pair` link (even one missing a param, so the button stays clickable
 *  and lets `handleManualSubmit` surface the specific "missing session or fingerprint" error rather
 *  than just sitting disabled with no explanation). */
function isPairingUri(raw: string): boolean {
  try {
    return parsePairingUri(raw) !== null;
  } catch (err) {
    return err instanceof MissingParamError;
  }
}

/** Turns a raw backend error into something a user can actually act on. A 401 here means the
 *  session died (expired/invalid token) — `apiFetch` (`api/client.ts`) already clears it and
 *  redirects to `/login` before this ever renders, so this message is just what's briefly visible
 *  during that redirect, not something the user needs to act on themselves. */
function describePairingError(err: unknown): string {
  if (isAuthError(err)) {
    return 'Your session has expired. Redirecting to login…';
  }
  if (err instanceof ApiError) {
    // status 0 = the fetch itself never got a response — either the backend isn't running, or
    // (the common case on a second device) this page is calling an API_BASE_URL the *current*
    // device can't reach, e.g. still "localhost" while opened from a phone. CORS rejections land
    // here too (the browser reports those as a generic network failure, not a distinguishable
    // status). Naming the actual URL in use turns "it just doesn't work" into something checkable.
    if (err.status === 0) {
      return `Could not reach the PeerVault backend at ${API_BASE_URL}. If you're on a different ` +
        `device than the one running the backend, "localhost" won't resolve to it — set ` +
        `VITE_API_BASE_URL to your PC's LAN IP (e.g. http://10.242.248.71:8080) and reload. Also ` +
        `check the backend's FRONTEND_ORIGIN matches this page's origin, or the request may be ` +
        `silently blocked by CORS instead.`;
    }
    return err.message;
  }
  return 'Could not reach device-service. Is the backend mesh running?';
}

/** Best-effort classification of a getUserMedia failure. Camera access is only guaranteed on a
 *  "secure context" (https:// or http://localhost) — opening this app from a LAN IP over plain
 *  http:// (the common case for a phone reaching a PC by IP) is the single most likely reason the
 *  Scan tab's camera never starts, so it gets called out by name instead of leaving the raw
 *  DOMException message ("Permission denied" etc.) to speak for itself. */
function describeCameraError(err: { message?: string; name?: string } | Error): string {
  const name = (err as any).name || '';
  const insecureContext = typeof window !== 'undefined' &&
    window.location.protocol !== 'https:' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';
  if (insecureContext || name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera access is not available on this connection. Browsers only allow the camera ' +
      'over HTTPS or on localhost — a LAN IP like this one (' + window.location.origin + ') is ' +
      'often blocked. Use an HTTPS tunnel (e.g. ngrok) for reliable camera access, or enter the ' +
      "session details from the QR manually below.";
  }
  return `Camera error: ${err.message || 'unknown error'}. You can also enter the session details manually below.`;
}

/**
 * QR-only device pairing — the session id only ever moves from `initiatePairing()` into a rendered
 * QR code and back out either through a decoded camera frame, or (see `showManualEntry` below) a
 * plain-text fallback of the same two values, for when the camera itself is unavailable (most
 * commonly: this page opened over plain http:// on a LAN IP, where browsers block getUserMedia).
 * There is still no separate human-typable *pairing code* — the fallback is the QR's own payload
 * typed in by hand, not an alternate secret. See backend/CLAUDE.md Task 9 for the full rationale.
 *
 * Two modes, since this is one web app standing in for both sides of a real handshake:
 * - "Generate": this browser already has a paired identity and is inviting a new device.
 * - "Scan": this browser IS the new device, scanning a QR shown elsewhere (another tab/device).
 *
 * Important: the QR encodes a `peervault://` URI — a scheme only *this app's own* Scan tab knows
 * how to read. A phone's stock Camera/QR app will not open anything for it (no OS-level handler
 * exists for a made-up scheme) — the joining device must have this same web app open and use its
 * in-app Scan QR tab, not its regular camera.
 */
export const QrPairingModal: React.FC<QrPairingModalProps> = ({ isOpen, onClose, onPairSuccess }) => {
  const [mode, setMode] = useState<'generate' | 'scan'>('generate');

  // Generate mode state
  const [session, setSession] = useState<PairingSession | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Scan mode state
  const [scanned, setScanned] = useState<ScannedPayload | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Manual entry fallback — only surfaced once a real camera error happens, or the user asks for
  // it themselves; the Scanner stays the primary path.
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualSessionId, setManualSessionId] = useState('');
  const [manualFingerprint, setManualFingerprint] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setMode('generate');
      setSession(null);
      setSecondsLeft(0);
      setGenerateError(null);
      setScanned(null);
      setScanError(null);
      setConfirmError(null);
      setShowManualEntry(false);
      setManualSessionId('');
      setManualFingerprint('');
      return;
    }
    // Dev diagnostic: the #1 cause of "QR scan does nothing on my other device" is this page
    // silently talking to a backend the other device can't reach (still "localhost" instead of
    // the host machine's LAN IP). Logging it up front makes that checkable in devtools without
    // needing to trigger a failing request first.
    // eslint-disable-next-line no-console
    console.info(`[QrPairingModal] API_BASE_URL = ${API_BASE_URL} · page origin = ${window.location.origin}`);
  }, [isOpen]);

  // Live countdown against the real expiresInSeconds the backend returned.
  useEffect(() => {
    if (!session || secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft(s => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(timer);
  }, [session, secondsLeft]);

  // Render the real QR payload as an actual scannable code once we have one.
  useEffect(() => {
    if (session && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, session.qrPayload, { width: 240, margin: 1 }).catch(() => {
        setGenerateError('Failed to render QR code.');
      });
    }
  }, [session]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const s = await initiatePairing();
      setSession(s);
      setSecondsLeft(s.expiresInSeconds);
    } catch (err) {
      setGenerateError(describePairingError(err));
    } finally {
      setGenerating(false);
    }
  };

  /** Decoded camera frame → `parsePairingUri` only, never a navigation or fetch of the raw string
   *  (see the comment on `parsePairingUri` itself). This is also the only place a "not a valid
   *  PeerVault pairing code" verdict gets produced — there is no separate generic "here's what this
   *  link is" page anywhere in this app for an unrecognized scan to fall through to. */
  const handleScan = (rawValue: string) => {
    if (scanned) return; // already decoded one — ignore further frames until reset
    try {
      const payload = parsePairingUri(rawValue);
      if (!payload) {
        setScanError('This QR code is not a valid PeerVault pairing code.');
        return;
      }
      setScanError(null);
      setScanned(payload);
    } catch (err) {
      if (err instanceof MissingParamError) {
        setScanError('Invalid pairing QR code – missing session or fingerprint.');
      } else {
        setScanError('This QR code is not a valid PeerVault pairing code.');
      }
    }
  };

  /** Same destination as `handleScan`, just fed from the manual-entry inputs instead of a decoded
   *  camera frame — for when the camera itself isn't available (see `describeCameraError`). Not a
   *  separate pairing code: these are the exact `session`/`fp` values the QR itself encodes, just
   *  read and typed by a human instead of a camera — from here on (permission dialog, confirm call,
   *  success/error states) it is the *identical* path `handleScan` uses, via the same `scanned`
   *  state and the same `handleAccept` below.
   *
   *  Convenience: if the whole `peervault://pair?...` link got pasted into the Session ID field
   *  (e.g. copied from wherever it failed to open as a link), parse it the same way a scan would
   *  instead of making the person split it into two fields by hand. */
  const handleManualSubmit = () => {
    try {
      const pastedUri = parsePairingUri(manualSessionId);
      if (pastedUri) {
        setScanError(null);
        setScanned(pastedUri);
        return;
      }
    } catch (err) {
      if (err instanceof MissingParamError) {
        setScanError('Invalid pairing QR code – missing session or fingerprint.');
        return;
      }
      // fall through — not a peervault:// link at all, treat the field as a plain session id
    }
    const sessionId = manualSessionId.trim();
    const fingerprint = manualFingerprint.trim();
    if (!sessionId || !fingerprint) return;
    setScanError(null);
    setScanned({ sessionId, fingerprint });
  };

  const handleAccept = async (
    profile: { name: string; type: DeviceType; os: OSType; rootPath: string; rootLabel: string; allowDelete: boolean },
    permissions: SharingPermissions
  ) => {
    if (!scanned) return;
    setConfirming(true);
    setConfirmError(null);
    try {
      // scanned.fingerprint is deliberately not sent here — it's a client-side display value only
      // (shown in DevicePermissionDialog for the human to visually cross-check against the
      // generating device's screen). The backend already has it from pair/init and re-derives
      // everything it needs from sessionId alone; see backend/README.md's pairing section.
      const device = await confirmPairing({
        sessionId: scanned.sessionId,
        name: profile.name,
        type: profile.type,
        os: profile.os,
        allowedRoots: [{ path: profile.rootPath, label: profile.rootLabel, allowDelete: profile.allowDelete }],
        permissions
      });
      onPairSuccess(device);
      onClose();
    } catch (err) {
      setConfirmError(describePairingError(err));
    } finally {
      setConfirming(false);
    }
  };

  const handleDecline = () => {
    setScanned(null);
    setScanError(null);
    setConfirmError(null);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div className="bg-[#FFFFFF] border border-[#1A1A1A]/30 max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

          <div className="p-6 border-b border-[#1A1A1A]/20 bg-[#F9F8F6] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#FFFFFF] border border-[#1A1A1A]/20 text-[#1A1A1A]">
                <ShieldCheck className="w-5 h-5 text-emerald-800" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-[#1A1A1A] text-lg">Pair Trusted Storage Node</h3>
                <p className="text-xs font-mono text-[#76746E]">QR-Only Cryptographic Handshake</p>
              </div>
            </div>
            <button onClick={onClose} className="text-[#76746E] hover:text-[#1A1A1A] p-1.5 hover:bg-[#EFECE6] transition-colors cursor-pointer">
              ✕
            </button>
          </div>

          {/* Mode toggle */}
          <div className="flex border-b border-[#1A1A1A]/10">
            {[
              { m: 'generate' as const, label: 'Generate QR', icon: QrCode },
              { m: 'scan' as const, label: 'Scan QR', icon: Camera }
            ].map(({ m, label, icon: Icon }) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-3 flex items-center justify-center space-x-2 text-xs font-mono uppercase transition-colors cursor-pointer ${
                  mode === m ? 'bg-[#1A1A1A] text-[#F9F8F6]' : 'bg-[#FFFFFF] text-[#76746E] hover:bg-[#F9F8F6]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="p-6 space-y-4">
            {mode === 'generate' && (
              <div className="space-y-4 text-center">
                {!session ? (
                  <div className="py-8">
                    <QrCode className="w-14 h-14 mx-auto mb-4 text-[#1A1A1A]/40" />
                    <p className="text-xs text-[#5A5955] mb-3 max-w-sm mx-auto leading-relaxed">
                      Generate a real, scannable QR code. The joining device scans it from{' '}
                      <strong className="text-[#1A1A1A]">inside this same PeerVault app's own Scan
                      QR tab</strong> — not its regular camera app — and grants its own permissions
                      before it's ever added to the mesh.
                    </p>
                    <p className="text-[11px] text-[#76746E] mb-6 max-w-sm mx-auto leading-relaxed">
                      Pairing from another device on your network? It needs to reach this app and
                      backend by your PC's LAN IP, not "localhost" — see the frontend README's
                      "Cross-device / LAN setup" section.
                    </p>
                    {generateError && (
                      <div className="mb-4 p-3 bg-rose-50 border border-rose-300 text-xs text-rose-800 flex items-start space-x-2 text-left">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{generateError}</span>
                      </div>
                    )}
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-[#1A1A1A] hover:bg-[#333333] text-[#F9F8F6] text-xs font-mono font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <span>{generating ? 'Generating…' : 'Generate QR Code'}</span>
                    </button>
                  </div>
                ) : secondsLeft > 0 ? (
                  <div className="bg-[#F9F8F6] p-5 border border-[#1A1A1A]/20 flex flex-col items-center justify-center space-y-3">
                    <div className="flex items-start space-x-1.5 text-left bg-[#FFFFFF] border border-[#1A1A1A]/15 px-3 py-2 max-w-[260px]">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#5A5955]" />
                      <p className="text-[11px] text-[#5A5955] leading-relaxed">
                        Scan with the <strong className="text-[#1A1A1A]">Scan QR</strong> tab in the
                        PeerVault app on your other device — your phone's own camera app can't open this.
                      </p>
                    </div>
                    <canvas ref={canvasRef} className="bg-white border border-[#1A1A1A]/20 p-2 shadow-xs" />
                    <div className="flex items-center justify-between w-full text-xs px-1 text-[#5A5955] font-mono">
                      <span className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1 text-amber-700" />
                        Expires in: <strong className="text-[#1A1A1A] ml-1">{formatTime(secondsLeft)}</strong>
                      </span>
                      <span className="text-[11px] text-[#76746E] truncate max-w-[160px]" title={session.deviceFingerprint}>
                        {session.deviceFingerprint}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-8">
                    <AlertCircle className="w-10 h-10 mx-auto mb-3 text-amber-700" />
                    <p className="text-xs text-[#5A5955] mb-4">This QR code has expired.</p>
                    <button
                      onClick={handleGenerate}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-[#F9F8F6] text-xs font-mono font-semibold transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Generate New QR Code</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {mode === 'scan' && (
              <div className="space-y-3">
                <p className="text-xs text-[#5A5955] leading-relaxed">
                  Point this device's camera at the QR code shown on the other screen — using this
                  app's own scanner below, not your device's regular camera/QR app.
                </p>
                {scanError && (
                  <div className="p-3 bg-rose-50 border border-rose-300 text-xs text-rose-800 flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{scanError}</span>
                  </div>
                )}
                <div className="w-full aspect-square bg-[#1A1A1A] overflow-hidden border border-[#1A1A1A]/30">
                  <Scanner
                    paused={!!scanned}
                    onScan={(codes) => codes[0] && handleScan(codes[0].rawValue)}
                    onError={(err) => {
                      setScanError(describeCameraError(err as any));
                      setShowManualEntry(true); // a real camera failure — surface the fallback immediately
                    }}
                  />
                </div>
                <p className="text-[11px] text-[#76746E] text-center">
                  Camera permission is requested by your browser on first use.
                </p>

                <div className="pt-2 border-t border-[#1A1A1A]/10">
                  <button
                    type="button"
                    onClick={() => setShowManualEntry(v => !v)}
                    className="w-full flex items-center justify-between text-[11px] font-mono uppercase text-[#5A5955] hover:text-[#1A1A1A] py-1 cursor-pointer"
                  >
                    <span className="flex items-center space-x-1.5">
                      <KeyRound className="w-3 h-3" />
                      <span>Camera not working? Enter details manually</span>
                    </span>
                    {showManualEntry ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {showManualEntry && (
                    <div className="space-y-2 pt-2">
                      <p className="text-[11px] text-[#76746E] leading-relaxed">
                        Paste the full <code className="font-mono">peervault://pair?...</code> link
                        into the first field below, or read the two values off the generating
                        device's screen and type them in separately — either way this is the exact
                        same `session`/`fp` pair the QR code encodes, not a separate code. (Remember:
                        that link isn't a normal web address — it can't be opened by tapping it or
                        pasting it into a browser's address bar; it only means anything typed in here.)
                      </p>
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[#1A1A1A] font-semibold mb-1">Session ID (or full pairing link)</label>
                        <input
                          type="text"
                          value={manualSessionId}
                          onChange={(e) => setManualSessionId(e.target.value)}
                          placeholder="peervault://pair?session=...&fp=... — or just the session id"
                          className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#1A1A1A]/30 text-[#1A1A1A] text-xs font-mono focus:outline-none focus:border-[#1A1A1A]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[#1A1A1A] font-semibold mb-1">Device Fingerprint</label>
                        <input
                          type="text"
                          value={manualFingerprint}
                          onChange={(e) => setManualFingerprint(e.target.value)}
                          placeholder="Not needed if you pasted the full link above"
                          className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#1A1A1A]/30 text-[#1A1A1A] text-xs font-mono focus:outline-none focus:border-[#1A1A1A]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleManualSubmit}
                        disabled={!manualSessionId.trim() || (!manualFingerprint.trim() && !isPairingUri(manualSessionId))}
                        className="w-full inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-[#F9F8F6] text-xs font-mono font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <span>Use These Values</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Always-visible diagnostic footer — the single most useful line for "why doesn't this
              work on my other device": whether this page is even pointed at a reachable backend. */}
          <div className="px-6 py-2 border-t border-[#1A1A1A]/10 bg-[#F9F8F6]">
            <p className="text-[10px] font-mono text-[#76746E] truncate" title={API_BASE_URL}>
              Backend: {API_BASE_URL}
            </p>
          </div>
        </div>
      </div>

      {scanned && (
        <DevicePermissionDialog
          sessionId={scanned.sessionId}
          deviceFingerprint={scanned.fingerprint}
          onAccept={handleAccept}
          onDecline={handleDecline}
          submitting={confirming}
          error={confirmError}
        />
      )}
    </>
  );
};
