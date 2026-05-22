import { useState } from "react";
import { FiCheck, FiSlash, FiX } from "react-icons/fi";
import { formatMoney } from "../utils/workflowHelpers";

const CloseIcon = FiX as any;
const CheckIcon = FiCheck as any;
const SlashIcon = FiSlash as any;

export function ApprovalDialog({ busy, criteria, items, onClose, onDecision }) {
  if (!items.length) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-[18px]"
      role="presentation"
    >
      <section
        className="max-h-[calc(100vh-36px)] w-[min(560px,100%)] overflow-auto rounded-lg border border-app-line bg-app-surface p-4 shadow-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-dialog-title"
      >
        <div className="mb-3 flex items-start justify-between gap-4 max-[720px]:flex-col max-[720px]:items-stretch">
          <div>
            <h2
              id="approval-dialog-title"
              className="m-0 text-lg tracking-normal"
            >
              Bekleyen Onaylar
            </h2>
            <p className="mb-0 mt-1 text-app-muted">
              Workflow onay adiminda bekliyor.
            </p>
          </div>
          <button
            type="button"
            className="w-[38px] justify-center border-app-primary bg-white p-0 text-app-primary"
            title="Kapat"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>
        <PendingApprovals
          items={items}
          criteria={criteria}
          busy={busy}
          showChrome={false}
          onDecision={onDecision}
        />
      </section>
    </div>
  );
}

function PendingApprovals({
  items,
  criteria,
  busy,
  onDecision,
  showChrome = true,
}) {
  const [notes, setNotes] = useState({});

  const content = (
    <>
      {showChrome && (
        <div className="mb-3 flex items-center justify-between gap-4 max-[720px]:flex-col max-[720px]:items-stretch">
          <h2 className="m-0 text-lg tracking-normal">Bekleyen Onaylar</h2>
          <span className="text-sm text-app-muted">
            {items.length} bekleyen
          </span>
        </div>
      )}
      <div className="grid gap-2.5">
        {items.length === 0 && (
          <p className="m-0 text-app-muted">Bekleyen onay yok.</p>
        )}
        {items.map((item) => {
          const activeStep = criteria.find(
            (candidate) =>
              candidate.workflowItemId === item.id &&
              candidate.id === item.currentNodeId,
          );

          return (
            <article
              key={item.id}
              className="grid gap-2.5 rounded-lg border border-app-line p-3"
            >
              <div>
                <strong>
                  #{item.id} {item.sorumlu}
                </strong>
                {activeStep?.title && (
                  <span className="mt-1 block text-sm font-bold text-app-text">
                    {activeStep.title}
                  </span>
                )}
                <span className="mt-1 block text-app-muted">
                  {formatMoney(item.amount)} - Onaylayacak kişi:{" "}
                  {item.assignedApprover}
                </span>
              </div>
              <textarea
                rows={2}
                placeholder="Onay/red notu"
                value={notes[item.id] || ""}
                onChange={(event) =>
                  setNotes({ ...notes, [item.id]: event.target.value })
                }
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="border-app-green bg-app-green text-white"
                  disabled={busy}
                  onClick={() =>
                    onDecision(item.id, true, notes[item.id] || "Onay verildi.")
                  }
                >
                  <CheckIcon />
                  Onayla
                </button>
                <button
                  type="button"
                  className="border-app-red bg-app-red text-white"
                  disabled={busy}
                  onClick={() =>
                    onDecision(item.id, false, notes[item.id] || "Red edildi.")
                  }
                >
                  <SlashIcon />
                  Reddet
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );

  if (!showChrome) return content;

  return (
    <section className="min-w-0 rounded-lg border border-app-line bg-app-surface p-4">
      {content}
    </section>
  );
}
