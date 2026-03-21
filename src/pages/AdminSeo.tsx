import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import AdminHeader from "@/components/admin/AdminHeader";
import { authFetch } from "./shared.types";

const API = "https://functions.poehali.dev/867570d6-4bd3-4fdc-977c-f50fd3926c0e";

interface SeoData {
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  og_title: string;
  og_description: string;
  og_image: string;
  custom_head_tags: string;
  custom_body_tags: string;
}

const EMPTY: SeoData = {
  meta_title: "", meta_description: "", meta_keywords: "",
  og_title: "", og_description: "", og_image: "",
  custom_head_tags: "", custom_body_tags: "",
};

const oswald = "'Oswald', sans-serif";
const inp = "w-full px-3 py-2.5 rounded text-sm outline-none";
const inpSt = { background: "#0d1117", border: "1px solid rgba(245,124,0,0.3)", color: "#e8e0d0" };
const lbl: React.CSSProperties = { color: "#8a9ab5", fontFamily: oswald, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" };

export default function AdminSeo() {
  const [seo, setSeo] = useState<SeoData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetch(`${API}?action=seo`)
      .then(r => r.json())
      .then(d => { if (d.seo) setSeo({ ...EMPTY, ...d.seo }); })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    await authFetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_seo", seo }),
    });
    setSaving(false);
    notify("SEO-настройки сохранены");
  };

  const field = (key: keyof SeoData, label: string, hint?: string, rows?: number) => (
    <div>
      <div style={lbl} className="mb-2">{label}</div>
      {rows ? (
        <textarea className={inp} style={{ ...inpSt, resize: "none", fontFamily: "monospace", fontSize: 12 }}
          rows={rows} value={seo[key]} onChange={e => setSeo(s => ({ ...s, [key]: e.target.value }))} />
      ) : (
        <input className={inp} style={inpSt} value={seo[key]}
          onChange={e => setSeo(s => ({ ...s, [key]: e.target.value }))} />
      )}
      {hint && <div className="text-xs mt-1" style={{ color: "rgba(138,154,181,0.6)" }}>{hint}</div>}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e8e0d0", fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-5 py-3 rounded shadow-lg text-sm font-medium" style={{
          background: toast.ok ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)",
          border: `1px solid ${toast.ok ? "rgba(74,222,128,0.4)" : "rgba(248,113,113,0.4)"}`,
          color: toast.ok ? "#4ade80" : "#f87171",
        }}>{toast.msg}</div>
      )}

      <AdminHeader section="SEO" />

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ fontFamily: oswald, color: "#ffffff" }}>SEO-НАСТРОЙКИ</h1>
          <p className="text-sm mt-1" style={{ color: "#8a9ab5" }}>Мета-теги, Open Graph и произвольные теги для поисковых роботов</p>
        </div>

        {loading ? (
          <div className="text-center py-20" style={{ color: "#8a9ab5" }}>Загрузка...</div>
        ) : (
          <div className="space-y-8">

            <div className="rounded-lg p-6" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)" }}>
              <div className="flex items-center gap-2 mb-5">
                <Icon name="FileText" size={16} style={{ color: "#f57c00" }} />
                <span className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: oswald, color: "#f57c00" }}>Основные мета-теги</span>
              </div>
              <div className="space-y-4">
                {field("meta_title", "Title (заголовок страницы)", "Отображается в поисковой выдаче. До 70 символов.")}
                {field("meta_description", "Description (описание)", "Описание для поисковиков. До 160 символов.", 3)}
                {field("meta_keywords", "Keywords (ключевые слова)", "Через запятую. Yandex учитывает, Google — нет.", 2)}
              </div>
            </div>

            <div className="rounded-lg p-6" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)" }}>
              <div className="flex items-center gap-2 mb-5">
                <Icon name="Share2" size={16} style={{ color: "#f57c00" }} />
                <span className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: oswald, color: "#f57c00" }}>Open Graph (соцсети)</span>
              </div>
              <div className="space-y-4">
                {field("og_title", "OG Title", "Заголовок при репосте в соцсетях")}
                {field("og_description", "OG Description", "Описание при репосте", 2)}
                {field("og_image", "OG Image (URL)", "Прямая ссылка на изображение для превью")}
              </div>
            </div>

            <div className="rounded-lg p-6" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)" }}>
              <div className="flex items-center gap-2 mb-5">
                <Icon name="Code" size={16} style={{ color: "#f57c00" }} />
                <span className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: oswald, color: "#f57c00" }}>Произвольные теги</span>
              </div>
              <div className="space-y-4">
                {field("custom_head_tags", "Теги в <head>", "HTML-код: meta, link, script, JSON-LD разметка и т.д. Вставляется в <head> страницы.", 6)}
                {field("custom_body_tags", "Теги в <body>", "HTML-код внизу страницы: счётчики, пиксели, скрытый контент для роботов.", 6)}
              </div>
            </div>

            <button onClick={save} disabled={saving} className="w-full py-3.5 text-sm font-bold rounded"
              style={{ background: "#f57c00", color: "#0d1117", fontFamily: oswald, letterSpacing: "0.05em", cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Сохраняю..." : "Сохранить SEO-настройки"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}