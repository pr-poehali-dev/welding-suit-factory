import { useState } from "react";
import Icon from "@/components/ui/icon";
import { PAYMENT_OPTIONS, PAYMENT_GROUPS, VOLUME_DISCOUNTS, type PaymentOption } from "./constants";
import CalcPaymentPanel from "./CalcPaymentPanel";
import CalcAddItem from "./CalcAddItem";
import CalcCartTable from "./CalcCartTable";
import CalcOrderModal from "./CalcOrderModal";

const SEND_API = "https://functions.poehali.dev/7b81d36e-be04-4b5e-828d-eab1f6a6a992";

export interface ProductSizeData {
  size_label: string;
  price_add: number;
  is_available: boolean;
  stock_qty?: number;
}

export function stockInfo(qty: number) {
  if (qty === 0) return { color: "#f87171", label: "Под заказ" };
  if (qty < 20)  return { color: "#facc15", label: `Мало (${qty} шт)` };
  if (qty <= 100) return { color: "#4ade80", label: "В наличии" };
  return { color: "#60a5fa", label: "Много" };
}

export interface CartItem {
  id: string;
  product: string;
  size: string;
  qty: number;
  paymentId: string;
}

export function getVolumeDiscount(sum: number): number {
  for (const tier of VOLUME_DISCOUNTS) {
    if (sum >= tier.from) return tier.discount;
  }
  return 0;
}

function getPriceAdd(product: string, size: string, productSizes: Record<string, ProductSizeData[]>): number {
  return (productSizes[product] || []).find(s => s.size_label === size)?.price_add ?? 0;
}

export function calcItemPrice(product: string, size: string, paymentId: string, withLogo: boolean, basePrices: Record<string, number>, productSizes: Record<string, ProductSizeData[]>, options?: PaymentOption[]): number {
  const base = basePrices[product] ?? 0;
  const priceAdd = getPriceAdd(product, size, productSizes);
  const fullBase = base + priceAdd;
  const opts = options ?? PAYMENT_OPTIONS;
  const payOpt = opts.find((p) => p.id === paymentId) ?? opts[0];
  const priceAfterPayment = fullBase * payOpt.coeff;
  const logoAdd = withLogo ? base * 0.15 : 0;
  return Math.round(priceAfterPayment + logoAdd);
}

