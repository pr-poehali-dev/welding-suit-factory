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

/** Хлебные крошки — вертикально, каждый уровень на своей строке */
function Breadcrumbs({ path, onNavigate }: CatalogTreeProps) {
  const crumbs: { label: string; path: CatalogPath }[] = [
    { label: "Каталог", path: { nodes: [] } },
  ];
  path.nodes.forEach((node, i) => {
    crumbs.push({ label: node.label, path: { nodes: path.nodes.slice(0, i + 1) } });
  });

  if (crumbs.length <= 1) return null;

  return (
    <div className="flex flex-col gap-0 mb-5" style={{ fontFamily: oswald }}>
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <div key={i} className="flex items-center" style={{ paddingLeft: i * 12 }}>
            {i > 0 && (
              <Icon name="CornerDownRight" size={12} style={{ color: "rgba(138,154,181,0.4)", marginRight: 6, flexShrink: 0 }} />
            )}
            {isLast ? (
              <span className="text-xs font-bold uppercase tracking-wider py-0.5"
                style={{ color: accent }}>
                {c.label}
              </span>
            ) : (
              <button
                onClick={() => onNavigate(c.path)}
                className="text-xs uppercase tracking-wider py-0.5 transition-colors"
                style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontFamily: oswald, textAlign: "left" }}
                onMouseEnter={e => (e.currentTarget.style.color = accent)}
                onMouseLeave={e => (e.currentTarget.style.color = muted)}
              >
                {c.label}
              </button>
            )}
          </div>
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

/** Компактная строка-пункт меню */
function NodeCard({ node, depth, onClick }: { node: CatalogNode; depth: number; onClick: () => void }) {
  const isLeaf = !node.children;
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded transition-all"
      style={{
        background: "transparent",
        border: `1px solid ${border}`,
        cursor: "pointer",
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = accent;
        (e.currentTarget as HTMLElement).style.background = "rgba(245,124,0,0.06)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = border;
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {/* Иконка */}
      <div className="flex-shrink-0 flex items-center justify-center rounded"
        style={{ width: 28, height: 28, background: "rgba(245,124,0,0.08)" }}>
        <Icon name={levelIcon(depth)} size={14} style={{ color: accent }} />
      </div>

      {/* Текст */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold uppercase leading-snug"
          style={{ fontFamily: oswald, fontSize: 12, color: "#ffffff", letterSpacing: "0.04em", wordBreak: "break-word" }}>
          {node.label}
        </div>
        {node.children && (
          <div style={{ fontSize: 10, color: muted, marginTop: 1 }}>
            {node.children.length} позиц{node.children.length === 1 ? "ия" : node.children.length < 5 ? "ии" : "ий"}
          </div>
        )}
        {isLeaf && (
          <div style={{ fontSize: 10, color: accent, marginTop: 1 }}>Смотреть товары →</div>
        )}
      </div>

      {/* Стрелка */}
      <Icon name={isLeaf ? "ShoppingBag" : "ChevronRight"} size={13} style={{ color: muted, flexShrink: 0 }} />
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
    ? "Разделы"
    : path.nodes[depth - 1].label;

  return (
    <div>
      {/* Хлебные крошки */}
      <Breadcrumbs path={path} onNavigate={onNavigate} />

      {/* Заголовок + кнопка назад */}
      <div className="mb-4">
        {depth > 0 && (
          <button
            onClick={() => onNavigate({ nodes: path.nodes.slice(0, -1) })}
            className="flex items-center gap-1 mb-2"
            style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontFamily: oswald, fontSize: 11, letterSpacing: "0.04em", padding: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = accent)}
            onMouseLeave={e => (e.currentTarget.style.color = muted)}
          >
            <Icon name="ArrowLeft" size={12} /> Назад
          </button>
        )}
        <div className="text-xs font-bold uppercase tracking-widest"
          style={{ fontFamily: oswald, color: muted }}>
          {sectionTitle}
        </div>
      </div>

      {/* Список узлов — всегда одна колонка */}
      <div className="flex flex-col gap-2">
        {currentChildren.map(node => (
          <NodeCard
            key={node.id}
            node={node}
            depth={depth}
            onClick={() => handleClick(node)}
          />
        ))}
      </div>

      {/* Нижняя подсказка */}
      <div className="mt-6 pt-4" style={{ borderTop: `1px solid ${border}` }}>
        <div className="flex items-center gap-2" style={{ color: muted, fontSize: 10 }}>
          <Icon name="Info" size={11} />
          <span>Выберите категорию для просмотра товаров</span>
        </div>
      </div>
    </div>
  );
}