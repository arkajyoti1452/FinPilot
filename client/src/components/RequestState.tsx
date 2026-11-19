import { AlertCircle, LoaderCircle } from 'lucide-react';

export function LoadingState({ label = 'Loading your data' }: { label?: string }) {
  return (
    <div className="request-state" role="status" aria-live="polite">
      <LoaderCircle className="loading-spinner" size={19} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="request-error" role="alert">
      <span className="request-error-icon"><AlertCircle size={17} aria-hidden="true" /></span>
      <div><strong>We couldn't load this right now</strong><p>{message}</p></div>
      {onRetry && <button type="button" className="button button-soft" onClick={onRetry}>Try again</button>}
    </div>
  );
}
export function RequestState({ title, description }: { title: string; description: string }) {
  return (
    <div className="request-state" role="status">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
