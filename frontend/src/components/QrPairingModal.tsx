import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Scanner } from '@yudiel/react-qr-scanner';
import { ShieldCheck, Clock, RefreshCw, QrCode, Camera, AlertCircle } from 'lucide-react';
import { Device, DeviceType, OSType, PairingSession, SharingPermissions } from '../types';
import { initiatePairing, confirmPairing, ApiError } from '../api-client';
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
 * QR-only device pairing. There is no PIN, no manual code entry anywhere in this component — the
 * session id only ever moves from `initiatePairing()` into a rendered QR code and back out through
 * a decoded camera frame. See backend/CLAUDE.md Task 9 for the full rationale.
 *
 * Two modes, since this is one web app standing in for both sides of a real handshake:
 * - "Generate": this browser already has a paired identity and is inviting a new device.
 * - "Scan": this browser IS the new device, scanning a QR shown elsewhere (another tab/device).
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

  useEffect(() => {
    if (!isOpen) {
      setMode('generate');
      setSession(null);
      setSecondsLeft(0);
      setGenerateError(null);
      setScanned(null);
      setScanError(null);
      setConfirmError(null);
    }
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
      setGenerateError(err instanceof ApiError ? err.message : 'Could not reach device-service. Is the backend mesh running?');
    } finally {
      setGenerating(false);
    }
  };

  const handleScan = (rawValue: string) => {
    if (scanned) return; // already decoded one — ignore further frames until reset
    try {
      const url = new URL(rawValue);
      const sessionId = url.searchParams.get('session');
      const fingerprint = url.searchParams.get('fp');
      if (url.protocol !== 'peervault:' || !sessionId || !fingerprint) {
        throw new Error('not a pairing code');
      }
      setScanError(null);
      setScanned({ sessionId, fingerprint });
    } catch {
      setScanError('That QR code isn’t a PeerVault pairing code.');
    }
  };

  const handleAccept = async (
    profile: { name: string; type: DeviceType; os: OSType; rootPath: string; rootLabel: string; allowDelete: boolean },
    permissions: SharingPermissions
  ) => {
    if (!scanned) return;
    setConfirming(true);
    setConfirmError(null);
    try {
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
      setConfirmError(err instanceof ApiError ? err.message : 'Could not reach device-service. Is the backend mesh running?');
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
                    <p className="text-xs text-[#5A5955] mb-6 max-w-sm mx-auto leading-relaxed">
                      Generate a real, scannable QR code. The joining device scans it — with a camera —
                      and grants its own permissions before it's ever added to the mesh.
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
                  Point this device's camera at the QR code shown on the other screen.
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
                    onError={(err) => setScanError(`Camera error: ${err.message}`)}
                  />
                </div>
                <p className="text-[11px] text-[#76746E] text-center">
                  Camera permission is requested by your browser on first use.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {scanned && (
        <DevicePermissionDialog
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
