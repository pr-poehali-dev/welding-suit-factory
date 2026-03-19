import Icon from "@/components/ui/icon";
import { CATALOG_TREE, CatalogNode } from "./constants";

export interface CatalogPath {
  /** Узел на каждом уровне: [lvl0, lvl1, lvl2, lvl3] */
  nodes: CatalogNode[];
}

interface CatalogTreeProps {
  path: CatalogPath;
  onNavigate: (path: CatalogPath) => void;
}

const accent = "#f57c00";
const bg = "#0d1117";
const bgCard = "#13181f";
const border = "rgba(245,124,0,0.2)";
const muted = "#8a9ab5";
const oswald = "'Oswald', sans-serif";

/** Хлебные крошки */
function Breadcrumbs({ path, onNavigate }: CatalogTreeProps) {
  const crumbs: { label: string; path: CatalogPath }[] = [
    { label: "Каталог", path: { nodes: [] } },
  ];
  path.nodes.forEach((node, i) => {
    crumbs.push({ label: node.label, path: { nodes: path.nodes.slice(0, i + 1) } });
  });

  return (
    <div className="flex flex-wrap items-center gap-1 mb-8" style={{ fontFamily: oswald }}>
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <Icon name="ChevronRight" size={14} style={{ color: muted }} />}
            {isLast ? (
              <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: accent }}>
                {c.label}
              </span>
            ) : (
              <button
                onClick={() => onNavigate(c.path)}
                className="text-sm uppercase tracking-wider transition-colors"
                style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontFamily: oswald }}
                onMouseEnter={e => (e.currentTarget.style.color = accent)}
                onMouseLeave={e => (e.currentTarget.style.color = muted)}
              >
                {c.label}
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}

/** Уровень глубины: иконки для каждого уровня */
function levelIcon(depth: number): string {
  if (depth === 0) return "Layers";
  if (depth === 1) return "FolderOpen";
  if (depth === 2) return "Folder";
  return "FileText";
}

/** Плашка-карточка одного узла */
function NodeCard({ node, depth, onClick }: { node: CatalogNode; depth: number; onClick: () => void }) {
  const isLeaf = !node.children;
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded transition-all group"
      style={{
        background: bgCard,
        border: `1px solid ${border}`,
        cursor: "pointer",
        padding: depth >= 3 ? "14px 18px" : "20px 24px",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = accent;
        (e.currentTarget as HTMLElement).style.background = "rgba(245,124,0,0.05)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = border;
        (e.currentTarget as HTMLElement).style.background = bgCard;
      }}
    >
      {/* Иконка */}
      <div className="flex-shrink-0 flex items-center justify-center rounded"
        style={{ width: 38, height: 38, background: "rgba(245,124,0,0.1)", border: `1px solid rgba(245,124,0,0.2)` }}>
        <Icon name={levelIcon(depth)} size={18} style={{ color: accent }} />
      </div>

      {/* Текст */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold uppercase leading-tight"
          style={{ fontFamily: oswald, fontSize: depth >= 3 ? 13 : 15, color: "#ffffff", letterSpacing: "0.04em" }}>
          {node.label}
        </div>
        {node.children && (
          <div className="text-xs mt-0.5" style={{ color: muted }}>
            {node.children.length} позиц{node.children.length === 1 ? "ия" : node.children.length < 5 ? "ии" : "ий"}
          </div>
        )}
        {isLeaf && (
          <div className="text-xs mt-0.5" style={{ color: accent }}>Смотреть товары →</div>
        )}
      </div>

      {/* Стрелка */}
      <Icon name={isLeaf ? "ShoppingBag" : "ChevronRight"} size={16} style={{ color: muted, flexShrink: 0 }} />
    </button>
  );
}

export default function CatalogTree({ path, onNavigate }: CatalogTreeProps) {
  const depth = path.nodes.length;

  // Определяем текущий список дочерних узлов
  let currentChildren: CatalogNode[];
  if (depth === 0) {
    currentChildren = CATALOG_TREE;
  } else {
    const last = path.nodes[depth - 1];
    currentChildren = last.children ?? [];
  }

  const handleClick = (node: CatalogNode) => {
    onNavigate({ nodes: [...path.nodes, node] });
  };

  // Заголовок текущего уровня
  const sectionTitle = depth === 0
    ? "Выберите раздел"
    : path.nodes[depth - 1].label;

  // Колонки: 1 для 1-го уровня (широкие карточки), 2 или 3 для глубже
  const cols = depth === 0 ? 1 : depth === 1 ? 2 : 3;

  return (
    <div>
      <Breadcrumbs path={path} onNavigate={onNavigate} />

      <div className="mb-5">
        <h3 className="text-2xl font-bold uppercase tracking-wide"
          style={{ fontFamily: oswald, color: "#ffffff" }}>
          {sectionTitle}
        </h3>
        {depth > 0 && (
          <button
            onClick={() => onNavigate({ nodes: path.nodes.slice(0, -1) })}
            className="flex items-center gap-1 mt-2 text-sm transition-colors"
            style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontFamily: oswald, letterSpacing: "0.04em" }}
            onMouseEnter={e => (e.currentTarget.style.color = accent)}
            onMouseLeave={e => (e.currentTarget.style.color = muted)}
          >
            <Icon name="ArrowLeft" size={14} /> Назад
          </button>
        )}
      </div>

      <div
        className={`grid gap-3`}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {currentChildren.map(node => (
          <NodeCard
            key={node.id}
            node={node}
            depth={depth}
            onClick={() => handleClick(node)}
          />
        ))}
      </div>

      {/* Нижняя полоска */}
      <div className="mt-8 pt-4" style={{ borderTop: `1px solid ${border}` }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: muted }}>
          <Icon name="Info" size={13} />
          <span>Выберите категорию для просмотра товаров</span>
        </div>
      </div>
    </div>
  );
}
