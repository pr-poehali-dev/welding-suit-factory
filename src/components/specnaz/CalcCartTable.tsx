import Icon from "@/components/ui/icon";
import { stockInfo, type ProductSizeData } from "./CalculatorSection";

interface CartRow {
  id: string;
  product: string;
  size: string;
  qty: number;
  unitPrice: number;
  finalUnit: number;
  finalLine: number;
  lineSaving: number;
}

interface CalcCartTableProps {
  cartRows: CartRow[];
  volumeDiscount: number;
  productSizes: Record<string, ProductSizeData[]>;
  updateSize: (id: string, size: string) => void;
  updateQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
}

export default function CalcCartTable({
  cartRows,
  volumeDiscount,
  productSizes,
  updateSize,
  updateQty,
  removeFromCart,
}: CalcCartTableProps) {
  return (
    <div className="rounded overflow-hidden" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)" }}>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(245,124,0,0.15)" }}>
        <div className="text-xs uppercase tracking-widest" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>
          Позиции заказа
        </div>
        <div className="flex items-center gap-2">
          <Icon name="ShoppingCart" size={16} style={{ color: "#f57c00" }} />
          <span className="text-sm font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>{cartRows.length} поз.</span>
        </div>
      </div>

      {cartRows.length === 0 ? (
        <div className="px-5 py-10 text-center" style={{ color: "#8a9ab5" }}>
          <Icon name="ShoppingCart" size={36} style={{ color: "rgba(138,154,181,0.3)", margin: "0 auto 12px" }} />
          <div className="text-sm">Добавьте позиции из каталога или формы слева</div>
        </div>
      ) : (
        <div>
          {/* Заголовок таблицы */}
          <div className="hidden md:grid grid-cols-12 px-5 py-2 text-xs uppercase tracking-wider" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="col-span-4">Артикул</div>
            <div className="col-span-3">Размер</div>
            <div className="col-span-2 text-center">Кол-во</div>
            <div className="col-span-2 text-right">Сумма</div>
            <div className="col-span-1" />
          </div>

          {cartRows.map((item, idx) => (
            <div
              key={item.id}
              className="px-5 py-3 grid grid-cols-12 gap-2 items-center"
              style={{ borderBottom: idx < cartRows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
            >
              {/* Артикул */}
              <div className="col-span-12 md:col-span-4">
                <div className="text-sm font-medium" style={{ color: "#e8e0d0" }}>{item.product}</div>
                <div className="text-xs mt-0.5 flex items-center gap-2">
                  <span style={{ color: "#f57c00" }}>{item.finalUnit.toLocaleString("ru-RU")} ₽/шт</span>
                  {volumeDiscount > 0 && (
                    <span style={{ color: "#8a9ab5", textDecoration: "line-through", fontSize: 10 }}>{item.unitPrice.toLocaleString("ru-RU")}</span>
                  )}
                </div>
              </div>

              {/* Размер */}
              <div className="col-span-6 md:col-span-3">
                {(() => { const csi = stockInfo((productSizes[item.product] || []).find(s => s.size_label === item.size)?.stock_qty ?? 0); return (
                  <>
                    <select
                      value={item.size}
                      onChange={(e) => updateSize(item.id, e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded"
                      style={{ background: "#0d1117", border: `1px solid ${csi.color}40`, color: csi.color, outline: "none" }}
                    >
                      {(productSizes[item.product] || []).map((s) => {
                        const si = stockInfo(s.stock_qty ?? 0);
                        return (
                          <option key={s.size_label} value={s.size_label} style={{ color: si.color, background: "#0d1117" }}>
                            {s.size_label}{s.price_add > 0 ? ` (+${s.price_add} ₽)` : ""} — {si.label}
                          </option>
                        );
                      })}
                    </select>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: csi.color }} />
                      <span style={{ color: csi.color, fontSize: 10 }}>{csi.label}</span>
                    </div>
                  </>
                ); })()}
              </div>

              {/* Количество */}
              <div className="col-span-3 md:col-span-2 flex items-center justify-center gap-1">
                <button
                  onClick={() => updateQty(item.id, item.qty - 1)}
                  className="w-6 h-6 flex items-center justify-center rounded text-xs"
                  style={{ background: "rgba(245,124,0,0.15)", color: "#f57c00", border: "none", cursor: "pointer" }}
                >−</button>
                <span className="text-sm font-medium w-8 text-center" style={{ color: "#e8e0d0" }}>{item.qty}</span>
                <button
                  onClick={() => updateQty(item.id, item.qty + 1)}
                  className="w-6 h-6 flex items-center justify-center rounded text-xs"
                  style={{ background: "rgba(245,124,0,0.15)", color: "#f57c00", border: "none", cursor: "pointer" }}
                >+</button>
              </div>

              {/* Сумма */}
              <div className="col-span-2 md:col-span-2 text-right">
                <div className="text-sm font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
                  {item.finalLine.toLocaleString("ru-RU")} ₽
                </div>
                {item.lineSaving > 0 && (
                  <div className="text-xs" style={{ color: "#4ade80" }}>−{item.lineSaving.toLocaleString("ru-RU")} ₽</div>
                )}
              </div>

              {/* Удалить */}
              <div className="col-span-1 flex justify-end">
                <button
                  onClick={() => removeFromCart(item.id)}
                  style={{ background: "none", border: "none", color: "#8a9ab5", cursor: "pointer" }}
                >
                  <Icon name="Trash2" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
