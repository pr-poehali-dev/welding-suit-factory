import { PAYMENT_OPTIONS, PAYMENT_GROUPS, type PaymentOption } from "./constants";

interface CalcPaymentPanelProps {
  payment: string;
  setPayment: (val: string) => void;
  withLogo: boolean;
  setWithLogo: (val: boolean) => void;
  paymentOptions?: PaymentOption[];
}

export default function CalcPaymentPanel({
  payment, setPayment,
  withLogo, setWithLogo,
  paymentOptions,
}: CalcPaymentPanelProps) {
  const opts = paymentOptions ?? PAYMENT_OPTIONS;

  return (
    <div className="rounded p-3" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)", height: "100%" }}>
      <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Условие оплаты</div>
      <div className="space-y-3">
        {PAYMENT_GROUPS.map(group => {
          const groupOpts = opts.filter(o => o.group === group.id);
          if (!groupOpts.length) return null;
          return (
            <div key={group.id}>
              <div className="text-xs font-bold uppercase tracking-wider mb-1.5 px-1" style={{ color: "#f57c00", fontFamily: "'Oswald', sans-serif", fontSize: 10 }}>
                {group.label}
              </div>
              <div className="space-y-1">
                {groupOpts.map(opt => {
                  const pct = Math.round((opt.coeff - 1) * 10000) / 100;
                  const pctLabel = pct === 0 ? "базовая" : pct > 0 ? `+${pct}%` : `${pct}%`;
                  const pctColor = pct === 0 ? "#8a9ab5" : pct > 0 ? "#f87171" : "#4ade80";
                  return (
                    <label key={opt.id} className="flex items-center justify-between gap-2 p-2.5 rounded cursor-pointer transition-all" style={{
                      background: payment === opt.id ? "rgba(245,124,0,0.1)" : "#0d1117",
                      border: `1px solid ${payment === opt.id ? "rgba(245,124,0,0.4)" : "rgba(255,255,255,0.06)"}`,
                    }}>
                      <div className="flex items-center gap-2">
                        <input type="radio" name="payment" checked={payment === opt.id} onChange={() => setPayment(opt.id)} style={{ accentColor: "#f57c00" }} />
                        <div>
                          <div className="text-xs" style={{ color: payment === opt.id ? "#e8e0d0" : "#8a9ab5" }}>{opt.label}</div>
                        </div>
                      </div>
                      <span className="text-xs font-bold whitespace-nowrap" style={{ color: pctColor }}>{pctLabel}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <label className="flex items-center gap-2 cursor-pointer mt-3 p-2.5 rounded" style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.06)" }}>
        <input type="checkbox" checked={withLogo} onChange={(e) => setWithLogo(e.target.checked)} style={{ accentColor: "#f57c00", width: 14, height: 14 }} />
        <span className="text-xs" style={{ color: "#c8bca8" }}>Логотип <span style={{ color: "#f57c00" }}>+15%</span></span>
      </label>
    </div>
  );
}