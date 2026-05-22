import { DndContext } from "@dnd-kit/core";
import classNames from "classnames";
import dayjs from "dayjs";
import { FiMaximize2, FiZoomIn, FiZoomOut } from "react-icons/fi";
import { kindIcon, kindOptions } from "../utils/workflowConstants";
import { CriteriaTable } from "./CriteriaTable";
import { FlowCanvas } from "./FlowCanvas";

const MaximizeIcon = FiMaximize2 as any;
const ZoomInIcon = FiZoomIn as any;
const ZoomOutIcon = FiZoomOut as any;

export function WorkflowDesigner({
  busy,
  canvasRef,
  canvasZoom,
  criteriaForm,
  currentCriteria,
  designerTab,
  dragPreview,
  pendingLink,
  selectedCriteriaId,
  selectedWorkflow,
  onAddCriteria,
  onBeginLink,
  onChangeCriteriaForm,
  onClearSelection,
  onConnect,
  onDeleteCriteria,
  onDeleteLink,
  onDragMove,
  onFitLayout,
  onOpenDetails,
  onSaveCriteria,
  onSelectCriteria,
  onSetDesignerTab,
  onUpdateNodePosition,
  onZoomIn,
  onZoomOut,
}) {
  return (
    <section className="designer-section">
      <DesignerToolbar
        busy={busy}
        currentCriteria={currentCriteria}
        selectedWorkflow={selectedWorkflow}
        zoom={canvasZoom}
        onAddCriteria={onAddCriteria}
        onFitLayout={onFitLayout}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
      />

      <DesignerTabs activeTab={designerTab} onChange={onSetDesignerTab} />

      {designerTab === "flow" && (
        <div className="designer-grid">
          <DndContext
            onDragMove={onDragMove}
            onDragCancel={() => onDragMove(null)}
            onDragEnd={onUpdateNodePosition}
          >
            <FlowCanvas
              currentCriteria={currentCriteria}
              dragPreview={dragPreview}
              zoom={canvasZoom}
              activeNodeId={selectedWorkflow?.currentNodeId}
              selectedId={selectedCriteriaId}
              pendingLink={pendingLink}
              canvasRef={canvasRef}
              onSelect={onSelectCriteria}
              onOpenDetails={onOpenDetails}
              onClearSelection={onClearSelection}
              onDelete={onDeleteCriteria}
              onDeleteLink={onDeleteLink}
              onBeginLink={onBeginLink}
              onConnect={onConnect}
            />
          </DndContext>
        </div>
      )}

      {designerTab === "criteria" && (
        <CriteriaTable
          criteria={currentCriteria}
          selectedWorkflow={selectedWorkflow}
          selectedId={selectedCriteriaId}
          activeNodeId={selectedWorkflow?.currentNodeId}
          form={criteriaForm}
          busy={busy}
          onSelect={onSelectCriteria}
          onChange={onChangeCriteriaForm}
          onSubmit={onSaveCriteria}
          onDelete={onDeleteCriteria}
          onAddCriteria={onAddCriteria}
        />
      )}

      {designerTab === "history" && (
        <ApprovalHistoryTable selectedWorkflow={selectedWorkflow} />
      )}
    </section>
  );
}

function DesignerToolbar({
  busy,
  currentCriteria,
  selectedWorkflow,
  zoom,
  onAddCriteria,
  onFitLayout,
  onZoomIn,
  onZoomOut,
}) {
  return (
    <div className="section-title">
      <div>
        <h2>Akış Tasarımcı</h2>
        <p>
          {selectedWorkflow
            ? `#${selectedWorkflow.id} ${selectedWorkflow.sorumlu} için ayrı canvas yönetiliyor.`
            : "Bir iş kaydı seçin."}
        </p>
      </div>
      <div className="tool-strip">
        <button
          type="button"
          className="secondary-button"
          disabled={busy || currentCriteria.length === 0}
          title="Düğümleri okunabilir şekilde yerleştir"
          onClick={onFitLayout}
        >
          <MaximizeIcon />
          Fit
        </button>
        <button
          type="button"
          className="secondary-button icon-only"
          title="Yakınlaştır"
          onClick={onZoomIn}
        >
          <ZoomInIcon />
        </button>
        <button
          type="button"
          className="secondary-button icon-only"
          title="Uzaklaştır"
          onClick={onZoomOut}
        >
          <ZoomOutIcon />
        </button>
        <span className="zoom-value">{Math.round(zoom * 100)}%</span>
        {kindOptions.map((option) => {
          const Icon = kindIcon[option.value];
          return (
            <button
              key={option.value}
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() => onAddCriteria(option.value)}
            >
              <Icon />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DesignerTabs({ activeTab, onChange }) {
  return (
    <div className="designer-tabs" role="tablist" aria-label="Akış tasarımı">
      <button
        type="button"
        role="tab"
        className={classNames("tab-button", { active: activeTab === "flow" })}
        onClick={() => onChange("flow")}
      >
        Akış
      </button>
      <button
        type="button"
        role="tab"
        className={classNames("tab-button", {
          active: activeTab === "criteria",
        })}
        onClick={() => onChange("criteria")}
      >
        Adımlar
      </button>
      <button
        type="button"
        role="tab"
        className={classNames("tab-button", {
          active: activeTab === "history",
        })}
        onClick={() => onChange("history")}
      >
        Akış Geçmişi
      </button>
    </div>
  );
}

function ApprovalHistoryTable({ selectedWorkflow }: any) {
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
