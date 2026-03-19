import { PRODUCT_IMAGE, PRODUCTS, CATEGORIES, SIZES_GOST, SIZE_SURCHARGE } from "./constants";

interface CatalogSectionProps {
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  selectedSizes: Record<number, string>;
  setSelectedSizes: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  setAddProduct: (product: string) => void;
  setAddSize: (size: string) => void;
  scrollTo: (href: string) => void;
}

export default function CatalogSection({
  activeCategory,
  setActiveCategory,
  selectedSizes,
  setSelectedSizes,
  setAddProduct,
  setAddSize,
  scrollTo,
}: CatalogSectionProps) {
  const filteredProducts =
    activeCategory === "Все" ? PRODUCTS : PRODUCTS.filter((p) => p.category === activeCategory);

  const getCardPrice = (product: typeof PRODUCTS[0], size: string) => {
    const surcharge = SIZE_SURCHARGE[size] ?? 0;
    return Math.round(product.basePrice * (1 + surcharge));
  };

  return (
    <section id="catalog" className="py-24" style={{ background: "#0d1117" }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div style={{ width: 32, height: 2, background: "#f57c00" }} />
            <span className="text-sm tracking-widest uppercase" style={{ color: "#f57c00" }}>Продукция</span>
            <div style={{ width: 32, height: 2, background: "#f57c00" }} />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>КАТАЛОГ СПЕЦОДЕЖДЫ</h2>
          <p style={{ color: "#8a9ab5" }}>Размеры по ГОСТ (размер/рост) · цена зависит от размера</p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className="px-5 py-2 text-sm transition-all" style={{
              fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em",
              background: activeCategory === cat ? "#f57c00" : "transparent",
              color: activeCategory === cat ? "#0d1117" : "#8a9ab5",
              border: `1px solid ${activeCategory === cat ? "#f57c00" : "rgba(138,154,181,0.3)"}`,
              cursor: "pointer", borderRadius: 2,
            }}>{cat}</button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((p) => {
            const currentSize = selectedSizes[p.id] ?? SIZES_GOST[1];
            const cardPrice = getCardPrice(p, currentSize);
            const surcharge = SIZE_SURCHARGE[currentSize] ?? 0;
            return (
              <div key={p.id} className="product-card rounded overflow-hidden" style={{ background: "#13181f" }}>
                <div className="relative">
                  <img src={PRODUCT_IMAGE} alt={p.name} className="w-full h-52 object-cover" />
                  {p.badge && (
                    <div className="absolute top-3 left-3 px-2 py-1 text-xs font-bold uppercase" style={{ background: "#f57c00", color: "#0d1117", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.06em" }}>
                      {p.badge}
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="text-xs mb-2 font-medium" style={{ color: "#f57c00", letterSpacing: "0.04em" }}>{p.category}</div>
                  <h3 className="text-lg font-bold mb-1" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>{p.name}</h3>
                  <p className="text-sm mb-3 leading-relaxed" style={{ color: "#8a9ab5" }}>{p.desc}</p>
                  <div className="mb-3">
                    <div className="text-xs mb-1.5 uppercase tracking-wider" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Размер / Рост (ГОСТ)</div>
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
                  <div className="flex items-center justify-between py-3" style={{ borderTop: "1px solid rgba(245,124,0,0.1)" }}>
                    <div>
                      <div className="text-xl font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>{cardPrice.toLocaleString("ru-RU")} ₽</div>
                      <div className="text-xs mt-0.5 flex items-center gap-2">
                        <span style={{ color: "#8a9ab5" }}>{p.gost}</span>
                        {surcharge > 0 && <span className="px-1.5 py-0.5 rounded" style={{ background: "rgba(245,124,0,0.15)", color: "#f57c00", fontSize: 11 }}>+{surcharge * 100}%</span>}
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
      </div>
    </section>
  );
}
