import Icon from "@/components/ui/icon";

interface CalcOrderModalProps {
  showModal: boolean;
  setShowModal: (val: boolean) => void;
  cartLength: number;
  cartQtySum: number;
  totalPrice: number;
  sending: boolean;
  sent: boolean;
  mError: string;
  mOrg: string;
  setMOrg: (val: string) => void;
  mContact: string;
  setMContact: (val: string) => void;
  mPhone: string;
  setMPhone: (val: string) => void;
  mEmail: string;
  setMEmail: (val: string) => void;
  handleSendOrder: () => void;
}

export default function CalcOrderModal({
  showModal,
  setShowModal,
  cartLength,
  cartQtySum,
  totalPrice,
  sending,
  sent,
  mError,
  mOrg, setMOrg,
  mContact, setMContact,
  mPhone, setMPhone,
  mEmail, setMEmail,
  handleSendOrder,
}: CalcOrderModalProps) {
  if (!showModal) return null;

  return (
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
                <span style={{ color: "#8a9ab5" }}>{cartLength} позиц. · {cartQtySum} шт</span>
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
  );
}
