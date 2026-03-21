import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import Icon from "@/components/ui/icon";
import AdminHeader from "@/components/admin/AdminHeader";
import { authFetch } from "./shared.types";

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
  const [tab, setTab] = useState<"leads" | "send" | "import">("leads");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; skipped: number } | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [pendingFile, setPendingFile] = useState<{ b64: string; filename: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ab = reader.result as ArrayBuffer;
      const wb = XLSX.read(ab, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
      if (data.length < 2) { notify("Файл пуст или не содержит данных", false); return; }
      const headers = (data[0] as string[]).map(h => String(h ?? ""));
      const rows = (data.slice(1) as string[][]).slice(0, 5).map(r =>
        headers.map((_, i) => String(r[i] ?? ""))
      );
      setPreview({ headers, rows });
      // Base64 для отправки на бэкенд
      const b64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
      setPendingFile({ b64, filename: file.name });
      setImportResult(null);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleImport = async () => {
    if (!pendingFile) return;
    setImporting(true);
    const res = await authFetch(`${PROMO_API}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: pendingFile.b64, filename: pendingFile.filename }),
    });
    const data = await res.json();
    setImportResult({ added: data.added, skipped: data.skipped });
    setImporting(false);
    notify(`Импортировано ${data.added} контактов`);
    setPendingFile(null);
    setPreview(null);
    load();
  };

  const unsubscribe = async (id: number) => {
    if (!confirm("Отписать этого клиента от рассылки?")) return;
    await authFetch(`${PROMO_API}/unsubscribe`, {
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
    const res = await authFetch(`${PROMO_API}/send`, {
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

      <AdminHeader section="Рассылка" />

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
            { id: "leads",  label: "Контакты",          icon: "Users" },
            { id: "import", label: "Импорт из Excel",   icon: "FileSpreadsheet" },
            { id: "send",   label: "Отправить рассылку", icon: "Send" },
          ].map(t => (
            <button key={t.id}
              className="flex items-center gap-2 px-5 py-2.5 rounded text-sm"
              style={{
                background: tab === t.id ? "#f57c00" : "transparent",
                color: tab === t.id ? "#0d1117" : "#8a9ab5",
                border: `1px solid ${tab === t.id ? "#f57c00" : "rgba(138,154,181,0.3)"}`,
                fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em", cursor: "pointer",
              }}
              onClick={() => setTab(t.id as "leads" | "send" | "import")}>
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

        {/* ── Таб: импорт ── */}
        {tab === "import" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">

              {/* Зона загрузки */}
              <div
                className="rounded-lg flex flex-col items-center justify-center py-12 cursor-pointer transition-all"
                style={{ border: "2px dashed rgba(245,124,0,0.35)", background: "#13181f" }}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  fileRef.current?.click();
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#f57c00")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(245,124,0,0.35)")}
              >
                <Icon name="FileSpreadsheet" size={48} style={{ color: "rgba(245,124,0,0.4)", marginBottom: 12 }} />
                <div className="font-bold mb-1" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
                  Загрузить файл
                </div>
                <div className="text-sm" style={{ color: "#8a9ab5" }}>Excel (.xlsx) или CSV · нажмите или перетащите</div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileSelect} />
              </div>

              {/* Инструкция по формату */}
              <div className="rounded-lg p-5" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.15)" }}>
                <div className="font-bold text-sm mb-3 uppercase" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
                  Формат файла
                </div>
                <div className="text-xs mb-3" style={{ color: "#8a9ab5" }}>
                  Первая строка — заголовки. Система автоматически распознаёт столбцы по названию:
                </div>
                <div className="rounded overflow-hidden" style={{ border: "1px solid rgba(245,124,0,0.15)" }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: "rgba(245,124,0,0.1)" }}>
                        {["Столбец", "Варианты названия"].map(h => (
                          <th key={h} className="px-3 py-2 text-left" style={{ color: "#f57c00", fontFamily: "'Oswald', sans-serif" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Email", "email, e-mail, почта"],
                        ["Телефон", "phone, телефон, тел"],
                        ["Организация", "org, компания, организация, company"],
                        ["Контакт", "contact, имя, name, фио"],
                      ].map(([col, variants]) => (
                        <tr key={col} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <td className="px-3 py-2" style={{ color: "#e8e0d0", fontWeight: 600 }}>{col}</td>
                          <td className="px-3 py-2" style={{ color: "#8a9ab5" }}>{variants}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-xs mt-3" style={{ color: "#8a9ab5" }}>
                  Дубликаты по телефону или email автоматически пропускаются.
                </div>
              </div>
            </div>

            {/* Превью и кнопка импорта */}
            <div className="space-y-4">
              {preview && (
                <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(245,124,0,0.3)" }}>
                  <div className="px-4 py-3 flex items-center justify-between" style={{ background: "#13181f", borderBottom: "1px solid rgba(245,124,0,0.15)" }}>
                    <span className="text-sm font-bold uppercase" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
                      Предпросмотр (первые 5 строк)
                    </span>
                    <button onClick={() => { setPreview(null); setPendingFile(null); }}
                      style={{ background: "none", border: "none", color: "#8a9ab5", cursor: "pointer" }}>
                      <Icon name="X" size={16} />
                    </button>
                  </div>
                  <div className="overflow-x-auto" style={{ background: "#0d1117" }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(245,124,0,0.15)" }}>
                          {preview.headers.map((h, i) => (
                            <th key={i} className="px-3 py-2 text-left whitespace-nowrap"
                              style={{ color: "#f57c00", fontFamily: "'Oswald', sans-serif" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((row, i) => (
                          <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                            {row.map((cell, j) => (
                              <td key={j} className="px-3 py-2 whitespace-nowrap" style={{ color: "#c8bca8", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3" style={{ background: "#13181f", borderTop: "1px solid rgba(245,124,0,0.15)" }}>
                    <button onClick={handleImport} disabled={importing}
                      className="w-full py-3 text-sm font-bold rounded flex items-center justify-center gap-2"
                      style={{
                        background: "#f57c00", color: "#0d1117",
                        fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em",
                        cursor: importing ? "default" : "pointer",
                        opacity: importing ? 0.7 : 1,
                      }}>
                      <Icon name="Upload" size={16} />
                      {importing ? "Импортирую..." : "Загрузить в базу"}
                    </button>
                  </div>
                </div>
              )}

              {importResult && (
                <div className="rounded-lg p-5" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.3)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon name="CheckCircle" size={18} style={{ color: "#4ade80" }} />
                    <span className="font-bold" style={{ color: "#4ade80", fontFamily: "'Oswald', sans-serif" }}>ИМПОРТ ЗАВЕРШЁН</span>
                  </div>
                  <div className="text-sm space-y-1" style={{ color: "#c8bca8" }}>
                    <div>Добавлено контактов: <strong style={{ color: "#ffffff" }}>{importResult.added}</strong></div>
                    <div>Пропущено (дубликаты / нет данных): <strong style={{ color: "#ffffff" }}>{importResult.skipped}</strong></div>
                  </div>
                </div>
              )}

              {!preview && !importResult && (
                <div className="rounded-lg p-6 flex flex-col items-center justify-center text-center"
                  style={{ border: "1px dashed rgba(245,124,0,0.2)", minHeight: 200 }}>
                  <Icon name="ArrowLeft" size={24} style={{ color: "rgba(245,124,0,0.3)", marginBottom: 12 }} />
                  <div className="text-sm" style={{ color: "#8a9ab5" }}>Загрузите файл — здесь появится предпросмотр данных</div>
                </div>
              )}
            </div>
          </div>
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