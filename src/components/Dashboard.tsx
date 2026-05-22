import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import { workflowApi } from "../api/workflowApi";
import {
  buildFitLayout,
  emptyCriteria,
  isPendingApproval,
  normalizeCriteria,
  toCriteriaForm,
} from "../utils/workflowHelpers";
import { DashboardShell } from "./DashboardShell";

dayjs.locale("tr");

export function Dashboard() {
  const [workflowItems, setWorkflowItems] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [pendingLink, setPendingLink] = useState(null);
  const [workflowForm, setWorkflowForm] = useState({
    sorumlu: "",
    amount: 7200,
  });
  const [editingWorkflowId, setEditingWorkflowId] = useState(null);
  const [workflowEditForm, setWorkflowEditForm] = useState({
    sorumlu: "",
    tarih: "",
    amount: 0,
  });
  const [criteriaForm, setCriteriaForm] = useState(emptyCriteria());
  const [dragPreview, setDragPreview] = useState(null);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [designerTab, setDesignerTab] = useState("flow");
  const [busy, setBusy] = useState(false);
  const [approvalDialogWorkflowId, setApprovalDialogWorkflowId] =
    useState(null);
  const canvasRef = useRef(null);

  const currentCriteria = useMemo(
    () => criteria.filter((item) => item.workflowItemId === selectedWorkflowId),
    [criteria, selectedWorkflowId],
  );

  const selectedWorkflow = useMemo(
    () => workflowItems.find((item) => item.id === selectedWorkflowId),
    [selectedWorkflowId, workflowItems],
  );

  const selectedCriteria = useMemo(
    () => currentCriteria.find((item) => item.id === selectedId) ?? null,
    [currentCriteria, selectedId],
  );

  const pendingItems = useMemo(
    () => workflowItems.filter((item) => isPendingApproval(item, criteria)),
    [criteria, workflowItems],
  );

  const dialogPendingItems = useMemo(
    () => pendingItems.filter((item) => item.id === approvalDialogWorkflowId),
    [approvalDialogWorkflowId, pendingItems],
  );

  const loadState = useCallback(async () => {
    const data = await workflowApi.getState();
    setWorkflowItems(data.workflowItems);
    setCriteria(data.criteria);
    setSelectedWorkflowId(
      (current) => current || data.workflowItems[0]?.id || null,
    );
    return data;
  }, []);

  const runAction = useCallback(
    async (action) => {
      setBusy(true);
      try {
        await action();
        await loadState();
      } finally {
        setBusy(false);
      }
    },
    [loadState],
  );

  useEffect(() => {
    loadState();
  }, [loadState]);

  useEffect(() => {
    if (selectedCriteria) {
      setCriteriaForm(toCriteriaForm(selectedCriteria));
    } else if (selectedWorkflowId) {
      setCriteriaForm(emptyCriteria("Start", selectedWorkflowId));
    }
  }, [selectedCriteria, selectedWorkflowId]);

  useEffect(() => {
    if (!selectedWorkflowId || !selectedId) return;

    const selectedStillBelongs = currentCriteria.some(
      (item) => item.id === selectedId,
    );
    if (!selectedStillBelongs) {
      setSelectedId("");
    }
  }, [currentCriteria, selectedId, selectedWorkflowId]);

  useEffect(() => {
    if (!approvalDialogWorkflowId) return;

    const stillPending = pendingItems.some(
      (item) => item.id === approvalDialogWorkflowId,
    );
    if (!stillPending) {
      setApprovalDialogWorkflowId(null);
    }
  }, [approvalDialogWorkflowId, pendingItems]);

  const createWorkflow = (event) => {
    event.preventDefault();
    runAction(async () => {
      const created = await workflowApi.createWorkflow({
        sorumlu: workflowForm.sorumlu,
        amount: Number(workflowForm.amount),
      });
      setWorkflowForm({ sorumlu: "", amount: 7200 });
      setSelectedWorkflowId(created.id);
      setSelectedId("");
      setCriteriaForm(emptyCriteria("Start", created.id));
    });
  };

  const beginWorkflowEdit = (item) => {
    setSelectedWorkflowId(item.id);
    setPendingLink(null);
    setSelectedId("");
    setEditingWorkflowId(item.id);
    setWorkflowEditForm({
      sorumlu: item.sorumlu,
      tarih: dayjs(item.tarih).format("YYYY-MM-DD"),
      amount: item.amount,
    });
  };

  const cancelWorkflowEdit = () => {
    setEditingWorkflowId(null);
    setWorkflowEditForm({ sorumlu: "", tarih: "", amount: 0 });
  };

  const saveWorkflowEdit = (id) => {
    runAction(async () => {
      await workflowApi.updateWorkflow(id, {
        sorumlu: workflowEditForm.sorumlu,
        tarih: workflowEditForm.tarih,
        amount: Number(workflowEditForm.amount),
      });
      cancelWorkflowEdit();
    });
  };

  const startWorkflow = useCallback(
    (id) => {
      runAction(async () => {
        await workflowApi.startWorkflow(id);
        const data = await loadState();
        const startedWorkflow = data.workflowItems.find(
          (item) => item.id === id,
        );

        setApprovalDialogWorkflowId(
          isPendingApproval(startedWorkflow, data.criteria) ? id : null,
        );
      });
    },
    [loadState, runAction],
  );

  const saveCriteria = (event) => {
    event.preventDefault();
    runAction(async () => {
      await workflowApi.saveCriteria(normalizeCriteria(criteriaForm));
      setSelectedId("");
    });
  };

  const addCriteria = (kind) => {
    if (!selectedWorkflowId) return;

    setDesignerTab("flow");
    runAction(async () => {
      const saved = await workflowApi.saveCriteria({
        ...normalizeCriteria(emptyCriteria(kind, selectedWorkflowId)),
        positionX: 80 + (currentCriteria.length % 5) * 230,
        positionY: 220 + Math.floor(currentCriteria.length / 5) * 140,
      });
      setSelectedId(saved.id);
    });
  };

  const deleteSelectedCriteria = useCallback(
    (criteriaId = selectedId) => {
      if (!criteriaId || busy) return;

      runAction(async () => {
        await workflowApi.deleteCriteria(criteriaId);
        setSelectedId("");
      });
    },
    [busy, runAction, selectedId],
  );

  const disconnectLink = useCallback(
    (sourceId, outcome) => {
      if (!sourceId || !outcome || busy) return;

      const source = currentCriteria.find((item) => item.id === sourceId);
      if (!source) return;

      const next = { ...source };
      if (outcome.startsWith("compareOutcomes:")) {
        const outcomeIndex = Number(outcome.split(":")[1]);
        next.compareOutcomes = [...(source.compareOutcomes || [])];
        if (next.compareOutcomes[outcomeIndex]) {
          next.compareOutcomes[outcomeIndex] = {
            ...next.compareOutcomes[outcomeIndex],
            targetId: null,
          };
        }
        if (outcomeIndex === 0) next.nextOnTrue = null;
        if (outcomeIndex === 1) next.nextOnFalse = null;
      } else {
        next[outcome] = null;
      }

      runAction(async () => {
        await workflowApi.saveCriteria(normalizeCriteria(next));
        setPendingLink(null);
        setSelectedId(sourceId);
      });
    },
    [busy, currentCriteria, runAction],
  );

  useEffect(() => {
    const deleteWithKeyboard = (event) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isEditing =
        ["input", "textarea", "select"].includes(activeTag) ||
        (document.activeElement instanceof HTMLElement &&
          document.activeElement.isContentEditable);

      if (event.key !== "Delete" || isEditing) return;

      event.preventDefault();
      if (pendingLink) {
        disconnectLink(pendingLink.sourceId, pendingLink.outcome);
        return;
      }
      deleteSelectedCriteria();
    };

    window.addEventListener("keydown", deleteWithKeyboard);
    return () => window.removeEventListener("keydown", deleteWithKeyboard);
  }, [deleteSelectedCriteria, disconnectLink, pendingLink]);

  const updateNodePosition = ({ active, delta }) => {
    setDragPreview(null);

    const item = currentCriteria.find(
      (candidate) => candidate.id === active.id,
    );
    if (!item) return;

    setSelectedId(item.id);
    if (delta.x === 0 && delta.y === 0) return;

    const next = {
      ...item,
      positionX: Math.max(12, Math.round(item.positionX + delta.x)),
      positionY: Math.max(12, Math.round(item.positionY + delta.y)),
    };

    runAction(async () => {
      await workflowApi.saveCriteria(next);
      setSelectedId(next.id);
    });
  };

  const connectNodes = (sourceId, outcome, targetId) => {
    const source = currentCriteria.find((item) => item.id === sourceId);
    if (!source || source.id === targetId) return;

    const next = { ...source };
    if (outcome.startsWith("compareOutcomes:")) {
      const outcomeIndex = Number(outcome.split(":")[1]);
      next.compareOutcomes = [...(source.compareOutcomes || [])];
      next.compareOutcomes[outcomeIndex] = {
        ...next.compareOutcomes[outcomeIndex],
        targetId,
      };
      if (outcomeIndex === 0) next.nextOnTrue = targetId;
      if (outcomeIndex === 1) next.nextOnFalse = targetId;
    } else {
      next[outcome] = targetId;
    }

    setPendingLink(null);
    runAction(async () => {
      await workflowApi.saveCriteria(normalizeCriteria(next));
      setSelectedId("");
    });
  };

  const fitFlowLayout = () => {
    if (!currentCriteria.length || busy) return;

    const nextPositions = buildFitLayout(currentCriteria);
    setDesignerTab("flow");
    setCanvasZoom(1);

    runAction(async () => {
      for (const item of currentCriteria) {
        const position = nextPositions.get(item.id);
        if (!position) continue;

        await workflowApi.saveCriteria({
          ...normalizeCriteria(item),
          positionX: position.x,
          positionY: position.y,
        });
      }

      requestAnimationFrame(() => {
        canvasRef.current?.scrollTo({ left: 0, top: 0, behavior: "smooth" });
      });
    });
  };

  const selectWorkflow = (item) => {
    setSelectedWorkflowId(item.id);
    setPendingLink(null);
    setSelectedId("");
  };

  const openCriteriaDetails = (id) => {
    setSelectedId(id);
    setPendingLink(null);
    setDesignerTab("criteria");
  };

  const clearCanvasSelection = () => {
    setPendingLink(null);
    setSelectedId("");
  };

  const beginLink = (sourceId, outcome) => {
    setPendingLink({ sourceId, outcome });
    setSelectedId(sourceId);
  };

  return (
    <DashboardShell
      busy={busy}
      canvasRef={canvasRef}
      canvasZoom={canvasZoom}
      criteria={criteria}
      criteriaForm={criteriaForm}
      currentCriteria={currentCriteria}
      designerTab={designerTab}
      dialogPendingItems={dialogPendingItems}
      dragPreview={dragPreview}
      editingWorkflowId={editingWorkflowId}
      pendingLink={pendingLink}
      selectedId={selectedId}
      selectedWorkflow={selectedWorkflow}
      selectedWorkflowId={selectedWorkflowId}
      showApprovalDialog={Boolean(approvalDialogWorkflowId)}
      workflowEditForm={workflowEditForm}
      workflowForm={workflowForm}
      workflowItems={workflowItems}
      onAddCriteria={addCriteria}
      onBeginLink={beginLink}
      onBeginWorkflowEdit={beginWorkflowEdit}
      onCancelWorkflowEdit={cancelWorkflowEdit}
      onChangeCriteriaForm={setCriteriaForm}
      onClearCanvasSelection={clearCanvasSelection}
      onCloseApprovalDialog={() => setApprovalDialogWorkflowId(null)}
      onConnectNodes={connectNodes}
      onCreateWorkflow={createWorkflow}
      onDecision={(id, approved, note) =>
        runAction(() => workflowApi.decideWorkflow(id, { approved, note }))
      }
      onDeleteSelectedCriteria={deleteSelectedCriteria}
      onDisconnectLink={disconnectLink}
      onDragMove={(event) =>
        setDragPreview(
          event ? { id: event.active.id, delta: event.delta } : null,
        )
      }
      onFitFlowLayout={fitFlowLayout}
      onOpenCriteriaDetails={openCriteriaDetails}
      onResetDemo={() => runAction(workflowApi.resetDemo)}
      onSaveCriteria={saveCriteria}
      onSaveWorkflowEdit={saveWorkflowEdit}
      onSelectCriteria={setSelectedId}
      onSelectWorkflow={selectWorkflow}
      onSetDesignerTab={setDesignerTab}
      onStartWorkflow={startWorkflow}
      onUpdateNodePosition={updateNodePosition}
      onWorkflowEditFormChange={setWorkflowEditForm}
      onWorkflowFormChange={setWorkflowForm}
      onZoomIn={() =>
        setCanvasZoom((current) =>
          Math.min(1.5, Number((current + 0.1).toFixed(2))),
        )
      }
      onZoomOut={() =>
        setCanvasZoom((current) =>
          Math.max(0.6, Number((current - 0.1).toFixed(2))),
        )
      }
    />
  );
}