export function getPaymentAvailability(payment: string, options?: PaymentOption[]): "stock" | "order" {
  const opts = options ?? PAYMENT_OPTIONS;
  const payOpt = opts.find(p => p.id === payment);
  return payOpt?.availability ?? "stock";
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
  paymentOptionsOverride?: PaymentOption[] | null;
  stockWarning?: string;
  dismissWarning?: () => void;
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
  paymentOptionsOverride,
  stockWarning,
  dismissWarning,
}: CalculatorSectionProps) {
  const activeOptions = paymentOptionsOverride ?? PAYMENT_OPTIONS;
  const payOpt = activeOptions.find(p => p.id === payment) ?? activeOptions[0];
  const availability = payOpt.availability;
  const currentProductSizes = productSizes[addProduct] || [];

  const [showModal, setShowModal] = useState(false);
  const [mOrg, setMOrg] = useState("");
  const [mContact, setMContact] = useState("");
  const [mPhone, setMPhone] = useState("");
  const [mEmail, setMEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [mError, setMError] = useState("");

  const rawRows = cart.map((item) => {
    const unitPrice = calcItemPrice(item.product, item.size, item.paymentId, withLogo, basePrices, productSizes, activeOptions);
    return { ...item, unitPrice, lineTotal: unitPrice * item.qty };
  });

  const grandSubtotal = rawRows.reduce((s, r) => s + r.lineTotal, 0);
  const totalQty = cart.reduce((s, r) => s + r.qty, 0);
  const volumeDiscount = getVolumeDiscount(grandSubtotal);
  const grandDiscountAmount = Math.round(grandSubtotal * volumeDiscount);
  const grandTotal = grandSubtotal - grandDiscountAmount;

  const allCartRows = rawRows.map(r => {
    const finalUnit = Math.round(r.unitPrice * (1 - volumeDiscount));
    const finalLine = finalUnit * r.qty;
    const lineSaving = r.lineTotal - finalLine;
    return { ...r, finalUnit, finalLine, lineSaving };
  });

  const paymentIds = [...new Set(cart.map(c => c.paymentId))];

  const groups = paymentIds.map(pid => {
    const po = activeOptions.find(o => o.id === pid) ?? activeOptions[0];
    const rows = allCartRows.filter(r => r.paymentId === pid);
    const sub = rows.reduce((s, r) => s + r.unitPrice * r.qty, 0);
    const subFinal = rows.reduce((s, r) => s + r.finalLine, 0);
    return { paymentId: pid, payOpt: po, rows, subtotal: sub, total: subFinal };
  });

  const handleSendOrder = async () => {
    if (!mPhone.trim()) { setMError("Укажите телефон"); return; }
    setSending(true);
    setMError("");
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
          withLogo,
          subtotal: grandSubtotal,
          volumeDiscount,
          total: grandTotal,
          groups: groups.map(g => ({
            payment: g.payOpt.label,
            paymentDesc: g.payOpt.desc,
            orderType: g.payOpt.availability,
            subtotal: g.subtotal,
            total: g.total,
            items: g.rows.map(r => ({ product: r.product, size: r.size, qty: r.qty, unitPriceFull: r.unitPrice, unitPrice: r.finalUnit, lineTotal: r.finalLine, saving: r.lineSaving })),
          })),
        }),
      });
      setSent(true);
    } catch {
      setMError("Ошибка отправки. Позвоните нам напрямую.");
    }
    setSending(false);
  };

  return (
    <>
    <section id="calculator" className="py-24" style={{ background: "#0a0e14" }}>
      <div className="mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div style={{ width: 32, height: 2, background: "#f57c00" }} />
            <span className="text-sm tracking-widest uppercase" style={{ color: "#f57c00" }}>Калькулятор заказа</span>
            <div style={{ width: 32, height: 2, background: "#f57c00" }} />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>РАСЧЁТ ОПТОВОГО ЗАКАЗА</h2>
          <p style={{ color: "#8a9ab5" }}>Добавляйте несколько артикулов и размеров — калькулятор посчитает итог</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="w-full lg:w-[15%] flex-shrink-0">
            <CalcPaymentPanel
              payment={payment}
              setPayment={setPayment}
              withLogo={withLogo}
              setWithLogo={setWithLogo}
              paymentOptions={activeOptions}
            />
          </div>
          <div className="w-full lg:w-[25%] flex-shrink-0">
            <CalcAddItem
              addProduct={addProduct}
              setAddProduct={setAddProduct}
              addSize={addSize}
              setAddSize={setAddSize}
              addQty={addQty}
              setAddQty={setAddQty}
              addToCart={addToCart}
              productNames={productNames}
              currentProductSizes={currentProductSizes}
              availability={availability}
            />
          </div>

          <div className="w-full lg:flex-1 flex flex-col gap-4">

            {groups.length === 0 && (
              <div className="rounded overflow-hidden" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)" }}>
                <div className="px-5 py-10 text-center" style={{ color: "#8a9ab5" }}>
                  <Icon name="ShoppingCart" size={36} style={{ color: "rgba(138,154,181,0.3)", margin: "0 auto 12px" }} />
                  <div className="text-sm">Добавьте позиции из каталога или формы слева</div>
                </div>
              </div>
            )}

            {groups.map(g => {
              const pct = Math.round((g.payOpt.coeff - 1) * 10000) / 100;
              const pctLabel = pct === 0 ? "базовая" : pct > 0 ? `+${pct}%` : `${pct}%`;
              const pctColor = pct === 0 ? "#8a9ab5" : pct > 0 ? "#f87171" : "#4ade80";
              return (
                <div key={g.paymentId}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon name={g.payOpt.availability === "stock" ? "Package" : "Clock"} size={14} style={{ color: "#f57c00" }} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: "'Oswald', sans-serif", color: "#e8e0d0" }}>
                        {g.payOpt.label}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: `${pctColor}15`, color: pctColor, border: `1px solid ${pctColor}30` }}>
                        {pctLabel}
                      </span>
                    </div>
                    <div className="text-sm font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>
                      {g.total.toLocaleString("ru-RU")} ₽
                    </div>
                  </div>
                  <CalcCartTable
                    cartRows={g.rows}
                    volumeDiscount={volumeDiscount}
                    productSizes={productSizes}
                    updateSize={updateSize}
                    updateQty={updateQty}
                    removeFromCart={removeFromCart}
                    availability={g.payOpt.availability}
                  />
                </div>
              );
            })}

            {stockWarning && (
              <div className="flex items-center gap-3 px-4 py-3 rounded" style={{ background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.3)" }}>
                <Icon name="AlertTriangle" size={18} style={{ color: "#facc15", flexShrink: 0 }} />
                <span className="text-sm flex-1" style={{ color: "#facc15" }}>{stockWarning}</span>
                <button
                  onClick={dismissWarning}
                  className="px-3 py-1 text-xs font-bold rounded flex-shrink-0"
                  style={{ background: "rgba(250,204,21,0.2)", border: "1px solid rgba(250,204,21,0.4)", color: "#facc15", cursor: "pointer" }}
                >
                  Хорошо
                </button>
              </div>
            )}

            <div className="rounded p-5" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)" }}>
              <div className="text-xs uppercase tracking-widest mb-4" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Итог заказа</div>

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
                      background: grandSubtotal >= tier.from ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.05)",
                      color: grandSubtotal >= tier.from ? "#4ade80" : "#8a9ab5",
                      border: `1px solid ${grandSubtotal >= tier.from ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.08)"}`,
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
                {groups.map(g => (
                  <div key={g.paymentId} className="flex justify-between py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <span className="text-sm" style={{ color: "#8a9ab5" }}>{g.payOpt.label} ({g.rows.length} поз.)</span>
                    <span className="text-sm font-medium" style={{ color: "#e8e0d0" }}>{g.total.toLocaleString("ru-RU")} ₽</span>
                  </div>
                ))}
                <div className="flex justify-between py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span className="text-sm" style={{ color: "#8a9ab5" }}>Сумма без скидки</span>
                  <span className="text-sm font-medium" style={{ color: "#e8e0d0" }}>{grandSubtotal.toLocaleString("ru-RU")} ₽</span>
                </div>
                {volumeDiscount > 0 && (
                  <div className="flex justify-between py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <span className="text-sm" style={{ color: "#4ade80" }}>Скидка за объём ({(volumeDiscount * 100).toFixed(0)}%)</span>
                    <span className="text-sm font-bold" style={{ color: "#4ade80" }}>−{grandDiscountAmount.toLocaleString("ru-RU")} ₽</span>
                  </div>
                )}
              </div>

              <div className="flex items-end justify-between pt-3" style={{ borderTop: "2px solid rgba(245,124,0,0.3)" }}>
                <div>
                  <div className="text-xs mb-1" style={{ color: "#8a9ab5" }}>ИТОГО:</div>
                  <div className="text-4xl font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>
                    {grandTotal.toLocaleString("ru-RU")} ₽
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

    <CalcOrderModal
      showModal={showModal}
      setShowModal={setShowModal}
      cartLength={cart.length}
      cartQtySum={totalQty}
      totalPrice={grandTotal}
      sending={sending}
      sent={sent}
      mError={mError}
      mOrg={mOrg}
      setMOrg={setMOrg}
      mContact={mContact}
      setMContact={setMContact}
      mPhone={mPhone}
      setMPhone={setMPhone}
      mEmail={mEmail}
      setMEmail={setMEmail}
      handleSendOrder={handleSendOrder}
    />
    </>
  );
}