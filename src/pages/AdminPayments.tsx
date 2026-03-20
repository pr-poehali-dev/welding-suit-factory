import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const API = "https://functions.poehali.dev/867570d6-4bd3-4fdc-977c-f50fd3926c0e";

const GROUPS: Record<string, string> = {
  stock_prepay: "Наличие · Предоплата",
  stock_deferred: "Наличие · Отсрочка",
  order_prepay: "Под заказ · Предоплата",
  order_deferred: "Под заказ · Отсрочка",
};

interface PayOpt {
  id: number;
  option_id: string;
  group_id: string;
  availability: string;
  label: string;
  desc: string;
  coeff: number;
  sort_order: number;
}

export default function AdminPayments() {
  const [options, setOptions] = useState<PayOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetch(`${API}?action=payment_options`)
      .then(r => r.json())
      .then(data => { setOptions(data.payment_options || []); setLoading(false); });
  }, []);

  const update = (id: number, field: keyof PayOpt, value: string | number) => {
    setOptions(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
  };

  const save = async () => {
    setSaving(true);
    await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_payment_options", items: options.map(o => ({ id: o.id, label: o.label, description: o.desc, coeff: o.coeff, sort_order: o.sort_order })) }),
    });
    setSaving(false);
    notify("Коэффициенты сохранены");
  };

  const grouped = Object.keys(GROUPS).map(gid => ({
    gid,
    label: GROUPS[gid],
    items: options.filter(o => o.group_id === gid),
  }));

  const pctLabel = (coeff: number) => {
    const pct = Math.round((coeff - 1) * 10000) / 100;
    return pct === 0 ? "базовая" : pct > 0 ? `+${pct}%` : `${pct}%`;
  };
  const pctColor = (coeff: number) => {
    const pct = coeff - 1;
    return pct === 0 ? "#8a9ab5" : pct > 0 ? "#f87171" : "#4ade80";
  };

  return (
    <div style={{ background: "#0a0e14", minHeight: "100vh" }}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-2" style={{ borderBottom: "1px solid rgba(245,124,0,0.15)", paddingBottom: 16 }}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 flex items-center justify-center" style={{ background: "#f57c00" }}>
              <Icon name="Flame" size={14} style={{ color: "#0d1117" }} />
            </div>
            <span className="font-bold tracking-widest uppercase" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>СПЕЦНАЗ</span>
            <span className="text-sm" style={{ color: "#8a9ab5" }}>/ Условия оплаты</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/admin" className="text-sm flex items-center gap-1" style={{ color: "#8a9ab5" }}>
              <Icon name="ArrowLeft" size={14} /> Товары
            </a>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>КОЭФФИЦИЕНТЫ УСЛОВИЙ ОПЛАТЫ</h1>
              <p className="text-sm mt-1" style={{ color: "#8a9ab5" }}>Редактируйте коэффициенты, названия и описания</p>
            </div>
            <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-3 text-sm font-bold rounded"
              style={{ background: "#f57c00", color: "#0d1117", fontFamily: "'Oswald', sans-serif", cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
              <Icon name="Save" size={16} />
              {saving ? "Сохраняю..." : "Сохранить"}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-20" style={{ color: "#8a9ab5" }}>Загрузка...</div>
          ) : (
            <div className="space-y-6">
              {grouped.map(g => (
                <div key={g.gid} className="rounded overflow-hidden" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)" }}>
                  <div className="px-5 py-3" style={{ background: "rgba(245,124,0,0.08)", borderBottom: "1px solid rgba(245,124,0,0.15)" }}>
                    <div className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>
                      {g.label}
                    </div>
                  </div>

                  <div className="hidden md:grid px-5 py-2 text-xs uppercase tracking-wider" style={{ gridTemplateColumns: "2fr 2fr 100px 100px", color: "#8a9ab5", fontFamily: "'Oswald', sans-serif", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div>Название</div>
                    <div>Описание</div>
                    <div className="text-center">Коэффициент</div>
                    <div className="text-center">Наценка</div>
                  </div>

                  {g.items.map(opt => (
                    <div key={opt.id} className="grid items-center gap-3 px-5 py-3" style={{ gridTemplateColumns: "2fr 2fr 100px 100px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <input
                        className="w-full px-3 py-2 rounded text-sm outline-none"
                        style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.2)", color: "#e8e0d0" }}
                        value={opt.label}
                        onChange={e => update(opt.id, "label", e.target.value)}
                      />
                      <input
                        className="w-full px-3 py-2 rounded text-sm outline-none"
                        style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.2)", color: "#e8e0d0" }}
                        value={opt.desc}
                        onChange={e => update(opt.id, "desc", e.target.value)}
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full px-3 py-2 rounded text-sm text-center outline-none"
                        style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.2)", color: "#e8e0d0" }}
                        value={opt.coeff}
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9.]/g, "");
                          update(opt.id, "coeff", v === "" ? 0 : parseFloat(v));
                        }}
                      />
                      <div className="text-sm font-bold text-center" style={{ color: pctColor(opt.coeff) }}>
                        {pctLabel(opt.coeff)}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 px-5 py-3 rounded shadow-lg flex items-center gap-2 z-50"
          style={{ background: toast.ok ? "#166534" : "#991b1b", color: "#fff" }}>
          <Icon name={toast.ok ? "CheckCircle" : "AlertCircle"} size={16} />
          <span className="text-sm">{toast.msg}</span>
        </div>
      )}
    </div>
  );
}