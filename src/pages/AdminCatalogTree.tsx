import { useState } from "react";
import Icon from "@/components/ui/icon";
import { CATALOG_TREE, CatalogNode } from "@/components/specnaz/constants";
import { Product } from "./admin.types";

interface AdminCatalogTreeProps {
  products: Product[];
  selectedCategory: string | null;
  onSelect: (categoryTag: string | null) => void;
}

const accent = "#f57c00";
const muted = "#8a9ab5";
const oswald = "'Oswald', sans-serif";

function collectLeafTags(node: CatalogNode): string[] {
  if (node.categoryTag) return [node.categoryTag];
  if (!node.children) return [];
  return node.children.flatMap(collectLeafTags);
}

function countProducts(node: CatalogNode, products: Product[]): number {
  const tags = collectLeafTags(node);
  return products.filter(p => tags.includes(p.category)).length;
}

function TreeNode({
  node,
  depth,
  products,
  selectedCategory,
  onSelect,
}: {
  node: CatalogNode;
  depth: number;
  products: Product[];
  selectedCategory: string | null;
  onSelect: (tag: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const isLeaf = !node.children;
  const count = countProducts(node, products);
  const isActive = isLeaf && selectedCategory === node.categoryTag;
  const tags = collectLeafTags(node);
  const isParentActive = !isLeaf && selectedCategory !== null && tags.includes(selectedCategory);

  const handleClick = () => {
    if (isLeaf) {
      onSelect(isActive ? null : node.categoryTag!);
    } else {
      setExpanded(!expanded);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className="w-full text-left flex items-center gap-2 rounded transition-colors"
        style={{
          padding: "6px 8px",
          paddingLeft: 8 + depth * 16,
          background: isActive ? "rgba(245,124,0,0.12)" : "transparent",
          border: "none",
          cursor: "pointer",
          borderLeft: isActive ? `2px solid ${accent}` : "2px solid transparent",
        }}
        onMouseEnter={e => {
          if (!isActive) e.currentTarget.style.background = "rgba(245,124,0,0.06)";
        }}
        onMouseLeave={e => {
          if (!isActive) e.currentTarget.style.background = "transparent";
        }}
      >
        {!isLeaf && (
          <Icon
            name={expanded ? "ChevronDown" : "ChevronRight"}
            size={12}
            style={{ color: isParentActive ? accent : muted, flexShrink: 0 }}
          />
        )}
        {isLeaf && <div style={{ width: 12, flexShrink: 0 }} />}

        <span
          className="flex-1 truncate"
          style={{
            fontFamily: oswald,
            fontSize: depth === 0 ? 12 : 11,
            fontWeight: depth === 0 ? 700 : 500,
            textTransform: "uppercase",
            letterSpacing: "0.03em",
            color: isActive ? accent : isParentActive ? "#ffffff" : depth === 0 ? "#ffffff" : "#c0c8d4",
          }}
        >
          {node.label}
        </span>

        <span
          className="flex-shrink-0 text-right"
          style={{
            fontFamily: oswald,
            fontSize: 10,
            minWidth: 20,
            color: count > 0 ? (isActive ? accent : muted) : "rgba(138,154,181,0.3)",
          }}
        >
          {count}
        </span>
      </button>

      {!isLeaf && expanded && node.children && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              products={products}
              selectedCategory={selectedCategory}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminCatalogTree({ products, selectedCategory, onSelect }: AdminCatalogTreeProps) {
  const uncategorized = products.filter(
    p => !CATALOG_TREE.flatMap(n => collectLeafTags(n)).includes(p.category)
  );

  return (
    <div
      className="rounded"
      style={{
        border: "1px solid rgba(245,124,0,0.15)",
        background: "#13181f",
        padding: "12px 8px",
      }}
    >
      <div className="flex items-center justify-between mb-3 px-2">
        <span
          style={{
            fontFamily: oswald,
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: muted,
          }}
        >
          Категории
        </span>
        {selectedCategory && (
          <button
            onClick={() => onSelect(null)}
            className="flex items-center gap-1"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: oswald,
              fontSize: 10,
              color: accent,
              textTransform: "uppercase",
            }}
          >
            <Icon name="X" size={10} /> Сброс
          </button>
        )}
      </div>

      <button
        onClick={() => onSelect(null)}
        className="w-full text-left flex items-center gap-2 rounded transition-colors mb-1"
        style={{
          padding: "6px 8px",
          background: selectedCategory === null ? "rgba(245,124,0,0.12)" : "transparent",
          border: "none",
          cursor: "pointer",
          borderLeft: selectedCategory === null ? `2px solid ${accent}` : "2px solid transparent",
        }}
        onMouseEnter={e => {
          if (selectedCategory !== null) e.currentTarget.style.background = "rgba(245,124,0,0.06)";
        }}
        onMouseLeave={e => {
          if (selectedCategory !== null) e.currentTarget.style.background = "transparent";
        }}
      >
        <Icon name="LayoutGrid" size={12} style={{ color: selectedCategory === null ? accent : muted, flexShrink: 0 }} />
        <span
          style={{
            fontFamily: oswald,
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.03em",
            color: selectedCategory === null ? accent : "#ffffff",
          }}
        >
          Все товары
        </span>
        <span
          className="flex-shrink-0 text-right"
          style={{ fontFamily: oswald, fontSize: 10, minWidth: 20, color: selectedCategory === null ? accent : muted }}
        >
          {products.length}
        </span>
      </button>

      <div style={{ height: 1, background: "rgba(245,124,0,0.1)", margin: "4px 8px 4px" }} />

      {CATALOG_TREE.map(node => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          products={products}
          selectedCategory={selectedCategory}
          onSelect={onSelect}
        />
      ))}

      {uncategorized.length > 0 && (
        <>
          <div style={{ height: 1, background: "rgba(245,124,0,0.1)", margin: "4px 8px" }} />
          <button
            onClick={() => onSelect("__uncategorized__")}
            className="w-full text-left flex items-center gap-2 rounded transition-colors"
            style={{
              padding: "6px 8px",
              background: selectedCategory === "__uncategorized__" ? "rgba(245,124,0,0.12)" : "transparent",
              border: "none",
              cursor: "pointer",
              borderLeft: selectedCategory === "__uncategorized__" ? `2px solid ${accent}` : "2px solid transparent",
            }}
            onMouseEnter={e => {
              if (selectedCategory !== "__uncategorized__") e.currentTarget.style.background = "rgba(245,124,0,0.06)";
            }}
            onMouseLeave={e => {
              if (selectedCategory !== "__uncategorized__") e.currentTarget.style.background = "transparent";
            }}
          >
            <Icon name="HelpCircle" size={12} style={{ color: selectedCategory === "__uncategorized__" ? accent : muted, flexShrink: 0 }} />
            <span
              style={{
                fontFamily: oswald,
                fontSize: 11,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                color: selectedCategory === "__uncategorized__" ? accent : "#c0c8d4",
              }}
            >
              Без категории
            </span>
            <span
              className="flex-shrink-0 text-right"
              style={{ fontFamily: oswald, fontSize: 10, minWidth: 20, color: selectedCategory === "__uncategorized__" ? accent : muted }}
            >
              {uncategorized.length}
            </span>
          </button>
        </>
      )}
    </div>
  );
}
