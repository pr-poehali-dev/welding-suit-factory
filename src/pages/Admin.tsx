import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { CATALOG_LEAF_CATEGORIES } from "@/components/specnaz/constants";

const API = "https://functions.poehali.dev/867570d6-4bd3-4fdc-977c-f50fd3926c0e";

const STOCK_OPTIONS = [
  { value: "on_order", label: "Много",      filled: 4 },
  { value: "in_stock", label: "В наличии",  filled: 3 },
  { value: "few",      label: "Мало",       filled: 1 },
  { value: "low",      label: "Под заказ",  filled: 0 },
] as const;

type StockStatus = typeof STOCK_OPTIONS[number]["value"];

function StockBadge({ status }: { status: StockStatus }) {
  const opt = STOCK_OPTIONS.find(o => o.value === status) ?? STOCK_OPTIONS[1];
  const labelColor = opt.filled === 0 ? "#f87171" : opt.filled === 1 ? "#facc15" : "#f57c00";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex items-center gap-1">
        {[0, 1, 2, 3].map(i => (
          <span key={i} className="rounded-full inline-block"
            style={{
              width: 8, height: 8,
              background: i < opt.filled ? "#f57c00" : "transparent",
              border: `1.5px solid ${i < opt.filled ? "#f57c00" : "rgba(245,124,0,0.3)"}`,
            }} />
        ))}
      </span>
      <span className="text-xs" style={{ color: labelColor }}>{opt.label}</span>
    </span>
  );
}

interface Product {
  id: number;
  name: string;
  category: string;
  description: string;
  gost: string;
  badge: string | null;
  base_price: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  stock_status: StockStatus;
}

const emptyForm = (): Omit<Product, "id"> => ({
  name: "",
  category: CATALOG_LEAF_CATEGORIES[0],
  description: "",
  gost: "",
  badge: "",
  base_price: 0,
  image_url: null,
  is_active: true,
  sort_order: 0,
  stock_status: "in_stock",
});

