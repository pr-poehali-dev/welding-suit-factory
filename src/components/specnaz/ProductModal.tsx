import { useEffect, useState } from "react";
import { SIZES_GOST } from "./constants";
import Icon from "@/components/ui/icon";
import { ApiProduct, accent, muted, oswald, FALLBACK_IMG } from "./catalogTypes";
import StockBadge from "./StockBadge";

type DetailTab = "description" | "specs" | "docs" | "materials";

interface ProductModalProps {
  product: ApiProduct;
  onClose: () => void;
  onAddToCalc: () => void;
  selectedSize: string;
  setSelectedSize: (s: string) => void;
}

export default function ProductModal({ product, onClose, onAddToCalc, selectedSize, setSelectedSize }: ProductModalProps) {
  const [tab, setTab] = useState<DetailTab>("description");
  const [imgIdx, setImgIdx] = useState(0);

  const availSizes = product.sizes?.filter(s => s.is_available) ?? [];
  const currentSizeObj = availSizes.find(s => s.size_label === selectedSize) ?? availSizes[0];
  const price = product.base_price + (currentSizeObj?.price_add ?? 0);

  const stkInfo = (qty: number) => {
    if (qty === 0) return { color: "#f87171", label: "Под заказ" };
    if (qty < 20)  return { color: "#facc15", label: `Мало (${qty} шт)` };
    if (qty <= 100) return { color: "#4ade80", label: "В наличии" };
    return { color: "#60a5fa", label: "Много" };
  };
  const curStk = stkInfo(currentSizeObj?.stock_qty ?? 0);
  const allImgs = product.images?.length
    ? product.images.map(i => i.url)
    : [product.image_url || FALLBACK_IMG];

  const tabs: { id: DetailTab; label: string; icon: string; hasContent: boolean }[] = [
    { id: "description", label: "Описание",        icon: "FileText",  hasContent: !!product.description },
    { id: "specs",       label: "Характеристики",  icon: "ShieldCheck", hasContent: !!product.protection_class || !!product.gost || (product.unit_weight > 0) },
    { id: "docs",        label: "Документация",    icon: "BookOpen",  hasContent: !!product.documentation },
    { id: "materials",   label: "Материалы",       icon: "Layers",    hasContent: !!product.materials || !!product.extra_info },
  ].filter(t => t.hasContent);

  useEffect(() => {
    if (tabs.length) setTab(tabs[0].id);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [product.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.82)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-4xl rounded-lg overflow-hidden flex flex-col"
        style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.25)", maxHeight: "92vh" }}>

        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(245,124,0,0.15)", background: "#0d1117" }}>
          <div>
            <div className="text-xs mb-0.5" style={{ color: accent }}>{product.category}</div>
            <h2 className="text-xl font-bold" style={{ fontFamily: oswald, color: "#fff" }}>{product.name}</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: muted, cursor: "pointer", padding: 4 }}>
            <Icon name="X" size={22} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="flex flex-col md:flex-row gap-0">

            <div className="md:w-80 flex-shrink-0 p-5 flex flex-col gap-4"
              style={{ borderRight: "1px solid rgba(245,124,0,0.1)" }}>

              <div className="relative rounded overflow-hidden" style={{ aspectRatio: "1/1", background: "#0d1117" }}>
                {product.badge && (
                  <div className="absolute top-3 left-3 z-10 px-2 py-1 text-xs font-bold uppercase"
                    style={{ background: accent, color: "#0d1117", fontFamily: oswald }}>
                    {product.badge}
                  </div>
                )}
                <img src={allImgs[imgIdx]} alt={product.name} className="w-full h-full object-contain" />
              </div>

              {allImgs.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {allImgs.map((url, i) => (
                    <button key={i} onClick={() => setImgIdx(i)}
                      className="rounded overflow-hidden flex-shrink-0"
                      style={{ width: 52, height: 52, border: `2px solid ${i === imgIdx ? accent : "rgba(245,124,0,0.2)"}`, background: "none", padding: 0, cursor: "pointer" }}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="rounded p-4" style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.15)" }}>
                <div className="text-2xl font-bold mb-3" style={{ fontFamily: oswald, color: accent }}>
                  {price.toLocaleString("ru-RU")} ₽
                </div>

                <div className="mb-3">
                  <div className="text-xs mb-1.5 uppercase tracking-wider" style={{ color: muted, fontFamily: oswald }}>Размер / Рост</div>
                  {availSizes.length > 0 ? (
                    <>
                      <select value={selectedSize}
                        onChange={e => setSelectedSize(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded outline-none"
                        style={{ background: "#13181f", border: `1px solid ${curStk.color}40`, color: curStk.color }}>
                        {availSizes.map(s => {
                          const si = stkInfo(s.stock_qty ?? 0);
                          return (
                            <option key={s.size_label} value={s.size_label} style={{ color: si.color, background: "#13181f" }}>
                              {s.size_label}{s.price_add > 0 ? ` (+${s.price_add.toLocaleString("ru-RU")} ₽)` : ""} — {si.label}
                            </option>
                          );
                        })}
                      </select>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: curStk.color }} />
                        <span className="text-xs font-medium" style={{ color: curStk.color }}>{curStk.label}</span>
                      </div>
                    </>
                  ) : (
                    <select value={selectedSize} onChange={e => setSelectedSize(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded outline-none"
                      style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.3)", color: "#e8e0d0" }}>
                      {SIZES_GOST.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </div>

                <div className="mb-4">
                  <StockBadge status={product.stock_status ?? "in_stock"} />
                </div>

                <button onClick={onAddToCalc}
                  className="w-full py-2.5 text-sm font-bold rounded"
                  style={{ background: accent, color: "#0d1117", fontFamily: oswald, letterSpacing: "0.05em", border: "none", cursor: "pointer" }}>
                  В калькулятор
                </button>
              </div>

              {product.gost && (
                <div className="text-xs" style={{ color: "rgba(138,154,181,0.6)" }}>{product.gost}</div>
              )}

              {product.barcode_url && (
                <img src={product.barcode_url} alt="штрихкод" className="w-full rounded" style={{ background: "#fff", padding: 6 }} />
              )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col">
              {tabs.length > 0 && (
                <>
                  <div className="flex border-b flex-shrink-0 overflow-x-auto"
                    style={{ borderColor: "rgba(245,124,0,0.12)" }}>
                    {tabs.map(t => (
                      <button key={t.id} onClick={() => setTab(t.id)}
                        className="flex items-center gap-1.5 px-4 py-3 text-sm whitespace-nowrap flex-shrink-0"
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          fontFamily: oswald, letterSpacing: "0.04em",
                          color: tab === t.id ? accent : muted,
                          borderBottom: tab === t.id ? `2px solid ${accent}` : "2px solid transparent",
                        }}>
                        <Icon name={t.icon} size={13} />
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="p-6 text-sm leading-relaxed flex-1" style={{ color: "#c8bca8" }}>

                    {tab === "description" && (
                      <p style={{ whiteSpace: "pre-wrap" }}>{product.description}</p>
                    )}

                    {tab === "specs" && (
                      <div className="space-y-3">
                        {product.protection_class && (
                          <div className="flex gap-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <span className="flex-shrink-0 text-xs uppercase tracking-wider" style={{ color: muted, fontFamily: oswald, minWidth: 160 }}>Класс защиты</span>
                            <span>{product.protection_class}</span>
                          </div>
                        )}
                        {product.gost && (
                          <div className="flex gap-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <span className="flex-shrink-0 text-xs uppercase tracking-wider" style={{ color: muted, fontFamily: oswald, minWidth: 160 }}>ГОСТ / Стандарт</span>
                            <span>{product.gost}</span>
                          </div>
                        )}
                        {(product.pack_length > 0 || product.pack_width > 0 || product.pack_height > 0) && (
                          <div className="flex gap-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <span className="flex-shrink-0 text-xs uppercase tracking-wider" style={{ color: muted, fontFamily: oswald, minWidth: 160 }}>Габариты упаковки</span>
                            <span>{product.pack_length} x {product.pack_width} x {product.pack_height} см</span>
                          </div>
                        )}
                        {product.unit_weight > 0 && (
                          <div className="flex gap-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <span className="flex-shrink-0 text-xs uppercase tracking-wider" style={{ color: muted, fontFamily: oswald, minWidth: 160 }}>Вес единицы</span>
                            <span>{product.unit_weight} кг</span>
                          </div>
                        )}
                        {availSizes.length > 0 && (
                          <div className="py-2.5">
                            <div className="text-xs uppercase tracking-wider mb-3" style={{ color: muted, fontFamily: oswald }}>Размерный ряд</div>
                            <div className="flex flex-wrap gap-2">
                              {availSizes.map(s => (
                                <span key={s.size_label} className="px-2 py-1 rounded text-xs"
                                  style={{ background: "rgba(245,124,0,0.08)", border: "1px solid rgba(245,124,0,0.2)", color: "#e8e0d0" }}>
                                  {s.size_label}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {tab === "docs" && (
                      <p style={{ whiteSpace: "pre-wrap" }}>{product.documentation}</p>
                    )}

                    {tab === "materials" && (
                      <div className="space-y-4">
                        {product.materials && (
                          <div>
                            <div className="text-xs uppercase tracking-wider mb-2" style={{ color: muted, fontFamily: oswald }}>Состав и материалы</div>
                            <p style={{ whiteSpace: "pre-wrap" }}>{product.materials}</p>
                          </div>
                        )}
                        {product.extra_info && (
                          <div>
                            <div className="text-xs uppercase tracking-wider mb-2" style={{ color: muted, fontFamily: oswald }}>Дополнительно</div>
                            <p style={{ whiteSpace: "pre-wrap" }}>{product.extra_info}</p>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}