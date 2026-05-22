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
    <section className="relative min-w-0 rounded-lg border border-app-line bg-app-surface p-4 max-[1080px]:pr-4">
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
        <div className="block min-w-0 max-[1080px]:grid-cols-1">
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
    <div className="mb-3.5 flex items-center justify-between gap-4 max-[720px]:flex-col max-[720px]:items-stretch">
      <div>
        <h2 className="m-0 text-lg tracking-normal">Akış Tasarımcı</h2>
        <p className="mb-0 mt-1 text-app-muted">
          {selectedWorkflow
            ? `#${selectedWorkflow.id} ${selectedWorkflow.sorumlu} için ayrı canvas yönetiliyor.`
            : "Bir iş kaydı seçin."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="border-app-primary bg-white text-app-primary"
          disabled={busy || currentCriteria.length === 0}
          title="Düğümleri okunabilir şekilde yerleştir"
          onClick={onFitLayout}
        >
          <MaximizeIcon />
          Fit
        </button>
        <button
          type="button"
          className="w-[38px] justify-center border-app-primary bg-white p-0 text-app-primary"
          title="Yakınlaştır"
          onClick={onZoomIn}
        >
          <ZoomInIcon />
        </button>
        <button
          type="button"
          className="w-[38px] justify-center border-app-primary bg-white p-0 text-app-primary"
          title="Uzaklaştır"
          onClick={onZoomOut}
        >
          <ZoomOutIcon />
        </button>
        <span className="inline-flex min-w-12 items-center justify-center text-[13px] font-bold text-app-muted">
          {Math.round(zoom * 100)}%
        </span>
        {kindOptions.map((option) => {
          const Icon = kindIcon[option.value];
          return (
            <button
              key={option.value}
              type="button"
              className="border-app-primary bg-white text-app-primary"
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
    <div
      className="mb-3 inline-flex gap-1 rounded-lg border border-app-line bg-slate-50 p-1"
      role="tablist"
      aria-label="Akış tasarımı"
    >
      <button
        type="button"
        role="tab"
        className={classNames(
          "min-h-8 border-transparent bg-transparent text-[#475467]",
          {
            "border-[#c7d7f4] bg-white text-app-primary":
              activeTab === "flow",
          },
        )}
        onClick={() => onChange("flow")}
      >
        Akış
      </button>
      <button
        type="button"
        role="tab"
        className={classNames(
          "min-h-8 border-transparent bg-transparent text-[#475467]",
          {
            "border-[#c7d7f4] bg-white text-app-primary":
              activeTab === "criteria",
          },
        )}
        onClick={() => onChange("criteria")}
      >
        Adımlar
      </button>
      <button
        type="button"
        role="tab"
        className={classNames(
          "min-h-8 border-transparent bg-transparent text-[#475467]",
          {
            "border-[#c7d7f4] bg-white text-app-primary":
              activeTab === "history",
          },
        )}
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
    <section className="min-w-0 rounded-lg border border-app-line bg-app-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-4 max-[720px]:flex-col max-[720px]:items-stretch">
        <h2 className="m-0 text-lg tracking-normal">
          Akış Geçmişi
          {selectedWorkflow
            ? ` - #${selectedWorkflow.id} ${selectedWorkflow.sorumlu}`
            : ""}
        </h2>
        <span className="text-sm text-app-muted">{history.length} kayıt</span>
      </div>
      <div className="overflow-auto rounded-md border border-app-line">
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
