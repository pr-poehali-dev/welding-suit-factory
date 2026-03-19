import { useState } from "react";
import Icon from "@/components/ui/icon";
import {
  HERO_IMAGE,
  FACTORY_IMAGE,
  PRODUCT_IMAGE,
  PRODUCTS,
  CATEGORIES,
  URGENCY_OPTIONS,
  BASE_PRICES,
} from "./constants";

interface CatalogAndCalculatorProps {
  scrollTo: (href: string) => void;
}

export default function CatalogAndCalculator({ scrollTo }: CatalogAndCalculatorProps) {
  const [activeCategory, setActiveCategory] = useState("Все");
  const [calcProduct, setCalcProduct] = useState("Костюм сварщика КС-01");
  const [calcQty, setCalcQty] = useState(50);
  const [calcUrgency, setCalcUrgency] = useState(0);
  const [calcCustom, setCalcCustom] = useState(false);

  const getDiscount = (qty: number) => {
    if (qty >= 500) return 0.2;
    if (qty >= 200) return 0.15;
    if (qty >= 100) return 0.1;
    if (qty >= 50) return 0.05;
    return 0;
  };

  const basePrice = BASE_PRICES[calcProduct] || 2800;
  const discount = getDiscount(calcQty);
  const urgencyMult = URGENCY_OPTIONS[calcUrgency].multiplier;
  const customAdd = calcCustom ? basePrice * 0.15 : 0;
  const pricePerUnit = Math.round((basePrice * (1 - discount) + customAdd) * urgencyMult);
  const totalPrice = pricePerUnit * calcQty;

  const filteredProducts =
    activeCategory === "Все" ? PRODUCTS : PRODUCTS.filter((p) => p.category === activeCategory);

  return (
    <>
      {/* HERO */}
      <section className="relative flex items-center min-h-screen pt-16" style={{ overflow: "hidden" }}>
        <div className="absolute inset-0">
          <img src={HERO_IMAGE} alt="Сварщик" className="w-full h-full object-cover" style={{ opacity: 0.25 }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0d1117 40%, rgba(13,17,23,0.6) 100%)" }} />
          <div className="absolute inset-0" style={{
            backgroundImage: "linear-gradient(rgba(245,124,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(245,124,0,0.04) 1px, transparent 1px)",
            backgroundSize: "60px 60px"
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-20">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6 animate-fade-up">
              <div style={{ width: 40, height: 2, background: "#f57c00" }} />
              <span className="text-sm font-medium tracking-widest uppercase" style={{ color: "#f57c00", fontFamily: "'IBM Plex Sans', sans-serif" }}>
                Производство с 2012 года
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-up-delay-1 leading-none" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
              СПЕЦОДЕЖДА<br />
              <span style={{ color: "#f57c00" }}>ДЛЯ ПРОФИ</span>
            </h1>
            <p className="text-lg md:text-xl mb-8 animate-fade-up-delay-2 max-w-xl" style={{ color: "#8a9ab5", fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.7 }}>
              Костюмы сварщика и спецодежда по ГОСТ. Производство полного цикла, собственный пошив. Оптовые поставки от 50 единиц.
            </p>
            <div className="flex flex-wrap gap-4 animate-fade-up-delay-3">
              <button className="btn-primary px-8 py-4 text-base" onClick={() => scrollTo("#catalog")}>
                Смотреть каталог
              </button>
              <button className="btn-outline px-8 py-4 text-base" onClick={() => scrollTo("#calculator")}>
                Рассчитать стоимость
              </button>
            </div>

            <div className="flex flex-wrap gap-8 mt-16 animate-fade-up-delay-4">
              {[
                { val: "13+", label: "лет на рынке" },
                { val: "1 200", label: "единиц в сутки" },
                { val: "500+", label: "клиентов" },
                { val: "18 ГОСТов", label: "сертифицировано" },
              ].map((s) => (
                <div key={s.val}>
                  <div className="text-3xl font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>{s.val}</div>
                  <div className="text-sm mt-1" style={{ color: "#8a9ab5" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32" style={{ background: "linear-gradient(transparent, #0d1117)" }} />
      </section>

      {/* О ФАБРИКЕ */}
      <section id="about" className="py-24" style={{ background: "#0d1117" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div style={{ width: 32, height: 2, background: "#f57c00" }} />
                <span className="text-sm tracking-widest uppercase" style={{ color: "#f57c00" }}>О фабрике</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
                КАЧЕСТВО —<br />НАШ СТАНДАРТ
              </h2>
              <p className="mb-5 leading-relaxed" style={{ color: "#8a9ab5" }}>
                «СпецНаз» — швейная фабрика полного производственного цикла. Мы специализируемся на выпуске костюмов сварщика и спецодежды для промышленных предприятий России и стран СНГ.
              </p>
              <p className="mb-8 leading-relaxed" style={{ color: "#8a9ab5" }}>
                Собственные пошивочные цеха площадью 4 500 м², современное оборудование и опытный персонал позволяют выпускать до 1 200 изделий в сутки с соблюдением всех стандартов качества.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: "Factory", text: "Собственное производство" },
                  { icon: "ShieldCheck", text: "Соответствие ГОСТ" },
                  { icon: "Users", text: "220 сотрудников" },
                  { icon: "Truck", text: "Доставка по России" },
                ].map((f) => (
                  <div key={f.text} className="flex items-center gap-3 p-3 rounded" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.1)" }}>
                    <Icon name={f.icon} size={18} style={{ color: "#f57c00" }} />
                    <span className="text-sm" style={{ color: "#c8bca8" }}>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <img src={FACTORY_IMAGE} alt="Производство" className="w-full rounded" style={{ aspectRatio: "4/3", objectFit: "cover", border: "1px solid rgba(245,124,0,0.2)" }} />
              <div className="absolute -bottom-4 -left-4 p-4 rounded" style={{ background: "#f57c00", color: "#0d1117" }}>
                <div className="text-3xl font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>2012</div>
                <div className="text-xs font-semibold uppercase tracking-wide">год основания</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* КАТАЛОГ */}
      <section id="catalog" className="py-24" style={{ background: "#0d1117" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div style={{ width: 32, height: 2, background: "#f57c00" }} />
              <span className="text-sm tracking-widest uppercase" style={{ color: "#f57c00" }}>Продукция</span>
              <div style={{ width: 32, height: 2, background: "#f57c00" }} />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
              КАТАЛОГ СПЕЦОДЕЖДЫ
            </h2>
            <p style={{ color: "#8a9ab5" }}>Цены указаны для оптовых заказов от 50 единиц</p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center mb-10">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="px-5 py-2 text-sm transition-all"
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  letterSpacing: "0.05em",
                  background: activeCategory === cat ? "#f57c00" : "transparent",
                  color: activeCategory === cat ? "#0d1117" : "#8a9ab5",
                  border: `1px solid ${activeCategory === cat ? "#f57c00" : "rgba(138,154,181,0.3)"}`,
                  cursor: "pointer",
                  borderRadius: 2,
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((p) => (
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
                  <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>{p.name}</h3>
                  <p className="text-sm mb-3 leading-relaxed" style={{ color: "#8a9ab5" }}>{p.desc}</p>
                  <div className="flex items-center justify-between py-3" style={{ borderTop: "1px solid rgba(245,124,0,0.1)" }}>
                    <div>
                      <div className="text-xl font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>{p.price}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#8a9ab5" }}>{p.gost}</div>
                    </div>
                    <button className="btn-outline px-4 py-2 text-xs" onClick={() => scrollTo("#contacts")}>
                      Запросить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* КАЛЬКУЛЯТОР */}
      <section id="calculator" className="py-24" style={{ background: "#0a0e14" }}>
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div style={{ width: 32, height: 2, background: "#f57c00" }} />
              <span className="text-sm tracking-widest uppercase" style={{ color: "#f57c00" }}>Онлайн-калькулятор</span>
              <div style={{ width: 32, height: 2, background: "#f57c00" }} />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
              РАСЧЁТ ОПТОВОГО ЗАКАЗА
            </h2>
            <p style={{ color: "#8a9ab5" }}>Предварительный расчёт. Точную стоимость согласуем в КП</p>
          </div>

          <div className="rounded p-8" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)" }}>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ fontFamily: "'Oswald', sans-serif", color: "#c8bca8", letterSpacing: "0.05em" }}>
                    НАИМЕНОВАНИЕ ИЗДЕЛИЯ
                  </label>
                  <select
                    value={calcProduct}
                    onChange={(e) => setCalcProduct(e.target.value)}
                    className="w-full px-4 py-3 text-sm rounded"
                    style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.3)", color: "#e8e0d0", outline: "none", fontFamily: "'IBM Plex Sans', sans-serif" }}
                  >
                    {Object.keys(BASE_PRICES).map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ fontFamily: "'Oswald', sans-serif", color: "#c8bca8", letterSpacing: "0.05em" }}>
                    КОЛИЧЕСТВО ЕДИНИЦ: <span style={{ color: "#f57c00" }}>{calcQty}</span>
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={1000}
                    step={10}
                    value={calcQty}
                    onChange={(e) => setCalcQty(Number(e.target.value))}
                    className="w-full"
                    style={{ accentColor: "#f57c00" }}
                  />
                  <div className="flex justify-between text-xs mt-1" style={{ color: "#8a9ab5" }}>
                    <span>10 шт</span>
                    <span>1000 шт</span>
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {[
                      { from: 50, label: "−5%" },
                      { from: 100, label: "−10%" },
                      { from: 200, label: "−15%" },
                      { from: 500, label: "−20%" },
                    ].map((d) => (
                      <span key={d.from} className="px-2 py-0.5 text-xs rounded" style={{
                        background: calcQty >= d.from ? "rgba(245,124,0,0.2)" : "rgba(255,255,255,0.05)",
                        color: calcQty >= d.from ? "#f57c00" : "#8a9ab5",
                        border: `1px solid ${calcQty >= d.from ? "rgba(245,124,0,0.4)" : "rgba(255,255,255,0.08)"}`,
                        fontFamily: "'Oswald', sans-serif",
                      }}>
                        от {d.from} шт {d.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ fontFamily: "'Oswald', sans-serif", color: "#c8bca8", letterSpacing: "0.05em" }}>
                    СРОК ПРОИЗВОДСТВА
                  </label>
                  <div className="space-y-2">
                    {URGENCY_OPTIONS.map((opt, i) => (
                      <label key={i} className="flex items-center gap-3 p-3 rounded cursor-pointer transition-all" style={{
                        background: calcUrgency === i ? "rgba(245,124,0,0.1)" : "#0d1117",
                        border: `1px solid ${calcUrgency === i ? "rgba(245,124,0,0.4)" : "rgba(255,255,255,0.06)"}`,
                      }}>
                        <input
                          type="radio"
                          name="urgency"
                          checked={calcUrgency === i}
                          onChange={() => setCalcUrgency(i)}
                          style={{ accentColor: "#f57c00" }}
                        />
                        <span className="text-sm" style={{ color: calcUrgency === i ? "#e8e0d0" : "#8a9ab5" }}>{opt.label}</span>
                        {opt.multiplier > 1 && (
                          <span className="ml-auto text-xs" style={{ color: "#f57c00" }}>×{opt.multiplier}</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={calcCustom}
                    onChange={(e) => setCalcCustom(e.target.checked)}
                    style={{ accentColor: "#f57c00", width: 16, height: 16 }}
                  />
                  <span className="text-sm" style={{ color: "#c8bca8" }}>Нанесение логотипа / персонализация <span style={{ color: "#f57c00" }}>+15%</span></span>
                </label>
              </div>

              <div className="flex flex-col justify-between">
                <div className="rounded p-6 flex-1" style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.15)" }}>
                  <div className="text-sm uppercase tracking-widest mb-6" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>
                    Предварительный расчёт
                  </div>

                  <div className="space-y-0">
                    {[
                      { label: "Изделие", val: calcProduct, highlight: false },
                      { label: "Количество", val: `${calcQty} шт`, highlight: false },
                      { label: "Скидка за опт", val: discount > 0 ? `−${(discount * 100).toFixed(0)}%` : "нет", highlight: discount > 0 },
                      { label: "Срок", val: URGENCY_OPTIONS[calcUrgency].label.split("—")[1]?.trim() ?? "", highlight: false },
                      { label: "Цена за единицу", val: `${pricePerUnit.toLocaleString("ru-RU")} ₽`, highlight: true },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between items-center py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <span className="text-sm" style={{ color: "#8a9ab5" }}>{row.label}</span>
                        <span className="text-sm font-medium text-right max-w-44" style={{ color: row.highlight ? "#f57c00" : "#e8e0d0" }}>{row.val}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-4" style={{ borderTop: "2px solid rgba(245,124,0,0.3)" }}>
                    <div className="text-sm mb-1" style={{ color: "#8a9ab5" }}>Итого за заказ:</div>
                    <div className="text-4xl font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>
                      {totalPrice.toLocaleString("ru-RU")} ₽
                    </div>
                    <div className="text-xs mt-1" style={{ color: "#8a9ab5" }}>без учёта доставки · НДС включён</div>
                  </div>
                </div>

                <button className="btn-primary w-full py-4 text-base mt-4" onClick={() => scrollTo("#contacts")}>
                  Запросить точное КП
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
