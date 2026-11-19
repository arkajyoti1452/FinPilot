import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ArrowRight, CircleAlert, ShieldCheck } from 'lucide-react';
import { z } from 'zod';
import { useAuth } from './AuthProvider';
import './auth.css';

const authSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
});

type AuthFormValues = z.infer<typeof authSchema>;

export function AuthPage() {
  const { isConfigured, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; message: string } | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: '', password: '' },
  });

  function switchMode(nextMode: 'sign-in' | 'sign-up') {
    setMode(nextMode);
    setFeedback(null);
    reset();
  }

  const submit = handleSubmit(async ({ email, password }) => {
    setFeedback(null);
    const result = mode === 'sign-in'
      ? await signIn(email.toLowerCase(), password)
      : await signUp(email.toLowerCase(), password);

    if (result.error) {
      setFeedback({ kind: 'error', message: result.error });
    } else if (mode === 'sign-up' && result.needsEmailConfirmation) {
      setFeedback({ kind: 'success', message: 'Check your email for a confirmation link. In local development, open the Supabase Mailpit inbox.' });
    } else {
      setFeedback({ kind: 'success', message: 'Your account is ready. FinPilot is opening your workspace.' });
    }
  });

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand"><span className="brand-mark">f</span><span className="brand-word">finpilot<span>.</span></span></div>
        <div className="auth-intro"><p className="eyebrow">YOUR MONEY, WITH MORE CLARITY</p><h1 id="auth-title">{isConfigured ? 'A calmer way to manage money.' : 'Connect your Supabase project.'}</h1><p>{isConfigured ? 'Sign in to open your private finance workspace.' : 'Add your local Supabase URL and publishable key to client/.env.local, then restart Vite.'}</p></div>
        {!isConfigured ? (
          <div className="auth-config-help"><CircleAlert size={18} /><div><strong>Authentication is not configured</strong><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_PUBLISHABLE_KEY</code><small>Use the publishable key only. Do not put a Supabase secret key here.</small></div></div>
        ) : (
          <>
            <div className="auth-tabs" role="tablist" aria-label="Account access">
              <button type="button" role="tab" aria-selected={mode === 'sign-in'} className={mode === 'sign-in' ? 'selected' : ''} onClick={() => switchMode('sign-in')}>Sign in</button>
              <button type="button" role="tab" aria-selected={mode === 'sign-up'} className={mode === 'sign-up' ? 'selected' : ''} onClick={() => switchMode('sign-up')}>Create account</button>
            </div>
            <form className="auth-form" onSubmit={submit} noValidate>
              <label className="form-field"><span>Email address</span><input type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} aria-invalid={Boolean(errors.email)} />{errors.email && <small className="field-error">{errors.email.message}</small>}</label>
              <label className="form-field"><span>Password</span><input type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} placeholder="At least 8 characters" {...register('password')} aria-invalid={Boolean(errors.password)} />{errors.password && <small className="field-error">{errors.password.message}</small>}</label>
              {feedback && <p className={`auth-feedback ${feedback.kind}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>{feedback.message}</p>}
              <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Please wait…' : mode === 'sign-in' ? 'Sign in securely' : 'Create account'} <ArrowRight size={16} /></button>
            </form>
          </>
        )}
        <div className="auth-privacy"><ShieldCheck size={16} /><span>Your account is protected by Supabase Auth. Financial records remain private to your account.</span></div>
      </section>
      <aside className="auth-aside"><div className="auth-aside-pattern" aria-hidden="true"><span /><span /><span /><span /><span /></div><p className="eyebrow">FINPILOT PERSONAL FINANCE</p><h2>Know where you stand.<br />Choose what comes next.</h2><p>A thoughtful place to track your everyday money and build better habits over time.</p><div className="auth-aside-note"><span className="aside-note-icon"><ShieldCheck size={17} /></span><span><strong>Private by design</strong><small>Your data is protected with database-level access policies.</small></span></div></aside>
    </main>
  );
}
