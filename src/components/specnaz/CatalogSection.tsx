import { useEffect, useState } from "react";
import { SIZES_GOST, SIZE_SURCHARGE } from "./constants";
import CatalogTree, { CatalogPath } from "./CatalogTree";
import { CatalogNode } from "./constants";
import Icon from "@/components/ui/icon";

const API = "https://functions.poehali.dev/867570d6-4bd3-4fdc-977c-f50fd3926c0e";

type StockStatus = "in_stock" | "few" | "low" | "on_order";

// Уровни наличия: 4 кружка, закрашенные = есть, пустые = нет
const STOCK_LEVELS: Record<StockStatus, { label: string; filled: number }> = {
  on_order: { label: "Много",      filled: 4 },
  in_stock: { label: "В наличии",  filled: 3 },
  few:      { label: "Мало",       filled: 2 },
  low:      { label: "Под заказ",  filled: 1 },
};

function StockBadge({ status }: { status: StockStatus }) {
  const s = STOCK_LEVELS[status] ?? STOCK_LEVELS.in_stock;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex items-center gap-1">
        {[0, 1, 2, 3].map(i => (
          <span key={i} className="rounded-full inline-block"
            style={{
              width: 8, height: 8,
              background: i < s.filled ? "#f57c00" : "transparent",
              border: `1.5px solid ${i < s.filled ? "#f57c00" : "rgba(245,124,0,0.3)"}`,
            }} />
        ))}
      </span>
      <span className="text-xs" style={{ color: s.filled === 0 ? "#f87171" : s.filled === 1 ? "#facc15" : "#f57c00" }}>
        {s.label}
      </span>
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
  protection_class: string;
  documentation: string;
  materials: string;
  extra_info: string;
  images: { id: number; url: string; sort_order: number }[];
  sizes: { id: number; size_label: string; price_add: number; is_available: boolean; gtin: string }[];
  barcode_url: string;
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

type DetailTab = "description" | "specs" | "docs" | "materials";

function ProductModal({ product, onClose, onAddToCalc, selectedSize, setSelectedSize }: {
  product: ApiProduct;
  onClose: () => void;
  onAddToCalc: () => void;
  selectedSize: string;
  setSelectedSize: (s: string) => void;
}) {
  const [tab, setTab] = useState<DetailTab>("description");
  const [imgIdx, setImgIdx] = useState(0);

  const availSizes = product.sizes?.filter(s => s.is_available) ?? [];
  const currentSizeObj = availSizes.find(s => s.size_label === selectedSize) ?? availSizes[0];
  const price = product.base_price + (currentSizeObj?.price_add ?? 0);
  const allImgs = product.images?.length
    ? product.images.map(i => i.url)
    : [product.image_url || FALLBACK_IMG];

  const tabs: { id: DetailTab; label: string; icon: string; hasContent: boolean }[] = [
    { id: "description", label: "Описание",        icon: "FileText",  hasContent: !!product.description },
    { id: "specs",       label: "Характеристики",  icon: "ShieldCheck", hasContent: !!product.protection_class || !!product.gost },
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

        {/* Шапка */}
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

            {/* Левая колонка — фото + заказ */}
            <div className="md:w-80 flex-shrink-0 p-5 flex flex-col gap-4"
              style={{ borderRight: "1px solid rgba(245,124,0,0.1)" }}>

              {/* Фото */}
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

              {/* Цена и размер */}
              <div className="rounded p-4" style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.15)" }}>
                <div className="text-2xl font-bold mb-3" style={{ fontFamily: oswald, color: accent }}>
                  {price.toLocaleString("ru-RU")} ₽
                </div>

                <div className="mb-3">
                  <div className="text-xs mb-1.5 uppercase tracking-wider" style={{ color: muted, fontFamily: oswald }}>Размер / Рост</div>
                  {availSizes.length > 0 ? (
                    <select value={selectedSize}
                      onChange={e => setSelectedSize(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded outline-none"
                      style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.3)", color: "#e8e0d0" }}>
                      {availSizes.map(s => (
                        <option key={s.size_label} value={s.size_label}>
                          {s.size_label}{s.price_add > 0 ? ` (+${s.price_add.toLocaleString("ru-RU")} ₽)` : ""}
                        </option>
                      ))}
                    </select>
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

            {/* Правая колонка — вкладки */}
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
  const [modalProduct, setModalProduct] = useState<ApiProduct | null>(null);

  useEffect(() => {
    fetch(API)
      .then(r => r.json())
      .then(data => {
        setAllProducts((data.products || []).filter((p: ApiProduct) => p.is_active));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const openModal = (p: ApiProduct) => {
    setModalProduct(p);
    const firstSize = p.sizes?.find(s => s.is_available)?.size_label ?? SIZES_GOST[1];
    setSelectedSizes(prev => ({ ...prev, [p.id]: prev[p.id] ?? firstSize }));
  };

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
    <>
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
                        <div key={p.id} className="product-card rounded overflow-hidden flex flex-col" style={{ background: "#13181f" }}>
                          <div className="relative cursor-pointer" onClick={() => openModal(p)}>
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
                            {p.gtin && (
                              <div className="absolute bottom-2 right-2">
                                <img src="https://cdn.poehali.dev/projects/c9ed5862-2c66-4e7a-985a-adae1a32a552/bucket/13d96f42-3da7-4dbe-bfcc-50c514929a23.png"
                                  alt="Честный знак" title="Маркировка «Честный знак»"
                                  style={{ width: 36, height: 36, borderRadius: "50%", opacity: 0.92 }} />
                              </div>
                            )}
                          </div>
                          <div className="p-5 flex flex-col flex-1">
                            <div className="text-xs mb-2 font-medium" style={{ color: accent, letterSpacing: "0.04em" }}>{p.category}</div>
                            <h3 className="text-base font-bold mb-1 cursor-pointer hover:underline" style={{ fontFamily: oswald, color: "#ffffff" }}
                              onClick={() => openModal(p)}>{p.name}</h3>
                            <p className="text-sm mb-3 leading-relaxed line-clamp-2" style={{ color: muted }}>{p.description}</p>
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
                            <div className="mt-auto pt-3 flex flex-col gap-2" style={{ borderTop: "1px solid rgba(245,124,0,0.1)" }}>
                              <div className="flex items-center justify-between">
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
                              <button onClick={() => openModal(p)}
                                className="w-full py-2 text-xs rounded flex items-center justify-center gap-1.5"
                                style={{ background: "rgba(245,124,0,0.06)", border: "1px solid rgba(245,124,0,0.2)", color: accent, cursor: "pointer", fontFamily: oswald, letterSpacing: "0.04em" }}>
                                <Icon name="Info" size={13} /> Подробнее
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

    {modalProduct && (
      <ProductModal
        product={modalProduct}
        onClose={() => setModalProduct(null)}
        selectedSize={selectedSizes[modalProduct.id] ?? (modalProduct.sizes?.find(s => s.is_available)?.size_label ?? SIZES_GOST[1])}
        setSelectedSize={s => setSelectedSizes(prev => ({ ...prev, [modalProduct.id]: s }))}
        onAddToCalc={() => {
          setAddProduct(modalProduct.name);
          setAddSize(selectedSizes[modalProduct.id] ?? SIZES_GOST[1]);
          setModalProduct(null);
          scrollTo("#calculator");
        }}
      />
    )}
  </>
  );
}