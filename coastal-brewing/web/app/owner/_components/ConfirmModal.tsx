"use client";
import * as React from "react";

export function ConfirmModal({
  open,
  title,
  diff,
  requiredPhrase,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  diff: React.ReactNode;
  requiredPhrase: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = React.useState("");
  React.useEffect(() => { if (!open) setTyped(""); }, [open]);
  if (!open) return null;
  const canConfirm = typed === requiredPhrase;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card p-6 max-w-2xl w-full border border-border">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <div className="mb-4 text-sm">{diff}</div>
        <label className="block text-xs uppercase tracking-widest mb-1">
          Type <code className="font-mono">{requiredPhrase}</code> to confirm
        </label>
        <input
          className="w-full border px-3 py-2 mb-4 font-mono"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 border">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className="px-4 py-2 bg-foreground text-background disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
