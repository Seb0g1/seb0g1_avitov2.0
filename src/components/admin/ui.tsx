"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "default" | "primary" | "danger" | "ghost";
  compact?: boolean;
};

export function Button({ tone = "default", compact = false, className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`button ${tone === "primary" ? "primary" : ""} ${tone === "danger" ? "danger" : ""} ${tone === "ghost" ? "ghost" : ""} ${compact ? "compact-button" : ""} ${className}`.trim()}
    />
  );
}

export function Modal({
  title,
  description,
  open,
  onClose,
  children,
  footer
}: {
  title: string;
  description?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2>{title}</h2>
            {description ? <p className="muted">{description}</p> : null}
          </div>
          <button className="icon-button" type="button" onClick={onClose} title="Закрыть">
            <X size={18} aria-hidden />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-footer">{footer}</footer> : null}
      </section>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Подтвердить",
  danger,
  onConfirm,
  onClose
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onClose}
      footer={
        <>
          <Button type="button" onClick={onClose}>Отмена</Button>
          <Button type="button" tone={danger ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="confirm-icon">{danger ? "!" : "?"}</div>
    </Modal>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange
}: {
  value: T;
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented-control">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? "active" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Toast({ children }: { children?: ReactNode }) {
  return children ? <div className="toast">{children}</div> : null;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {children ? <span>{children}</span> : null}
    </div>
  );
}
