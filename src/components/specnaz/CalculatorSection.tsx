import { useState } from "react";
import Icon from "@/components/ui/icon";
import { PAYMENT_OPTIONS, VOLUME_DISCOUNTS } from "./constants";
import CalcPaymentPanel from "./CalcPaymentPanel";
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
  if (qty < 20)  return { color: "#facc15", label: "Мало" };
  if (qty <= 100) return { color: "#4ade80", label: "В наличии" };
  return { color: "#60a5fa", label: "Много" };
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

function getSizeStockQty(product: string, size: string, productSizes: Record<string, ProductSizeData[]>): number {
  return (productSizes[product] || []).find(s => s.size_label === size)?.stock_qty ?? 0;
}

function getPriceAdd(product: string, size: string, productSizes: Record<string, ProductSizeData[]>): number {
  return (productSizes[product] || []).find(s => s.size_label === size)?.price_add ?? 0;
}

export function calcItemPrice(product: string, size: string, payment: string, withLogo: boolean, basePrices: Record<string, number>, productSizes: Record<string, ProductSizeData[]>): number {
  const base = basePrices[product] ?? 0;
  const priceAdd = getPriceAdd(product, size, productSizes);
  const fullBase = base + priceAdd;
  const inStock = getSizeStockQty(product, size, productSizes) > 0;

  const payOpt = PAYMENT_OPTIONS.find((p) => p.id === payment) ?? PAYMENT_OPTIONS[0];
  const coeff = inStock ? payOpt.stockCoeff : payOpt.orderCoeff;
  const priceAfterPayment = fullBase * coeff;
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

  const payOpt = PAYMENT_OPTIONS.find(p => p.id === payment) ?? PAYMENT_OPTIONS[0];

  const rawRows = cart.map((item) => {
    const unitPrice = calcItemPrice(item.product, item.size, payment, withLogo, basePrices, productSizes);
    const inStock = getSizeStockQty(item.product, item.size, productSizes) > 0;
    return { ...item, unitPrice, lineTotal: unitPrice * item.qty, inStock };
  });

  const stockRows = rawRows.filter(r => r.inStock);
  const orderRows = rawRows.filter(r => !r.inStock);

  const subtotal = rawRows.reduce((s, r) => s + r.lineTotal, 0);
  const totalQty = cart.reduce((s, r) => s + r.qty, 0);
  const volumeDiscount = getVolumeDiscount(subtotal);
  const discountAmount = Math.round(subtotal * volumeDiscount);
  const totalPrice = subtotal - discountAmount;

  const applyDiscount = (rows: typeof rawRows) => rows.map(r => {
    const finalUnit = Math.round(r.unitPrice * (1 - volumeDiscount));
    const finalLine = finalUnit * r.qty;
    const lineSaving = r.lineTotal - finalLine;
    return { ...r, finalUnit, finalLine, lineSaving };
  });

  const stockCartRows = applyDiscount(stockRows);
  const orderCartRows = applyDiscount(orderRows);
  const allCartRows = applyDiscount(rawRows);

  const stockSubtotal = stockRows.reduce((s, r) => s + r.lineTotal, 0);
  const orderSubtotal = orderRows.reduce((s, r) => s + r.lineTotal, 0);
  const stockTotal = Math.round(stockSubtotal * (1 - volumeDiscount));
  const orderTotal = Math.round(orderSubtotal * (1 - volumeDiscount));

  const stockPctLabel = payOpt.stockCoeff === 1 ? "базовая" : `${payOpt.stockCoeff > 1 ? "+" : ""}${Math.round((payOpt.stockCoeff - 1) * 10000) / 100}%`;
  const orderPctLabel = payOpt.orderCoeff === 1 ? "базовая" : `${payOpt.orderCoeff > 1 ? "+" : ""}${Math.round((payOpt.orderCoeff - 1) * 10000) / 100}%`;

  const handleSendOrder = async () => {
    if (!mPhone.trim()) { setMError("Укажите телефон"); return; }
    setSending(true);
    setMError("");
    try {
      const base = { org: mOrg, contact: mContact, phone: mPhone, email: mEmail, payment: payOpt.label, paymentDesc: payOpt.desc, withLogo, volumeDiscount };

      if (stockCartRows.length > 0) {
        await fetch(SEND_API, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...base, kind: "order", orderType: "stock",
            subtotal: stockSubtotal, total: stockTotal,
            items: stockCartRows.map(r => ({ product: r.product, size: r.size, qty: r.qty, unitPriceFull: r.unitPrice, unitPrice: r.finalUnit, lineTotal: r.finalLine, saving: r.lineSaving })),
          }),
        });
      }

      if (orderCartRows.length > 0) {
        await fetch(SEND_API, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...base, kind: "order", orderType: "order",
            subtotal: orderSubtotal, total: orderTotal,
            items: orderCartRows.map(r => ({ product: r.product, size: r.size, qty: r.qty, unitPriceFull: r.unitPrice, unitPrice: r.finalUnit, lineTotal: r.finalLine, saving: r.lineSaving })),
          }),
        });
      }

      setSent(true);
    } catch {
      setMError("Ошибка отправки. Позвоните нам напрямую.");
    }
    setSending(false);
  };

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
          <CalcPaymentPanel
            payment={payment}
            setPayment={setPayment}
            withLogo={withLogo}
            setWithLogo={setWithLogo}
            addProduct={addProduct}
            setAddProduct={setAddProduct}
            addSize={addSize}
            setAddSize={setAddSize}
            addQty={addQty}
            setAddQty={setAddQty}
            addToCart={addToCart}
            productNames={productNames}
            currentProductSizes={currentProductSizes}
          />

          <div className="lg:col-span-2 flex flex-col gap-5">

            {stockCartRows.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="Package" size={16} style={{ color: "#4ade80" }} />
                  <span className="text-sm font-bold uppercase" style={{ fontFamily: "'Oswald', sans-serif", color: "#4ade80" }}>
                    В наличии
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}>
                    {stockPctLabel}
                  </span>
                </div>
                <CalcCartTable
                  cartRows={stockCartRows}
                  volumeDiscount={volumeDiscount}
                  productSizes={productSizes}
                  updateSize={updateSize}
                  updateQty={updateQty}
                  removeFromCart={removeFromCart}
                />
              </div>
            )}

            {orderCartRows.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="Clock" size={16} style={{ color: "#f87171" }} />
                  <span className="text-sm font-bold uppercase" style={{ fontFamily: "'Oswald', sans-serif", color: "#f87171" }}>
                    Под заказ
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
                    {orderPctLabel}
                  </span>
                </div>
                <CalcCartTable
                  cartRows={orderCartRows}
                  volumeDiscount={volumeDiscount}
                  productSizes={productSizes}
                  updateSize={updateSize}
                  updateQty={updateQty}
                  removeFromCart={removeFromCart}
                />
              </div>
            )}

            {cart.length === 0 && (
              <div className="rounded overflow-hidden" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)" }}>
                <div className="px-5 py-10 text-center" style={{ color: "#8a9ab5" }}>
                  <Icon name="ShoppingCart" size={36} style={{ color: "rgba(138,154,181,0.3)", margin: "0 auto 12px" }} />
                  <div className="text-sm">Добавьте позиции из каталога или формы слева</div>
                </div>
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
                {stockCartRows.length > 0 && (
                  <div className="flex justify-between py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <span className="text-sm" style={{ color: "#4ade80" }}>В наличии ({stockCartRows.length} поз.)</span>
                    <span className="text-sm font-medium" style={{ color: "#4ade80" }}>{stockTotal.toLocaleString("ru-RU")} ₽</span>
                  </div>
                )}
                {orderCartRows.length > 0 && (
                  <div className="flex justify-between py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <span className="text-sm" style={{ color: "#f87171" }}>Под заказ ({orderCartRows.length} поз.)</span>
                    <span className="text-sm font-medium" style={{ color: "#f87171" }}>{orderTotal.toLocaleString("ru-RU")} ₽</span>
                  </div>
                )}
                <div className="flex justify-between py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span className="text-sm" style={{ color: "#8a9ab5" }}>Сумма без скидки</span>
                  <span className="text-sm font-medium" style={{ color: "#e8e0d0" }}>{subtotal.toLocaleString("ru-RU")} ₽</span>
                </div>
                {volumeDiscount > 0 && (
                  <div className="flex justify-between py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <span className="text-sm" style={{ color: "#4ade80" }}>Скидка за объём ({(volumeDiscount * 100).toFixed(0)}%)</span>
                    <span className="text-sm font-bold" style={{ color: "#4ade80" }}>−{discountAmount.toLocaleString("ru-RU")} ₽</span>
                  </div>
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

    <CalcOrderModal
      showModal={showModal}
      setShowModal={setShowModal}
      cartLength={cart.length}
      cartQtySum={allCartRows.reduce((s, r) => s + r.qty, 0)}
      totalPrice={totalPrice}
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
