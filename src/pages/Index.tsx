import { useState } from "react";
import Icon from "@/components/ui/icon";

const HERO_IMAGE = "https://cdn.poehali.dev/projects/c9ed5862-2c66-4e7a-985a-adae1a32a552/files/9fb0f06a-0b5f-467c-95b9-aa1d3abaa9ff.jpg";
const FACTORY_IMAGE = "https://cdn.poehali.dev/projects/c9ed5862-2c66-4e7a-985a-adae1a32a552/files/05e81fcb-8945-4a07-afed-088cf76a4c1a.jpg";
const PRODUCT_IMAGE = "https://cdn.poehali.dev/projects/c9ed5862-2c66-4e7a-985a-adae1a32a552/files/3f2a3aec-d043-4d9c-9fd7-97ee66727a80.jpg";

const NAV_LINKS = [
  { label: "О фабрике", href: "#about" },
  { label: "Каталог", href: "#catalog" },
  { label: "Производство", href: "#production" },
  { label: "Сертификаты", href: "#certificates" },
  { label: "Доставка", href: "#delivery" },
  { label: "Контакты", href: "#contacts" },
];

const PRODUCTS = [
  {
    id: 1,
    name: "Костюм сварщика КС-01",
    desc: "Защита от искр и брызг металла. ГОСТ Р 12.4.250-2019",
    gost: "ГОСТ Р 12.4.250",
    category: "Сварка",
    price: "от 2 800 ₽",
    badge: "Хит продаж",
  },
  {
    id: 2,
    name: "Костюм сварщика «Профи»",
    desc: "Усиленная защита, огнестойкая ткань. Класс защиты II.",
    gost: "ГОСТ Р 12.4.250",
    category: "Сварка",
    price: "от 3 900 ₽",
    badge: null,
  },
  {
    id: 3,
    name: "Куртка рабочая утеплённая",
    desc: "Для работ при низких температурах. Водозащитная пропитка.",
    gost: "ГОСТ 12.4.303-2016",
    category: "Зимняя",
    price: "от 1 950 ₽",
    badge: null,
  },
  {
    id: 4,
    name: "Костюм хлопчатобумажный",
    desc: "Для общих производственных работ. Куртка + брюки.",
    gost: "ГОСТ 12.4.280-2014",
    category: "Общие работы",
    price: "от 890 ₽",
    badge: null,
  },
  {
    id: 5,
    name: "Комбинезон рабочий",
    desc: "Удобная посадка, усиленные колени и локти.",
    gost: "ГОСТ 12.4.280-2014",
    category: "Общие работы",
    price: "от 1 200 ₽",
    badge: "Новинка",
  },
  {
    id: 6,
    name: "Жилет сигнальный",
    desc: "Светоотражающие полосы, 2-й класс защиты.",
    gost: "ГОСТ Р 12.4.219-2002",
    category: "Сигнальная",
    price: "от 450 ₽",
    badge: null,
  },
];

const CATEGORIES = ["Все", "Сварка", "Зимняя", "Общие работы", "Сигнальная"];

const CERTS = [
  { icon: "ShieldCheck", title: "ГОСТ Р 12.4.250-2019", desc: "Защитная одежда сварщика" },
  { icon: "Award", title: "ISO 11612:2015", desc: "Защита от тепла и огня" },
  { icon: "BadgeCheck", title: "ГОСТ 12.4.303-2016", desc: "Одежда сигнальная" },
  { icon: "Stamp", title: "ТР ТС 019/2011", desc: "Технический регламент ТС" },
];

const DELIVERY_ZONES = [
  { zone: "Москва и МО", days: "2–3 дня", cost: "Бесплатно от 50 000 ₽" },
  { zone: "ЦФО", days: "3–5 дней", cost: "по тарифу ТК" },
  { zone: "По России", days: "5–14 дней", cost: "по тарифу ТК" },
  { zone: "СНГ", days: "от 14 дней", cost: "по запросу" },
];

const URGENCY_OPTIONS = [
  { label: "Стандарт — 21 рабочий день", multiplier: 1 },
  { label: "Срочно — 14 рабочих дней", multiplier: 1.2 },
  { label: "Очень срочно — 7 рабочих дней", multiplier: 1.5 },
];

