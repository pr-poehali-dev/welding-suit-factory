import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const PROMO_API = "https://functions.poehali.dev/01af805d-fc1a-45ea-a4f2-054ed53c55b7";

interface Lead {
  id: number;
  org: string;
  contact: string;
  phone: string;
  email: string;
  kind: string;
  order_total: number;
  is_unsubscribed: boolean;
  created_at: string;
}

export default function AdminPromo() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; skipped: number } | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [tab, setTab] = useState<"leads" | "send">("leads");

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    const res = await fetch(PROMO_API);
    const data = await res.json();
    setLeads(data.leads || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const unsubscribe = async (id: number) => {
    if (!confirm("Отписать этого клиента от рассылки?")) return;
    await fetch(`${PROMO_API}/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    notify("Клиент отписан");
    load();
  };

  const sendPromo = async () => {
    if (!subject.trim()) { notify("Укажите тему письма", false); return; }
    if (!text.trim()) { notify("Введите текст письма", false); return; }
    const withEmail = leads.filter(l => l.email && !l.is_unsubscribed);
    if (withEmail.length === 0) { notify("Нет клиентов с email для рассылки", false); return; }
    if (!confirm(`Отправить письмо ${withEmail.length} клиентам?`)) return;
    setSending(true);
    setResult(null);
    const res = await fetch(`${PROMO_API}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, text }),
    });
    const data = await res.json();
    setResult({ sent: data.sent, skipped: data.skipped });
    setSending(false);
    notify(`Отправлено ${data.sent} писем`);
  };

  const withEmail = leads.filter(l => l.email && !l.is_unsubscribed).length;
  const totalLeads = leads.length;

  const inp = "w-full px-3 py-2.5 rounded text-sm outline-none";
  const inpStyle = { background: "#0d1117", border: "1px solid rgba(245,124,0,0.3)", color: "#e8e0d0" };

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e8e0d0", fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* Тост */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-5 py-3 rounded shadow-lg text-sm font-medium" style={{
          background: toast.ok ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)",
          border: `1px solid ${toast.ok ? "rgba(74,222,128,0.4)" : "rgba(248,113,113,0.4)"}`,
          color: toast.ok ? "#4ade80" : "#f87171",
        }}>
          {toast.msg}
        </div>
      )}

      {/* Шапка */}
      <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(245,124,0,0.2)", background: "#080c11" }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 flex items-center justify-center" style={{ background: "#f57c00" }}>
            <Icon name="Flame" size={14} style={{ color: "#0d1117" }} />
          </div>
          <span className="font-bold tracking-widest uppercase" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>СПЕЦНАЗ</span>
          <span className="text-sm" style={{ color: "#8a9ab5" }}>/ Рассылка</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/admin" className="text-sm flex items-center gap-1" style={{ color: "#8a9ab5" }}>
            <Icon name="Package" size={14} /> Товары
          </a>
          <a href="/" className="text-sm flex items-center gap-1" style={{ color: "#8a9ab5" }}>
            <Icon name="ArrowLeft" size={14} /> На сайт
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Заголовок + статистика */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>БАЗА КЛИЕНТОВ</h1>
            <p className="text-sm mt-1" style={{ color: "#8a9ab5" }}>Управление контактами и рассылками</p>
          </div>
          <div className="flex gap-4">
            {[
              { label: "Всего контактов", val: totalLeads, icon: "Users" },
              { label: "Для рассылки", val: withEmail, icon: "Mail" },
            ].map(s => (
              <div key={s.label} className="px-5 py-3 rounded text-center" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)", minWidth: 120 }}>
                <Icon name={s.icon} size={18} style={{ color: "#f57c00", margin: "0 auto 4px" }} />
                <div className="text-2xl font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>{s.val}</div>
                <div className="text-xs" style={{ color: "#8a9ab5" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Табы */}
        <div className="flex gap-2 mb-6">
          {[
            { id: "leads", label: "Контакты", icon: "Users" },
            { id: "send",  label: "Отправить рассылку", icon: "Send" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as "leads" | "send")}
              className="flex items-center gap-2 px-5 py-2.5 rounded text-sm"
              style={{
                background: tab === t.id ? "#f57c00" : "transparent",
                color: tab === t.id ? "#0d1117" : "#8a9ab5",
                border: `1px solid ${tab === t.id ? "#f57c00" : "rgba(138,154,181,0.3)"}`,
                fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em", cursor: "pointer",
              }}>
              <Icon name={t.icon} size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* ── Таб: контакты ── */}
        {tab === "leads" && (
          loading ? (
            <div className="text-center py-20" style={{ color: "#8a9ab5" }}>Загрузка...</div>
          ) : leads.length === 0 ? (
            <div className="text-center py-20 rounded" style={{ border: "1px dashed rgba(245,124,0,0.3)", color: "#8a9ab5" }}>
              <Icon name="Users" size={40} style={{ margin: "0 auto 12px", color: "rgba(138,154,181,0.2)" }} />
              <div>Заявок ещё не было. Клиенты появятся здесь после первой отправки формы.</div>
            </div>
          ) : (
            <div className="rounded overflow-hidden" style={{ border: "1px solid rgba(245,124,0,0.2)" }}>
              {/* Шапка */}
              <div className="grid grid-cols-12 px-5 py-3 text-xs uppercase tracking-wider"
                style={{ background: "#13181f", color: "#8a9ab5", fontFamily: "'Oswald', sans-serif", borderBottom: "1px solid rgba(245,124,0,0.15)" }}>
                <div className="col-span-3">Организация / Контакт</div>
                <div className="col-span-2">Телефон</div>
                <div className="col-span-3">E-mail</div>
                <div className="col-span-1 text-center">Тип</div>
                <div className="col-span-2 text-right">Дата</div>
                <div className="col-span-1 text-right"></div>
              </div>

              {leads.map((l, idx) => (
                <div key={l.id} className="grid grid-cols-12 px-5 py-3 items-center gap-2"
                  style={{
                    borderBottom: idx < leads.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    background: l.is_unsubscribed ? "rgba(255,255,255,0.02)" : idx % 2 === 0 ? "#0d1117" : "#0a0e14",
                    opacity: l.is_unsubscribed ? 0.5 : 1,
                  }}>

                  <div className="col-span-3">
                    <div className="text-sm font-medium" style={{ color: "#e8e0d0" }}>{l.org !== "—" ? l.org : l.contact}</div>
                    {l.org !== "—" && l.contact !== "—" && (
                      <div className="text-xs" style={{ color: "#8a9ab5" }}>{l.contact}</div>
                    )}
                  </div>

                  <div className="col-span-2 text-sm" style={{ color: "#f57c00" }}>{l.phone}</div>

                  <div className="col-span-3 text-sm" style={{ color: l.email ? "#e8e0d0" : "#8a9ab5" }}>
                    {l.email || <span style={{ fontStyle: "italic" }}>не указан</span>}
                  </div>

                  <div className="col-span-1 flex justify-center">
                    <span className="text-xs px-2 py-0.5 rounded"
                      style={{
                        background: l.kind === "order" ? "rgba(245,124,0,0.15)" : "rgba(138,154,181,0.1)",
                        color: l.kind === "order" ? "#f57c00" : "#8a9ab5",
                      }}>
                      {l.kind === "order" ? "Заказ" : "КП"}
                    </span>
                  </div>

                  <div className="col-span-2 text-right text-xs" style={{ color: "#8a9ab5" }}>{l.created_at}</div>

                  <div className="col-span-1 flex justify-end">
                    {!l.is_unsubscribed ? (
                      <button onClick={() => unsubscribe(l.id)} title="Отписать от рассылки"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(138,154,181,0.4)", padding: 4 }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(138,154,181,0.4)")}>
                        <Icon name="BellOff" size={13} />
                      </button>
                    ) : (
                      <span className="text-xs" style={{ color: "#8a9ab5" }}>отписан</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Таб: рассылка ── */}
        {tab === "send" && (
          <div className="grid md:grid-cols-2 gap-6">

            {/* Форма */}
            <div className="rounded-lg p-6 space-y-4" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)" }}>
              <h3 className="font-bold text-lg uppercase" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>Новое письмо</h3>

              <div>
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Тема письма</div>
                <input className={inp} style={inpStyle} value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder="Специальное предложение — скидка 10% на костюмы сварщика" />
              </div>

              <div>
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Текст письма</div>
                <textarea className={inp} style={{ ...inpStyle, resize: "none" }} rows={10} value={text} onChange={e => setText(e.target.value)}
                  placeholder={"Уважаемый клиент!\n\nСообщаем вам об акции...\n\nС уважением,\nСПЕЦНАЗ ФАБРИКА"} />
                <div className="text-xs mt-1" style={{ color: "#8a9ab5" }}>Переносы строк сохраняются в письме</div>
              </div>

              <button onClick={sendPromo} disabled={sending || withEmail === 0}
                className="w-full py-3 text-sm font-bold rounded flex items-center justify-center gap-2"
                style={{
                  background: "#f57c00", color: "#0d1117",
                  fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em",
                  cursor: sending || withEmail === 0 ? "default" : "pointer",
                  opacity: sending || withEmail === 0 ? 0.5 : 1,
                }}>
                <Icon name="Send" size={16} />
                {sending ? "Отправляю..." : `Отправить ${withEmail} клиентам`}
              </button>

              {withEmail === 0 && (
                <div className="text-xs text-center" style={{ color: "#f87171" }}>
                  Нет клиентов с email. Рассылка будет доступна после первых заявок.
                </div>
              )}
            </div>

            {/* Результат + инфо */}
            <div className="space-y-4">
              {result && (
                <div className="rounded-lg p-5" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.3)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon name="CheckCircle" size={18} style={{ color: "#4ade80" }} />
                    <span className="font-bold" style={{ color: "#4ade80", fontFamily: "'Oswald', sans-serif" }}>РАССЫЛКА ЗАВЕРШЕНА</span>
                  </div>
                  <div className="text-sm space-y-1" style={{ color: "#c8bca8" }}>
                    <div>Отправлено писем: <strong style={{ color: "#ffffff" }}>{result.sent}</strong></div>
                    <div>Пропущено (нет email / отписаны): <strong style={{ color: "#ffffff" }}>{result.skipped}</strong></div>
                  </div>
                </div>
              )}

              <div className="rounded-lg p-5 space-y-3" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.15)" }}>
                <div className="font-bold text-sm uppercase tracking-wide" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>Как работает рассылка</div>
                {[
                  { icon: "UserCheck", text: "Каждому клиенту отправляется отдельное письмо — никто не видит других получателей" },
                  { icon: "Mail", text: "В письме используется имя клиента из заявки для персонализации" },
                  { icon: "BellOff", text: "Отписанные клиенты исключаются из рассылки автоматически" },
                  { icon: "Database", text: "База клиентов пополняется автоматически при каждой новой заявке с сайта" },
                ].map(item => (
                  <div key={item.icon} className="flex items-start gap-3">
                    <Icon name={item.icon} size={15} style={{ color: "#f57c00", flexShrink: 0, marginTop: 1 }} />
                    <span className="text-sm" style={{ color: "#8a9ab5" }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
