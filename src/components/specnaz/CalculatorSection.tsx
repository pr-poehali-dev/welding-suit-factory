import { useState } from "react";
import Icon from "@/components/ui/icon";
import { PAYMENT_OPTIONS, VOLUME_DISCOUNTS } from "./constants";

const SEND_API = "https://functions.poehali.dev/7b81d36e-be04-4b5e-828d-eab1f6a6a992";

export interface ProductSizeData {
  size_label: string;
  price_add: number;
  is_available: boolean;
}

export interface CartItem {
  id: string;
  product: string;
  size: string;
  qty: number;
}

export function getVolumeDiscount(sum: number): number {
  for (const tier of VOLUME_DISCOUNTS) {
    if (sum >= tier.from) return tier.discount;
  }
  return 0;
}

function getPriceAdd(product: string, size: string, productSizes: Record<string, ProductSizeData[]>): number {
  const sizes = productSizes[product] || [];
  return sizes.find(s => s.size_label === size)?.price_add ?? 0;
}

export function calcItemPrice(product: string, size: string, payment: string, withLogo: boolean, basePrices: Record<string, number>, productSizes: Record<string, ProductSizeData[]>): number {
  const base = basePrices[product] ?? 0;
  const priceAdd = getPriceAdd(product, size, productSizes);
  const fullBase = base + priceAdd;

  const payOpt = PAYMENT_OPTIONS.find((p) => p.id === payment) ?? PAYMENT_OPTIONS[0];
  let priceAfterPayment: number;

  if (payOpt.id === "preorder30") {
    priceAfterPayment = fullBase * (1 - 0.018) * (1 - 0.016);
  } else if (payOpt.sign === 1 && payOpt.steps > 0) {
    priceAfterPayment = fullBase * Math.pow(1.018, payOpt.steps);
  } else if (payOpt.sign === -1 && payOpt.id === "preorder14") {
    priceAfterPayment = fullBase * (1 - 0.018);
  } else {
    priceAfterPayment = fullBase;
  }

  const logoAdd = withLogo ? base * 0.15 : 0;
  return Math.round(priceAfterPayment + logoAdd);
}

interface CalculatorSectionProps {
  payment: string;
  setPayment: (val: string) => void;
  withLogo: boolean;
  setWithLogo: (val: boolean) => void;
  cart: CartItem[];
  addProduct: string;
  setAddProduct: (val: string) => void;
  addSize: string;
  setAddSize: (val: string) => void;
  addQty: number;
  setAddQty: (val: number) => void;
  addToCart: () => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  updateSize: (id: string, size: string) => void;
  scrollTo: (href: string) => void;
  basePrices: Record<string, number>;
  productNames: string[];
  productSizes: Record<string, ProductSizeData[]>;
}

