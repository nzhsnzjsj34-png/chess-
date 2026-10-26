import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import type { ToastMessage } from '../hooks/useLondonGame';
import { cx } from './ui';

const STYLES = {
  info: { border: 'border-sky-300/25', bg: 'bg-sky-300/8', icon: Info, color: 'text-sky-200' },
  success: {
    border: 'border-emerald-300/25',
    bg: 'bg-emerald-300/8',
    icon: CircleCheck,
    color: 'text-emerald-200',
  },
  warning: {
    border: 'border-amber-300/30',
    bg: 'bg-amber-300/8',
    icon: TriangleAlert,
    color: 'text-amber-200',
  },
  danger: {
    border: 'border-rose-300/30',
    bg: 'bg-rose-300/8',
    icon: CircleAlert,
    color: 'text-rose-200',
  },
} as const;

export function Toast({ toast, onClose }: { toast: ToastMessage | null; onClose: () => void }) {
  if (!toast) return null;
  const style = STYLES[toast.tone];
  const Icon = style.icon;
  return (
    <div
      key={toast.id}
      className={cx(
        'fade-rise pointer-events-auto flex w-[min(92vw,26rem)] items-start gap-2.5 rounded-xl border px-3 py-2.5 shadow-2xl backdrop-blur-xl',
        style.border,
        style.bg,
      )}
      role="status"
    >
      <Icon className={cx('mt-0.5 h-4 w-4 shrink-0', style.color)} />
      <span className="flex-1 text-[0.73rem] leading-snug text-slate-100">{toast.message}</span>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onClose}
        className="rounded p-0.5 text-slate-500 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
