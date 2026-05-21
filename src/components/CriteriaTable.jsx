import React, { useMemo } from 'react'
import Select from 'react-select'
import { FiPlus, FiSave, FiSlash, FiTrash2 } from 'react-icons/fi'
import classNames from 'classnames'
import { columnOptions, kindIcon, kindOptions, operatorOptions } from '../workflowConstants'
import { compareOutcomeRuleText, criteriaSummary, emptyCompareOutcome, targetTitle } from '../utils/workflowHelpers'

function CriteriaEditor({
  form,
  selectedWorkflow,
  currentCriteria,
  busy,
  onChange,
  onSubmit,
  onDelete,
  onAddCriteria,
}) {
  const setField = (name, value) => onChange({ ...form, [name]: value })
  const targetOptions = useMemo(
    () => [
      { value: '', label: 'Bağlantı yok' },
      ...currentCriteria
        .filter((item) => item.id !== form.id)
        .map((item) => ({ value: item.id, label: `${item.id} - ${item.title}` })),
    ],
    [currentCriteria, form.id],
  )
  const targetValue = (value) =>
    targetOptions.find((option) => option.value === (value || '')) || targetOptions[0]
  const targetControl = (value, onSelect) => (
    <div className="target-control">
      <Select
        className="target-select"
        value={targetValue(value)}
        options={targetOptions}
        onChange={(option) => onSelect(option?.value || '')}
      />
      <button
        type="button"
        className="ghost-icon-button clear-link-button"
        disabled={!value}
        title="Bağlantıyı kaldır"
        aria-label="Bağlantıyı kaldır"
        onClick={() => onSelect('')}
      >
        <FiSlash />
      </button>
    </div>
  )

  return (
    <aside className="editor">
      <div className="section-title compact">
        <h2>Seçili Adım</h2>
        <span>
          {selectedWorkflow ? `#${selectedWorkflow.id}` : '-'} / {form.id || 'Yeni'}
        </span>
      </div>
      <form onSubmit={onSubmit}>
        <Field label="Tip">
          <Select
            value={kindOptions.find((item) => item.value === form.kind)}
            options={kindOptions}
            onChange={(option) => setField('kind', option.value)}
          />
        </Field>
        <Field label="Başlık">
          <input
            required
            value={form.title}
            onChange={(event) => setField('title', event.target.value)}
          />
        </Field>
        <div className="three-fields">
          <Field label="Sütun">
            <Select
              value={columnOptions.find((item) => item.value === form.column)}
              options={columnOptions}
              onChange={(option) => setField('column', option.value)}
            />
          </Field>
          <Field label="Operatör">
            <Select
              value={operatorOptions.find((item) => item.value === form.operator)}
              options={operatorOptions}
              onChange={(option) => setField('operator', option.value)}
            />
          </Field>
          <Field label="Değer">
            <input
              type="number"
              step="0.01"
              value={form.compareValue}
              onChange={(event) => setField('compareValue', event.target.value)}
            />
          </Field>
        </div>
        <Field label="Onaylanacak kişi">
          <input
            value={form.approver}
            placeholder="Örn. Mehmet Yılmaz"
            onChange={(event) => setField('approver', event.target.value)}
          />
        </Field>
        <Field label="Bilgilendirme yapılacak personel">
          <input
            value={form.informPerson}
            placeholder="Örn. Muhasebe"
            onChange={(event) => setField('informPerson', event.target.value)}
          />
        </Field>
        {form.kind === 'Compare' && (
          <div className="compare-outcomes">
            <div className="mini-title">
              <span>Karşılaştırma durumları</span>
              <button
                type="button"
                className="ghost-icon-button"
                disabled={(form.compareOutcomes || []).length >= 4}
                onClick={() =>
                  setField('compareOutcomes', [
                    ...(form.compareOutcomes || []),
                    emptyCompareOutcome(`Durum ${(form.compareOutcomes || []).length + 1}`),
                  ])
                }
              >
                Ekle
              </button>
            </div>
            {(form.compareOutcomes || []).map((outcome, index) => (
              <div key={index} className="outcome-row">
                <input
                  value={outcome.label}
                  placeholder={`Durum ${index + 1}`}
                  onChange={(event) => {
                    const next = [...(form.compareOutcomes || [])]
                    next[index] = { ...next[index], label: event.target.value }
                    setField('compareOutcomes', next)
                  }}
                />
                {targetControl(outcome.targetId, (targetId) => {
                  const next = [...(form.compareOutcomes || [])]
                  next[index] = { ...next[index], targetId }
                  setField('compareOutcomes', next)
                })}
                <button
                  type="button"
                  className="ghost-icon-button"
                  disabled={(form.compareOutcomes || []).length <= 2}
                  onClick={() =>
                    setField(
                      'compareOutcomes',
                      (form.compareOutcomes || []).filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  Sil
                </button>
              </div>
            ))}
          </div>
        )}
        {(form.kind === 'Start' || form.kind === 'Inform') && (
          <Field label="Sonraki adım">
            {targetControl(form.nextOnStart, (value) => setField('nextOnStart', value))}
          </Field>
        )}
        {form.kind === 'Approval' && (
          <div className="approval-targets">
            <Field label="Onay adımı">
              {targetControl(form.nextOnApprove, (value) => setField('nextOnApprove', value))}
            </Field>
            <Field label="Red adımı">
              {targetControl(form.nextOnReject, (value) => setField('nextOnReject', value))}
            </Field>
          </div>
        )}
        <div className="canvas-link-note">
          Bağlantılar bu panelden seçilip kaydedilebilir veya canvas üzerinde çıkış etiketine ve ardından hedef adıma tıklanarak yönetilir.
        </div>
        <div className="editor-actions">
          <button type="submit" disabled={busy}>
            <FiSave />
            Kaydet
          </button>
          <button
            type="button"
            className="danger-button"
            disabled={busy || !form.id}
            onClick={onDelete}
          >
            <FiTrash2 />
            Sil
          </button>
        </div>
      </form>
    </aside>
  )
}

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
}) {
  const setField = (name, value) => onChange({ ...form, [name]: value })
  const targetOptions = [
    { value: '', label: 'Bağlantı yok' },
    ...criteria
      .filter((item) => item.id !== form.id)
      .map((item) => ({ value: item.id, label: `${item.id} - ${item.title}` })),
  ]
  const updateCompareOutcome = (index, patch) => {
    const next = [...(form.compareOutcomes || [])]
    next[index] = { ...next[index], ...patch }
    setField('compareOutcomes', next)
  }
  const updateCompareCondition = (outcomeIndex, conditionIndex, patch) => {
    const next = [...(form.compareOutcomes || [])]
    const conditions = [...(next[outcomeIndex]?.conditions || [])]
    conditions[conditionIndex] = { ...conditions[conditionIndex], ...patch }
    next[outcomeIndex] = { ...next[outcomeIndex], conditions }
    setField('compareOutcomes', next)
  }
  const addCompareCondition = (outcomeIndex) => {
    const next = [...(form.compareOutcomes || [])]
    next[outcomeIndex] = {
      ...next[outcomeIndex],
      conditions: [
        ...(next[outcomeIndex]?.conditions || []),
        { column: 'Tutar', operator: '>', compareValue: 0 },
      ],
    }
    setField('compareOutcomes', next)
  }
  const removeCompareCondition = (outcomeIndex, conditionIndex) => {
    const next = [...(form.compareOutcomes || [])]
    const conditions = (next[outcomeIndex]?.conditions || []).filter((_, index) => index !== conditionIndex)
    next[outcomeIndex] = { ...next[outcomeIndex], conditions }
    setField('compareOutcomes', next)
  }
  const removeCompareOutcome = (index) => {
    setField(
      'compareOutcomes',
      (form.compareOutcomes || []).filter((_, itemIndex) => itemIndex !== index),
    )
  }
  const targetSelect = (value, onSelectTarget) => (
    <select value={value || ''} onChange={(event) => onSelectTarget(event.target.value)}>
      {targetOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )

  return (
    <section className="surface criteria-manager">
      <div className="section-title compact">
        <h2>
          Adımlar
          {selectedWorkflow ? ` - #${selectedWorkflow.id} ${selectedWorkflow.sorumlu}` : ''}
        </h2>
        <div className="criteria-title-actions">
          <span>
            {criteria.length} kriter
            {activeNodeId ? ` / aktif: ${activeNodeId}` : ''}
          </span>
          {kindOptions.map((option) => {
            const Icon = kindIcon[option.value]
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
            )
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
              <th>Bağlantı 1</th>
              <th>Bağlantı 2</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {criteria.map((item) => {
              const isSelected = item.id === selectedId
              const isActive = item.id === activeNodeId
              const primaryTarget = item.nextOnTrue || item.nextOnApprove || item.nextOnStart
              const secondaryTarget = item.nextOnFalse || item.nextOnReject

              return (
                <React.Fragment key={item.id}>
                  <tr
                    className={classNames({ 'selected-row': isSelected, 'active-row': isActive })}
                    onClick={() => onSelect(item.id)}
                  >
                    <td>
                      <strong>{item.id}</strong>
                      {isActive && <span className="active-step-badge">Aktif</span>}
                    </td>
                    <td>{kindOptions.find((option) => option.value === item.kind)?.label}</td>
                    <td>{criteriaSummary(item)}</td>
                    <td>{targetTitle(criteria, primaryTarget)}</td>
                    <td>{targetTitle(criteria, secondaryTarget)}</td>
                    <td>
                      <button type="button" className="ghost-icon-button" onClick={() => onSelect(item.id)}>
                        Düzenle
                      </button>
                    </td>
                  </tr>
                  {isSelected && (
                    <tr className="selected-details-row">
                      <td colSpan={6}>
                        <div className="inline-editor-grid">
                          <Field label="Tip">
                            <select value={form.kind} onChange={(event) => setField('kind', event.target.value)}>
                              {kindOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Başlık">
                            <input
                              required
                              value={form.title}
                              onChange={(event) => setField('title', event.target.value)}
                            />
                          </Field>
                          <Field label="Onaylanacak kişi">
                            <input
                              value={form.approver}
                              onChange={(event) => setField('approver', event.target.value)}
                            />
                          </Field>
                          <Field label="Bilgilendirme personeli">
                            <input
                              value={form.informPerson}
                              onChange={(event) => setField('informPerson', event.target.value)}
                            />
                          </Field>

                          {(form.kind === 'Start' || form.kind === 'Inform') && (
                            <Field label="Sonraki adım">
                              {targetSelect(form.nextOnStart, (value) => setField('nextOnStart', value))}
                            </Field>
                          )}

                          {form.kind === 'Approval' && (
                            <>
                              <Field label="Onay adımı">
                                {targetSelect(form.nextOnApprove, (value) => setField('nextOnApprove', value))}
                              </Field>
                              <Field label="Red adımı">
                                {targetSelect(form.nextOnReject, (value) => setField('nextOnReject', value))}
                              </Field>
                            </>
                          )}
                        </div>

                        {form.kind === 'Compare' && (
                          <div className="table-outcomes">
                            <div className="mini-title">
                              <span>Karşılaştırma durumları</span>
                              <button
                                type="button"
                                className="ghost-icon-button"
                                disabled={(form.compareOutcomes || []).length >= 4}
                                onClick={() =>
                                  setField('compareOutcomes', [
                                    ...(form.compareOutcomes || []),
                                    emptyCompareOutcome(`Durum ${(form.compareOutcomes || []).length + 1}`),
                                  ])
                                }
                              >
                                Ekle
                              </button>
                            </div>
                            {(form.compareOutcomes || []).map((outcome, index) => (
                              <div key={index} className="table-outcome-editor">
                                <div className="table-outcome-row">
                                  <input
                                    value={outcome.label}
                                    onChange={(event) => updateCompareOutcome(index, { label: event.target.value })}
                                  />
                                  {targetSelect(outcome.targetId, (targetId) =>
                                    updateCompareOutcome(index, { targetId }),
                                  )}
                                  <button
                                    type="button"
                                    className="ghost-icon-button"
                                    disabled={(form.compareOutcomes || []).length <= 2}
                                    onClick={() => removeCompareOutcome(index)}
                                  >
                                    Sil
                                  </button>
                                </div>
                                <div className="condition-list">
                                  {(outcome.conditions || []).map((condition, conditionIndex) => (
                                    <div key={conditionIndex} className="condition-row">
                                      <select
                                        value={condition.column}
                                        onChange={(event) => updateCompareCondition(index, conditionIndex, { column: event.target.value })}
                                      >
                                        {columnOptions.map((option) => (
                                          <option key={option.value} value={option.value}>
                                            {option.label}
                                          </option>
                                        ))}
                                      </select>
                                      <select
                                        value={condition.operator}
                                        onChange={(event) => updateCompareCondition(index, conditionIndex, { operator: event.target.value })}
                                      >
                                        {operatorOptions.map((option) => (
                                          <option key={option.value} value={option.value}>
                                            {option.label}
                                          </option>
                                        ))}
                                      </select>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={condition.compareValue}
                                        onChange={(event) => updateCompareCondition(index, conditionIndex, { compareValue: event.target.value })}
                                      />
                                      <button
                                        type="button"
                                        className="ghost-icon-button"
                                        disabled={(outcome.conditions || []).length <= 1}
                                        onClick={() => removeCompareCondition(index, conditionIndex)}
                                      >
                                        Koşulu sil
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    className="ghost-icon-button"
                                    onClick={() => addCompareCondition(index)}
                                  >
                                    Koşul ekle
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="table-editor-actions">
                          <button type="submit" disabled={busy}>
                            <FiSave />
                            Kaydet
                          </button>
                          <button
                            type="button"
                            className="danger-button"
                            disabled={busy || !form.id}
                            onClick={() => onDelete(form.id)}
                          >
                            <FiTrash2 />
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
          </table>
        </div>
      </form>
    </section>
  )
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

