import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  QrCode,
  X,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Search,
  Lock,
  LogOut,
  ChevronDown,
  ArrowLeft,
  Camera,
  CameraOff,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { useAuth } from "../../components/AuthProvider";
import { useScannerEvents, useScanTicket } from "../../../hooks/useScanner";
import { useLanguage } from "../../contexts/LanguageContext";
import { useDashboardLocale } from "../../../hooks/useDashboardLocale";

type ScanState = 'idle' | 'scanning' | 'valid' | 'duplicate' | 'invalid';

const SCANNER_ID = "qr-reader";

export function AdminQRScanner() {
  const { t } = useLanguage();
  const { locale, formatDateTime } = useDashboardLocale();
  const navigate = useNavigate();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [showManual, setShowManual] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [selectedEventId, setSelectedEventId] = useState('');
  const [lastScanName, setLastScanName] = useState('');
  const [admitCount, setAdmitCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  /** ISO time from API when duplicate (ticket already used); shown to doorman for re-entry context */
  const [duplicateUsedAtIso, setDuplicateUsedAtIso] = useState<string | null>(null);
  const [duplicateGuestName, setDuplicateGuestName] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanningRef = useRef(false);
  const lastCodeRef = useRef<string>('');
  const lastCodeTimeRef = useRef<number>(0);

  const { user, signOut } = useAuth();
  const { data: scannerEvents } = useScannerEvents();
  const scanMutation = useScanTicket();

  const events = scannerEvents ?? [];

  const handleScan = async (code: string) => {
    if (!selectedEventId || !code || scanningRef.current) return;
    if (code === lastCodeRef.current && Date.now() - lastCodeTimeRef.current < 3000) return;
    lastCodeRef.current = code;
    lastCodeTimeRef.current = Date.now();
    scanningRef.current = true;
    setScanState('scanning');
    try {
      const result = await scanMutation.mutateAsync({ ticket_code: code, event_id: selectedEventId });
      if (result.result === 'success') {
        setScanState('valid');
        setLastScanName(
          result.ticket?.users
            ? `${result.ticket.users.first_name} ${result.ticket.users.last_name}`
            : ''
        );
        setAdmitCount((prev) => prev + 1);
        setTimeout(() => {
          setScanState('idle');
          scanningRef.current = false;
        }, 2000);
      } else if (result.result === 'duplicate') {
        setScanState('duplicate');
        setDuplicateCount((prev) => prev + 1);
        setDuplicateUsedAtIso(result.used_at ?? null);
        const tn = result.ticket?.users
          ? `${result.ticket.users.first_name ?? ''} ${result.ticket.users.last_name ?? ''}`.trim()
          : '';
        setDuplicateGuestName(tn);
      } else {
        setScanState('invalid');
      }
    } catch {
      setScanState('invalid');
      scanningRef.current = false;
    }
    setManualCode('');
  };

  const startCamera = async () => {
    setCameraError('');
    try {
      const scanner = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => handleScan(decodedText),
        undefined
      );
      setCameraActive(true);
    } catch (err: any) {
      setCameraError(err?.message ?? 'Camera access denied');
      scannerRef.current = null;
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch { /* already stopped */ }
      scannerRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  const handleAcknowledge = () => {
    setScanState('idle');
    scanningRef.current = false;
    setDuplicateUsedAtIso(null);
    setDuplicateGuestName('');
  };

  const getBackgroundColor = () => {
    switch (scanState) {
      case 'valid': return 'bg-green-600';
      case 'duplicate': return 'bg-red-600';
      case 'invalid': return 'bg-yellow-500';
      default: return 'bg-[#0A0A0A]';
    }
  };

  const userName = user
    ? `${user.first_name} ${user.last_name}`.trim() || user.email || t('admin.scanner.title')
    : t('admin.scanner.title');

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${getBackgroundColor()} transition-colors duration-300`}>
      {/* Top Bar */}
      <header className="px-6 py-4 flex items-center justify-between text-white bg-secondary/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { stopCamera(); navigate(-1); }}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={20} className="rtl:rotate-180" />
          </button>
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <Lock size={20} />
          </div>
          <div>
            <div className="font-bold text-sm">{t('admin.scanner.gate')}</div>
            <div className="text-xs text-white/70">{userName}</div>
          </div>
        </div>
        <button
          onClick={() => { stopCamera(); signOut(); navigate('/login'); }}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Event Selector */}
      <div className="bg-secondary/40 text-white px-6 py-3 border-b border-white/10">
        <div className="text-sm text-white/70 mb-1">{t('admin.scanner.scanning_for')}</div>
        <div className="relative inline-block">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="appearance-none bg-transparent font-bold text-lg text-white focus:outline-none cursor-pointer pe-8 ps-0"
          >
            <option value="" className="bg-primary text-primary-foreground">{t('admin.scanner.select_event')}</option>
            {events.map((event) => {
              const date = new Date(event.date_time);
              const label = `${event.title} — ${date.toLocaleDateString(locale, { day: '2-digit', month: 'short' })}`;
              return (
                <option key={event.id} value={event.id} className="bg-primary text-primary-foreground">
                  {label}
                </option>
              );
            })}
          </select>
          <ChevronDown size={16} className="absolute top-1/2 -translate-y-1/2 text-white/70 pointer-events-none end-0" />
        </div>
        <div className="flex gap-6 mt-2 text-sm flex-wrap">
          <span className="flex items-center gap-1 text-green-400 font-bold">
            <CheckCircle size={14} /> {t('admin.scanner.admitted').replace('{{n}}', String(admitCount))}
          </span>
          <span className="flex items-center gap-1 text-red-400 font-bold">
            <AlertTriangle size={14} /> {t('admin.scanner.duplicates').replace('{{n}}', String(duplicateCount))}
          </span>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-6 overflow-hidden">

        {/* Camera viewfinder — never unmounted so Html5Qrcode keeps its element reference */}
        <div className={`relative w-72 h-72 md:w-80 md:h-80 mb-6 ${scanState !== 'idle' && scanState !== 'scanning' ? 'hidden' : ''}`}>
          <div id={SCANNER_ID} className="w-full h-full rounded-xl overflow-hidden" />

          {!cameraActive && (
            <div className="absolute inset-0 rounded-xl bg-white/10 flex flex-col items-center justify-center gap-3">
              {cameraError ? (
                <>
                  <CameraOff size={48} className="text-white/50" />
                  <p className="text-white/70 text-sm text-center px-4">{cameraError}</p>
                </>
              ) : (
                <>
                  <Camera size={48} className="text-white/50" />
                  <p className="text-white/70 text-sm">{t('admin.scanner.start_camera_hint')}</p>
                </>
              )}
            </div>
          )}

          {cameraActive && (
            <>
              <div className="absolute top-0 start-0 w-10 h-10 border-t-4 border-s-4 border-white rounded-ss-lg pointer-events-none" />
              <div className="absolute top-0 end-0 w-10 h-10 border-t-4 border-e-4 border-white rounded-se-lg pointer-events-none" />
              <div className="absolute bottom-0 start-0 w-10 h-10 border-b-4 border-s-4 border-white rounded-es-lg pointer-events-none" />
              <div className="absolute bottom-0 end-0 w-10 h-10 border-b-4 border-e-4 border-white rounded-ee-lg pointer-events-none" />
            </>
          )}
        </div>

        {(scanState === 'idle' || scanState === 'scanning') && (
          <div className="text-white text-lg font-bold tracking-wide mb-6 text-center px-2">
            {scanState === 'scanning' ? t('admin.scanner.scanning') : cameraActive ? t('admin.scanner.point_camera') : t('admin.scanner.ready')}
          </div>
        )}

        {(scanState !== 'idle' && scanState !== 'scanning') && (
          <div className="flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            {scanState === 'valid' && (
              <>
                <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-6">
                  <CheckCircle size={64} className="text-white" />
                </div>
                <h2 className="text-4xl font-bold text-white mb-2">{t('admin.scanner.admit')}</h2>
                {lastScanName && (
                  <div className="text-2xl text-white font-['Tajawal'] mb-4">{lastScanName}</div>
                )}
              </>
            )}

            {scanState === 'duplicate' && (
              <>
                <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-6 animate-pulse">
                  <XCircle size={64} className="text-white" />
                </div>
                <h2 className="text-4xl font-bold text-white mb-2">{t('admin.scanner.already_used')}</h2>
                <div className="text-xl text-white/90 font-bold mb-4">{t('admin.scanner.do_not_admit')}</div>
                {duplicateGuestName && (
                  <div className="text-xl text-white font-['Tajawal'] mb-4">{duplicateGuestName}</div>
                )}
                <div className="bg-secondary/20 p-4 rounded-lg text-start max-w-sm mb-8 space-y-3">
                  <p className="text-white/80 text-sm">{t('admin.scanner.already_scanned')}</p>
                  {duplicateUsedAtIso && (
                    <div className="pt-2 border-t border-white/10">
                      <p className="text-white font-semibold text-base">
                        {t('admin.scanner.last_scanned_at').replace(
                          '{{time}}',
                          formatDateTime(duplicateUsedAtIso),
                        )}
                      </p>
                      <p className="text-white/70 text-xs mt-2 leading-relaxed">{t('admin.scanner.reentry_note')}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleAcknowledge}
                  className="px-8 py-4 bg-card text-red-500 font-bold rounded-xl text-lg hover:bg-card/90 border border-red-500/30 transition-colors w-full max-w-sm"
                >
                  {t('admin.scanner.acknowledge')}
                </button>
              </>
            )}

            {scanState === 'invalid' && (
              <>
                <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-6">
                  <AlertTriangle size={64} className="text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">{t('admin.scanner.invalid')}</h2>
                <div className="text-lg text-white/90 font-medium mb-8">{t('admin.scanner.invalid_desc')}</div>
                <button
                  onClick={handleAcknowledge}
                  className="px-8 py-4 bg-card text-yellow-500 font-bold rounded-xl text-lg hover:bg-card/90 border border-yellow-500/30 transition-colors w-full max-w-sm"
                >
                  {t('admin.scanner.acknowledge')}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      {(scanState === 'idle' || scanState === 'scanning') && (
        <div className="px-6 py-8 bg-secondary/40 backdrop-blur-md">
          <div className="flex justify-between items-center max-w-md mx-auto gap-4">
            <button
              onClick={cameraActive ? stopCamera : startCamera}
              disabled={!selectedEventId}
              className="flex-1 py-4 rounded-full bg-white/10 flex items-center justify-center gap-2 text-white font-semibold hover:bg-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {cameraActive ? <CameraOff size={20} /> : <Camera size={20} />}
              {cameraActive ? t('admin.scanner.stop') : t('admin.scanner.start_camera')}
            </button>
            <button
              onClick={() => setShowManual(true)}
              disabled={!selectedEventId}
              className="flex-1 py-4 bg-primary text-primary-foreground font-bold rounded-full hover:bg-accent transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <QrCode size={20} />
              {t('admin.scanner.manual_entry')}
            </button>
          </div>
          {!selectedEventId && (
            <p className="text-center text-white/50 text-sm mt-3">{t('admin.scanner.select_event_hint')}</p>
          )}
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManual && (
        <div className="absolute inset-0 bg-secondary/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-muted rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center bg-card">
              <h3 className="font-bold text-foreground">{t('admin.scanner.enter_code')}</h3>
              <button onClick={() => setShowManual(false)} className="text-muted-foreground hover:text-foreground">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 bg-card">
              <div className="relative">
                <Search className="absolute top-1/2 -translate-y-1/2 text-muted-foreground start-4" size={20} />
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder={t('admin.scanner.ticket_code_ph')}
                  className="w-full bg-muted border-2 border-border rounded-xl py-4 ps-12 pe-4 text-xl font-bold font-['Space_Grotesk'] focus:border-primary focus:ring-0 outline-none uppercase"
                  autoFocus
                />
              </div>
              <button
                onClick={() => {
                  setShowManual(false);
                  handleScan(manualCode);
                }}
                disabled={manualCode.length < 3 || !selectedEventId}
                className="w-full mt-6 py-4 bg-primary text-primary-foreground font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
              >
                {t('admin.scanner.lookup')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
