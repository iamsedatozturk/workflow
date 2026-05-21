import React from 'react'
import { FiCheck, FiEdit2, FiPlay, FiPlus, FiX } from 'react-icons/fi'
import classNames from 'classnames'
import dayjs from 'dayjs'
import { formatMoney, statusClass } from '../utils/workflowHelpers'

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
}: any) {
  return (
    <section className="surface">
      <div className="section-title compact">
        <h2>WorkflowItems Tablosu</h2>
        <span>{items.length} kayıt</span>
      </div>

      <form className="create-row" onSubmit={onSubmit}>
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
          <FiPlus />
          Yeni Akışı Ekle
        </button>
      </form>

      <div className="table-wrap">
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
              )
              const statusTitle = currentStep?.title || item.durum
              const canStart = currentStep?.kind === 'Start' || currentStep?.kind === 'Compare'
              const isEditing = item.id === editingId

              return (
                <tr
                  key={item.id}
                  className={classNames({ 'selected-row': item.id === selectedWorkflowId })}
                  onClick={() => {
                    if (!isEditing) onSelect(item)
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
                          onEditFormChange({ ...editForm, sorumlu: event.target.value })
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
                          onEditFormChange({ ...editForm, tarih: event.target.value })
                        }
                      />
                    ) : (
                      dayjs(item.tarih).format('DD MMM YYYY')
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
                          onEditFormChange({ ...editForm, amount: event.target.value })
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
                    <div className="row-actions">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            className="approve-button"
                            disabled={busy || !editForm.sorumlu?.trim() || !editForm.tarih}
                            onClick={(event) => {
                              event.stopPropagation()
                              onSaveEdit(item.id)
                            }}
                          >
                            <FiCheck />
                            Kaydet
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={busy}
                            onClick={(event) => {
                              event.stopPropagation()
                              onCancelEdit()
                            }}
                          >
                            <FiX />
                            İptal
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={busy}
                            onClick={(event) => {
                              event.stopPropagation()
                              onEdit(item)
                            }}
                          >
                            <FiEdit2 />
                            Edit
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={busy || !canStart}
                            onClick={(event) => {
                              event.stopPropagation()
                              onStart(item.id)
                            }}
                          >
                            <FiPlay />
                            Başlat
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function StatusPill({ status }: any) {
  return <span className={classNames('status-pill', statusClass(status))}>{status}</span>
}
