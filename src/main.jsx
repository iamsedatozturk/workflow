import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { DndContext } from '@dnd-kit/core'
import { FiMaximize2, FiRefreshCw, FiX, FiZoomIn, FiZoomOut } from 'react-icons/fi'
import classNames from 'classnames'
import dayjs from 'dayjs'
import 'dayjs/locale/tr'
import { workflowApi } from './api/workflowApi'
import { ApprovalHistoryTable } from './components/ApprovalHistoryTable'
import { PendingApprovals } from './components/PendingApprovals'
import { CriteriaTable } from './components/CriteriaTable'
import { FlowCanvas } from './components/FlowCanvas'
import { WorkflowTable } from './components/WorkflowTable'
import { appVersion, elstarVersion } from './generated/version'
import { collectLinks, emptyCriteria, normalizeCriteria, toCriteriaForm } from './utils/workflowHelpers'
import { getNodeHeight, kindIcon, kindOptions, nodeSize } from './workflowConstants'
import './styles.css'

dayjs.locale('tr')

function App() {
  const [workflowItems, setWorkflowItems] = useState([])
  const [criteria, setCriteria] = useState([])
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null)
  const [selectedId, setSelectedId] = useState('')
  const [pendingLink, setPendingLink] = useState(null)
  const [workflowForm, setWorkflowForm] = useState({ sorumlu: '', amount: 7200 })
  const [editingWorkflowId, setEditingWorkflowId] = useState(null)
  const [workflowEditForm, setWorkflowEditForm] = useState({ sorumlu: '', tarih: '', amount: 0 })
  const [criteriaForm, setCriteriaForm] = useState(emptyCriteria())
  const [dragPreview, setDragPreview] = useState(null)
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [designerTab, setDesignerTab] = useState('flow')
  const [busy, setBusy] = useState(false)
  const [approvalDialogWorkflowId, setApprovalDialogWorkflowId] = useState(null)
  const canvasRef = useRef(null)

  const currentCriteria = useMemo(
    () => criteria.filter((item) => item.workflowItemId === selectedWorkflowId),
    [criteria, selectedWorkflowId],
  )

  const selectedWorkflow = useMemo(
    () => workflowItems.find((item) => item.id === selectedWorkflowId),
    [selectedWorkflowId, workflowItems],
  )

  const selectedCriteria = useMemo(
    () => currentCriteria.find((item) => item.id === selectedId) ?? null,
    [currentCriteria, selectedId],
  )

  const pendingItems = useMemo(
    () => workflowItems.filter((item) => isPendingApproval(item, criteria)),
    [criteria, workflowItems],
  )

  const dialogPendingItems = useMemo(
    () => pendingItems.filter((item) => item.id === approvalDialogWorkflowId),
    [approvalDialogWorkflowId, pendingItems],
  )

  const loadState = useCallback(async () => {
    const data = await workflowApi.getState()
    setWorkflowItems(data.workflowItems)
    setCriteria(data.criteria)
    setSelectedWorkflowId((current) => current || data.workflowItems[0]?.id || null)
    return data
  }, [])

  useEffect(() => {
    loadState()
  }, [loadState])

  useEffect(() => {
    if (selectedCriteria) {
      setCriteriaForm(toCriteriaForm(selectedCriteria))
    } else if (selectedWorkflowId) {
      setCriteriaForm(emptyCriteria('Start', selectedWorkflowId))
    }
  }, [selectedCriteria, selectedWorkflowId])

  useEffect(() => {
    if (!selectedWorkflowId) return

    if (!selectedId) return

    const selectedStillBelongs = currentCriteria.some((item) => item.id === selectedId)
    if (!selectedStillBelongs) {
      setSelectedId('')
    }
  }, [currentCriteria, selectedId, selectedWorkflowId])

  const runAction = useCallback(async (action) => {
    setBusy(true)
    try {
      await action()
      await loadState()
    } finally {
      setBusy(false)
    }
  }, [loadState])

  const createWorkflow = (event) => {
    event.preventDefault()
    runAction(async () => {
      const created = await workflowApi.createWorkflow({
        sorumlu: workflowForm.sorumlu,
        amount: Number(workflowForm.amount),
      })
      setWorkflowForm({ sorumlu: '', amount: 7200 })
      setSelectedWorkflowId(created.id)
      setSelectedId('')
      setCriteriaForm(emptyCriteria('Start', created.id))
    })
  }

  const beginWorkflowEdit = (item) => {
    setSelectedWorkflowId(item.id)
    setPendingLink(null)
    setSelectedId('')
    setEditingWorkflowId(item.id)
    setWorkflowEditForm({
      sorumlu: item.sorumlu,
      tarih: dayjs(item.tarih).format('YYYY-MM-DD'),
      amount: item.amount,
    })
  }

  const cancelWorkflowEdit = () => {
    setEditingWorkflowId(null)
    setWorkflowEditForm({ sorumlu: '', tarih: '', amount: 0 })
  }

  const saveWorkflowEdit = (id) => {
    runAction(async () => {
      await workflowApi.updateWorkflow(id, {
        sorumlu: workflowEditForm.sorumlu,
        tarih: workflowEditForm.tarih,
        amount: Number(workflowEditForm.amount),
      })
      cancelWorkflowEdit()
    })
  }

  const startWorkflow = useCallback((id) => {
    runAction(async () => {
      await workflowApi.startWorkflow(id)
      const data = await loadState()
      const startedWorkflow = data.workflowItems.find((item) => item.id === id)

      if (isPendingApproval(startedWorkflow, data.criteria)) {
        setApprovalDialogWorkflowId(id)
      } else {
        setApprovalDialogWorkflowId(null)
      }
    })
  }, [loadState, runAction])

  const saveCriteria = (event) => {
    event.preventDefault()
    runAction(async () => {
      await workflowApi.saveCriteria(normalizeCriteria(criteriaForm))
      setSelectedId('')
    })
  }

  const addCriteria = (kind) => {
    if (!selectedWorkflowId) return

    runAction(async () => {
      const saved = await workflowApi.saveCriteria({
        ...normalizeCriteria(emptyCriteria(kind, selectedWorkflowId)),
        positionX: 80 + (currentCriteria.length % 5) * 230,
        positionY: 220 + Math.floor(currentCriteria.length / 5) * 140,
      })
      setSelectedId(saved.id)
    })
  }

  const deleteSelectedCriteria = useCallback((criteriaId = selectedId) => {
    if (!criteriaId || busy) return

    runAction(async () => {
      await workflowApi.deleteCriteria(criteriaId)
      setSelectedId('')
    })
  }, [busy, runAction, selectedId])

  const disconnectLink = useCallback((sourceId, outcome) => {
    if (!sourceId || !outcome || busy) return

    const source = currentCriteria.find((item) => item.id === sourceId)
    if (!source) return

    const next = { ...source }
    if (outcome.startsWith('compareOutcomes:')) {
      const outcomeIndex = Number(outcome.split(':')[1])
      next.compareOutcomes = [...(source.compareOutcomes || [])]
      if (next.compareOutcomes[outcomeIndex]) {
        next.compareOutcomes[outcomeIndex] = {
          ...next.compareOutcomes[outcomeIndex],
          targetId: null,
        }
      }
      if (outcomeIndex === 0) next.nextOnTrue = null
      if (outcomeIndex === 1) next.nextOnFalse = null
    } else {
      next[outcome] = null
    }

    runAction(async () => {
      await workflowApi.saveCriteria(normalizeCriteria(next))
      setPendingLink(null)
      setSelectedId(sourceId)
    })
  }, [busy, currentCriteria, runAction])

  useEffect(() => {
    const deleteWithKeyboard = (event) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase()
      const isEditing =
        ['input', 'textarea', 'select'].includes(activeTag) ||
        document.activeElement?.isContentEditable

      if (event.key !== 'Delete' || isEditing) return

      event.preventDefault()
      if (pendingLink) {
        disconnectLink(pendingLink.sourceId, pendingLink.outcome)
        return
      }
      deleteSelectedCriteria()
    }

    window.addEventListener('keydown', deleteWithKeyboard)
    return () => window.removeEventListener('keydown', deleteWithKeyboard)
  }, [deleteSelectedCriteria, disconnectLink, pendingLink])

  useEffect(() => {
    if (!approvalDialogWorkflowId) return

    const stillPending = pendingItems.some((item) => item.id === approvalDialogWorkflowId)
    if (!stillPending) {
      setApprovalDialogWorkflowId(null)
    }
  }, [approvalDialogWorkflowId, pendingItems])

  const updateNodePosition = ({ active, delta }) => {
    const item = currentCriteria.find((candidate) => candidate.id === active.id)
    if (!item) return

    setSelectedId(item.id)
    if (delta.x === 0 && delta.y === 0) return

    const next = {
      ...item,
      positionX: Math.max(12, Math.round(item.positionX + delta.x)),
      positionY: Math.max(12, Math.round(item.positionY + delta.y)),
    }

    runAction(async () => {
      await workflowApi.saveCriteria(next)
      setSelectedId(next.id)
    })
  }

  const connectNodes = (sourceId, outcome, targetId) => {
    const source = currentCriteria.find((item) => item.id === sourceId)
    if (!source || source.id === targetId) return

    const next = { ...source }
    if (outcome.startsWith('compareOutcomes:')) {
      const outcomeIndex = Number(outcome.split(':')[1])
      next.compareOutcomes = [...(source.compareOutcomes || [])]
      next.compareOutcomes[outcomeIndex] = {
        ...next.compareOutcomes[outcomeIndex],
        targetId,
      }
      if (outcomeIndex === 0) next.nextOnTrue = targetId
      if (outcomeIndex === 1) next.nextOnFalse = targetId
    } else {
      next[outcome] = targetId
    }

    setPendingLink(null)
    runAction(async () => {
      await workflowApi.saveCriteria(normalizeCriteria(next))
      setSelectedId('')
    })
  }

  const fitFlowLayout = () => {
    if (!currentCriteria.length || busy) return

    const nextPositions = buildFitLayout(currentCriteria)
    setDesignerTab('flow')
    setCanvasZoom(1)

    runAction(async () => {
      for (const item of currentCriteria) {
        const position = nextPositions.get(item.id)
        if (!position) continue

        await workflowApi.saveCriteria({
          ...normalizeCriteria(item),
          positionX: position.x,
          positionY: position.y,
        })
      }

      requestAnimationFrame(() => {
        canvasRef.current?.scrollTo({ left: 0, top: 0, behavior: 'smooth' })
      })
    })
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">Platform UI</span>
          <h1>İş Akışı Yönetimi</h1>
          <p>
            Kriter tablosu, onay-red bağlantıları ve durum listeleri tek ekranda
            yönetilir.
          </p>
        </div>
        <div className="header-actions">
          <span>v{appVersion} / Elstar {elstarVersion}</span>
          <button
            type="button"
            className="ghost-button"
            disabled={busy}
            onClick={() => runAction(workflowApi.resetDemo)}
          >
            <FiRefreshCw />
            Demo Verisini Yenile
          </button>
        </div>
      </header>

      <main>
        <section className="top-grid">
          <WorkflowTable
            items={workflowItems}
            criteria={criteria}
            selectedWorkflowId={selectedWorkflowId}
            form={workflowForm}
            busy={busy}
            onFormChange={setWorkflowForm}
            onSubmit={createWorkflow}
            editingId={editingWorkflowId}
            editForm={workflowEditForm}
            onEditFormChange={setWorkflowEditForm}
            onEdit={beginWorkflowEdit}
            onCancelEdit={cancelWorkflowEdit}
            onSaveEdit={saveWorkflowEdit}
            onSelect={(item) => {
              setSelectedWorkflowId(item.id)
              setPendingLink(null)
              setSelectedId('')
            }}
            onStart={startWorkflow}
          />
        </section>

        <section className="designer-section">
          <div className="section-title">
            <div>
              <h2>Akış Tasarımcı</h2>
              <p>
                {selectedWorkflow
                  ? `#${selectedWorkflow.id} ${selectedWorkflow.sorumlu} için ayrı canvas yönetiliyor.`
                  : 'Bir iş kaydı seçin.'}
              </p>
            </div>
            <div className="tool-strip">
              <button
                type="button"
                className="secondary-button"
                disabled={busy || currentCriteria.length === 0}
                title="Düğümleri okunabilir şekilde yerleştir"
                onClick={fitFlowLayout}
              >
                <FiMaximize2 />
                Fit
              </button>
              <button
                type="button"
                className="secondary-button icon-only"
                title="Yakınlaştır"
                onClick={() => setCanvasZoom((current) => Math.min(1.5, Number((current + 0.1).toFixed(2))))}
              >
                <FiZoomIn />
              </button>
              <button
                type="button"
                className="secondary-button icon-only"
                title="Uzaklaştır"
                onClick={() => setCanvasZoom((current) => Math.max(0.6, Number((current - 0.1).toFixed(2))))}
              >
                <FiZoomOut />
              </button>
              <span className="zoom-value">{Math.round(canvasZoom * 100)}%</span>
              {kindOptions.map((option) => {
                const Icon = kindIcon[option.value]
                return (
                  <button
                    key={option.value}
                    type="button"
                    className="secondary-button"
                    disabled={busy}
                  onClick={() => {
                      setDesignerTab('flow')
                      addCriteria(option.value)
                    }}
                  >
                    <Icon />
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="designer-tabs" role="tablist" aria-label="Akış tasarımı">
            <button
              type="button"
              role="tab"
              className={classNames('tab-button', { active: designerTab === 'flow' })}
              onClick={() => setDesignerTab('flow')}
            >
              Akış
            </button>
            <button
              type="button"
              role="tab"
              className={classNames('tab-button', { active: designerTab === 'criteria' })}
              onClick={() => setDesignerTab('criteria')}
            >
              Adımlar
            </button>
            <button
              type="button"
              role="tab"
              className={classNames('tab-button', { active: designerTab === 'history' })}
              onClick={() => setDesignerTab('history')}
            >
              Akış Geçmişi
            </button>
          </div>

          {designerTab === 'flow' && (
            <div className="designer-grid">
              <DndContext
                onDragMove={({ active, delta }) => setDragPreview({ id: active.id, delta })}
                onDragCancel={() => setDragPreview(null)}
                onDragEnd={(event) => {
                  setDragPreview(null)
                  updateNodePosition(event)
                }}
              >
                <FlowCanvas
                  criteria={criteria}
                  currentCriteria={currentCriteria}
                  dragPreview={dragPreview}
                  zoom={canvasZoom}
                  activeNodeId={selectedWorkflow?.currentNodeId}
                  selectedId={selectedId}
                  pendingLink={pendingLink}
                  canvasRef={canvasRef}
                  onSelect={setSelectedId}
                  onOpenDetails={(id) => {
                    setSelectedId(id)
                    setPendingLink(null)
                    setDesignerTab('criteria')
                  }}
                  onClearSelection={() => {
                    setPendingLink(null)
                    setSelectedId('')
                  }}
                  onDelete={deleteSelectedCriteria}
                  onDeleteLink={disconnectLink}
                  onBeginLink={(sourceId, outcome) => {
                    setPendingLink({ sourceId, outcome })
                    setSelectedId(sourceId)
                  }}
                  onConnect={connectNodes}
                />
              </DndContext>
            </div>
          )}

          {designerTab === 'criteria' && (
            <CriteriaTable
              criteria={currentCriteria}
              selectedWorkflow={selectedWorkflow}
              selectedId={selectedId}
              activeNodeId={selectedWorkflow?.currentNodeId}
              form={criteriaForm}
              busy={busy}
              onSelect={setSelectedId}
              onChange={setCriteriaForm}
              onSubmit={saveCriteria}
              onDelete={deleteSelectedCriteria}
              onAddCriteria={addCriteria}
            />
          )}

          {designerTab === 'history' && (
            <ApprovalHistoryTable selectedWorkflow={selectedWorkflow} />
          )}
        </section>
      </main>

      {approvalDialogWorkflowId && dialogPendingItems.length > 0 && (
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
                onClick={() => setApprovalDialogWorkflowId(null)}
              >
                <FiX />
              </button>
            </div>
            <PendingApprovals
              items={dialogPendingItems}
              criteria={criteria}
              busy={busy}
              showChrome={false}
              onDecision={(id, approved, note) =>
                runAction(() => workflowApi.decideWorkflow(id, { approved, note }))
              }
            />
          </section>
        </div>
      )}
    </div>
  )
}

function isPendingApproval(item, criteria) {
  if (!item) return false

  return criteria.some(
    (candidate) =>
      candidate.workflowItemId === item.id &&
      candidate.id === item.currentNodeId &&
      candidate.kind === 'Approval',
  )
}

function buildFitLayout(criteria) {
  const links = collectLinks(criteria)
  const rankById = buildTraversalRanks(criteria, links)
  const groups = new Map()
  criteria.forEach((item) => {
    const column = fitColumn(item)
    if (!groups.has(column)) groups.set(column, [])
    groups.get(column).push(item)
  })

  const sortedColumns = [...groups.keys()].sort((a, b) => a - b)
  const yGap = 74
  const maxGroupHeight = Math.max(
    1,
    ...[...groups.values()].map((items) =>
      items.reduce((sum, item) => sum + getNodeHeight(item), 0) + Math.max(0, items.length - 1) * yGap,
    ),
  )
  const top = 72
  const left = 72
  const xGap = 128
  const positions = new Map()

  sortedColumns.forEach((column, columnIndex) => {
    const items = groups.get(column).sort((a, b) => compareLayoutNodes(a, b, rankById))
    const groupHeight =
      items.reduce((sum, item) => sum + getNodeHeight(item), 0) + Math.max(0, items.length - 1) * yGap
    let y = top + Math.max(0, (maxGroupHeight - groupHeight) / 2)

    items.forEach((item) => {
      positions.set(item.id, {
        x: left + columnIndex * (nodeSize.width + xGap),
        y: Math.round(y),
      })
      y += getNodeHeight(item) + yGap
    })
  })

  return positions
}

function fitColumn(item) {
  const priority = {
    Start: 0,
    Compare: 1,
    Approval: 2,
    Inform: 3,
    End: 4,
  }

  return priority[item.kind] ?? 2
}

function compareLayoutNodes(a, b, rankById = new Map()) {
  return (
    (rankById.get(a.id) ?? 999) - (rankById.get(b.id) ?? 999) ||
    a.title.localeCompare(b.title, 'tr')
  )
}

function buildTraversalRanks(criteria, links) {
  const rankById = new Map()
  const outgoing = new Map(criteria.map((item) => [item.id, []]))
  links.forEach((link) => {
    outgoing.get(link.source.id)?.push(link.target.id)
  })

  const roots = criteria.filter((item) => item.kind === 'Start')
  const queue = roots.length ? roots.map((item) => item.id) : criteria.map((item) => item.id)

  while (queue.length) {
    const id = queue.shift()
    if (rankById.has(id)) continue

    rankById.set(id, rankById.size)
    ;(outgoing.get(id) || []).forEach((targetId) => {
      if (targetId && !rankById.has(targetId)) queue.push(targetId)
    })
  }

  criteria.forEach((item) => {
    if (!rankById.has(item.id)) rankById.set(item.id, rankById.size)
  })

  return rankById
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{ padding: 24, fontFamily: 'Inter, Segoe UI, Arial, sans-serif' }}>
          <h1>Sayfa yuklenemedi</h1>
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
          </pre>
        </main>
      )
    }

    return this.props.children
  }
}

const rootElement = document.getElementById('root')

try {
  createRoot(rootElement).render(
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>,
  )
} catch (error) {
  rootElement.innerHTML = `
    <main style="padding:24px;font-family:Inter,Segoe UI,Arial,sans-serif;color:#1f2937">
      <h1>Sayfa yuklenemedi</h1>
      <pre style="white-space:pre-wrap;background:#fff;border:1px solid #d8dee8;border-radius:8px;padding:16px">${String(
        error?.stack || error?.message || error,
      )}</pre>
    </main>
  `
  throw error
}
