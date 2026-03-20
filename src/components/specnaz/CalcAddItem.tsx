import Icon from "@/components/ui/icon";
import { stockInfo, type ProductSizeData } from "./CalculatorSection";

function sizeMatchesAvailability(s: ProductSizeData, availability: "stock" | "order"): boolean {
  const qty = s.stock_qty ?? 0;
  return availability === "stock" ? qty > 0 : qty === 0;
}

interface CalcAddItemProps {
  addProduct: string;
  setAddProduct: (val: string) => void;
  addSize: string;
  setAddSize: (val: string) => void;
  addQty: number;
  setAddQty: (val: number) => void;
  addToCart: () => void;
  productNames: string[];
  currentProductSizes: ProductSizeData[];
  availability: "stock" | "order";
}

export default function CalcAddItem({
  addProduct, setAddProduct,
  addSize, setAddSize,
  addQty, setAddQty,
  addToCart,
  productNames,
  currentProductSizes,
  availability,
}: CalcAddItemProps) {
  const allowedSizes = currentProductSizes.filter(s => sizeMatchesAvailability(s, availability));
  const currentSizeData = currentProductSizes.find(s => s.size_label === addSize);
  const isAllowed = currentSizeData ? sizeMatchesAvailability(currentSizeData, availability) : false;
  const asi = isAllowed ? stockInfo(currentSizeData?.stock_qty ?? 0) : { color: "#555", label: "Измените условия заказа" };

  return (
    <div className="rounded p-4" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)", height: "100%" }}>
      <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Добавить позицию</div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: "#8a9ab5" }}>Артикул</label>
          <select value={addProduct} onChange={(e) => setAddProduct(e.target.value)} className="w-full px-3 py-2 text-sm rounded" style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.3)", color: "#e8e0d0", outline: "none" }}>
            {productNames.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: "#8a9ab5" }}>Размер / Рост (ГОСТ)</label>
          <select
            value={addSize}
            onChange={(e) => setAddSize(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded"
            style={{ background: "#0d1117", border: `1px solid ${asi.color}40`, color: asi.color, outline: "none" }}
          >
            {currentProductSizes.map((s) => {
              const matches = sizeMatchesAvailability(s, availability);
              const si = matches ? stockInfo(s.stock_qty ?? 0) : { color: "#555", label: "Измените условия заказа" };
              return (
                <option key={s.size_label} value={s.size_label} disabled={!matches} style={{ color: si.color, background: "#0d1117" }}>
                  {s.size_label}{s.price_add > 0 ? ` (+${s.price_add} ₽)` : ""} — {si.label}
                </option>
              );
            })}
          </select>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: asi.color }} />
            <span className="text-xs" style={{ color: asi.color }}>{asi.label}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: "#8a9ab5" }}>Количество, шт</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddQty(Math.max(1, addQty - 1))}
              className="w-9 h-9 flex items-center justify-center rounded text-sm flex-shrink-0"
              style={{ background: "rgba(245,124,0,0.15)", color: "#f57c00", border: "none", cursor: "pointer" }}
            >−</button>
            <input
              type="text"
              inputMode="numeric"
              value={addQty}
              onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); setAddQty(v === "" ? 1 : Math.max(1, parseInt(v, 10))); }}
              className="w-full px-3 py-2 text-sm rounded text-center outline-none"
              style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.3)", color: "#e8e0d0" }}
            />
            <button
              onClick={() => setAddQty(addQty + 1)}
              className="w-9 h-9 flex items-center justify-center rounded text-sm flex-shrink-0"
              style={{ background: "rgba(245,124,0,0.15)", color: "#f57c00", border: "none", cursor: "pointer" }}
            >+</button>
          </div>
        </div>

        <button
          className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
          onClick={addToCart}
          disabled={!allowedSizes.some(s => s.size_label === addSize)}
          style={{ opacity: allowedSizes.some(s => s.size_label === addSize) ? 1 : 0.4 }}
        >
          <Icon name="Plus" size={16} />
          Добавить в заказ
        </button>
      </div>
    </div>
  );
}
