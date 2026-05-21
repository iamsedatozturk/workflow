const state = {
  workflows: [],
  criteria: [],
  selectedId: null
};

const kindLabels = {
  Start: "Başlat",
  Compare: "Karşılaştırma",
  Approval: "Onay",
  Inform: "Bilgilendirme",
  End: "Bitiş"
};

const nodeSize = {
  width: 170,
  height: 72
};

const api = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) throw new Error(await response.text());
  return response.status === 204 ? null : response.json();
};

async function loadState() {
  const data = await api("/api/state");
  state.workflows = data.workflowItems;
  state.criteria = data.criteria;
  state.selectedId ||= state.criteria[0]?.id ?? null;
  render();
}

function render() {
  renderWorkflowTable();
  renderPendingList();
  renderCriteriaTable();
  renderSelectOptions();
  renderFlow();
  fillEditor(state.criteria.find(c => c.id === state.selectedId) ?? state.criteria[0]);
}

function renderWorkflowTable() {
  document.querySelector("#workflowCount").textContent = `${state.workflows.length} kayıt`;
  document.querySelector("#workflowRows").innerHTML = state.workflows.map(item => `
    <tr>
      <td>${item.id}</td>
      <td>${escapeHtml(item.sorumlu)}</td>
      <td>${item.tarih}</td>
      <td>${formatMoney(item.amount)}</td>
      <td><span class="status ${statusClass(item.durum)}">${escapeHtml(item.durum)}</span></td>
      <td>
        <button data-start="${item.id}" ${item.durum !== "Taslak" ? "disabled" : ""}>Başlat</button>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll("[data-start]").forEach(button => {
    button.addEventListener("click", async () => {
      await api(`/api/workflows/${button.dataset.start}/start`, { method: "POST" });
      await loadState();
    });
  });
}

function renderPendingList() {
  const pending = state.workflows.filter(item => item.durum === "Onay Bekliyor");
  document.querySelector("#pendingCount").textContent = `${pending.length} bekleyen`;
  const list = document.querySelector("#pendingList");
  list.innerHTML = "";

  if (pending.length === 0) {
    list.innerHTML = `<p class="empty">Bekleyen onay yok.</p>`;
    return;
  }

  const template = document.querySelector("#pendingTemplate");
  pending.forEach(item => {
    const node = template.content.cloneNode(true);
    node.querySelector("strong").textContent = `#${item.id} ${item.sorumlu}`;
    node.querySelector("span").textContent = `${formatMoney(item.amount)} - Onaylayacak kişi: ${item.assignedApprover}`;
    const note = node.querySelector("textarea");
    node.querySelector(".approve").addEventListener("click", () => decide(item.id, true, note.value || "Onay verildi."));
    node.querySelector(".reject").addEventListener("click", () => decide(item.id, false, note.value || "Red edildi."));
    list.appendChild(node);
  });
}

async function decide(id, approved, note) {
  await api(`/api/workflows/${id}/decision`, {
    method: "POST",
    body: JSON.stringify({ approved, note })
  });
  await loadState();
}

function renderCriteriaTable() {
  document.querySelector("#criteriaCount").textContent = `${state.criteria.length} kriter`;
  document.querySelector("#criteriaRows").innerHTML = state.criteria.map(c => `
    <tr>
      <td>${c.id}</td>
      <td>${kindLabels[c.kind]}</td>
      <td>${criteriaSummary(c)}</td>
      <td>${targetLabel(c.nextOnTrue || c.nextOnApprove || c.nextOnStart)}</td>
      <td>${targetLabel(c.nextOnFalse || c.nextOnReject)}</td>
    </tr>
  `).join("");
}

function renderSelectOptions() {
  const options = [`<option value="">Seçilmedi</option>`]
    .concat(state.criteria.map(c => `<option value="${c.id}">${c.id} - ${escapeHtml(c.title)}</option>`))
    .join("");
  document.querySelectorAll(".links-grid select").forEach(select => {
    const value = select.value;
    select.innerHTML = options;
    select.value = value;
  });
}

