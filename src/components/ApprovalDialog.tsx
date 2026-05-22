import { useState } from "react";
import { FiCheck, FiSlash, FiX } from "react-icons/fi";
import { formatMoney } from "../utils/workflowHelpers";

const CloseIcon = FiX as any;
const CheckIcon = FiCheck as any;
const SlashIcon = FiSlash as any;

export function ApprovalDialog({ busy, criteria, items, onClose, onDecision }) {
  if (!items.length) return null;

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="approval-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-dialog-title"
      >
        <div className="section-title compact">
          <div>
            <h2 id="approval-dialog-title">Bekleyen Onaylar</h2>
            <p>Workflow onay adiminda bekliyor.</p>
          </div>
          <button
            type="button"
            className="secondary-button icon-only"
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
        <div className="section-title compact">
          <h2>Bekleyen Onaylar</h2>
          <span>{items.length} bekleyen</span>
        </div>
      )}
      <div className="approval-list">
        {items.length === 0 && <p className="empty-text">Bekleyen onay yok.</p>}
        {items.map((item) => {
          const activeStep = criteria.find(
            (candidate) =>
              candidate.workflowItemId === item.id &&
              candidate.id === item.currentNodeId,
          );

          return (
            <article key={item.id} className="approval-row">
              <div>
                <strong>
                  #{item.id} {item.sorumlu}
                </strong>
                {activeStep?.title && (
                  <span className="approval-step-title">
                    {activeStep.title}
                  </span>
                )}
                <span>
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
              <div className="decision-row">
                <button
                  type="button"
                  className="approve-button"
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
                  className="danger-button"
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

  return <section className="surface">{content}</section>;
}
