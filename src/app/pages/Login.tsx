import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Mail, Loader2, ArrowLeft, ChevronRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../components/AuthProvider';
import { usePublicSettings } from '../../hooks/useSettings';
import { isDashboardTeamRole } from '../../utils/dashboardRole';
import { getUserFacingErrorMessage } from '../../utils/userFacingError';
import fallbackLogo from '../../imports/logo_theagencyjo.png';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user, loading: authLoading, sendOtp, verifyOtp } = useAuth();
  const { data: publicSettings } = usePublicSettings();
  const logoSrc = publicSettings?.logo_url?.trim() || fallbackLogo;
  const isCustomLogo = Boolean(publicSettings?.logo_url?.trim());
  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (authLoading || !token || !user) return;
    if (location.pathname !== '/login') return;
    if (!isDashboardTeamRole(user.role)) return;
    const target = user.role === 'doorman' ? '/scan' : from && from !== '/login' ? from : '/';
    navigate(target, { replace: true });
  }, [token, user, authLoading, navigate, from, location.pathname]);

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const t = window.setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendSeconds]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendOtp(email.trim().toLowerCase());
      setStep('otp');
      setResendSeconds(60);
      toast.success('Verification code sent — check your inbox and spam folder');
    } catch (err: unknown) {
      toast.error(getUserFacingErrorMessage(err, 'Failed to send verification code'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyOtp(email, otp, rememberMe);
    } catch (err: unknown) {
      toast.error(getUserFacingErrorMessage(err, 'Invalid verification code'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendSeconds > 0) return;
    try {
      await sendOtp(email.trim().toLowerCase());
      setResendSeconds(60);
      toast.success('Code resent — check your inbox and spam folder');
    } catch (err: unknown) {
      toast.error(getUserFacingErrorMessage(err, 'Failed to resend code'));
    }
  };

  return (
    <div className="min-h-screen flex font-['Inter']">
      {/* ── Left panel (desktop) ───────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] bg-hero-noir flex-col p-10 relative overflow-hidden select-none">
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Radial fade at bottom-right */}
        <div className="absolute bottom-0 end-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-x-1/4 translate-y-1/4" />

        {/* Logo */}
        <div className="relative z-10">
          <img
            src={logoSrc}
            alt={publicSettings?.platform_name?.trim() || 'TheAgencyJo'}
            className={`h-8 w-auto max-w-[200px] object-contain object-start ${isCustomLogo ? '' : 'filter brightness-0 invert'}`}
          />
        </div>

        {/* Center text */}
        <div className="flex-1 flex flex-col justify-center items-center text-center relative z-10 px-6">
          <p className="text-white/35 text-sm font-semibold uppercase tracking-[0.22em] mb-6">
            Admin Control Center
          </p>
          <h1 className="text-5xl xl:text-6xl 2xl:text-7xl font-bold text-white leading-[1.1] mb-6 max-w-3xl tracking-tight">
            Manage your<br />
            events with<br />
            precision.
          </h1>
          <p className="text-white/45 text-base xl:text-lg leading-relaxed max-w-lg">
            Reservations, analytics, role access, and team management — all in one place.
          </p>
        </div>

        {/* Bottom */}
        <div className="text-white/20 text-xs relative z-10">
          © {new Date().getFullYear()} TheAgencyJo. All rights reserved.
        </div>
      </div>

      {/* ── Right panel (form) ─────────────────────────────────── */}
      <div className="flex-1 bg-muted flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[360px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <img
              src={logoSrc}
              alt={publicSettings?.platform_name?.trim() || 'TheAgencyJo'}
              className={`h-7 w-auto max-w-[180px] object-contain object-start ${isCustomLogo ? '' : 'filter brightness-0'}`}
            />
          </div>

          {step === 'email' ? (
            /* ── Step 1: Email ── */
            <div>
              <div className="mb-8">
                <h2 className="text-[26px] font-bold text-foreground tracking-tight mb-1">
                  Welcome back
                </h2>
                <p className="text-sm text-muted-foreground">
                  Sign in to the admin dashboard
                </p>
              </div>

              <form onSubmit={handleSendCode} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                      size={15}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      className="w-full ps-10 pe-4 py-3 bg-input rounded-xl border border-border text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all shadow-sm"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-accent active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm mt-1"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ChevronRight size={15} className="rtl:rotate-180" />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* ── Step 2: OTP ── */
            <div>
              <button
                onClick={() => { setStep('email'); setOtp(''); }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 -ms-0.5"
              >
                <ArrowLeft size={15} className="rtl:rotate-180" />
                Back
              </button>

              <div className="mb-8">
                <h2 className="text-[26px] font-bold text-foreground tracking-tight mb-1">
                  Check your email
                </h2>
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit code to{' '}
                  <span className="font-semibold text-foreground">{email.trim().toLowerCase()}</span>.
                  Delivery can take up to a minute — check spam if you do not see it.
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-2">
                    Verification code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    required
                    autoFocus
                    maxLength={8}
                    className="w-full px-4 py-3.5 bg-input rounded-xl border border-border text-center text-[28px] font-mono tracking-[0.4em] text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all shadow-sm"
                    placeholder="······"
                  />
                </div>

                {/* Remember me */}
                <label className="flex items-start gap-3 cursor-pointer py-1 group">
                  <button
                    type="button"
                    onClick={() => setRememberMe((v) => !v)}
                    className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      rememberMe
                        ? 'bg-primary border-primary'
                        : 'bg-input border-border group-hover:border-foreground'
                    }`}
                  >
                    {rememberMe && <Check size={11} className="text-white" strokeWidth={3} />}
                  </button>
                  <div className="leading-tight">
                    <span className="text-sm font-medium text-foreground">Remember me</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      Stay signed in for 4 hours
                    </span>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-accent active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>

              <p className="text-xs text-muted-foreground text-center mt-5">
                Didn't receive a code?{' '}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendSeconds > 0}
                  className="text-foreground font-semibold hover:underline disabled:opacity-40 disabled:no-underline"
                >
                  {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend'}
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
