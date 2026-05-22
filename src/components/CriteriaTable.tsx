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
    <section className="min-w-0 rounded-lg border border-app-line bg-app-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-4 max-[720px]:flex-col max-[720px]:items-stretch">
        <h2 className="m-0 text-lg tracking-normal">
          Adımlar
          {selectedWorkflow
            ? ` - #${selectedWorkflow.id} ${selectedWorkflow.sorumlu}`
            : ""}
        </h2>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-sm text-app-muted">
            {criteria.length} kriter
            {activeNodeId ? ` / aktif: ${activeNodeId}` : ""}
          </span>
          {kindOptions.map((option) => {
            const Icon = kindIcon[option.value];
            return (
              <button
                key={option.value}
                type="button"
                className="border-app-primary bg-white text-app-primary"
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

      <form className="block" onSubmit={onSubmit}>
        <div className="overflow-auto rounded-md border border-app-line">
          <table className="[&_button]:text-[13px] [&_input]:text-[13px] [&_select]:text-[13px] [&_td]:text-[13px] [&_th]:text-[13px]">
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
                        "[&>td]:bg-[#eef5ff]": isSelected,
                        "[&>td]:bg-[#f0fdf4] [&>td]:shadow-[inset_0_1px_0_#bbf7d0,inset_0_-1px_0_#bbf7d0]":
                          isActive,
                        "[&>td]:bg-[#e8f7ff]": isSelected && isActive,
                      })}
                      onClick={() => toggleRow(item.id)}
                    >
                      <td>
                        <strong>{item.id}</strong>
                        {isActive && (
                          <span className="ml-2 inline-flex rounded-full bg-[#dcfce7] px-2 py-0.5 text-[11px] font-bold text-[#166534]">
                            Aktif
                          </span>
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
                          className="ml-1.5 min-h-8 border-[#cfd6e2] bg-white px-2.5 text-[#344054]"
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
                      <tr className="[&>td]:bg-slate-50 [&>td]:p-3.5">
                        <td colSpan={5}>
                          <div className="grid grid-cols-3 gap-2.5 max-[720px]:grid-cols-1">
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
                            <div className="grid gap-2.5 rounded-lg border border-app-line bg-slate-50 p-2.5">
                              <div className="flex items-center justify-between gap-2 text-[13px] font-bold text-[#344054]">
                                <span>Karşılaştırma durumları</span>
                                <button
                                  type="button"
                                  className="ml-1.5 min-h-8 border-[#cfd6e2] bg-white px-2.5 text-[#344054]"
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
                                    className="grid gap-2 border-t border-[#e4e7ec] pt-2 first:border-t-0 first:pt-0"
                                  >
                                    <div className="grid grid-cols-[minmax(130px,0.8fr)_minmax(200px,1.4fr)_auto] items-center gap-2 max-[720px]:grid-cols-1">
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
                                        className="ml-1.5 min-h-8 border-[#cfd6e2] bg-white px-2.5 text-[#344054]"
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
                                    <div className="grid gap-2.5">
                                      {(outcome.conditions || []).map(
                                        (condition, conditionIndex) => (
                                          <div
                                            key={conditionIndex}
                                            className="grid grid-cols-[minmax(100px,0.7fr)_82px_minmax(110px,0.8fr)_auto] items-center gap-1.5 max-[720px]:grid-cols-1"
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
                                              className="ml-1.5 min-h-8 border-[#cfd6e2] bg-white px-2.5 text-[#344054]"
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
                                        className="ml-1.5 min-h-8 border-[#cfd6e2] bg-white px-2.5 text-[#344054]"
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

                          <div className="flex flex-wrap gap-2">
                            <button type="submit" disabled={busy}>
                              <SaveIcon />
                              Kaydet
                            </button>
                            <button
                              type="button"
                              className="border-app-red bg-app-red text-white"
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
    <label className="grid gap-1.5 text-[12px] text-[#344054]">
      <span>
        {label}
        {required && <span className="font-bold text-app-red"> *</span>}
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
      <ul className="m-0 grid gap-1 pl-[18px] [&_li]:pl-0.5">
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
      <ul className="m-0 grid gap-1 pl-[18px] [&_li]:pl-0.5">
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
      <ul className="m-0 grid gap-1 pl-[18px] [&_li]:pl-0.5">
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
