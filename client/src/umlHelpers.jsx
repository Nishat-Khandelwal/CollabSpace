import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { X, GitBranch } from "lucide-react";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ═══════════════════════════════════════════════════════
// UML Constants
// ═══════════════════════════════════════════════════════

export const UML_ELEMENTS = {
  class: [{ type: "class", label: "Class Box" }],
  activity: [
    { type: "action", label: "Action" },
    { type: "decision", label: "Decision" },
    { type: "start_node", label: "Start" },
    { type: "end_node", label: "End" },
    { type: "fork_bar", label: "Fork/Join" },
  ],
  usecase: [
    { type: "actor", label: "Actor" },
    { type: "usecase", label: "Use Case" },
  ],
  sequence: [{ type: "lifeline", label: "Lifeline" }],
  state: [
    { type: "state", label: "State" },
    { type: "initial_state", label: "Initial" },
    { type: "final_state", label: "Final" },
  ],
  deployment: [
    { type: "node3d", label: "Node" },
    { type: "artifact", label: "Artifact" },
    { type: "component", label: "Component" },
  ],
};

export const UML_DEFAULTS = {
  class: { w: 200, h: 140 },
  actor: { w: 60, h: 110 },
  usecase: { w: 160, h: 80 },
  action: { w: 160, h: 56 },
  decision: { w: 100, h: 100 },
  start_node: { w: 28, h: 28 },
  end_node: { w: 32, h: 32 },
  fork_bar: { w: 200, h: 8 },
  lifeline: { w: 120, h: 200 },
  state: { w: 160, h: 56 },
  initial_state: { w: 24, h: 24 },
  final_state: { w: 32, h: 32 },
  node3d: { w: 180, h: 120 },
  artifact: { w: 140, h: 100 },
  component: { w: 160, h: 80 },
};

const UML_TAB_LABELS = {
  class: "Class",
  activity: "Activity",
  usecase: "Use Case",
  sequence: "Sequence",
  state: "State",
  deployment: "Deploy",
};

// ═══════════════════════════════════════════════════════
// Canvas Rendering
// ═══════════════════════════════════════════════════════

