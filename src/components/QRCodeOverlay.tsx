/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Smartphone, CheckCircle, Wifi, ExternalLink, Copy, Check } from 'lucide-react';
import { ConnectionState } from '../services/peerService';

interface QRCodeOverlayProps {
  sessionId: string;
  connectionState: ConnectionState;
}

export const QRCodeOverlay: React.FC<QRCodeOverlayProps> = ({
  sessionId,
  connectionState,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const mobileUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?session=${sessionId}`
    : '';

  useEffect(() => {
    if (!sessionId || !mobileUrl) return;

    QRCode.toDataURL(mobileUrl, {
      width: 240,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [sessionId, mobileUrl]);

  // When connection turns green, auto-minimize after 1.5s so toddler and parent have 100% full screen
  useEffect(() => {
    if (connectionState === 'connected') {
      const timer = setTimeout(() => setIsMinimized(true), 1200);
      return () => clearTimeout(timer);
    } else {
      setIsMinimized(false);
    }
  }, [connectionState]);

  const copyLink = () => {
    if (!mobileUrl) return;
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!sessionId) return null;

  if (isMinimized && connectionState === 'connected') {
    return (
      <div className="absolute top-4 left-4 z-40 pointer-events-auto">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-full shadow-lg border border-emerald-500/30 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:scale-105 transition-all"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Phone Controller Connected</span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-6 left-6 z-40 max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-5 shadow-2xl border border-slate-200/80 dark:border-slate-800 pointer-events-auto transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
            Pair Phone Controller
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {connectionState === 'connected' ? (
            <span className="flex items-center gap-1 text-emerald-600 font-bold">
              <CheckCircle className="w-3.5 h-3.5" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600 font-bold">
              <Wifi className="w-3.5 h-3.5" />
              Awaiting Scan
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
        Scan with your smartphone camera to connect the motion steering controller.
      </p>

      {/* QR Code Container */}
      <div className="flex justify-center p-2 bg-white rounded-xl shadow-inner border border-slate-100 mb-3">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="Pairing QR Code" className="w-48 h-48 rounded-lg" />
        ) : (
          <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
            Generating QR Code...
          </div>
        )}
      </div>

      {/* Session ID & Link */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={mobileUrl}
          className="flex-1 text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 truncate"
        />
        <button
          onClick={copyLink}
          title="Copy Pairing Link"
          className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span>Lay phone flat on table face-up</span>
        <button
          onClick={() => window.open(mobileUrl, '_blank')}
          className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
        >
          Open Tab <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
