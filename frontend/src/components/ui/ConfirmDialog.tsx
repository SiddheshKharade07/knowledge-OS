import * as React from 'react';
import { Button } from './Button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from './Modal';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} className="sm:max-w-md" sheet ariaLabel={title}>
      <ModalHeader title={title} onClose={onCancel} />
      {description ? (
        <ModalBody>
          <div className="text-sm text-on-surface-variant">{description}</div>
        </ModalBody>
      ) : null}
      <ModalFooter>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button variant={destructive ? 'destructive' : 'primary'} onClick={onConfirm} disabled={busy}>
          {busy ? 'Please wait…' : confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
