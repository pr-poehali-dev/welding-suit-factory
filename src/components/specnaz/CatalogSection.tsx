import { useEffect, useState } from "react";
import { SIZES_GOST, SIZE_SURCHARGE } from "./constants";
import CatalogTree, { CatalogPath } from "./CatalogTree";
import { CatalogNode } from "./constants";
import Icon from "@/components/ui/icon";

const API = "https://functions.poehali.dev/867570d6-4bd3-4fdc-977c-f50fd3926c0e";

type StockStatus = "in_stock" | "few" | "low" | "on_order";

const STOCK_MAP: Record<StockStatus, { label: string; color: string }> = {
  in_stock: { label: "В наличии",  color: "#4ade80" },
  few:      { label: "Мало",       color: "#facc15" },
  low:      { label: "Под заказ",  color: "#f87171" },
  on_order: { label: "Много",      color: "#60a5fa" },
};

function StockBadge({ status }: { status: StockStatus }) {
  const s = STOCK_MAP[status] ?? STOCK_MAP.in_stock;
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}40` }}>
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

interface ApiProduct {
  id: number;
  name: string;
  category: string;
  description: string;
  gost: string;
  badge: string | null;
  base_price: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  stock_status: StockStatus;
}

interface CatalogSectionProps {
  catalogPath: CatalogPath;
  setCatalogPath: (path: CatalogPath) => void;
  selectedSizes: Record<number, string>;
  setSelectedSizes: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  setAddProduct: (product: string) => void;
  setAddSize: (size: string) => void;
  scrollTo: (href: string) => void;
}

const accent = "#f57c00";
const muted = "#8a9ab5";
const oswald = "'Oswald', sans-serif";
const FALLBACK_IMG = "https://cdn.poehali.dev/projects/c9ed5862-2c66-4e7a-985a-adae1a32a552/files/3f2a3aec-d043-4d9c-9fd7-97ee66727a80.jpg";

function lastNode(path: CatalogPath): CatalogNode | null {
  return path.nodes.length ? path.nodes[path.nodes.length - 1] : null;
}

function isLeafNode(node: CatalogNode | null): boolean {
  return !!node && !node.children;
}

export default function CatalogSection({
  catalogPath,
  setCatalogPath,
  selectedSizes,
  setSelectedSizes,
  setAddProduct,
  setAddSize,
  scrollTo,
}: CatalogSectionProps) {
  const [allProducts, setAllProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API)
      .then(r => r.json())
      .then(data => {
        setAllProducts((data.products || []).filter((p: ApiProduct) => p.is_active));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const leaf = lastNode(catalogPath);
  const showProducts = isLeafNode(leaf);

  const filteredProducts = showProducts && leaf?.categoryTag
    ? allProducts.filter(p => p.category === leaf.categoryTag)
    : allProducts;

  const getCardPrice = (basePrice: number, size: string) => {
    const surcharge = SIZE_SURCHARGE[size] ?? 0;
    return Math.round(basePrice * (1 + surcharge));
  };

  return (
    <section id="catalog" className="py-24" style={{ background: "#0d1117" }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8">

        {/* Заголовок */}
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div style={{ width: 32, height: 2, background: accent }} />
            <span className="text-sm tracking-widest uppercase" style={{ color: accent }}>Продукция</span>
            <div style={{ width: 32, height: 2, background: accent }} />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: oswald, color: "#ffffff" }}>
            КАТАЛОГ СПЕЦОДЕЖДЫ
          </h2>
          <p style={{ color: muted }}>Размеры по ГОСТ (размер/рост) · цена зависит от размера</p>
        </div>

        {/* Сетка: дерево + товары */}
        <div className="flex gap-8 flex-col lg:flex-row">

          {/* Левая колонка: навигация */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="rounded-lg overflow-hidden sticky top-24"
              style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)", padding: "24px" }}>
              <div className="flex items-center gap-2 mb-6">
                <Icon name="LayoutGrid" size={16} style={{ color: accent }} />
                <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: accent, fontFamily: oswald }}>
                  Навигация
                </span>
              </div>
              <CatalogTree path={catalogPath} onNavigate={setCatalogPath} />
            </div>
          </div>

          {/* Правая колонка: товары */}
          <div className="flex-1 min-w-0">
            {showProducts ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold uppercase" style={{ fontFamily: oswald, color: "#ffffff" }}>
                      {leaf?.label}
                    </h3>
                    <p className="text-sm mt-1" style={{ color: muted }}>
                      {loading ? "Загрузка..." : `${filteredProducts.length} товар${filteredProducts.length === 1 ? "" : filteredProducts.length < 5 ? "а" : "ов"} в разделе`}
                    </p>
                  </div>
                  <button
                    onClick={() => setCatalogPath({ nodes: catalogPath.nodes.slice(0, -1) })}
                    className="flex items-center gap-1 px-4 py-2 rounded text-sm"
                    style={{ background: "rgba(245,124,0,0.1)", border: "1px solid rgba(245,124,0,0.3)", color: accent, cursor: "pointer", fontFamily: oswald }}
                  >
                    <Icon name="ArrowLeft" size={14} /> Назад
                  </button>
                </div>

                {loading ? (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="rounded overflow-hidden animate-pulse" style={{ background: "#13181f" }}>
                        <div style={{ height: 192, background: "#1e2530" }} />
                        <div className="p-5 space-y-3">
                          <div style={{ height: 12, background: "#1e2530", borderRadius: 4, width: "60%" }} />
                          <div style={{ height: 16, background: "#1e2530", borderRadius: 4 }} />
                          <div style={{ height: 12, background: "#1e2530", borderRadius: 4, width: "80%" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 rounded-lg"
                    style={{ border: "1px dashed rgba(245,124,0,0.2)", color: muted }}>
                    <Icon name="Package" size={40} style={{ color: "rgba(138,154,181,0.2)", marginBottom: 12 }} />
                    <div className="text-sm">Товары для этой категории пока добавляются</div>
                    <div className="text-xs mt-2" style={{ color: "rgba(138,154,181,0.5)" }}>Свяжитесь с нами для уточнения наличия</div>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredProducts.map((p) => {
                      const currentSize = selectedSizes[p.id] ?? SIZES_GOST[1];
                      const cardPrice = getCardPrice(p.base_price, currentSize);
                      const surcharge = SIZE_SURCHARGE[currentSize] ?? 0;
                      return (
                        <div key={p.id} className="product-card rounded overflow-hidden" style={{ background: "#13181f" }}>
                          <div className="relative">
                            <img
                              src={p.image_url || FALLBACK_IMG}
                              alt={p.name}
                              className="w-full h-48 object-cover"
                            />
                            {p.badge && (
                              <div className="absolute top-3 left-3 px-2 py-1 text-xs font-bold uppercase"
                                style={{ background: accent, color: "#0d1117", fontFamily: oswald, letterSpacing: "0.06em" }}>
                                {p.badge}
                              </div>
                            )}
                          </div>
                          <div className="p-5">
                            <div className="text-xs mb-2 font-medium" style={{ color: accent, letterSpacing: "0.04em" }}>{p.category}</div>
                            <h3 className="text-base font-bold mb-1" style={{ fontFamily: oswald, color: "#ffffff" }}>{p.name}</h3>
                            <p className="text-sm mb-3 leading-relaxed" style={{ color: muted }}>{p.description}</p>
                            <div className="mb-3">
                              <div className="text-xs mb-1.5 uppercase tracking-wider" style={{ color: muted, fontFamily: oswald }}>Размер / Рост (ГОСТ)</div>
                              <select
                                value={currentSize}
                                onChange={(e) => setSelectedSizes((prev) => ({ ...prev, [p.id]: e.target.value }))}
                                className="w-full px-3 py-2 text-xs rounded"
                                style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.25)", color: "#e8e0d0", outline: "none" }}
                              >
                                {SIZES_GOST.map((s) => (
                                  <option key={s} value={s}>{s}{SIZE_SURCHARGE[s] > 0 ? ` (+${SIZE_SURCHARGE[s] * 100}%)` : ""}</option>
                                ))}
                              </select>
                            </div>
                            <div className="mb-3">
                              <StockBadge status={p.stock_status ?? "in_stock"} />
                            </div>
                            <div className="flex items-center justify-between py-3" style={{ borderTop: "1px solid rgba(245,124,0,0.1)" }}>
                              <div>
                                <div className="text-xl font-bold" style={{ fontFamily: oswald, color: accent }}>
                                  {cardPrice.toLocaleString("ru-RU")} ₽
                                </div>
                                <div className="text-xs mt-0.5 flex items-center gap-2">
                                  <span style={{ color: muted }}>{p.gost}</span>
                                  {surcharge > 0 && (
                                    <span className="px-1.5 py-0.5 rounded" style={{ background: "rgba(245,124,0,0.15)", color: accent, fontSize: 11 }}>
                                      +{surcharge * 100}%
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                className="btn-outline px-4 py-2 text-xs"
                                onClick={() => {
                                  setAddProduct(p.name);
                                  setAddSize(currentSize);
                                  scrollTo("#calculator");
                                }}
                              >
                                В калькулятор
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-64 rounded-lg"
                style={{ border: "1px dashed rgba(245,124,0,0.2)" }}>
                <div className="text-center px-8">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: "rgba(245,124,0,0.1)", border: "1px solid rgba(245,124,0,0.2)" }}>
                    <Icon name="LayoutGrid" size={28} style={{ color: "rgba(245,124,0,0.5)" }} />
                  </div>
                  <div className="font-semibold text-lg mb-2" style={{ fontFamily: oswald, color: "#ffffff" }}>
                    Выберите категорию
                  </div>
                  <div className="text-sm" style={{ color: muted }}>
                    Используйте навигацию слева, чтобы найти нужную продукцию
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}