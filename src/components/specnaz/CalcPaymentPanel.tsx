import Icon from "@/components/ui/icon";
import { PAYMENT_OPTIONS } from "./constants";
import { stockInfo, type ProductSizeData } from "./CalculatorSection";

interface CalcPaymentPanelProps {
  payment: string;
  setPayment: (val: string) => void;
  withLogo: boolean;
  setWithLogo: (val: boolean) => void;
  addProduct: string;
  setAddProduct: (val: string) => void;
  addSize: string;
  setAddSize: (val: string) => void;
  addQty: number;
  setAddQty: (val: number) => void;
  addToCart: () => void;
  productNames: string[];
  currentProductSizes: ProductSizeData[];
}

export default function CalcPaymentPanel({
  payment, setPayment,
  withLogo, setWithLogo,
  addProduct, setAddProduct,
  addSize, setAddSize,
  addQty, setAddQty,
  addToCart,
  productNames,
  currentProductSizes,
}: CalcPaymentPanelProps) {
  return (
    <div className="lg:col-span-1 space-y-5">

      {/* Условие оплаты */}
      <div className="rounded p-5" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)" }}>
        <div className="text-xs uppercase tracking-widest mb-4" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Условие оплаты</div>
        <div className="space-y-1.5">
          {PAYMENT_OPTIONS.map(opt => (
            <label key={opt.id} className="flex items-center justify-between gap-3 p-3 rounded cursor-pointer transition-all" style={{
              background: payment === opt.id ? "rgba(245,124,0,0.1)" : "#0d1117",
              border: `1px solid ${payment === opt.id ? "rgba(245,124,0,0.4)" : "rgba(255,255,255,0.06)"}`,
            }}>
              <div className="flex items-center gap-3">
                <input type="radio" name="payment" checked={payment === opt.id} onChange={() => setPayment(opt.id)} style={{ accentColor: "#f57c00" }} />
                <div>
                  <div className="text-sm" style={{ color: payment === opt.id ? "#e8e0d0" : "#8a9ab5" }}>{opt.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: "#8a9ab5" }}>{opt.desc}</div>
                </div>
              </div>
            </label>
          ))}
        </div>

        <label className="flex items-center gap-3 cursor-pointer mt-3 p-3 rounded" style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.06)" }}>
          <input type="checkbox" checked={withLogo} onChange={(e) => setWithLogo(e.target.checked)} style={{ accentColor: "#f57c00", width: 16, height: 16 }} />
          <span className="text-sm" style={{ color: "#c8bca8" }}>Нанесение логотипа <span style={{ color: "#f57c00" }}>+15%</span></span>
        </label>
      </div>

      {/* Добавить позицию */}
      <div className="rounded p-5" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)" }}>
        <div className="text-xs uppercase tracking-widest mb-4" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Добавить позицию</div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: "#8a9ab5" }}>Артикул</label>
            <select value={addProduct} onChange={(e) => setAddProduct(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded" style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.3)", color: "#e8e0d0", outline: "none" }}>
              {productNames.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "#8a9ab5" }}>Размер / Рост (ГОСТ)</label>
            {(() => { const asi = stockInfo(currentProductSizes.find(s => s.size_label === addSize)?.stock_qty ?? 0); return (
              <>
                <select value={addSize} onChange={(e) => setAddSize(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded" style={{ background: "#0d1117", border: `1px solid ${asi.color}40`, color: asi.color, outline: "none" }}>
                  {currentProductSizes.map((s) => {
                    const si = stockInfo(s.stock_qty ?? 0);
                    return (
                      <option key={s.size_label} value={s.size_label} style={{ color: si.color, background: "#0d1117" }}>
                        {s.size_label}{s.price_add > 0 ? ` (+${s.price_add} ₽)` : ""} — {si.label}
                      </option>
                    );
                  })}
                </select>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: asi.color }} />
                  <span className="text-xs" style={{ color: asi.color }}>{asi.label}</span>
                </div>
              </>
            ); })()}
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "#8a9ab5" }}>Количество, шт</label>
            <input
              type="number"
              min={1}
              value={addQty}
              onChange={(e) => setAddQty(Math.max(1, Number(e.target.value)))}
              className="w-full px-3 py-2.5 text-sm rounded"
              style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.3)", color: "#e8e0d0", outline: "none" }}
            />
          </div>
          <button
            className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
            onClick={addToCart}
          >
            <Icon name="Plus" size={16} />
            Добавить в заказ
          </button>
        </div>
      </div>
    </div>
  );
}