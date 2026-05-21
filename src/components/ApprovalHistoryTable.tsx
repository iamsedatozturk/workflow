import React from "react";
import dayjs from "dayjs";
import { AnyAaaaRecord } from "dns";

export function ApprovalHistoryTable({ selectedWorkflow }: any) {
  const history = selectedWorkflow?.history || [];

  return (
    <section className="surface approval-history-panel">
      <div className="section-title compact">
        <h2>
          Akış Geçmişi
          {selectedWorkflow
            ? ` - #${selectedWorkflow.id} ${selectedWorkflow.sorumlu}`
            : ""}
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
            {history.map((item: any, index: number) => (
              <tr key={`${item.time}-${index}`}>
                <td>{dayjs(item.time).format("DD MMM YYYY HH:mm")}</td>
                <td>{item.action}</td>
                <td>{item.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
