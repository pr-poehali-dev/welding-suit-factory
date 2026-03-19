import { useState } from "react";
import Icon from "@/components/ui/icon";
import {
  HERO_IMAGE,
  FACTORY_IMAGE,
  PRODUCT_IMAGE,
  PRODUCTS,
  CATEGORIES,
  PAYMENT_OPTIONS,
  VOLUME_DISCOUNTS,
  BASE_PRICES,
  SIZES_GOST,
  SIZE_SURCHARGE,
} from "./constants";

interface CatalogAndCalculatorProps {
  scrollTo: (href: string) => void;
}

// Возвращает скидку от суммы (уже с учётом оплаты)
function getVolumeDiscount(sum: number): number {
  for (const tier of VOLUME_DISCOUNTS) {
    if (sum >= tier.from) return tier.discount;
  }
  return 0;
}

export default function CatalogAndCalculator({ scrollTo }: CatalogAndCalculatorProps) {
  const [activeCategory, setActiveCategory] = useState("Все");

  // Калькулятор
  const [calcProduct, setCalcProduct] = useState("Костюм сварщика КС-01");
  const [calcQty, setCalcQty] = useState(50);
  const [calcSize, setCalcSize] = useState(SIZES_GOST[1]); // 44-46/170-176
  const [calcPayment, setCalcPayment] = useState("prepayment100");
  const [calcCustom, setCalcCustom] = useState(false);

  // Каталог — выбранный размер для каждой карточки
  const [selectedSizes, setSelectedSizes] = useState<Record<number, string>>({});

  const basePrice = BASE_PRICES[calcProduct] || 2800;
  const sizeSurcharge = SIZE_SURCHARGE[calcSize] ?? 0;
  const priceWithSize = basePrice * (1 + sizeSurcharge);

  const paymentOpt = PAYMENT_OPTIONS.find((p) => p.id === calcPayment) ?? PAYMENT_OPTIONS[0];

  // Цена с учётом условия оплаты
  let priceAfterPayment: number;
  if (paymentOpt.id === "preorder30") {
    // −18% от базовой, потом ещё −16% от получившейся суммы
    const after18 = priceWithSize * (1 - 0.18);
    priceAfterPayment = after18 * (1 - 0.16);
  } else {
    priceAfterPayment = priceWithSize * (1 + paymentOpt.modifier);
  }

  // Нанесение логотипа
  const customAdd = calcCustom ? basePrice * 0.15 : 0;
  const pricePerUnitBeforeVolume = Math.round(priceAfterPayment + customAdd);
  const subtotal = pricePerUnitBeforeVolume * calcQty;

  // Скидка от суммы
  const volumeDiscount = getVolumeDiscount(subtotal);
  const totalPrice = Math.round(subtotal * (1 - volumeDiscount));
  const pricePerUnit = Math.round(totalPrice / calcQty);

  const filteredProducts =
    activeCategory === "Все" ? PRODUCTS : PRODUCTS.filter((p) => p.category === activeCategory);

  // Цена в карточке каталога с учётом выбранного размера
  const getCardPrice = (product: typeof PRODUCTS[0], size: string) => {
    const surcharge = SIZE_SURCHARGE[size] ?? 0;
    return Math.round(product.basePrice * (1 + surcharge));
  };

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
            <p style={{ color: "#8a9ab5" }}>Размеры по ГОСТ (размер/рост) · цена зависит от размера</p>
          </div>

          {/* Фильтры */}
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

          {/* Карточки */}
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

                    {/* Выбор размера */}
                    <div className="mb-3">
                      <div className="text-xs mb-1.5 uppercase tracking-wider" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>
                        Размер / Рост (ГОСТ)
                      </div>
                      <select
                        value={currentSize}
                        onChange={(e) => setSelectedSizes((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        className="w-full px-3 py-2 text-xs rounded"
                        style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.25)", color: "#e8e0d0", outline: "none", fontFamily: "'IBM Plex Sans', sans-serif" }}
                      >
                        {SIZES_GOST.map((s) => (
                          <option key={s} value={s}>{s}{SIZE_SURCHARGE[s] > 0 ? ` (+${SIZE_SURCHARGE[s] * 100}%)` : ""}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between py-3" style={{ borderTop: "1px solid rgba(245,124,0,0.1)" }}>
                      <div>
                        <div className="text-xl font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>
                          {cardPrice.toLocaleString("ru-RU")} ₽
                        </div>
                        <div className="text-xs mt-0.5 flex items-center gap-2">
                          <span style={{ color: "#8a9ab5" }}>{p.gost}</span>
                          {surcharge > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(245,124,0,0.15)", color: "#f57c00" }}>
                              +{surcharge * 100}% за размер
                            </span>
                          )}
                        </div>
                      </div>
                      <button className="btn-outline px-4 py-2 text-xs" onClick={() => scrollTo("#contacts")}>
                        Запросить
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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

          <div className="rounded p-6 md:p-8" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)" }}>
            <div className="grid md:grid-cols-2 gap-8">

              {/* Левая колонка — параметры */}
              <div className="space-y-5">

                {/* Изделие */}
                <div>
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-widest" style={{ fontFamily: "'Oswald', sans-serif", color: "#c8bca8" }}>
                    Наименование изделия
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

                {/* Размер */}
                <div>
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-widest" style={{ fontFamily: "'Oswald', sans-serif", color: "#c8bca8" }}>
                    Размер / Рост (ГОСТ)
                  </label>
                  <select
                    value={calcSize}
                    onChange={(e) => setCalcSize(e.target.value)}
                    className="w-full px-4 py-3 text-sm rounded"
                    style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.3)", color: "#e8e0d0", outline: "none", fontFamily: "'IBM Plex Sans', sans-serif" }}
                  >
                    {SIZES_GOST.map((s) => (
                      <option key={s} value={s}>
                        {s}{SIZE_SURCHARGE[s] > 0 ? ` — наценка +${SIZE_SURCHARGE[s] * 100}%` : ""}
                      </option>
                    ))}
                  </select>
                  {sizeSurcharge > 0 && (
                    <div className="mt-1.5 text-xs" style={{ color: "#f57c00" }}>
                      Нестандартный размер: +{sizeSurcharge * 100}% к базовой цене
                    </div>
                  )}
                </div>

                {/* Количество */}
                <div>
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-widest" style={{ fontFamily: "'Oswald', sans-serif", color: "#c8bca8" }}>
                    Количество единиц: <span style={{ color: "#f57c00" }}>{calcQty} шт</span>
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
                </div>

                {/* Условие оплаты */}
                <div>
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-widest" style={{ fontFamily: "'Oswald', sans-serif", color: "#c8bca8" }}>
                    Условие оплаты
                  </label>
                  <div className="space-y-2">
                    {PAYMENT_OPTIONS.map((opt) => (
                      <label
                        key={opt.id}
                        className="flex items-center justify-between gap-3 p-3 rounded cursor-pointer transition-all"
                        style={{
                          background: calcPayment === opt.id ? "rgba(245,124,0,0.1)" : "#0d1117",
                          border: `1px solid ${calcPayment === opt.id ? "rgba(245,124,0,0.4)" : "rgba(255,255,255,0.06)"}`,
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="payment"
                            checked={calcPayment === opt.id}
                            onChange={() => setCalcPayment(opt.id)}
                            style={{ accentColor: "#f57c00" }}
                          />
                          <div>
                            <div className="text-sm" style={{ color: calcPayment === opt.id ? "#e8e0d0" : "#8a9ab5" }}>{opt.label}</div>
                            <div className="text-xs mt-0.5" style={{ color: "#8a9ab5" }}>{opt.desc}</div>
                          </div>
                        </div>
                        <span className="text-xs font-bold ml-auto whitespace-nowrap" style={{
                          color: opt.id === "prepayment100" ? "#8a9ab5"
                            : opt.id === "deferred14" ? "#f87171"
                            : "#4ade80",
                        }}>
                          {opt.id === "prepayment100" && "базовая"}
                          {opt.id === "deferred14" && "+18%"}
                          {opt.id === "preorder14" && "−18%"}
                          {opt.id === "preorder30" && "−18%−16%"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Логотип */}
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded" style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <input
                    type="checkbox"
                    checked={calcCustom}
                    onChange={(e) => setCalcCustom(e.target.checked)}
                    style={{ accentColor: "#f57c00", width: 16, height: 16 }}
                  />
                  <span className="text-sm" style={{ color: "#c8bca8" }}>
                    Нанесение логотипа / персонализация{" "}
                    <span style={{ color: "#f57c00" }}>+15%</span>
                  </span>
                </label>
              </div>

              {/* Правая колонка — итог */}
              <div className="flex flex-col gap-4">
                <div className="rounded p-6 flex-1" style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.15)" }}>
                  <div className="text-xs uppercase tracking-widest mb-5" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>
                    Предварительный расчёт
                  </div>

                  <div className="space-y-0">
                    {[
                      { label: "Изделие", val: calcProduct },
                      { label: "Размер / Рост", val: calcSize },
                      { label: "Количество", val: `${calcQty} шт` },
                      { label: "Базовая цена", val: `${basePrice.toLocaleString("ru-RU")} ₽` },
                      sizeSurcharge > 0
                        ? { label: "Наценка за размер", val: `+${(sizeSurcharge * 100).toFixed(0)}%` }
                        : null,
                      {
                        label: "Условие оплаты",
                        val: paymentOpt.id === "prepayment100" ? "—"
                          : paymentOpt.id === "deferred14" ? "+18%"
                          : paymentOpt.id === "preorder14" ? "−18%"
                          : "−18% и −16%",
                      },
                      calcCustom ? { label: "Логотип", val: "+15%" } : null,
                      {
                        label: "Сумма до скидки",
                        val: `${subtotal.toLocaleString("ru-RU")} ₽`,
                      },
                      volumeDiscount > 0
                        ? { label: "Скидка с суммы", val: `−${(volumeDiscount * 100).toFixed(0)}%`, green: true }
                        : null,
                    ]
                      .filter(Boolean)
                      .map((row) => (
                        <div
                          key={row!.label}
                          className="flex justify-between items-center py-2.5"
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                        >
                          <span className="text-sm" style={{ color: "#8a9ab5" }}>{row!.label}</span>
                          <span
                            className="text-sm font-medium text-right"
                            style={{
                              color: (row as { label: string; val: string; green?: boolean }).green ? "#4ade80" : "#e8e0d0",
                              maxWidth: 180,
                            }}
                          >
                            {row!.val}
                          </span>
                        </div>
                      ))}
                  </div>

                  {/* Порог скидок */}
                  <div className="mt-4 mb-4">
                    <div className="text-xs mb-2" style={{ color: "#8a9ab5" }}>Скидка от суммы заказа:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { from: 500_000, pct: "1%", label: "500 т.р." },
                        { from: 750_000, pct: "2%", label: "750 т.р." },
                        { from: 1_000_000, pct: "5%", label: "1 млн" },
                        { from: 1_500_000, pct: "7%", label: "1.5 млн" },
                        { from: 2_000_000, pct: "10%", label: "2 млн" },
                      ].map((tier) => (
                        <span
                          key={tier.from}
                          className="px-2 py-0.5 text-xs rounded"
                          style={{
                            background: subtotal >= tier.from ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.05)",
                            color: subtotal >= tier.from ? "#4ade80" : "#8a9ab5",
                            border: `1px solid ${subtotal >= tier.from ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.08)"}`,
                            fontFamily: "'Oswald', sans-serif",
                          }}
                        >
                          {tier.label} → {tier.pct}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4" style={{ borderTop: "2px solid rgba(245,124,0,0.3)" }}>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-xs mb-1" style={{ color: "#8a9ab5" }}>Итого за заказ:</div>
                        <div className="text-4xl font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>
                          {totalPrice.toLocaleString("ru-RU")} ₽
                        </div>
                        <div className="text-xs mt-1" style={{ color: "#8a9ab5" }}>без учёта доставки · НДС включён</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs mb-1" style={{ color: "#8a9ab5" }}>Цена за ед.:</div>
                        <div className="text-xl font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#c8bca8" }}>
                          {pricePerUnit.toLocaleString("ru-RU")} ₽
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button className="btn-primary w-full py-4 text-base" onClick={() => scrollTo("#contacts")}>
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