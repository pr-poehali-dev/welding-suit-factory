import { useEffect, useState } from "react";
import { SIZES_GOST } from "./constants";
import CatalogTree, { CatalogPath } from "./CatalogTree";
import { CatalogNode } from "./constants";
import Icon from "@/components/ui/icon";
import { API, ApiProduct, accent, muted, oswald } from "./catalogTypes";
import ProductModal from "./ProductModal";
import ProductCard from "./ProductCard";

interface CatalogSectionProps {
  catalogPath: CatalogPath;
  setCatalogPath: (path: CatalogPath) => void;
  selectedSizes: Record<number, string>;
  setSelectedSizes: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  setAddProduct: (product: string) => void;
  setAddSize: (size: string) => void;
  scrollTo: (href: string) => void;
}

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

  const filteredProducts = (showProducts && leaf?.categoryTag
    ? allProducts.filter(p => p.category === leaf.categoryTag)
    : allProducts
  ).slice().sort((a, b) => {
    const aHasOrder = a.sort_order > 0;
    const bHasOrder = b.sort_order > 0;
    if (aHasOrder && bHasOrder) return a.sort_order - b.sort_order;
    if (aHasOrder) return -1;
    if (bHasOrder) return 1;
    return a.base_price - b.base_price;
  });

  return (
    <>
    <section id="catalog" className="py-24" style={{ background: "#0d1117" }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8">

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

        <div className="flex gap-8 flex-col lg:flex-row">

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
                    {filteredProducts.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        currentSize={selectedSizes[p.id] ?? SIZES_GOST[1]}
                        onSizeChange={(size) => setSelectedSizes(prev => ({ ...prev, [p.id]: size }))}
                        onOpenModal={() => openModal(p)}
                        onAddToCalc={() => {
                          setAddProduct(p.name);
                          setAddSize(selectedSizes[p.id] ?? SIZES_GOST[1]);
                          scrollTo("#calculator");
                        }}
                      />
                    ))}
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