export function renderUmlItem(ctx, item) {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  const umlColor = item.color || "#000000";
  ctx.strokeStyle = umlColor;
  ctx.lineWidth = 2;
  const { umlType, x, y, w, h } = item;

  switch (umlType) {
    // ── Class Diagram ──────────────────────────
    case "class": {
      const titleH = 32;
      const attrs = item.attributes || [];
      const methods = item.methods || [];
      const attrH = Math.max(28, attrs.length * 20 + 10);

      // Background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);

      // Title bar
      ctx.fillStyle = umlColor;
      ctx.fillRect(x + 1, y + 1, w - 2, titleH - 1);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(item.name || "ClassName", x + w / 2, y + titleH / 2);

      // Divider 1
      ctx.beginPath();
      ctx.moveTo(x, y + titleH);
      ctx.lineTo(x + w, y + titleH);
      ctx.stroke();

      // Attributes
      ctx.fillStyle = umlColor;
      ctx.font = "12px monospace";
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      attrs.forEach((attr, i) => ctx.fillText(attr, x + 8, y + titleH + 6 + i * 20));

      // Divider 2
      const methodY = y + titleH + attrH;
      ctx.beginPath();
      ctx.moveTo(x, methodY);
      ctx.lineTo(x + w, methodY);
      ctx.stroke();

      // Methods
      methods.forEach((m, i) => ctx.fillText(m, x + 8, methodY + 6 + i * 20));
      break;
    }

    // ── Activity Diagram ───────────────────────
    case "action": {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, h / 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = umlColor;
      ctx.font = "13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(item.name || "Action", x + w / 2, y + h / 2);
      break;
    }
    case "decision": {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x + w / 2, y + h);
      ctx.lineTo(x, y + h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = umlColor;
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(item.name || "?", x + w / 2, y + h / 2);
      break;
    }
    case "start_node":
    case "initial_state": {
      ctx.fillStyle = umlColor;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w / 2, 0, 2 * Math.PI);
      ctx.fill();
      break;
    }
    case "end_node":
    case "final_state": {
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w / 2, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = umlColor;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w / 2 - 5, 0, 2 * Math.PI);
      ctx.fill();
      break;
    }
    case "fork_bar": {
      ctx.fillStyle = umlColor;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 3);
      ctx.fill();
      break;
    }

    // ── Use Case Diagram ───────────────────────
    case "actor": {
      const cx = x + w / 2;
      const headR = Math.min(w, h) * 0.14;
      const headCY = y + headR + 4;
      const bodyTop = headCY + headR + 2;
      const bodyBot = y + h * 0.62;
      const armY = bodyTop + (bodyBot - bodyTop) * 0.3;

      ctx.beginPath();
      ctx.arc(cx, headCY, headR, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, bodyTop);
      ctx.lineTo(cx, bodyBot);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 6, armY);
      ctx.lineTo(x + w - 6, armY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, bodyBot);
      ctx.lineTo(x + 6, y + h - 16);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, bodyBot);
      ctx.lineTo(x + w - 6, y + h - 16);
      ctx.stroke();

      ctx.fillStyle = umlColor;
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(item.name || "Actor", cx, y + h);
      break;
    }
    case "usecase": {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = umlColor;
      ctx.font = "13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(item.name || "Use Case", x + w / 2, y + h / 2);
      break;
    }

    // ── Sequence Diagram ───────────────────────
    case "lifeline": {
      const boxH = 36;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, y, w, boxH);
      ctx.strokeRect(x, y, w, boxH);
      ctx.fillStyle = umlColor;
      ctx.font = "13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(item.name || "Object", x + w / 2, y + boxH / 2);
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y + boxH);
      ctx.lineTo(x + w / 2, y + h);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }

    // ── State Diagram ──────────────────────────
    case "state": {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = umlColor;
      ctx.font = "13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(item.name || "State", x + w / 2, y + h / 2);
      break;
    }

    // ── Deployment Diagram ─────────────────────
    case "node3d": {
      const d = 16;
      // Front face
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, y + d, w - d, h - d);
      ctx.strokeRect(x, y + d, w - d, h - d);
      // Top face
      ctx.fillStyle = "#f3f4f6";
      ctx.beginPath();
      ctx.moveTo(x, y + d);
      ctx.lineTo(x + d, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w - d, y + d);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Right face
      ctx.fillStyle = "#e5e7eb";
      ctx.beginPath();
      ctx.moveTo(x + w - d, y + d);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h - d);
      ctx.lineTo(x + w - d, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Label
      ctx.fillStyle = umlColor;
      ctx.font = "13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(item.name || "Node", x + (w - d) / 2, y + d + (h - d) / 2);
      break;
    }
    case "artifact": {
      const fold = 14;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w - fold, y);
      ctx.lineTo(x + w, y + fold);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Fold
      ctx.beginPath();
      ctx.moveTo(x + w - fold, y);
      ctx.lineTo(x + w - fold, y + fold);
      ctx.lineTo(x + w, y + fold);
      ctx.stroke();
      // Stereotype
      ctx.fillStyle = umlColor;
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("\u00ABartifact\u00BB", x + w / 2, y + fold + 6);
      // Label
      ctx.font = "13px sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillText(item.name || "Artifact", x + w / 2, y + h / 2 + 8);
      break;
    }
    case "component": {
      const tabW = 16, tabH = 8;
      // Main body
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + tabW / 2, y, w - tabW / 2, h);
      ctx.strokeRect(x + tabW / 2, y, w - tabW / 2, h);
      // Tab 1
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, y + h * 0.2 - tabH / 2, tabW, tabH);
      ctx.strokeRect(x, y + h * 0.2 - tabH / 2, tabW, tabH);
      // Tab 2
      ctx.fillRect(x, y + h * 0.55 - tabH / 2, tabW, tabH);
      ctx.strokeRect(x, y + h * 0.55 - tabH / 2, tabW, tabH);
      // Label
      ctx.fillStyle = umlColor;
      ctx.font = "13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(item.name || "Component", x + w / 2 + tabW / 4, y + h / 2);
      break;
    }
  }

  ctx.restore();
}