const BASE_PRICES: Record<string, number> = {
  "Костюм сварщика КС-01": 2800,
  "Костюм сварщика «Профи»": 3900,
  "Куртка рабочая утеплённая": 1950,
  "Костюм хлопчатобумажный": 890,
  "Комбинезон рабочий": 1200,
  "Жилет сигнальный": 450,
};

export default function Index() {
  const [activeCategory, setActiveCategory] = useState("Все");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "#0d1117", color: "#e8e0d0" }}>

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ background: "rgba(13,17,23,0.95)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(245,124,0,0.2)" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center" style={{ background: "#f57c00" }}>
              <Icon name="Flame" size={18} style={{ color: "#0d1117" }} />
            </div>
            <div>
              <div className="font-bold text-lg leading-none" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00", letterSpacing: "0.1em" }}>
                СПЕЦПРОМ
              </div>
              <div className="text-xs" style={{ color: "#8a9ab5", letterSpacing: "0.05em" }}>Швейная фабрика</div>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <button
                key={l.href}
                onClick={() => scrollTo(l.href)}
                className="nav-link text-sm font-medium"
                style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: "#c8bca8", background: "none", border: "none", cursor: "pointer" }}
              >
                {l.label}
              </button>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <a href="tel:+78001234567" className="flex items-center gap-2 text-sm font-medium" style={{ color: "#e8e0d0" }}>
              <Icon name="Phone" size={14} />
              8 800 123-45-67
            </a>
            <button className="btn-primary px-4 py-2 text-sm" onClick={() => scrollTo("#contacts")}>
              Получить КП
            </button>
          </div>

          <button className="lg:hidden" style={{ background: "none", border: "none", color: "#e8e0d0", cursor: "pointer" }} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <Icon name={mobileMenuOpen ? "X" : "Menu"} size={24} />
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden px-4 pb-4" style={{ borderTop: "1px solid rgba(245,124,0,0.15)", background: "rgba(13,17,23,0.98)" }}>
            {NAV_LINKS.map((l) => (
              <button
                key={l.href}
                onClick={() => scrollTo(l.href)}
                className="block w-full text-left py-3 text-sm"
                style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: "#c8bca8", background: "none", border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}
              >
                {l.label}
              </button>
            ))}
            <button className="btn-primary w-full py-3 mt-3 text-sm" onClick={() => scrollTo("#contacts")}>
              Получить КП
            </button>
          </div>
        )}
      </header>

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
                Производство с 1998 года
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
                { val: "26+", label: "лет на рынке" },
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
                «СпецПром» — швейная фабрика полного производственного цикла. Мы специализируемся на выпуске костюмов сварщика и спецодежды для промышленных предприятий России и стран СНГ.
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
                <div className="text-3xl font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>1998</div>
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

      {/* ПРОИЗВОДСТВО */}
      <section id="production" className="py-24" style={{ background: "#0d1117" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div style={{ width: 32, height: 2, background: "#f57c00" }} />
            <span className="text-sm tracking-widest uppercase" style={{ color: "#f57c00" }}>Производство</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-16" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
            КАК МЫ РАБОТАЕМ
          </h2>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              {[
                { n: "01", title: "Раскрой ткани", desc: "Автоматизированные раскройные комплексы. Точность ±1 мм. Минимум отходов." },
                { n: "02", title: "Пошив изделий", desc: "50 промышленных машин. Специальные швы для защитной одежды согласно ГОСТ." },
                { n: "03", title: "Контроль качества", desc: "Многоступенчатая проверка на каждом этапе. ОТК с 25-летним опытом." },
                { n: "04", title: "Маркировка и упаковка", desc: "Индивидуальная упаковка, штрих-коды, паспорт изделия, сертификаты." },
              ].map((step, i) => (
                <div key={step.n} className="flex gap-6 pb-8 relative" style={{ paddingLeft: 52 }}>
                  {i < 3 && <div className="absolute left-5 top-10 bottom-0 w-px" style={{ background: "rgba(245,124,0,0.2)" }} />}
                  <div className="absolute left-0 top-0 w-10 h-10 flex items-center justify-center text-sm font-bold" style={{ background: "#f57c00", color: "#0d1117", fontFamily: "'Oswald', sans-serif", borderRadius: 2 }}>
                    {step.n}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>{step.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#8a9ab5" }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: "Scissors", title: "4 500 м²", desc: "Площадь цехов" },
                { icon: "Zap", title: "1 200 шт", desc: "Изделий в сутки" },
                { icon: "Settings", title: "50+", desc: "Единиц оборудования" },
                { icon: "Clock", title: "21 день", desc: "Стандартный срок" },
              ].map((s) => (
                <div key={s.title} className="p-6 rounded text-center" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.1)" }}>
                  <Icon name={s.icon} size={28} style={{ color: "#f57c00", margin: "0 auto 12px" }} />
                  <div className="text-2xl font-bold mb-1" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>{s.title}</div>
                  <div className="text-xs" style={{ color: "#8a9ab5" }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* СЕРТИФИКАТЫ */}
      <section id="certificates" className="py-24" style={{ background: "#0a0e14" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div style={{ width: 32, height: 2, background: "#f57c00" }} />
              <span className="text-sm tracking-widest uppercase" style={{ color: "#f57c00" }}>Соответствие стандартам</span>
              <div style={{ width: 32, height: 2, background: "#f57c00" }} />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
              СЕРТИФИКАТЫ И ГОСТ
            </h2>
            <p style={{ color: "#8a9ab5" }}>Вся продукция сертифицирована и соответствует российским и международным стандартам</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {CERTS.map((c) => (
              <div key={c.title} className="p-6 rounded text-center" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.1)" }}>
                <div className="w-14 h-14 rounded flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(245,124,0,0.1)" }}>
                  <Icon name={c.icon} size={28} style={{ color: "#f57c00" }} />
                </div>
                <div className="font-bold mb-2" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff", fontSize: 15 }}>{c.title}</div>
                <div className="text-sm" style={{ color: "#8a9ab5" }}>{c.desc}</div>
              </div>
            ))}
          </div>

          <div className="p-6 rounded flex flex-wrap items-center gap-4 justify-between" style={{ background: "rgba(245,124,0,0.08)", border: "1px solid rgba(245,124,0,0.25)" }}>
            <div className="flex items-center gap-4">
              <Icon name="FileText" size={32} style={{ color: "#f57c00" }} />
              <div>
                <div className="font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>Полный пакет документов</div>
                <div className="text-sm" style={{ color: "#8a9ab5" }}>Сертификаты, декларации соответствия, паспорта изделий — прилагаются к каждой партии</div>
              </div>
            </div>
            <button className="btn-outline px-6 py-3 text-sm whitespace-nowrap" onClick={() => scrollTo("#contacts")}>
              Запросить документы
            </button>
          </div>
        </div>
      </section>

      {/* ДОСТАВКА */}
      <section id="delivery" className="py-24" style={{ background: "#0d1117" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div style={{ width: 32, height: 2, background: "#f57c00" }} />
            <span className="text-sm tracking-widest uppercase" style={{ color: "#f57c00" }}>Логистика</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
            УСЛОВИЯ ДОСТАВКИ
          </h2>
          <p className="mb-12 max-w-xl" style={{ color: "#8a9ab5" }}>
            Работаем с ведущими транспортными компаниями. Самовывоз из Москвы. Возможна доставка силами заказчика.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {DELIVERY_ZONES.map((z) => (
              <div key={z.zone} className="p-6 rounded" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.1)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="MapPin" size={16} style={{ color: "#f57c00" }} />
                  <span className="font-bold text-sm" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>{z.zone}</span>
                </div>
                <div className="text-2xl font-bold mb-1" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>{z.days}</div>
                <div className="text-xs" style={{ color: "#8a9ab5" }}>{z.cost}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "Package", title: "Упаковка", desc: "Полиэтиленовые пакеты + картонные коробки. Каждое изделие упаковано индивидуально." },
              { icon: "ClipboardCheck", title: "Сопроводительные документы", desc: "Накладная, счёт-фактура, сертификаты соответствия прилагаются к каждой отгрузке." },
              { icon: "RefreshCw", title: "Возврат и замена", desc: "Гарантия качества 12 месяцев. Брак заменяем в течение 10 рабочих дней." },
            ].map((f) => (
              <div key={f.title} className="flex gap-4 p-5 rounded" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.1)" }}>
                <div className="w-10 h-10 flex items-center justify-center rounded flex-shrink-0" style={{ background: "rgba(245,124,0,0.1)" }}>
                  <Icon name={f.icon} size={20} style={{ color: "#f57c00" }} />
                </div>
                <div>
                  <div className="font-bold mb-1" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>{f.title}</div>
                  <div className="text-sm leading-relaxed" style={{ color: "#8a9ab5" }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* КОНТАКТЫ */}
      <section id="contacts" className="py-24" style={{ background: "#0a0e14" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-2 gap-16">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div style={{ width: 32, height: 2, background: "#f57c00" }} />
                <span className="text-sm tracking-widest uppercase" style={{ color: "#f57c00" }}>Связаться с нами</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
                ЗАПРОСИТЬ<br />КОММЕРЧЕСКОЕ<br />ПРЕДЛОЖЕНИЕ
              </h2>
              <p className="mb-8 leading-relaxed" style={{ color: "#8a9ab5" }}>
                Оставьте заявку — наш менеджер свяжется с вами в течение 2 часов. Подготовим КП с точными ценами, сроками и условиями доставки.
              </p>

              <div className="space-y-4">
                {[
                  { icon: "Phone", label: "Телефон", val: "8 800 123-45-67 (бесплатно)", href: "tel:+78001234567" },
                  { icon: "Mail", label: "Email", val: "zakaz@specprom.ru", href: "mailto:zakaz@specprom.ru" },
                  { icon: "MapPin", label: "Адрес", val: "г. Москва, ул. Промышленная, 12", href: null },
                  { icon: "Clock", label: "Режим работы", val: "Пн–Пт: 9:00–18:00", href: null },
                ].map((c) => (
                  <div key={c.label} className="flex items-start gap-4">
                    <div className="w-10 h-10 flex items-center justify-center rounded flex-shrink-0" style={{ background: "rgba(245,124,0,0.1)" }}>
                      <Icon name={c.icon} size={18} style={{ color: "#f57c00" }} />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "#8a9ab5" }}>{c.label}</div>
                      {c.href ? (
                        <a href={c.href} className="font-medium hover:underline" style={{ color: "#e8e0d0" }}>{c.val}</a>
                      ) : (
                        <span className="font-medium" style={{ color: "#e8e0d0" }}>{c.val}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded p-8" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)" }}>
              <h3 className="text-2xl font-bold mb-6" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
                ЗАЯВКА НА КП
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Наименование организации</label>
                  <input type="text" placeholder="ООО «Металлургический завод»" className="w-full px-4 py-3 rounded text-sm" style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.2)", color: "#e8e0d0", outline: "none", fontFamily: "'IBM Plex Sans', sans-serif" }} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Контактное лицо</label>
                    <input type="text" placeholder="Иван Иванов" className="w-full px-4 py-3 rounded text-sm" style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.2)", color: "#e8e0d0", outline: "none", fontFamily: "'IBM Plex Sans', sans-serif" }} />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Телефон</label>
                    <input type="tel" placeholder="+7 (___) ___-__-__" className="w-full px-4 py-3 rounded text-sm" style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.2)", color: "#e8e0d0", outline: "none", fontFamily: "'IBM Plex Sans', sans-serif" }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Что требуется</label>
                  <textarea rows={3} placeholder="Укажите наименование, количество, требования к изделиям..." className="w-full px-4 py-3 rounded text-sm resize-none" style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.2)", color: "#e8e0d0", outline: "none", fontFamily: "'IBM Plex Sans', sans-serif" }} />
                </div>
                <button className="btn-primary w-full py-4 text-base mt-2">
                  Отправить заявку
                </button>
                <p className="text-xs text-center" style={{ color: "#8a9ab5" }}>
                  Нажимая кнопку, вы соглашаетесь с политикой обработки персональных данных
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8" style={{ background: "#080c11", borderTop: "1px solid rgba(245,124,0,0.15)" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 flex items-center justify-center" style={{ background: "#f57c00" }}>
              <Icon name="Flame" size={14} style={{ color: "#0d1117" }} />
            </div>
            <span className="font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00", letterSpacing: "0.1em" }}>СПЕЦПРОМ</span>
            <span className="text-sm" style={{ color: "#8a9ab5" }}>© 2024. Все права защищены</span>
          </div>
          <div className="flex flex-wrap gap-6">
            {NAV_LINKS.map((l) => (
              <button key={l.href} onClick={() => scrollTo(l.href)} className="text-sm" style={{ color: "#8a9ab5", background: "none", border: "none", cursor: "pointer" }}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