function renderFlow() {
  const nodesRoot = document.querySelector("#flowNodes");
  nodesRoot.innerHTML = state.criteria.map(c => `
    <button class="flow-node ${c.kind} ${c.id === state.selectedId ? "selected" : ""}"
      style="left:${c.positionX}px;top:${c.positionY}px"
      data-node="${c.id}">
      <small>${c.id} - ${kindLabels[c.kind]}</small>
      <strong>${escapeHtml(c.title)}</strong>
    </button>
  `).join("");

  nodesRoot.querySelectorAll("[data-node]").forEach(node => {
    node.addEventListener("click", () => {
      state.selectedId = node.dataset.node;
      render();
    });
  });
  drawArrows();
}

function drawArrows() {
  const svg = document.querySelector("#flowArrows");
  const links = [];
  state.criteria.forEach(c => {
    addLink(links, c, c.nextOnStart, "");
    addLink(links, c, c.nextOnTrue, "Doğru");
    addLink(links, c, c.nextOnFalse, "Yanlış");
    addLink(links, c, c.nextOnApprove, "Onay");
    addLink(links, c, c.nextOnReject, "Red");
  });

  svg.innerHTML = `
    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
        <path d="M0,0 L10,4 L0,8 Z" fill="#475467"></path>
      </marker>
    </defs>
    ${links.map(link => arrowPath(link)).join("")}
  `;
}

function addLink(links, source, targetId, label) {
  if (!targetId) return;
  const target = state.criteria.find(c => c.id === targetId);
  if (target) links.push({ source, target, label });
}

function arrowPath({ source, target, label }) {
  const sourceSide = sideToward(source, target);
  const targetSide = sideToward(target, source);
  const start = edgePoint(source, sourceSide);
  const end = edgePoint(target, targetSide);
  const exit = extendFromSide(start, sourceSide, 22);
  const entry = extendFromSide(end, targetSide, 22);
  const sourceHorizontal = isHorizontalSide(sourceSide);
  const targetHorizontal = isHorizontalSide(targetSide);
  const points = [start, exit];

  if (sourceHorizontal && targetHorizontal) {
    const midX = Math.round((exit.x + entry.x) / 2);
    points.push({ x: midX, y: exit.y }, { x: midX, y: entry.y });
  } else if (!sourceHorizontal && !targetHorizontal) {
    const midY = Math.round((exit.y + entry.y) / 2);
    points.push({ x: exit.x, y: midY }, { x: entry.x, y: midY });
  } else if (sourceHorizontal) {
    points.push({ x: entry.x, y: exit.y });
  } else {
    points.push({ x: exit.x, y: entry.y });
  }

  points.push(entry, end);
  const d = polylinePath(points);
  const lx = Math.round((exit.x + entry.x) / 2);
  const ly = Math.round((exit.y + entry.y) / 2 - 8);
  return `
    <path d="${d}" fill="none" stroke="#475467" stroke-width="2" marker-end="url(#arrow)"></path>
    ${label ? `<text x="${lx}" y="${ly}" font-size="12" fill="#344054">${label}</text>` : ""}
  `;
}

function sideToward(from, to) {
  const fromLeft = Number(from.positionX || 0);
  const fromTop = Number(from.positionY || 0);
  const fromRight = fromLeft + nodeSize.width;
  const fromBottom = fromTop + nodeSize.height;
  const toCenter = {
    x: Number(to.positionX || 0) + nodeSize.width / 2,
    y: Number(to.positionY || 0) + nodeSize.height / 2
  };

  if (toCenter.y < fromTop) return "top";
  if (toCenter.y > fromBottom) return "bottom";
  if (toCenter.x < fromLeft) return "left";
  if (toCenter.x > fromRight) return "right";

  const fromCenter = {
    x: fromLeft + nodeSize.width / 2,
    y: fromTop + nodeSize.height / 2
  };
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;

  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
  return dy >= 0 ? "bottom" : "top";
}

function edgePoint(item, side) {
  const left = Number(item.positionX || 0);
  const top = Number(item.positionY || 0);
  const centerX = left + nodeSize.width / 2;
  const centerY = top + nodeSize.height / 2;

  if (side === "left") return { x: left, y: centerY };
  if (side === "right") return { x: left + nodeSize.width, y: centerY };
  if (side === "top") return { x: centerX, y: top };
  return { x: centerX, y: top + nodeSize.height };
}

function extendFromSide(point, side, distance) {
  if (side === "left") return { x: point.x - distance, y: point.y };
  if (side === "right") return { x: point.x + distance, y: point.y };
  if (side === "top") return { x: point.x, y: point.y - distance };
  return { x: point.x, y: point.y + distance };
}

