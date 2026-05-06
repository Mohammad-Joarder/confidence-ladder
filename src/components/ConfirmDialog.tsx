"use client";

import { useEffect } from "react";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Mobile-first confirmation: bottom sheet on small screens, centered dialog on larger viewports.
 * Large touch targets and safe-area padding for iOS/Android browsers.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onCancel]);

  if (!open) return null;

  const confirmClasses =
    variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700 active:bg-red-800"
      : "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4" role="presentation">
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className="relative z-[101] w-full max-w-md rounded-t-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-2xl"
        style={{
          paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
          paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))",
        }}
      >
        <div className="mx-auto mt-2 hidden h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600 sm:hidden" aria-hidden />
        <div className="px-4 pb-2 pt-2 sm:px-5 sm:pb-4 sm:pt-4">
          <h2 id="confirm-dialog-title" className="text-lg font-semibold text-slate-900 dark:text-white">
            {title}
          </h2>
          <p id="confirm-dialog-desc" className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {message}
          </p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              className="min-h-12 w-full rounded-xl border border-slate-300 px-4 py-3 text-base font-semibold text-slate-800 active:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:active:bg-slate-800 sm:min-h-[44px] sm:w-auto sm:px-5"
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`min-h-12 w-full rounded-xl px-4 py-3 text-base font-semibold shadow-sm sm:min-h-[44px] sm:w-auto sm:px-5 ${confirmClasses}`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
