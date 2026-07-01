import { useState, useRef, useEffect, useMemo } from "react";
import { FinishedProduct } from "@/pages/backoffice/types";
import Icon from "@/components/ui/icon";

interface ProductPickerProps {
  products: FinishedProduct[];
  value: number | null;
  onSelect: (product: FinishedProduct) => void;
  placeholder?: string;
}

export default function ProductPicker({
  products,
  value,
  onSelect,
  placeholder = "Поиск по названию или артикулу...",
}: ProductPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  const selected = products.find((p) => p.id === value) || null;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const active = products.filter((p) => p.is_active);
    if (!q) return active.slice(0, 50);
    return active
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku || "").toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [products, query]);

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-left text-sm text-slate-800 hover:border-slate-400"
      >
        <span className={`truncate ${selected ? "" : "text-slate-400"}`}>
          {selected ? (
            <>
              {selected.name}
              {selected.sku && (
                <span className="ml-1 text-xs text-slate-400">({selected.sku})</span>
              )}
            </>
          ) : (
            "-- выберите --"
          )}
        </span>
        <Icon name="ChevronDown" size={16} className="flex-shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <div className="flex items-center gap-2 rounded-md border border-slate-200 px-2">
              <Icon name="Search" size={14} className="text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="h-8 w-full bg-transparent text-sm text-slate-800 outline-none"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-slate-400">
                Ничего не найдено
              </div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onSelect(p);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${
                    p.id === value ? "bg-blue-50 text-blue-700" : "text-slate-700"
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  {p.sku && (
                    <span className="flex-shrink-0 font-mono text-xs text-slate-400">
                      {p.sku}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
