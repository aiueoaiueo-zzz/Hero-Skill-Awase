import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** 下から出るシート（試作版 sheet を移植）。onOk が false を返したら閉じない */
export function Sheet({
  title,
  okLabel,
  onOk,
  onClose,
  children,
}: {
  title: string;
  okLabel: string;
  onOk: () => Promise<boolean | void> | boolean | void;
  onClose: () => void;
  children: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);
  return createPortal(
    <div className="modal" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="sheet f" role="dialog" aria-label={title}>
        <h2>{title}</h2>
        {children}
        <div className="btns">
          <button disabled={busy} onClick={onClose}>
            キャンセル
          </button>
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                if ((await onOk()) !== false) onClose();
              } finally {
                setBusy(false);
              }
            }}
          >
            {okLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
