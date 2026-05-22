import { ApprovalDialog } from "./ApprovalDialog";
import { WorkflowDesigner } from "./WorkflowDesigner";
import { WorkflowTable } from "./WorkflowTable";

export function DashboardShell({
  busy,
  canvasRef,
  canvasZoom,
  criteria,
  criteriaForm,
  currentCriteria,
  designerTab,
  dialogPendingItems,
  dragPreview,
  editingWorkflowId,
  pendingLink,
  selectedId,
  selectedWorkflow,
  selectedWorkflowId,
  showApprovalDialog,
  workflowEditForm,
  workflowForm,
  workflowItems,
  onAddCriteria,
  onBeginLink,
  onBeginWorkflowEdit,
  onCancelWorkflowEdit,
  onChangeCriteriaForm,
  onClearCanvasSelection,
  onCloseApprovalDialog,
  onConnectNodes,
  onCreateWorkflow,
  onDecision,
  onDeleteSelectedCriteria,
  onDisconnectLink,
  onDragMove,
  onFitFlowLayout,
  onOpenCriteriaDetails,
  onResetDemo,
  onSaveCriteria,
  onSaveWorkflowEdit,
  onSelectCriteria,
  onSelectWorkflow,
  onSetDesignerTab,
  onStartWorkflow,
  onUpdateNodePosition,
  onWorkflowEditFormChange,
  onWorkflowFormChange,
  onZoomIn,
  onZoomOut,
}) {
  return (
    <div className="min-h-screen">
      <main className="grid gap-[18px] p-[18px]">
        <section className="grid grid-cols-1 gap-[18px]">
          <WorkflowTable
            items={workflowItems}
            criteria={criteria}
            selectedWorkflowId={selectedWorkflowId}
            form={workflowForm}
            busy={busy}
            onFormChange={onWorkflowFormChange}
            onSubmit={onCreateWorkflow}
            editingId={editingWorkflowId}
            editForm={workflowEditForm}
            onEditFormChange={onWorkflowEditFormChange}
            onEdit={onBeginWorkflowEdit}
            onCancelEdit={onCancelWorkflowEdit}
            onSaveEdit={onSaveWorkflowEdit}
            onSelect={onSelectWorkflow}
            onStart={onStartWorkflow}
            onResetDemo={onResetDemo}
          />
        </section>

        <WorkflowDesigner
          busy={busy}
          canvasRef={canvasRef}
          canvasZoom={canvasZoom}
          criteriaForm={criteriaForm}
          currentCriteria={currentCriteria}
          designerTab={designerTab}
          dragPreview={dragPreview}
          pendingLink={pendingLink}
          selectedCriteriaId={selectedId}
          selectedWorkflow={selectedWorkflow}
          onAddCriteria={onAddCriteria}
          onBeginLink={onBeginLink}
          onChangeCriteriaForm={onChangeCriteriaForm}
          onClearSelection={onClearCanvasSelection}
          onConnect={onConnectNodes}
          onDeleteCriteria={onDeleteSelectedCriteria}
          onDeleteLink={onDisconnectLink}
          onDragMove={onDragMove}
          onFitLayout={onFitFlowLayout}
          onOpenDetails={onOpenCriteriaDetails}
          onSaveCriteria={onSaveCriteria}
          onSelectCriteria={onSelectCriteria}
          onSetDesignerTab={onSetDesignerTab}
          onUpdateNodePosition={onUpdateNodePosition}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
        />
      </main>

      {showApprovalDialog && (
        <ApprovalDialog
          busy={busy}
          criteria={criteria}
          items={dialogPendingItems}
          onClose={onCloseApprovalDialog}
          onDecision={onDecision}
        />
      )}
    </div>
  );
}
