import Icon from "@/components/ui/icon";
import { Product } from "./admin.types";
import StockBadge from "./AdminStockBadge";

interface AdminProductTableProps {
  products: Product[];
  loading: boolean;
  onEdit: (p: Product) => void;
  onRemove: (id: number, name: string) => void;
}

export default function AdminProductTable({ products, loading, onEdit, onRemove }: AdminProductTableProps) {
  if (loading) {
    return <div className="text-center py-20" style={{ color: "#8a9ab5" }}>Загрузка...</div>;
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20 rounded" style={{ border: "1px dashed rgba(245,124,0,0.3)", color: "#8a9ab5" }}>
        <Icon name="Package" size={40} style={{ margin: "0 auto 12px", color: "rgba(138,154,181,0.3)" }} />
        <div>Товаров пока нет. Добавьте первый!</div>
      </div>
    );
  }

  return (
    <div className="rounded overflow-hidden" style={{ border: "1px solid rgba(245,124,0,0.2)" }}>
      <div className="grid grid-cols-12 px-5 py-3 text-xs uppercase tracking-wider"
        style={{ background: "#13181f", color: "#8a9ab5", fontFamily: "'Oswald', sans-serif", borderBottom: "1px solid rgba(245,124,0,0.15)" }}>
        <div className="col-span-1">Фото</div>
        <div className="col-span-3">Название</div>
        <div className="col-span-2">Категория</div>
        <div className="col-span-2 text-right">Цена</div>
        <div className="col-span-2 text-center">Остаток</div>
        <div className="col-span-2 text-right">Действия</div>
      </div>

      {products.map((p, idx) => (
        <div key={p.id} className="grid grid-cols-12 px-5 py-3 items-center gap-2"
          style={{ borderBottom: idx < products.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: idx % 2 === 0 ? "#0d1117" : "#0a0e14" }}>

          <div className="col-span-1">
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded object-cover" style={{ border: "1px solid rgba(245,124,0,0.2)" }} />
            ) : (
              <div className="w-10 h-10 rounded flex items-center justify-center" style={{ background: "#13181f", border: "1px solid rgba(255,255,255,0.06)" }}>
                <Icon name="Image" size={14} style={{ color: "rgba(138,154,181,0.4)" }} />
              </div>
            )}
          </div>

          <div className="col-span-3">
            <div className="text-sm font-medium" style={{ color: "#e8e0d0" }}>{p.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              {p.badge && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(245,124,0,0.15)", color: "#f57c00" }}>{p.badge}</span>}
              {p.gtin && <span className="text-xs" style={{ color: "#8a9ab5" }}>EAN: {p.gtin}</span>}
            </div>
          </div>

          <div className="col-span-2 text-xs" style={{ color: "#8a9ab5" }}>{p.category}</div>

          <div className="col-span-2 text-right text-sm font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>
            {p.base_price.toLocaleString("ru-RU")} ₽
          </div>

          <div className="col-span-2 flex justify-center">
            <StockBadge status={p.stock_status ?? "in_stock"} />
          </div>

          <div className="col-span-2 flex justify-end gap-2">
            <button onClick={() => onEdit(p)}
              style={{ background: "rgba(245,124,0,0.1)", border: "1px solid rgba(245,124,0,0.3)", color: "#f57c00", cursor: "pointer", borderRadius: 4, padding: "4px 10px" }}
              className="text-xs">
              Изменить
            </button>
            <button onClick={() => onRemove(p.id, p.name)}
              style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", cursor: "pointer", borderRadius: 4, padding: "4px 8px" }}>
              <Icon name="Trash2" size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