export default function CalculatorSection({
  payment, setPayment,
  withLogo, setWithLogo,
  cart,
  addProduct, setAddProduct,
  addSize, setAddSize,
  addQty, setAddQty,
  addToCart,
  removeFromCart,
  updateQty,
  updateSize,
  scrollTo,
  basePrices,
  productNames,
  productSizes,
}: CalculatorSectionProps) {
  const currentProductSizes = productSizes[addProduct] || [];
  const [showModal, setShowModal] = useState(false);
  const [mOrg, setMOrg] = useState("");
  const [mContact, setMContact] = useState("");
  const [mPhone, setMPhone] = useState("");
  const [mEmail, setMEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [mError, setMError] = useState("");

  const handleSendOrder = async () => {
    if (!mPhone.trim()) { setMError("Укажите телефон"); return; }
    setSending(true);
    setMError("");
    const payLabel = PAYMENT_OPTIONS.find(p => p.id === payment)?.label ?? payment;
    try {
      await fetch(SEND_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "order",
          org: mOrg,
          contact: mContact,
          phone: mPhone,
          email: mEmail,
          payment: payLabel,
          withLogo,
          subtotal,
          volumeDiscount,
          total: totalPrice,
          items: cartRows.map(r => ({ product: r.product, size: r.size, qty: r.qty, unitPriceFull: r.unitPrice, unitPrice: r.finalUnit, lineTotal: r.finalLine, saving: r.lineSaving })),
        }),
      });
      setSent(true);
    } catch {
      setMError("Ошибка отправки. Позвоните нам напрямую.");
    }
    setSending(false);
  };

  const rawRows = cart.map((item) => {
    const unitPrice = calcItemPrice(item.product, item.size, payment, withLogo, basePrices, productSizes);
    return { ...item, unitPrice, lineTotal: unitPrice * item.qty };
  });
  const subtotal = rawRows.reduce((s, r) => s + r.lineTotal, 0);
  const totalQty = cart.reduce((s, r) => s + r.qty, 0);
  const volumeDiscount = getVolumeDiscount(subtotal);
  const discountAmount = Math.round(subtotal * volumeDiscount);
  const totalPrice = subtotal - discountAmount;
  const cartRows = rawRows.map(r => {
    const finalUnit = Math.round(r.unitPrice * (1 - volumeDiscount));
    const finalLine = finalUnit * r.qty;
    const lineSaving = r.lineTotal - finalLine;
    return { ...r, finalUnit, finalLine, lineSaving };
  });

  return (
    <>
    <section id="calculator" className="py-24" style={{ background: "#0a0e14" }}>
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div style={{ width: 32, height: 2, background: "#f57c00" }} />
            <span className="text-sm tracking-widest uppercase" style={{ color: "#f57c00" }}>Калькулятор заказа</span>
            <div style={{ width: 32, height: 2, background: "#f57c00" }} />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>РАСЧЁТ ОПТОВОГО ЗАКАЗА</h2>
          <p style={{ color: "#8a9ab5" }}>Добавляйте несколько артикулов и размеров — калькулятор посчитает итог</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Левая панель: условия + добавление позиции */}
          <div className="lg:col-span-1 space-y-5">

            {/* Условие оплаты */}
            <div className="rounded p-5" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)" }}>
              <div className="text-xs uppercase tracking-widest mb-4" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Условие оплаты</div>
              <div className="space-y-2">
                {PAYMENT_OPTIONS.map((opt) => (
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
                    <span className="text-xs font-bold ml-auto whitespace-nowrap" style={{
                      color: opt.id === "prepayment100" ? "#8a9ab5"
                        : opt.sign === 1 ? "#f87171"
                        : "#4ade80",
                    }}>
                      {opt.id === "prepayment100" && "базовая"}
                      {opt.id === "deferred14"    && "+1.8%"}
                      {opt.id === "deferred30"    && "+3.63%"}
                      {opt.id === "deferred60"    && "+5.49%"}
                      {opt.id === "preorder14"    && "−1.8%"}
                      {opt.id === "preorder30"    && "−3.36%"}
                    </span>
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
                  <select value={addSize} onChange={(e) => setAddSize(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded" style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.3)", color: "#e8e0d0", outline: "none" }}>
                    {currentProductSizes.map((s) => (
                      <option key={s.size_label} value={s.size_label}>
                        {s.size_label}{s.price_add > 0 ? ` (+${s.price_add} ₽)` : ""}
                      </option>
                    ))}
                  </select>
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

          {/* Правая панель: корзина + итог */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Таблица позиций */}
            <div className="rounded overflow-hidden" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)" }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(245,124,0,0.15)" }}>
                <div className="text-xs uppercase tracking-widest" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>
                  Позиции заказа
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="ShoppingCart" size={16} style={{ color: "#f57c00" }} />
                  <span className="text-sm font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>{cart.length} поз.</span>
                </div>
              </div>

              {cart.length === 0 ? (
                <div className="px-5 py-10 text-center" style={{ color: "#8a9ab5" }}>
                  <Icon name="ShoppingCart" size={36} style={{ color: "rgba(138,154,181,0.3)", margin: "0 auto 12px" }} />
                  <div className="text-sm">Добавьте позиции из каталога или формы слева</div>
                </div>
              ) : (
                <div>
                  {/* Заголовок таблицы */}
                  <div className="hidden md:grid grid-cols-12 px-5 py-2 text-xs uppercase tracking-wider" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="col-span-4">Артикул</div>
                    <div className="col-span-3">Размер</div>
                    <div className="col-span-2 text-center">Кол-во</div>
                    <div className="col-span-2 text-right">Сумма</div>
                    <div className="col-span-1" />
                  </div>

                  {cartRows.map((item, idx) => (
                    <div
                      key={item.id}
                      className="px-5 py-3 grid grid-cols-12 gap-2 items-center"
                      style={{ borderBottom: idx < cartRows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                    >
                      {/* Артикул */}
                      <div className="col-span-12 md:col-span-4">
                        <div className="text-sm font-medium" style={{ color: "#e8e0d0" }}>{item.product}</div>
                        <div className="text-xs mt-0.5 flex items-center gap-2">
                          <span style={{ color: "#f57c00" }}>{item.finalUnit.toLocaleString("ru-RU")} ₽/шт</span>
                          {volumeDiscount > 0 && (
                            <span style={{ color: "#8a9ab5", textDecoration: "line-through", fontSize: 10 }}>{item.unitPrice.toLocaleString("ru-RU")}</span>
                          )}
                        </div>
                      </div>

                      {/* Размер */}
                      <div className="col-span-6 md:col-span-3">
                        <select
                          value={item.size}
                          onChange={(e) => updateSize(item.id, e.target.value)}
                          className="w-full px-2 py-1.5 text-xs rounded"
                          style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.2)", color: "#e8e0d0", outline: "none" }}
                        >
                          {(productSizes[item.product] || []).map((s) => (
                            <option key={s.size_label} value={s.size_label}>
                              {s.size_label}{s.price_add > 0 ? ` (+${s.price_add} ₽)` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Количество */}
                      <div className="col-span-3 md:col-span-2 flex items-center justify-center gap-1">
                        <button
                          onClick={() => updateQty(item.id, item.qty - 1)}
                          className="w-6 h-6 flex items-center justify-center rounded text-xs"
                          style={{ background: "rgba(245,124,0,0.15)", color: "#f57c00", border: "none", cursor: "pointer" }}
                        >−</button>
                        <span className="text-sm font-medium w-8 text-center" style={{ color: "#e8e0d0" }}>{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.id, item.qty + 1)}
                          className="w-6 h-6 flex items-center justify-center rounded text-xs"
                          style={{ background: "rgba(245,124,0,0.15)", color: "#f57c00", border: "none", cursor: "pointer" }}
                        >+</button>
                      </div>

                      {/* Сумма */}
                      <div className="col-span-2 md:col-span-2 text-right">
                        <div className="text-sm font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
                          {item.finalLine.toLocaleString("ru-RU")} ₽
                        </div>
                        {item.lineSaving > 0 && (
                          <div className="text-xs" style={{ color: "#4ade80" }}>−{item.lineSaving.toLocaleString("ru-RU")} ₽</div>
                        )}
                      </div>

                      {/* Удалить */}
                      <div className="col-span-1 flex justify-end">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          style={{ background: "none", border: "none", color: "#8a9ab5", cursor: "pointer" }}
                        >
                          <Icon name="Trash2" size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Итоговый блок */}
            <div className="rounded p-5" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)" }}>
              <div className="text-xs uppercase tracking-widest mb-4" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Итог заказа</div>

              {/* Пороги скидок */}
              <div className="mb-4">
                <div className="text-xs mb-2" style={{ color: "#8a9ab5" }}>Скидка от суммы:</div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { from: 500_000, pct: "1%", label: "500 т.р." },
                    { from: 750_000, pct: "2%", label: "750 т.р." },
                    { from: 1_000_000, pct: "5%", label: "1 млн" },
                    { from: 1_500_000, pct: "7%", label: "1.5 млн" },
                    { from: 2_000_000, pct: "10%", label: "2 млн" },
                  ].map((tier) => (
                    <span key={tier.from} className="px-2 py-0.5 text-xs rounded" style={{
                      background: subtotal >= tier.from ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.05)",
                      color: subtotal >= tier.from ? "#4ade80" : "#8a9ab5",
                      border: `1px solid ${subtotal >= tier.from ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.08)"}`,
                      fontFamily: "'Oswald', sans-serif",
                    }}>
                      {tier.label} → {tier.pct}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-0 mb-4">
                <div className="flex justify-between py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span className="text-sm" style={{ color: "#8a9ab5" }}>Позиций в заказе</span>
                  <span className="text-sm font-medium" style={{ color: "#e8e0d0" }}>{cart.length} арт., {totalQty} шт</span>
                </div>
                <div className="flex justify-between py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span className="text-sm" style={{ color: "#8a9ab5" }}>Сумма без скидки</span>
                  <span className="text-sm font-medium" style={{ color: "#e8e0d0" }}>{subtotal.toLocaleString("ru-RU")} ₽</span>
                </div>
                {volumeDiscount > 0 && (
                  <>
                    <div className="flex justify-between py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <span className="text-sm" style={{ color: "#4ade80" }}>Скидка за объём ({(volumeDiscount * 100).toFixed(0)}%)</span>
                      <span className="text-sm font-bold" style={{ color: "#4ade80" }}>−{discountAmount.toLocaleString("ru-RU")} ₽</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-end justify-between pt-3" style={{ borderTop: "2px solid rgba(245,124,0,0.3)" }}>
                <div>
                  <div className="text-xs mb-1" style={{ color: "#8a9ab5" }}>ИТОГО:</div>
                  <div className="text-4xl font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>
                    {totalPrice.toLocaleString("ru-RU")} ₽
                  </div>
                  <div className="text-xs mt-1" style={{ color: "#8a9ab5" }}>без доставки · НДС включён</div>
                </div>
                <button
                  className="btn-primary px-6 py-4 text-sm"
                  disabled={cart.length === 0}
                  onClick={() => { setShowModal(true); setSent(false); setMError(""); }}
                  style={{ opacity: cart.length === 0 ? 0.4 : 1, cursor: cart.length === 0 ? "default" : "pointer" }}
                >
                  Запросить счёт
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Модалка отправки заказа */}
    {showModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}
        onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
        <div className="w-full max-w-md rounded-lg overflow-hidden" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.3)" }}>

          {/* Шапка */}
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(245,124,0,0.2)" }}>
            <h3 className="font-bold text-lg uppercase" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
              Оформить заявку
            </h3>
            <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "#8a9ab5", cursor: "pointer" }}>
              <Icon name="X" size={20} />
            </button>
          </div>

          <div className="px-6 py-5">
            {sent ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)" }}>
                  <Icon name="CheckCircle" size={28} style={{ color: "#4ade80" }} />
                </div>
                <div className="text-xl font-bold mb-2" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>Заявка отправлена!</div>
                <div className="text-sm mb-1" style={{ color: "#8a9ab5" }}>Сумма заказа: <span style={{ color: "#f57c00", fontWeight: "bold" }}>{totalPrice.toLocaleString("ru-RU")} ₽</span></div>
                <div className="text-sm" style={{ color: "#8a9ab5" }}>Менеджер свяжется с вами в течение 2 часов</div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Краткий итог */}
                <div className="p-3 rounded text-sm flex justify-between" style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.15)" }}>
                  <span style={{ color: "#8a9ab5" }}>{cart.length} позиц. · {cartRows.reduce((s,r) => s+r.qty,0)} шт</span>
                  <span className="font-bold" style={{ color: "#f57c00" }}>{totalPrice.toLocaleString("ru-RU")} ₽</span>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Организация</label>
                  <input type="text" value={mOrg} onChange={e => setMOrg(e.target.value)} placeholder="ООО «Название»" className="w-full px-3 py-2.5 rounded text-sm" style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.25)", color: "#e8e0d0", outline: "none" }} />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Контактное лицо</label>
                  <input type="text" value={mContact} onChange={e => setMContact(e.target.value)} placeholder="Иван Иванов" className="w-full px-3 py-2.5 rounded text-sm" style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.25)", color: "#e8e0d0", outline: "none" }} />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Телефон *</label>
                  <input type="tel" value={mPhone} onChange={e => setMPhone(e.target.value)} placeholder="+7 (___) ___-__-__" className="w-full px-3 py-2.5 rounded text-sm" style={{ background: "#0d1117", border: `1px solid ${mError ? "rgba(248,113,113,0.5)" : "rgba(245,124,0,0.25)"}`, color: "#e8e0d0", outline: "none" }} />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>E-mail *</label>
                  <input type="email" value={mEmail} onChange={e => setMEmail(e.target.value)} placeholder="example@company.ru" className="w-full px-3 py-2.5 rounded text-sm" style={{ background: "#0d1117", border: `1px solid ${mError ? "rgba(248,113,113,0.5)" : "rgba(245,124,0,0.25)"}`, color: "#e8e0d0", outline: "none" }} />
                </div>

                {mError && <div className="text-sm" style={{ color: "#f87171" }}>{mError}</div>}

                <button onClick={handleSendOrder} disabled={sending} className="w-full py-3 text-sm font-bold rounded"
                  style={{ background: "#f57c00", color: "#0d1117", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em", cursor: sending ? "default" : "pointer", opacity: sending ? 0.7 : 1 }}>
                  {sending ? "Отправляем..." : "Отправить заказ на почту"}
                </button>
                <p className="text-xs text-center" style={{ color: "#8a9ab5" }}>
                  Нажимая кнопку, вы соглашаетесь с{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#f57c00", textDecoration: "underline" }}>
                    политикой обработки данных
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}