// ═══════════════════════════════════════════════════════
// SVG Preview Component (mini-icons for the panel)
// ═══════════════════════════════════════════════════════

function UmlPreview({ type }) {
  const s = { width: 48, height: 40, className: "text-gray-500" };
  const sc = "#6b7280";
  const fl = "#f9fafb";
  switch (type) {
    case "class":
      return <svg {...s} viewBox="0 0 48 40"><rect x="4" y="2" width="40" height="36" fill={fl} stroke={sc} strokeWidth="1.5" rx="1"/><line x1="4" y1="14" x2="44" y2="14" stroke={sc} strokeWidth="1"/><line x1="4" y1="26" x2="44" y2="26" stroke={sc} strokeWidth="1"/><rect x="4" y="2" width="40" height="12" fill={sc} rx="1" ry="1"/></svg>;
    case "actor":
      return <svg {...s} viewBox="0 0 48 40"><circle cx="24" cy="7" r="4.5" fill="none" stroke={sc} strokeWidth="1.5"/><line x1="24" y1="12" x2="24" y2="25" stroke={sc} strokeWidth="1.5"/><line x1="16" y1="17" x2="32" y2="17" stroke={sc} strokeWidth="1.5"/><line x1="24" y1="25" x2="17" y2="36" stroke={sc} strokeWidth="1.5"/><line x1="24" y1="25" x2="31" y2="36" stroke={sc} strokeWidth="1.5"/></svg>;
    case "usecase":
      return <svg {...s} viewBox="0 0 48 40"><ellipse cx="24" cy="20" rx="20" ry="14" fill={fl} stroke={sc} strokeWidth="1.5"/></svg>;
    case "action":
      return <svg {...s} viewBox="0 0 48 40"><rect x="4" y="6" width="40" height="28" fill={fl} stroke={sc} strokeWidth="1.5" rx="14"/></svg>;
    case "decision":
      return <svg {...s} viewBox="0 0 48 40"><polygon points="24,4 44,20 24,36 4,20" fill={fl} stroke={sc} strokeWidth="1.5"/></svg>;
    case "start_node":
      return <svg {...s} viewBox="0 0 48 40"><circle cx="24" cy="20" r="10" fill={sc}/></svg>;
    case "end_node":
      return <svg {...s} viewBox="0 0 48 40"><circle cx="24" cy="20" r="10" fill="none" stroke={sc} strokeWidth="2"/><circle cx="24" cy="20" r="6" fill={sc}/></svg>;
    case "fork_bar":
      return <svg {...s} viewBox="0 0 48 40"><rect x="4" y="17" width="40" height="6" fill={sc} rx="2"/></svg>;
    case "lifeline":
      return <svg {...s} viewBox="0 0 48 40"><rect x="10" y="2" width="28" height="14" fill={fl} stroke={sc} strokeWidth="1.5" rx="1"/><line x1="24" y1="16" x2="24" y2="38" stroke={sc} strokeWidth="1.5" strokeDasharray="3,2"/></svg>;
    case "state":
      return <svg {...s} viewBox="0 0 48 40"><rect x="4" y="6" width="40" height="28" fill={fl} stroke={sc} strokeWidth="1.5" rx="10"/></svg>;
    case "initial_state":
      return <svg {...s} viewBox="0 0 48 40"><circle cx="24" cy="20" r="8" fill={sc}/></svg>;
    case "final_state":
      return <svg {...s} viewBox="0 0 48 40"><circle cx="24" cy="20" r="10" fill="none" stroke={sc} strokeWidth="2"/><circle cx="24" cy="20" r="6" fill={sc}/></svg>;
    case "node3d":
      return <svg {...s} viewBox="0 0 48 40"><polygon points="4,10 36,10 36,34 4,34" fill={fl} stroke={sc} strokeWidth="1.5"/><polygon points="36,10 44,4 44,28 36,34" fill="#e5e7eb" stroke={sc} strokeWidth="1"/><polygon points="4,10 12,4 44,4 36,10" fill="#e5e7eb" stroke={sc} strokeWidth="1"/></svg>;
    case "artifact":
      return <svg {...s} viewBox="0 0 48 40"><polygon points="8,4 32,4 40,12 40,36 8,36" fill={fl} stroke={sc} strokeWidth="1.5"/><polyline points="32,4 32,12 40,12" fill="none" stroke={sc} strokeWidth="1"/></svg>;
    case "component":
      return <svg {...s} viewBox="0 0 48 40"><rect x="12" y="4" width="32" height="32" fill={fl} stroke={sc} strokeWidth="1.5" rx="1"/><rect x="6" y="10" width="12" height="6" fill={fl} stroke={sc} strokeWidth="1" rx="1"/><rect x="6" y="22" width="12" height="6" fill={fl} stroke={sc} strokeWidth="1" rx="1"/></svg>;
    default:
      return <div className="w-12 h-10 bg-gray-100 rounded" />;
  }
}

