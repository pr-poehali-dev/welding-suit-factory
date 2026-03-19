import { SIZES_GOST, SIZE_SURCHARGE } from "./constants";
import Icon from "@/components/ui/icon";
import { ApiProduct, accent, muted, oswald, FALLBACK_IMG, CHESTNIY_ZNAK_IMG } from "./catalogTypes";
import StockBadge from "./StockBadge";

interface ProductCardProps {
  product: ApiProduct;
  currentSize: string;
  onSizeChange: (size: string) => void;
  onOpenModal: () => void;
  onAddToCalc: () => void;
}

export default function ProductCard({ product, currentSize, onSizeChange, onOpenModal, onAddToCalc }: ProductCardProps) {
  const surcharge = SIZE_SURCHARGE[currentSize] ?? 0;
  const cardPrice = Math.round(product.base_price * (1 + surcharge));

  return (
    <div className="product-card rounded overflow-hidden flex flex-col" style={{ background: "#13181f" }}>
      <div className="relative cursor-pointer" onClick={onOpenModal}>
        <img
          src={product.image_url || FALLBACK_IMG}
          alt={product.name}
          className="w-full h-48 object-cover"
        />
        {product.badge && (
          <div className="absolute top-3 left-3 px-2 py-1 text-xs font-bold uppercase"
            style={{ background: accent, color: "#0d1117", fontFamily: oswald, letterSpacing: "0.06em" }}>
            {product.badge}
          </div>
        )}
        {product.gtin && (
          <div className="absolute bottom-2 right-2">
            <img src={CHESTNIY_ZNAK_IMG}
              alt="Честный знак" title="Маркировка «Честный знак»"
              style={{ width: 36, height: 36, borderRadius: "50%", opacity: 0.92 }} />
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="text-xs mb-2 font-medium" style={{ color: accent, letterSpacing: "0.04em" }}>{product.category}</div>
        <h3 className="text-base font-bold mb-1 cursor-pointer hover:underline" style={{ fontFamily: oswald, color: "#ffffff" }}
          onClick={onOpenModal}>{product.name}</h3>
        <p className="text-sm mb-3 leading-relaxed line-clamp-2" style={{ color: muted }}>{product.description}</p>
        <div className="mb-3">
          <div className="text-xs mb-1.5 uppercase tracking-wider" style={{ color: muted, fontFamily: oswald }}>Размер / Рост (ГОСТ)</div>
          <select
            value={currentSize}
            onChange={(e) => onSizeChange(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded"
            style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.25)", color: "#e8e0d0", outline: "none" }}
          >
            {SIZES_GOST.map((s) => (
              <option key={s} value={s}>{s}{SIZE_SURCHARGE[s] > 0 ? ` (+${SIZE_SURCHARGE[s] * 100}%)` : ""}</option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <StockBadge status={product.stock_status ?? "in_stock"} />
        </div>
        <div className="mt-auto pt-3 flex flex-col gap-2" style={{ borderTop: "1px solid rgba(245,124,0,0.1)" }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-bold" style={{ fontFamily: oswald, color: accent }}>
                {cardPrice.toLocaleString("ru-RU")} ₽
              </div>
              <div className="text-xs mt-0.5 flex items-center gap-2">
                <span style={{ color: muted }}>{product.gost}</span>
                {surcharge > 0 && (
                  <span className="px-1.5 py-0.5 rounded" style={{ background: "rgba(245,124,0,0.15)", color: accent, fontSize: 11 }}>
                    +{surcharge * 100}%
                  </span>
                )}
              </div>
            </div>
            <button
              className="btn-outline px-4 py-2 text-xs"
              onClick={onAddToCalc}
            >
              В калькулятор
            </button>
          </div>
          <button onClick={onOpenModal}
            className="w-full py-2 text-xs rounded flex items-center justify-center gap-1.5"
            style={{ background: "rgba(245,124,0,0.06)", border: "1px solid rgba(245,124,0,0.2)", color: accent, cursor: "pointer", fontFamily: oswald, letterSpacing: "0.04em" }}>
            <Icon name="Info" size={13} /> Подробнее
          </button>
        </div>
      </div>
    </div>
  );
}
