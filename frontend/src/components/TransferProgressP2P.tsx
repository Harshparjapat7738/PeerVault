import React, { useEffect, useRef, useState } from 'react';
import { Zap, Wifi, WifiOff, Loader2, CheckCircle2, XCircle, Radio } from 'lucide-react';
import { sendP2POffer, sendP2PAnswer, sendP2PIceCandidate } from '../api-client';
import { subscribeStomp } from '../stomp-client';

/**
 * A real (not simulated) WebRTC handshake, driven by transfer-service's signaling relay
 * (`/api/v1/transfers/p2p/*` + `/topic/webrtc/{transferId}`, see Task 5). This is a *signaling and
 * connection-state* UI, matching its name — it establishes the peer connection and shows its
 * progress doing so, but doesn't implement chunked file transfer over the resulting data channel,
 * which is a separate, larger protocol beyond "progress UI".
 *
 * Load this component once on each of the two participating devices' browsers with matching
 * `transferId` and opposite `role` — `initiateP2PTransfer()` (api-client) gives the initiator its
 * `transferId`; the target learns it off the `/topic/transfers` broadcast, same as the backend does
 * (see `P2PSignalingService`'s javadoc).
 */

type ConnectionPhase = 'negotiating' | 'connecting' | 'connected' | 'failed' | 'closed';

interface TransferProgressP2PProps {
  transferId: string;
  role: 'initiator' | 'target';
  fileName?: string;
  onClose?: () => void;
}

interface SignalPayload {
  type: 'offer' | 'answer' | 'ice-candidate';
  payload: string;
}

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

export const TransferProgressP2P: React.FC<TransferProgressP2PProps> = ({ transferId, role, fileName, onClose }) => {
  const [phase, setPhase] = useState<ConnectionPhase>('negotiating');
  const [iceState, setIceState] = useState<RTCIceConnectionState>('new');
  const [log, setLog] = useState<string[]>([]);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const sentCandidates = useRef<Set<string>>(new Set());

  const appendLog = (line: string) => setLog(prev => [...prev.slice(-6), line]);

  useEffect(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.oniceconnectionstatechange = () => {
      setIceState(pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') setPhase('connected');
      else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') setPhase('failed');
    };

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      const payload = JSON.stringify(event.candidate.toJSON());
      sentCandidates.current.add(payload);
      sendP2PIceCandidate(transferId, payload).catch(() => appendLog('Failed to relay an ICE candidate.'));
    };

    let dataChannel: RTCDataChannel | null = null;
    const wireDataChannel = (channel: RTCDataChannel) => {
      dataChannel = channel;
      channel.onopen = () => appendLog('Data channel open.');
      channel.onclose = () => appendLog('Data channel closed.');
    };

    if (role === 'initiator') {
      wireDataChannel(pc.createDataChannel('peervault-transfer'));
      setPhase('connecting');
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer).then(() => offer))
        .then((offer) => {
          appendLog('Sent offer.');
          return sendP2POffer(transferId, JSON.stringify(offer));
        })
        .catch(() => {
          appendLog('Failed to create/send offer.');
          setPhase('failed');
        });
    } else {
      pc.ondatachannel = (event) => wireDataChannel(event.channel);
    }

    const unsubscribe = subscribeStomp(`/topic/webrtc/${transferId}`, (event: SignalPayload) => {
      if (role === 'initiator' && event.type === 'answer') {
        setPhase('connecting');
        appendLog('Received answer.');
        pc.setRemoteDescription(JSON.parse(event.payload)).catch(() => appendLog('Failed to apply remote answer.'));
      } else if (role === 'target' && event.type === 'offer') {
        appendLog('Received offer.');
        pc.setRemoteDescription(JSON.parse(event.payload))
          .then(() => pc.createAnswer())
          .then((answer) => pc.setLocalDescription(answer).then(() => answer))
          .then((answer) => {
            setPhase('connecting');
            appendLog('Sent answer.');
            return sendP2PAnswer(transferId, JSON.stringify(answer));
          })
          .catch(() => {
            appendLog('Failed to create/send answer.');
            setPhase('failed');
          });
      } else if (event.type === 'ice-candidate') {
        // Broadcast topic — both peers see every candidate they themselves sent too; skip echoes.
        if (sentCandidates.current.has(event.payload)) return;
        pc.addIceCandidate(JSON.parse(event.payload)).catch(() => appendLog('Failed to add a remote ICE candidate.'));
      }
    });

    return () => {
      unsubscribe();
      dataChannel?.close();
      pc.close();
      setPhase('closed');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferId, role]);

  const phaseDisplay: Record<ConnectionPhase, { label: string; icon: React.ReactNode; className: string }> = {
    negotiating: { label: 'Negotiating', icon: <Loader2 className="w-4 h-4 animate-spin" />, className: 'text-[#5A5955]' },
    connecting: { label: 'Connecting', icon: <Wifi className="w-4 h-4 animate-pulse" />, className: 'text-blue-700' },
    connected: { label: 'Connected', icon: <CheckCircle2 className="w-4 h-4" />, className: 'text-emerald-700' },
    failed: { label: 'Failed', icon: <XCircle className="w-4 h-4" />, className: 'text-rose-700' },
    closed: { label: 'Closed', icon: <WifiOff className="w-4 h-4" />, className: 'text-[#76746E]' },
  };
  const current = phaseDisplay[phase];

  return (
    <div className="bg-[#FFFFFF] border border-[#1A1A1A]/20 p-5 space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-amber-600" />
          <span className="font-serif font-bold text-sm text-[#1A1A1A]">{fileName || `Transfer ${transferId}`}</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-[#76746E] hover:text-[#1A1A1A] text-xs cursor-pointer">✕</button>
        )}
      </div>

      <div className={`inline-flex items-center space-x-1.5 px-2.5 py-1 font-mono text-[10px] uppercase font-semibold border ${current.className} border-current/30 bg-current/5`}>
        {current.icon}
        <span>{current.label}</span>
        <span className="text-[#8C8A82] normal-case font-normal">(ICE: {iceState})</span>
      </div>

      <div className="bg-[#F9F8F6] border border-[#1A1A1A]/10 p-3 space-y-1 text-[10px] font-mono text-[#5A5955] max-h-28 overflow-y-auto">
        {log.length === 0 ? (
          <div className="flex items-center text-[#8C8A82]"><Radio className="w-3 h-3 mr-1.5" />Waiting for signaling activity…</div>
        ) : (
          log.map((line, i) => <div key={i}>› {line}</div>)
        )}
      </div>
    </div>
  );
};