function isHorizontalSide(side) {
  return side === "left" || side === "right";
}

function polylinePath(points) {
  const compact = points.filter((point, index) => {
    if (index === 0) return true;
    const previous = points[index - 1];
    return Math.abs(point.x - previous.x) > 0.5 || Math.abs(point.y - previous.y) > 0.5;
  });

  return compact.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function fillEditor(criteria) {
  if (!criteria) return;
  const form = document.querySelector("#criteriaForm");
  const fields = form.elements;
  fields.id.value = criteria.id;
  fields.kind.value = criteria.kind;
  fields.title.value = criteria.title;
  fields.column.value = criteria.column || "Tutar";
  fields.operator.value = criteria.operator || ">";
  fields.compareValue.value = criteria.compareValue ?? 0;
  fields.approver.value = criteria.approver || "";
  fields.informPerson.value = criteria.informPerson || "";
  fields.nextOnStart.value = criteria.nextOnStart || "";
  fields.nextOnTrue.value = criteria.nextOnTrue || "";
  fields.nextOnFalse.value = criteria.nextOnFalse || "";
  fields.nextOnApprove.value = criteria.nextOnApprove || "";
  fields.nextOnReject.value = criteria.nextOnReject || "";
  fields.positionX.value = criteria.positionX || 24;
  fields.positionY.value = criteria.positionY || 42;
}

document.querySelector("#workflowForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  await api("/api/workflows", {
    method: "POST",
    body: JSON.stringify({
      sorumlu: form.sorumlu.value,
      amount: Number(form.amount.value)
    })
  });
  form.reset();
  form.amount.value = 7200;
  await loadState();
});

document.querySelector("#criteriaForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.compareValue = Number(payload.compareValue || 0);
  payload.positionX = Number(payload.positionX || 24);
  payload.positionY = Number(payload.positionY || 42);
  const saved = await api("/api/criteria", { method: "POST", body: JSON.stringify(payload) });
  state.selectedId = saved.id;
  await loadState();
});

document.querySelector("#deleteCriteria").addEventListener("click", async () => {
  const id = document.querySelector("#criteriaForm").elements.id.value;
  if (!id) return;
  await api(`/api/criteria/${id}`, { method: "DELETE" });
  state.selectedId = null;
  await loadState();
});

document.querySelectorAll(".toolbar [data-kind]").forEach(button => {
  button.addEventListener("click", async () => {
    const kind = button.dataset.kind;
    const positionX = 28 + state.criteria.length * 34;
    const positionY = 150 + (state.criteria.length % 4) * 38;
    const payload = {
      id: "",
      kind,
      title: defaultTitle(kind),
      column: "Tutar",
      operator: ">",
      compareValue: 5000,
      approver: "",
      informPerson: "",
      nextOnStart: "",
      nextOnTrue: "",
      nextOnFalse: "",
      nextOnApprove: "",
      nextOnReject: "",
      positionX,
      positionY
    };
    const saved = await api("/api/criteria", { method: "POST", body: JSON.stringify(payload) });
    state.selectedId = saved.id;
    await loadState();
  });
});

document.querySelector("#resetDemo").addEventListener("click", async () => {
  await api("/api/reset-demo", { method: "POST" });
  state.selectedId = null;
  await loadState();
});

function defaultTitle(kind) {
  return {
    Start: "İş Akışı Başlat",
    Compare: "Tutar > 5000 TL",
    Approval: "Onaylanacak Kişi",
    Inform: "Bilgilendirme Yapılacak Personel",
    End: "Akışı Bitir"
  }[kind];
}

function criteriaSummary(c) {
  if (c.kind === "Compare") return `${c.column} ${c.operator} ${formatMoney(c.compareValue)}`;
  if (c.kind === "Approval") return escapeHtml(c.approver || "-");
  if (c.kind === "Inform") return escapeHtml(c.informPerson || "-");
  return escapeHtml(c.title);
}

function targetLabel(id) {
  if (!id) return "-";
  const target = state.criteria.find(c => c.id === id);
  return target ? `${target.id} - ${escapeHtml(target.title)}` : id;
}

function statusClass(status) {
  if (status === "Onay Bekliyor") return "pending";
  if (status === "Bitti") return "done";
  return "";
}

function formatMoney(value) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value || 0);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadState().catch(error => {
  document.body.innerHTML = `<pre>${escapeHtml(error.message)}</pre>`;
});