// ═══════════════════════════════════════════════════════
// UML Panel Component
// ═══════════════════════════════════════════════════════

export function UmlPanel({
  isOpen,
  umlActiveTab,
  setUmlActiveTab,
  umlMode,
  onSelectElement,
  onOpenClassModal,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="absolute bottom-28 left-1/2 -translate-x-1/2 z-40 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden select-none"
      style={{ width: "560px" }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white">
        <div className="flex items-center gap-2">
          <GitBranch size={16} className="text-indigo-600" />
          <span className="text-sm font-bold text-gray-800">UML Diagrams</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-black hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-3 pt-2 border-b border-gray-100 overflow-x-auto custom-scrollbar">
        {Object.entries(UML_TAB_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setUmlActiveTab(key)}
            className={cn(
              "px-3 py-2 text-xs font-bold rounded-t-lg transition-all whitespace-nowrap",
              umlActiveTab === key
                ? "bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Elements Grid */}
      <div className="p-4 grid grid-cols-5 gap-2 min-h-[100px]">
        {(UML_ELEMENTS[umlActiveTab] || []).map((el) => (
          <button
            key={el.type}
            onClick={() => {
              if (el.type === "class") {
                onOpenClassModal();
              } else {
                onSelectElement(el.type, { name: el.label });
              }
            }}
            className={cn(
              "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-150",
              umlMode === el.type
                ? "border-indigo-500 bg-indigo-50 shadow-sm"
                : "border-transparent hover:bg-gray-50 hover:border-gray-200"
            )}
          >
            <UmlPreview type={el.type} />
            <span className="text-[10px] font-bold text-gray-500">{el.label}</span>
          </button>
        ))}
      </div>

      {/* Active placement indicator */}
      {umlMode && (
        <div className="px-4 pb-3 flex items-center gap-2 text-xs text-indigo-600 font-medium">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          Click anywhere on the canvas to place
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// UML Class Configuration Modal
// ═══════════════════════════════════════════════════════

export function UmlClassModal({ data, onChange, onPlace, onClose }) {
  if (!data) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <GitBranch size={18} className="text-indigo-600" /> Configure Class
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-black hover:bg-gray-100 p-2 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
              Class Name
            </label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all text-black"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
              Attributes{" "}
              <span className="text-gray-400 font-normal">(one per line)</span>
            </label>
            <textarea
              rows={3}
              value={data.attributes.join("\n")}
              onChange={(e) =>
                onChange({ ...data, attributes: e.target.value.split("\n") })
              }
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all resize-none text-black"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
              Methods{" "}
              <span className="text-gray-400 font-normal">(one per line)</span>
            </label>
            <textarea
              rows={3}
              value={data.methods.join("\n")}
              onChange={(e) =>
                onChange({ ...data, methods: e.target.value.split("\n") })
              }
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all resize-none text-black"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onPlace}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all"
          >
            Place on Canvas
          </button>
        </div>
      </div>
    </div>
  );
}
