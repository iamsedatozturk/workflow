import React from 'react'
import { FiPlay, FiPlus } from 'react-icons/fi'
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
  onSelect,
  onStart,
}) {
  return (
    <section className="surface">
      <div className="section-title compact">
        <h2>WorkflowItems Tablosu</h2>
        <span>{items.length} kayıt</span>
      </div>

      <form className="create-row" onSubmit={onSubmit}>
        <strong>Yeni iş akışı</strong>
        <label>
          Sorumlu
          <input
            required
            value={form.sorumlu}
            placeholder="Örn. Ayşe Demir"
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
          Kaydet
        </button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Id</th>
              <th>Sorumlu</th>
              <th>Tarih</th>
              <th>Fiyat</th>
              <th>Durum</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
                const currentStep = criteria.find(
                  (candidate) =>
                    candidate.workflowItemId === item.id &&
                    candidate.id === item.currentNodeId,
                )
                const statusTitle = currentStep?.title || item.durum
                const canStart = currentStep?.kind === 'Start' || currentStep?.kind === 'Compare'

                return (
                  <tr
                    key={item.id}
                    className={classNames({ 'selected-row': item.id === selectedWorkflowId })}
                    onClick={() => onSelect(item)}
                  >
                    <td>{item.id}</td>
                    <td>{item.sorumlu}</td>
                    <td>{dayjs(item.tarih).format('DD MMM YYYY')}</td>
                    <td>{formatMoney(item.amount)}</td>
                    <td>
                      <StatusPill status={statusTitle} />
                    </td>
                    <td>
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
                    </td>
                  </tr>
                )
              }
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}


function StatusPill({ status }) {
  return <span className={classNames('status-pill', statusClass(status))}>{status}</span>
}

