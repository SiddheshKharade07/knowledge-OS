import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  sheet?: boolean;
}

export function Modal({ open, onClose, children, className, sheet }: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-[1px]" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 w-full overflow-hidden bg-surface-container-lowest shadow-modal animate-slide-up',
          sheet ? 'max-h-[85vh] rounded-t-2xl sm:max-h-[90vh] sm:rounded-2xl sm:max-w-lg' : 'max-h-[90vh] rounded-t-2xl sm:rounded-xl sm:max-w-2xl',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({
  title,
  description,
  onClose,
  action,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-outline-variant/40 px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-on-surface">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-on-surface-variant">{description}</p> : null}
      </div>
      <div className="flex items-center gap-1">
        {action}
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-ring"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ModalBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('max-h-[70vh] overflow-y-auto px-5 py-4', className)}>{children}</div>;
}

export function ModalFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-end gap-2 border-t border-outline-variant/40 px-5 py-3', className)}>
      {children}
    </div>
  );
}
