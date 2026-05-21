import React from 'react'
import dayjs from 'dayjs'

export function ApprovalHistoryTable({ selectedWorkflow }) {
  const history = selectedWorkflow?.history || []

  return (
    <section className="surface approval-history-panel">
      <div className="section-title compact">
        <h2>
          Onay Açıklamaları
          {selectedWorkflow ? ` - #${selectedWorkflow.id} ${selectedWorkflow.sorumlu}` : ''}
        </h2>
        <span>{history.length} kayıt</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tarih</th>
              <th>İşlem</th>
              <th>Açıklama</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr>
                <td colSpan={3}>Seçili iş akışı için açıklama kaydı yok.</td>
              </tr>
            )}
            {history.map((item, index) => (
              <tr key={`${item.time}-${index}`}>
                <td>{dayjs(item.time).format('DD MMM YYYY HH:mm')}</td>
                <td>{item.action}</td>
                <td>{item.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

