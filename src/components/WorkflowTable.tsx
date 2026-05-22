import React from "react";
import {
  FiCheck,
  FiEdit2,
  FiPlay,
  FiPlus,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";
import classNames from "classnames";
import dayjs from "dayjs";
import { formatMoney, statusClass } from "../utils/workflowHelpers";

const CheckIcon = FiCheck as any;
const EditIcon = FiEdit2 as any;
const PlayIcon = FiPlay as any;
const PlusIcon = FiPlus as any;
const RefreshIcon = FiRefreshCw as any;
const CloseIcon = FiX as any;

export function WorkflowTable({
  items,
  criteria,
  selectedWorkflowId,
  form,
  busy,
  onFormChange,
  onSubmit,
  editingId,
  editForm,
  onEditFormChange,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onSelect,
  onStart,
  onResetDemo,
}: any) {
  return (
    <section className="min-w-0 rounded-lg border border-app-line bg-app-surface p-4">
      <div className="mb-3 flex items-start justify-between gap-4 max-[720px]:flex-col max-[720px]:items-stretch">
        <div className="flex items-center gap-3">
          <h2 className="m-0 text-lg tracking-normal">WorkflowItems Tablosu</h2>

          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
            {items.length} kayıt
          </span>
        </div>
        <button
          type="button"
          className="min-h-10 rounded-md border-[#c7d7f4] bg-[#f8fbff] px-3.5 text-sm font-bold text-app-primary shadow-[0_1px_2px_rgba(16,24,40,0.06)] transition hover:-translate-y-px hover:border-app-primary hover:bg-white hover:shadow-[0_8px_18px_rgba(37,99,235,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary/35 disabled:hover:translate-y-0 disabled:hover:border-[#c7d7f4] disabled:hover:bg-[#f8fbff] disabled:hover:shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
          disabled={busy}
          onClick={onResetDemo}
          title="Demo verisini yenile"
        >
          <RefreshIcon className={busy ? "animate-spin" : undefined} />
          <span>Demo Verisini Yenile</span>
        </button>
      </div>

      <form
        className="mb-3 grid grid-cols-[minmax(420px,2fr)_minmax(160px,0.6fr)_max-content] items-end gap-2.5 max-[720px]:grid-cols-1"
        onSubmit={onSubmit}
      >
        <label>
          Başlık
          <input
            required
            value={form.sorumlu}
            placeholder="Örn. Üretim Süreci"
            onChange={(event) =>
              onFormChange({ ...form, sorumlu: event.target.value })
            }
          />
        </label>
        <label>
          Fiyat
          <input
            required
            min="0"
            step="0.01"
            type="number"
            value={form.amount}
            onChange={(event) =>
              onFormChange({ ...form, amount: event.target.value })
            }
          />
        </label>
        <button type="submit" disabled={busy}>
          <PlusIcon />
          Yeni Akışı Ekle
        </button>
      </form>

      <div className="overflow-auto rounded-md border border-app-line">
        <table>
          <thead>
            <tr>
              <th>Id</th>
              <th>Başlık</th>
              <th>Tarih</th>
              <th>Fiyat</th>
              <th>Durum</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => {
              const currentStep = criteria.find(
                (candidate: any) =>
                  candidate.workflowItemId === item.id &&
                  candidate.id === item.currentNodeId,
              );
              const statusTitle = currentStep?.title || item.durum;
              const canStart =
                currentStep?.kind === "Start" ||
                currentStep?.kind === "Compare";
              const isEditing = item.id === editingId;

              return (
                <tr
                  key={item.id}
                  className={classNames({
                    "[&>td]:bg-[#eef5ff]": item.id === selectedWorkflowId,
                  })}
                  onClick={() => {
                    if (!isEditing) onSelect(item);
                  }}
                >
                  <td>{item.id}</td>
                  <td>
                    {isEditing ? (
                      <input
                        required
                        value={editForm.sorumlu}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          onEditFormChange({
                            ...editForm,
                            sorumlu: event.target.value,
                          })
                        }
                      />
                    ) : (
                      item.sorumlu
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        required
                        type="date"
                        value={editForm.tarih}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          onEditFormChange({
                            ...editForm,
                            tarih: event.target.value,
                          })
                        }
                      />
                    ) : (
                      dayjs(item.tarih).format("DD MMM YYYY")
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        required
                        min="0"
                        step="0.01"
                        type="number"
                        value={editForm.amount}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          onEditFormChange({
                            ...editForm,
                            amount: event.target.value,
                          })
                        }
                      />
                    ) : (
                      formatMoney(item.amount)
                    )}
                  </td>
                  <td>
                    <StatusPill status={statusTitle} />
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            className="border-app-green bg-app-green text-white"
                            disabled={
                              busy ||
                              !editForm.sorumlu?.trim() ||
                              !editForm.tarih
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              onSaveEdit(item.id);
                            }}
                          >
                            <CheckIcon />
                            Kaydet
                          </button>
                          <button
                            type="button"
                            className="border-app-primary bg-white text-app-primary"
                            disabled={busy}
                            onClick={(event) => {
                              event.stopPropagation();
                              onCancelEdit();
                            }}
                          >
                            <CloseIcon />
                            İptal
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="border-app-primary bg-white text-app-primary"
                            disabled={busy}
                            onClick={(event) => {
                              event.stopPropagation();
                              onEdit(item);
                            }}
                          >
                            <EditIcon />
                            Edit
                          </button>
                          <button
                            type="button"
                            className="border-app-primary bg-white text-app-primary"
                            disabled={busy || !canStart}
                            onClick={(event) => {
                              event.stopPropagation();
                              onStart(item.id);
                            }}
                          >
                            <PlayIcon />
                            Başlat
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusPill({ status }: any) {
  return (
    <span
      className={classNames(
        "inline-flex min-h-3 items-center whitespace-nowrap rounded-full bg-[#eef2f7] px-1.5 py-0.5 text-[#344054]",
        {
          "bg-[#fff4df] text-app-amber": statusClass(status) === "pending",
          "bg-[#e8f5ee] text-app-green": statusClass(status) === "done",
          "bg-[#e7f7f5] text-app-teal": statusClass(status) === "info",
        },
      )}
    >
      {status}
    </span>
  );
}
