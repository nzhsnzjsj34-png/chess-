import type {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
} from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown } from 'lucide-react';

export function cx(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(' ');
}

export function Panel({
  children,
  className,
  soft = false,
}: {
  children: ReactNode;
  className?: string;
  soft?: boolean;
}) {
  return (
    <section className={cx(soft ? 'glass-panel-soft' : 'glass-panel', 'rounded-2xl', className)}>
      {children}
    </section>
  );
}

export function SectionHeading({
  icon: Icon,
  title,
  subtitle,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('panel-heading', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="h-3.5 w-3.5 text-amber-300" /> : null}
          <h2 className="panel-title">{title}</h2>
        </div>
        {subtitle ? <p className="panel-subtitle">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
}) {
  return (
    <button
      className={cx(
        'btn',
        `btn-${size}`,
        `btn-${variant}`,
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className="h-3.8 w-3.8" /> : null}
      {children}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  label,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx('icon-button', className)}
      {...props}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  columns,
  className,
  disabled,
}: {
  value: T;
  options: Array<{ id: T; label: string; title?: string }>;
  onChange: (value: T) => void;
  columns?: number;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={cx('segmented', className)}
      style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          title={option.title ?? option.label}
          disabled={disabled}
          onClick={() => onChange(option.id)}
          className={cx('segmented-item', value === option.id ? 'active' : '')}
        >
          <span className="block truncate">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  icon: Icon,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  icon?: LucideIcon;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> : null}
        <div className="min-w-0">
          <div className="text-[0.8rem] font-semibold text-slate-200">{label}</div>
          {description ? (
            <div className="mt-0.5 text-[0.7rem] leading-snug text-slate-500">{description}</div>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx('toggle', checked ? 'on' : '')}
      />
    </div>
  );
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  hint?: string;
}) {
  const percent = ((value - min) / Math.max(1, max - min)) * 100;
  return (
    <label className="block py-2">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-[0.78rem] font-semibold text-slate-300">{label}</span>
        <span className="font-mono text-[0.75rem] font-semibold text-amber-200">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        className="range-input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ '--range-fill': `${percent}%` } as CSSProperties}
      />
      {hint ? <p className="mt-1 text-[0.68rem] text-slate-500">{hint}</p> : null}
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.78rem] font-semibold text-slate-300">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          className="input-surface appearance-none px-3 py-2 pr-9 text-[0.8rem]"
        >
          {options.map((option) => (
            <option key={option.id} value={option.id} className="bg-slate-900">
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>
    </label>
  );
}

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx('input-surface px-3 py-2 text-[0.8rem]', className)} {...props} />;
}

type BadgeTone = 'neutral' | 'gold' | 'mint' | 'sky' | 'rose' | 'violet';

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  const tones: Record<BadgeTone, string> = {
    neutral: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
    gold: 'border-amber-300/25 bg-amber-300/10 text-amber-200',
    mint: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200',
    sky: 'border-sky-300/25 bg-sky-300/10 text-sky-200',
    rose: 'border-rose-300/25 bg-rose-300/10 text-rose-200',
    violet: 'border-violet-300/25 bg-violet-300/10 text-violet-200',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-bold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  max = 100,
  className,
  accent = '#e9b949',
}: {
  value: number;
  max?: number;
  className?: string;
  accent?: string;
}) {
  const percent = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className={cx('h-1.5 overflow-hidden rounded-full bg-slate-700/45', className)}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${percent}%`, background: accent }}
      />
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/7 bg-white/3 p-3">
      <div className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-bold text-slate-100">{value}</div>
      {hint ? <div className="mt-0.5 text-[0.68rem] text-slate-500">{hint}</div> : null}
    </div>
  );
}

/** Minimal, safe rich text renderer for **bold** coach replies and bullet lines. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const lines = text.split('\n');
  return (
    <div className={cx('space-y-1.5', className)}>
      {lines.map((line, lineIndex) => {
        const isBullet = /^\s*[•\-]\s+/.test(line);
        const content = isBullet ? line.replace(/^\s*[•\-]\s+/, '') : line;
        const parts = content.split(/(\*\*[^*]+\*\*)/g);
        return (
          <div
            key={`${lineIndex}-${content.slice(0, 12)}`}
            className={cx(isBullet ? 'flex gap-2' : '', !content ? 'h-1' : '')}
          >
            {isBullet ? <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-amber-300" /> : null}
            <span>
              {parts.map((part, partIndex) =>
                part.startsWith('**') && part.endsWith('**') ? (
                  <strong key={partIndex} className="font-bold text-amber-100">
                    {part.slice(2, -2)}
                  </strong>
                ) : (
                  <span key={partIndex}>{part}</span>
                ),
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
