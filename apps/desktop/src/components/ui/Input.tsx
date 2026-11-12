import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";

const fieldStyles =
  "w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary " +
  "placeholder:text-text-secondary/60 outline-none transition-colors " +
  "focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 " +
  "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60";

function FieldShell({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full">
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-text-primary">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-text-secondary">{hint}</p>}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export function Input({ label, hint, className = "", ...rest }: InputProps) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} htmlFor={id}>
      <input id={id} className={`${fieldStyles} ${className}`} {...rest} />
    </FieldShell>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
}

export function Textarea({ label, hint, className = "", ...rest }: TextareaProps) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} htmlFor={id}>
      <textarea id={id} rows={4} className={`${fieldStyles} ${className}`} {...rest} />
    </FieldShell>
  );
}