export default function Admin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    const res = await fetch(API);
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      category: p.category,
      description: p.description,
      gost: p.gost,
      badge: p.badge || "",
      base_price: p.base_price,
      image_url: p.image_url,
      is_active: p.is_active,
      sort_order: p.sort_order,
      stock_status: p.stock_status ?? "in_stock",
    });
    setShowForm(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = (reader.result as string).split(",")[1];
      const res = await fetch(`${API}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: b64, contentType: file.type }),
      });
      const data = await res.json();
      setForm((f) => ({ ...f, image_url: data.url }));
      setUploading(false);
      notify("Фото загружено");
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.name.trim()) { notify("Введите название товара", false); return; }
    setSaving(true);
    const body = {
      ...form,
      badge: form.badge?.trim() || null,
      base_price: Number(form.base_price),
      sort_order: Number(form.sort_order),
    };
    if (editId !== null) {
      await fetch(API, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, id: editId }) });
      notify("Товар обновлён");
    } else {
      await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      notify("Товар добавлен");
    }
    setSaving(false);
    setShowForm(false);
    load();
  };

  const remove = async (id: number, name: string) => {
    if (!confirm(`Удалить «${name}»?`)) return;
    await fetch(`${API}?id=${id}`, { method: "DELETE" });
    notify("Товар удалён");
    load();
  };

  const inp = "w-full px-3 py-2.5 rounded text-sm outline-none";
  const inpStyle = { background: "#0d1117", border: "1px solid rgba(245,124,0,0.3)", color: "#e8e0d0" };
  const labelStyle = { color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" };

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
          <span className="text-sm" style={{ color: "#8a9ab5" }}>/ Панель администратора</span>
        </div>
        <a href="/" className="text-sm flex items-center gap-1" style={{ color: "#8a9ab5" }}>
          <Icon name="ArrowLeft" size={14} /> На сайт
        </a>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Заголовок + кнопка */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>ТОВАРЫ</h1>
            <p className="text-sm mt-1" style={{ color: "#8a9ab5" }}>{products.length} позиций в каталоге</p>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-5 py-3 text-sm font-medium rounded" style={{ background: "#f57c00", color: "#0d1117", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}>
            <Icon name="Plus" size={16} /> Добавить товар
          </button>
        </div>

        {/* Таблица */}
        {loading ? (
          <div className="text-center py-20" style={{ color: "#8a9ab5" }}>Загрузка...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 rounded" style={{ border: "1px dashed rgba(245,124,0,0.3)", color: "#8a9ab5" }}>
            <Icon name="Package" size={40} style={{ margin: "0 auto 12px", color: "rgba(138,154,181,0.3)" }} />
            <div>Товаров пока нет. Добавьте первый!</div>
          </div>
        ) : (
          <div className="rounded overflow-hidden" style={{ border: "1px solid rgba(245,124,0,0.2)" }}>
            {/* Шапка таблицы */}
            <div className="grid grid-cols-12 px-5 py-3 text-xs uppercase tracking-wider" style={{ background: "#13181f", color: "#8a9ab5", fontFamily: "'Oswald', sans-serif", borderBottom: "1px solid rgba(245,124,0,0.15)" }}>
              <div className="col-span-1">Фото</div>
              <div className="col-span-3">Название</div>
              <div className="col-span-2">Категория</div>
              <div className="col-span-2 text-right">Цена</div>
              <div className="col-span-2 text-center">Остаток</div>
              <div className="col-span-2 text-right">Действия</div>
            </div>

            {products.map((p, idx) => (
              <div key={p.id} className="grid grid-cols-12 px-5 py-3 items-center gap-2"
                style={{ borderBottom: idx < products.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: idx % 2 === 0 ? "#0d1117" : "#0a0e14" }}>

                {/* Фото */}
                <div className="col-span-1">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded object-cover" style={{ border: "1px solid rgba(245,124,0,0.2)" }} />
                  ) : (
                    <div className="w-10 h-10 rounded flex items-center justify-center" style={{ background: "#13181f", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <Icon name="Image" size={14} style={{ color: "rgba(138,154,181,0.4)" }} />
                    </div>
                  )}
                </div>

                {/* Название */}
                <div className="col-span-3">
                  <div className="text-sm font-medium" style={{ color: "#e8e0d0" }}>{p.name}</div>
                  {p.badge && <span className="text-xs px-1.5 py-0.5 rounded mt-0.5 inline-block" style={{ background: "rgba(245,124,0,0.15)", color: "#f57c00" }}>{p.badge}</span>}
                </div>

                {/* Категория */}
                <div className="col-span-2 text-xs" style={{ color: "#8a9ab5" }}>{p.category}</div>

                {/* Цена */}
                <div className="col-span-2 text-right text-sm font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>
                  {p.base_price.toLocaleString("ru-RU")} ₽
                </div>

                {/* Остаток */}
                <div className="col-span-2 flex justify-center">
                  <StockBadge status={p.stock_status ?? "in_stock"} />
                </div>

                {/* Действия */}
                <div className="col-span-2 flex justify-end gap-2">
                  <button onClick={() => openEdit(p)} style={{ background: "rgba(245,124,0,0.1)", border: "1px solid rgba(245,124,0,0.3)", color: "#f57c00", cursor: "pointer", borderRadius: 4, padding: "4px 10px" }} className="text-xs">
                    Изменить
                  </button>
                  <button onClick={() => remove(p.id, p.name)} style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", cursor: "pointer", borderRadius: 4, padding: "4px 8px" }}>
                    <Icon name="Trash2" size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно формы */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-xl rounded-lg overflow-hidden" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.3)", maxHeight: "90vh", overflowY: "auto" }}>

            {/* Шапка модалки */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(245,124,0,0.2)" }}>
              <h2 className="text-lg font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
                {editId !== null ? "Редактировать товар" : "Новый товар"}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "#8a9ab5", cursor: "pointer" }}>
                <Icon name="X" size={20} />
              </button>
            </div>

            {/* Форма */}
            <div className="px-6 py-5 space-y-4">

              {/* Фото */}
              <div>
                <div className="text-xs uppercase tracking-widest mb-2" style={labelStyle}>Фото товара</div>
                <div className="flex items-center gap-4">
                  {form.image_url ? (
                    <img src={form.image_url} alt="" className="w-20 h-20 rounded object-cover" style={{ border: "1px solid rgba(245,124,0,0.3)" }} />
                  ) : (
                    <div className="w-20 h-20 rounded flex items-center justify-center" style={{ background: "#0d1117", border: "1px dashed rgba(245,124,0,0.3)" }}>
                      <Icon name="Image" size={24} style={{ color: "rgba(138,154,181,0.4)" }} />
                    </div>
                  )}
                  <div>
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="px-4 py-2 text-sm rounded"
                      style={{ background: "rgba(245,124,0,0.15)", border: "1px solid rgba(245,124,0,0.3)", color: "#f57c00", cursor: "pointer" }}
                    >
                      {uploading ? "Загружаю..." : "Загрузить фото"}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                    <div className="text-xs mt-1" style={{ color: "#8a9ab5" }}>JPG, PNG, WebP</div>
                  </div>
                </div>
              </div>

              {/* Название */}
              <div>
                <div className="text-xs uppercase tracking-widest mb-2" style={labelStyle}>Название *</div>
                <input className={inp} style={inpStyle} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Костюм сварщика КС-01" />
              </div>

              {/* Категория */}
              <div>
                <div className="text-xs uppercase tracking-widest mb-2" style={labelStyle}>Категория</div>
                <select className={inp} style={inpStyle} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {CATALOG_LEAF_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Описание */}
              <div>
                <div className="text-xs uppercase tracking-widest mb-2" style={labelStyle}>Описание</div>
                <textarea className={inp} style={{ ...inpStyle, resize: "none" }} rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Защита от искр и брызг металла..." />
              </div>

              {/* ГОСТ + Метка */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2" style={labelStyle}>ГОСТ</div>
                  <input className={inp} style={inpStyle} value={form.gost} onChange={(e) => setForm((f) => ({ ...f, gost: e.target.value }))} placeholder="ГОСТ Р 12.4.250" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2" style={labelStyle}>Метка (значок)</div>
                  <input className={inp} style={inpStyle} value={form.badge || ""} onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))} placeholder="Хит продаж" />
                </div>
              </div>

              {/* Цена + Порядок */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2" style={labelStyle}>Базовая цена, ₽</div>
                  <input type="number" min={0} className={inp} style={inpStyle} value={form.base_price} onChange={(e) => setForm((f) => ({ ...f, base_price: Number(e.target.value) }))} />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2" style={labelStyle}>Порядок сортировки</div>
                  <input type="number" min={0} className={inp} style={inpStyle} value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />
                </div>
              </div>

              {/* Остаток */}
              <div>
                <div className="text-xs uppercase tracking-widest mb-2" style={labelStyle}>Остаток на складе</div>
                <div className="grid grid-cols-2 gap-2">
                  {STOCK_OPTIONS.map(opt => {
                    const isActive = form.stock_status === opt.value;
                    return (
                      <label key={opt.value} className="flex items-center gap-3 p-3 rounded cursor-pointer transition-all"
                        style={{
                          background: isActive ? "rgba(245,124,0,0.08)" : "#0d1117",
                          border: `1px solid ${isActive ? "rgba(245,124,0,0.4)" : "rgba(255,255,255,0.06)"}`,
                        }}>
                        <input type="radio" name="stock_status" value={opt.value} checked={isActive}
                          onChange={() => setForm(f => ({ ...f, stock_status: opt.value }))}
                          className="hidden" />
                        {/* Кружки */}
                        <span className="flex items-center gap-0.5">
                          {[0, 1, 2, 3].map(i => (
                            <span key={i} className="rounded-full inline-block"
                              style={{
                                width: 7, height: 7,
                                background: i < opt.filled ? "#f57c00" : "transparent",
                                border: `1.5px solid ${i < opt.filled ? "#f57c00" : "rgba(245,124,0,0.3)"}`,
                              }} />
                          ))}
                        </span>
                        <span className="text-sm" style={{ color: isActive ? "#e8e0d0" : "#8a9ab5" }}>
                          {opt.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Активен */}
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded" style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.06)" }}>
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} style={{ accentColor: "#f57c00", width: 16, height: 16 }} />
                <span className="text-sm" style={{ color: "#c8bca8" }}>Показывать на сайте</span>
              </label>

              {/* Кнопки */}
              <div className="flex gap-3 pt-2">
                <button onClick={save} disabled={saving} className="flex-1 py-3 text-sm font-bold rounded" style={{ background: "#f57c00", color: "#0d1117", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em", cursor: "pointer" }}>
                  {saving ? "Сохраняю..." : editId !== null ? "Сохранить изменения" : "Добавить товар"}
                </button>
                <button onClick={() => setShowForm(false)} className="px-5 py-3 text-sm rounded" style={{ background: "transparent", border: "1px solid rgba(138,154,181,0.3)", color: "#8a9ab5", cursor: "pointer" }}>
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}