import React from "react";
import { FiSave, FiTrash2 } from "react-icons/fi";
import classNames from "classnames";
import {
  columnOptions,
  kindIcon,
  kindOptions,
  operatorOptions,
} from "../utils/workflowConstants";
import {
  compareOutcomeRuleText,
  criteriaSummary,
  emptyCompareOutcome,
  targetTitle,
} from "../utils/workflowHelpers";

const SaveIcon = FiSave as any;
const TrashIcon = FiTrash2 as any;

export function CriteriaTable({
  criteria,
  selectedWorkflow,
  selectedId,
  activeNodeId,
  form,
  busy,
  onSelect,
  onChange,
  onSubmit,
  onDelete,
  onAddCriteria,
}) {
  const setField = (name, value) => onChange({ ...form, [name]: value });
  const targetOptions = [
    { value: "", label: "Bağlantı yok" },
    ...criteria
      .filter((item) => item.id !== form.id)
      .map((item) => ({ value: item.id, label: `${item.id} - ${item.title}` })),
  ];
  const updateCompareOutcome = (index, patch) => {
    const next = [...(form.compareOutcomes || [])];
    next[index] = { ...next[index], ...patch };
    setField("compareOutcomes", next);
  };
  const updateCompareCondition = (outcomeIndex, conditionIndex, patch) => {
    const next = [...(form.compareOutcomes || [])];
    const conditions = [...(next[outcomeIndex]?.conditions || [])];
    conditions[conditionIndex] = { ...conditions[conditionIndex], ...patch };
    next[outcomeIndex] = { ...next[outcomeIndex], conditions };
    setField("compareOutcomes", next);
  };
  const addCompareCondition = (outcomeIndex) => {
    const next = [...(form.compareOutcomes || [])];
    next[outcomeIndex] = {
      ...next[outcomeIndex],
      conditions: [
        ...(next[outcomeIndex]?.conditions || []),
        { column: "Tutar", operator: ">", compareValue: 0 },
      ],
    };
    setField("compareOutcomes", next);
  };
  const removeCompareCondition = (outcomeIndex, conditionIndex) => {
    const next = [...(form.compareOutcomes || [])];
    const conditions = (next[outcomeIndex]?.conditions || []).filter(
      (_, index) => index !== conditionIndex,
    );
    next[outcomeIndex] = { ...next[outcomeIndex], conditions };
    setField("compareOutcomes", next);
  };
  const removeCompareOutcome = (index) => {
    setField(
      "compareOutcomes",
      (form.compareOutcomes || []).filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    );
  };
  const targetSelect = (value, onSelectTarget, required = false) => (
    <select
      required={required}
      value={value || ""}
      onChange={(event) => onSelectTarget(event.target.value)}
    >
      {targetOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
  const toggleRow = (id) => onSelect(id === selectedId ? "" : id);

  return (
    <section className="surface criteria-manager">
      <div className="section-title compact">
        <h2>
          Adımlar
          {selectedWorkflow
            ? ` - #${selectedWorkflow.id} ${selectedWorkflow.sorumlu}`
            : ""}
        </h2>
        <div className="criteria-title-actions">
          <span>
            {criteria.length} kriter
            {activeNodeId ? ` / aktif: ${activeNodeId}` : ""}
          </span>
          {kindOptions.map((option) => {
            const Icon = kindIcon[option.value];
            return (
              <button
                key={option.value}
                type="button"
                className="secondary-button"
                disabled={busy}
                onClick={() => onAddCriteria(option.value)}
              >
                <Icon />
                Yeni {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <div className="table-wrap">
          <table className="criteria-edit-table">
            <thead>
              <tr>
                <th>Id</th>
                <th>Tip</th>
                <th>Başlık / Kural</th>
                <th>Bağlantılar</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((item) => {
                const isSelected = item.id === selectedId;
                const isActive = item.id === activeNodeId;
                const connectionSummary = criteriaConnectionSummary(
                  item,
                  criteria,
                );

                return (
                  <React.Fragment key={item.id}>
                    <tr
                      className={classNames({
                        "selected-row": isSelected,
                        "active-row": isActive,
                      })}
                      onClick={() => toggleRow(item.id)}
                    >
                      <td>
                        <strong>{item.id}</strong>
                        {isActive && (
                          <span className="active-step-badge">Aktif</span>
                        )}
                      </td>
                      <td>
                        {
                          kindOptions.find(
                            (option) => option.value === item.kind,
                          )?.label
                        }
                      </td>
                      <td>{criteriaSummaryContent(item)}</td>
                      <td>{connectionSummary}</td>
                      <td>
                        <button
                          type="button"
                          className="ghost-icon-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleRow(item.id);
                          }}
                        >
                          {isSelected ? "Kapat" : "Düzenle"}
                        </button>
                      </td>
                    </tr>
                    {isSelected && (
                      <tr className="selected-details-row">
                        <td colSpan={5}>
                          <div className="inline-editor-grid">
                            <Field label="Tip" required>
                              <select
                                value={form.kind}
                                onChange={(event) =>
                                  setField("kind", event.target.value)
                                }
                              >
                                {kindOptions.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field label="Başlık" required>
                              <input
                                required
                                value={form.title}
                                onChange={(event) =>
                                  setField("title", event.target.value)
                                }
                              />
                            </Field>
                            <Field
                              label="Onaylayacak Kişi"
                              required={
                                form.kind === "Approval" ||
                                form.kind === "Inform"
                              }
                            >
                              <input
                                required={
                                  form.kind === "Approval" ||
                                  form.kind === "Inform"
                                }
                                value={form.approver}
                                onChange={(event) =>
                                  onChange({
                                    ...form,
                                    approver: event.target.value,
                                    informPerson: event.target.value,
                                  })
                                }
                              />
                            </Field>
                            {false && (
                              <Field label="Bilgilendirme personeli">
                                <input
                                  value={form.informPerson}
                                  onChange={(event) =>
                                    onChange({
                                      ...form,
                                      approver: event.target.value,
                                      informPerson: event.target.value,
                                    })
                                  }
                                />
                              </Field>
                            )}

                            {(form.kind === "Start" ||
                              form.kind === "Inform") && (
                              <Field label="Sonraki adım" required>
                                {targetSelect(
                                  form.nextOnStart,
                                  (value) => setField("nextOnStart", value),
                                  true,
                                )}
                              </Field>
                            )}

                            {form.kind === "Approval" && (
                              <>
                                <Field label="Onay adımı" required>
                                  {targetSelect(
                                    form.nextOnApprove,
                                    (value) => setField("nextOnApprove", value),
                                    true,
                                  )}
                                </Field>
                                <Field label="Red adımı" required>
                                  {targetSelect(
                                    form.nextOnReject,
                                    (value) => setField("nextOnReject", value),
                                    true,
                                  )}
                                </Field>
                              </>
                            )}
                          </div>

                          {form.kind === "Compare" && (
                            <div className="table-outcomes">
                              <div className="mini-title">
                                <span>Karşılaştırma durumları</span>
                                <button
                                  type="button"
                                  className="ghost-icon-button"
                                  disabled={
                                    (form.compareOutcomes || []).length >= 4
                                  }
                                  onClick={() =>
                                    setField("compareOutcomes", [
                                      ...(form.compareOutcomes || []),
                                      emptyCompareOutcome(
                                        `Durum ${(form.compareOutcomes || []).length + 1}`,
                                      ),
                                    ])
                                  }
                                >
                                  Ekle
                                </button>
                              </div>
                              {(form.compareOutcomes || []).map(
                                (outcome, index) => (
                                  <div
                                    key={index}
                                    className="table-outcome-editor"
                                  >
                                    <div className="table-outcome-row">
                                      <input
                                        required
                                        value={outcome.label}
                                        aria-label="Durum adı zorunlu"
                                        onChange={(event) =>
                                          updateCompareOutcome(index, {
                                            label: event.target.value,
                                          })
                                        }
                                      />
                                      {targetSelect(
                                        outcome.targetId,
                                        (targetId) =>
                                          updateCompareOutcome(index, {
                                            targetId,
                                          }),
                                        true,
                                      )}
                                      <button
                                        type="button"
                                        className="ghost-icon-button"
                                        disabled={
                                          (form.compareOutcomes || []).length <=
                                          2
                                        }
                                        onClick={() =>
                                          removeCompareOutcome(index)
                                        }
                                      >
                                        Sil
                                      </button>
                                    </div>
                                    <div className="condition-list">
                                      {(outcome.conditions || []).map(
                                        (condition, conditionIndex) => (
                                          <div
                                            key={conditionIndex}
                                            className="condition-row"
                                          >
                                            <select
                                              value={condition.column}
                                              onChange={(event) =>
                                                updateCompareCondition(
                                                  index,
                                                  conditionIndex,
                                                  {
                                                    column: event.target.value,
                                                  },
                                                )
                                              }
                                            >
                                              {columnOptions.map((option) => (
                                                <option
                                                  key={option.value}
                                                  value={option.value}
                                                >
                                                  {option.label}
                                                </option>
                                              ))}
                                            </select>
                                            <select
                                              value={condition.operator}
                                              onChange={(event) =>
                                                updateCompareCondition(
                                                  index,
                                                  conditionIndex,
                                                  {
                                                    operator:
                                                      event.target.value,
                                                  },
                                                )
                                              }
                                            >
                                              {operatorOptions.map((option) => (
                                                <option
                                                  key={option.value}
                                                  value={option.value}
                                                >
                                                  {option.label}
                                                </option>
                                              ))}
                                            </select>
                                            <input
                                              required
                                              type="number"
                                              step="0.01"
                                              value={condition.compareValue}
                                              onChange={(event) =>
                                                updateCompareCondition(
                                                  index,
                                                  conditionIndex,
                                                  {
                                                    compareValue:
                                                      event.target.value,
                                                  },
                                                )
                                              }
                                            />
                                            <button
                                              type="button"
                                              className="ghost-icon-button"
                                              disabled={
                                                (outcome.conditions || [])
                                                  .length <= 1
                                              }
                                              onClick={() =>
                                                removeCompareCondition(
                                                  index,
                                                  conditionIndex,
                                                )
                                              }
                                            >
                                              Koşulu sil
                                            </button>
                                          </div>
                                        ),
                                      )}
                                      <button
                                        type="button"
                                        className="ghost-icon-button"
                                        onClick={() =>
                                          addCompareCondition(index)
                                        }
                                      >
                                        Koşul ekle
                                      </button>
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          )}

                          <div className="table-editor-actions">
                            <button type="submit" disabled={busy}>
                              <SaveIcon />
                              Kaydet
                            </button>
                            <button
                              type="button"
                              className="danger-button"
                              disabled={busy || !form.id}
                              onClick={() => onDelete(form.id)}
                            >
                              <TrashIcon />
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </form>
    </section>
  );
}

function Field({ label, children, required = false }) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <span className="required-mark"> *</span>}
      </span>
      {children}
    </label>
  );
}

function criteriaSummaryContent(item) {
  if (item.kind === "Compare") {
    const outcomes = item.compareOutcomes || [];
    if (!outcomes.length) return "-";

    return (
      <ul className="summary-list">
        {outcomes.map((outcome, index) => (
          <li key={`${outcome.label || "outcome"}-${index}`}>
            <strong>{outcome.label || `Durum ${index + 1}`}:</strong>{" "}
            {compareOutcomeRuleText(outcome)}
          </li>
        ))}
      </ul>
    );
  }

  return criteriaSummary(item);
}

function criteriaConnectionSummary(item, criteria) {
  if (item.kind === "Compare") {
    const outcomes = item.compareOutcomes || [];
    if (!outcomes.length) return "-";

    return (
      <ul className="summary-list">
        {outcomes.map((outcome, index) => (
          <li key={`${outcome.label || "target"}-${index}`}>
            <strong>{outcome.label || `Durum ${index + 1}`}:</strong>{" "}
            {targetTitle(criteria, outcome.targetId)}
          </li>
        ))}
      </ul>
    );
  }

  if (item.kind === "Approval") {
    return (
      <ul className="summary-list">
        <li>
          <strong>Onay:</strong> {targetTitle(criteria, item.nextOnApprove)}
        </li>
        <li>
          <strong>Red:</strong> {targetTitle(criteria, item.nextOnReject)}
        </li>
      </ul>
    );
  }

  if (item.kind === "Start" || item.kind === "Inform") {
    return targetTitle(criteria, item.nextOnStart);
  }

  return "-";
}
