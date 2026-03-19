import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { CATALOG_LEAF_CATEGORIES } from "@/components/specnaz/constants";

const API = "https://functions.poehali.dev/867570d6-4bd3-4fdc-977c-f50fd3926c0e";

const STOCK_OPTIONS = [
  { value: "on_order", label: "Много",     filled: 4 },
  { value: "in_stock", label: "В наличии", filled: 3 },
  { value: "few",      label: "Мало",      filled: 2 },
  { value: "low",      label: "Под заказ", filled: 1 },
] as const;
type StockStatus = typeof STOCK_OPTIONS[number]["value"];

interface ProductImage { id: number; url: string; sort_order: number; }
interface ProductSize  { id?: number; size_label: string; price_add: number; is_available: boolean; }

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
  gtin: string;
  barcode_url: string;
  images: ProductImage[];
  sizes: ProductSize[];
}

function StockBadge({ status }: { status: StockStatus }) {
  const opt = STOCK_OPTIONS.find(o => o.value === status) ?? STOCK_OPTIONS[1];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex items-center gap-0.5">
        {[0,1,2,3].map(i => (
          <span key={i} className="rounded-full inline-block" style={{
            width: 7, height: 7,
            background: i < opt.filled ? "#f57c00" : "transparent",
            border: `1.5px solid ${i < opt.filled ? "#f57c00" : "rgba(245,124,0,0.3)"}`,
          }} />
        ))}
      </span>
      <span className="text-xs" style={{ color: opt.filled <= 1 ? "#facc15" : "#f57c00" }}>{opt.label}</span>
    </span>
  );
}

const emptyForm = () => ({
  name: "", category: CATALOG_LEAF_CATEGORIES[0], description: "",
  gost: "", badge: "", base_price: 0, image_url: null as string | null,
  is_active: true, sort_order: 0, stock_status: "in_stock" as StockStatus,
  gtin: "",
});

const DEFAULT_SIZES: ProductSize[] = [
  { size_label: "44-46/158-164", price_add: 0, is_available: true },
  { size_label: "44-46/170-176", price_add: 0, is_available: true },
  { size_label: "48-50/158-164", price_add: 0, is_available: true },
  { size_label: "48-50/170-176", price_add: 0, is_available: true },
  { size_label: "52-54/170-176", price_add: 0, is_available: true },
  { size_label: "56-58/170-176", price_add: 200, is_available: true },
  { size_label: "60-62/170-176", price_add: 400, is_available: true },
];

export default function Admin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formImages, setFormImages] = useState<{ url: string }[]>([]);
  const [formSizes, setFormSizes] = useState<ProductSize[]>(DEFAULT_SIZES);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"main"|"photos"|"sizes">("main");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    const res  = await fetch(API);
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm());
    setFormImages([]);
    setFormSizes(DEFAULT_SIZES);
    setActiveTab("main");
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditId(p.id);
    setForm({
      name: p.name, category: p.category, description: p.description,
      gost: p.gost, badge: p.badge || "", base_price: p.base_price,
      image_url: p.image_url, is_active: p.is_active, sort_order: p.sort_order,
      stock_status: p.stock_status ?? "in_stock", gtin: p.gtin || "",
    });
    setFormImages((p.images || []).map(i => ({ url: i.url })));
    setFormSizes(p.sizes?.length ? p.sizes : DEFAULT_SIZES);
    setActiveTab("main");
    setShowForm(true);
  };

  // Загрузка главного фото
  const handleMainPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = (reader.result as string).split(",")[1];
      const res  = await fetch(`${API}/upload`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ file: b64, contentType: file.type }) });
      const data = await res.json();
      setForm(f => ({ ...f, image_url: data.url }));
      setUploading(false);
      notify("Фото загружено");
    };
    reader.readAsDataURL(file);
  };

  // Загрузка фото галереи
  const handleGalleryPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (formImages.length >= 5) { notify("Максимум 5 фотографий", false); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = (reader.result as string).split(",")[1];
      const res  = await fetch(`${API}/upload`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ file: b64, contentType: file.type }) });
      const data = await res.json();
      setFormImages(imgs => [...imgs, { url: data.url }]);
      setUploading(false);
      notify("Фото добавлено в галерею");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeGalleryPhoto = (idx: number) => {
    setFormImages(imgs => imgs.filter((_, i) => i !== idx));
  };

  // Размерный ряд
  const updateSize = (idx: number, field: keyof ProductSize, value: string | number | boolean) => {
    setFormSizes(sz => sz.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };
  const addSize = () => {
    setFormSizes(sz => [...sz, { size_label: "", price_add: 0, is_available: true }]);
  };
  const removeSize = (idx: number) => {
    setFormSizes(sz => sz.filter((_, i) => i !== idx));
  };

  const save = async () => {
    if (!form.name.trim()) { notify("Введите название товара", false); return; }
    setSaving(true);
    const body = { ...form, badge: form.badge?.trim() || null, base_price: Number(form.base_price), sort_order: Number(form.sort_order) };

    let productId = editId;
    if (editId !== null) {
      const res  = await fetch(API, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, id: editId }) });
      const data = await res.json();
      if (data.barcode_url) notify("Штрихкод сгенерирован");
    } else {
      const res  = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      productId  = data.id;
      if (data.barcode_url) notify("Штрихкод сгенерирован");
    }

    // Синхронизируем фото галереи
    if (productId) {
      // Получаем текущие фото с сервера
      const currentRes  = await fetch(API);
      const currentData = await currentRes.json();
      const currentProd = (currentData.products || []).find((p: Product) => p.id === productId);
      const currentImgs: ProductImage[] = currentProd?.images || [];

      // Удаляем лишние
      for (const ci of currentImgs) {
        if (!formImages.find(fi => fi.url === ci.url)) {
          await fetch(`${API}/images?id=${ci.id}`, { method: "DELETE" });
        }
      }
      // Добавляем новые
      for (let i = 0; i < formImages.length; i++) {
        if (!currentImgs.find(ci => ci.url === formImages[i].url)) {
          await fetch(`${API}/images`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product_id: productId, url: formImages[i].url, sort_order: i }) });
        }
      }

      // Синхронизируем размеры — перезаписываем всё
      for (const s of formSizes) {
        if (s.size_label.trim()) {
          const existingSize = currentProd?.sizes?.find((cs: ProductSize & { id: number }) => cs.id === (s as ProductSize & { id?: number }).id);
          await fetch(`${API}/sizes`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...s, product_id: productId, id: existingSize ? (s as ProductSize & { id?: number }).id : undefined }),
          });
        }
      }
    }

    setSaving(false);
    setShowForm(false);
    notify(editId !== null ? "Товар обновлён" : "Товар добавлен");
    load();
  };

  const remove = async (id: number, name: string) => {
    if (!confirm(`Скрыть товар «${name}»?`)) return;
    await fetch(`${API}?id=${id}`, { method: "DELETE" });
    notify("Товар скрыт");
    load();
  };

  const inp = "w-full px-3 py-2.5 rounded text-sm outline-none";
  const inpStyle = { background: "#0d1117", border: "1px solid rgba(245,124,0,0.3)", color: "#e8e0d0" };
  const labelStyle = { color: "#8a9ab5", fontFamily: "'Oswald', sans-serif", fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.08em" };

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e8e0d0", fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-5 py-3 rounded shadow-lg text-sm font-medium" style={{
          background: toast.ok ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)",
          border: `1px solid ${toast.ok ? "rgba(74,222,128,0.4)" : "rgba(248,113,113,0.4)"}`,
          color: toast.ok ? "#4ade80" : "#f87171",
        }}>{toast.msg}</div>
      )}

      {/* Шапка */}
      <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(245,124,0,0.2)", background: "#080c11" }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 flex items-center justify-center" style={{ background: "#f57c00" }}>
            <Icon name="Flame" size={14} style={{ color: "#0d1117" }} />
          </div>
          <span className="font-bold tracking-widest uppercase" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>СПЕЦНАЗ</span>
          <span className="text-sm" style={{ color: "#8a9ab5" }}>/ Администратор</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/admin/promo" className="text-sm flex items-center gap-1" style={{ color: "#8a9ab5" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#f57c00")} onMouseLeave={e => (e.currentTarget.style.color = "#8a9ab5")}>
            <Icon name="Send" size={14} /> Рассылка
          </a>
          <a href="/" className="text-sm flex items-center gap-1" style={{ color: "#8a9ab5" }}>
            <Icon name="ArrowLeft" size={14} /> На сайт
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>ТОВАРЫ</h1>
            <p className="text-sm mt-1" style={{ color: "#8a9ab5" }}>{products.length} позиций в каталоге</p>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-5 py-3 text-sm font-bold rounded"
            style={{ background: "#f57c00", color: "#0d1117", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em", cursor: "pointer" }}>
            <Icon name="Plus" size={16} /> Добавить товар
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20" style={{ color: "#8a9ab5" }}>Загрузка...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 rounded" style={{ border: "1px dashed rgba(245,124,0,0.3)", color: "#8a9ab5" }}>
            <Icon name="Package" size={40} style={{ margin: "0 auto 12px", color: "rgba(138,154,181,0.3)" }} />
            <div>Товаров пока нет. Добавьте первый!</div>
          </div>
        ) : (
          <div className="rounded overflow-hidden" style={{ border: "1px solid rgba(245,124,0,0.2)" }}>
            <div className="grid grid-cols-12 px-5 py-3 text-xs uppercase tracking-wider"
              style={{ background: "#13181f", color: "#8a9ab5", fontFamily: "'Oswald', sans-serif", borderBottom: "1px solid rgba(245,124,0,0.15)" }}>
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
                <div className="col-span-1">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded object-cover" style={{ border: "1px solid rgba(245,124,0,0.2)" }} />
                  ) : (
                    <div className="w-10 h-10 rounded flex items-center justify-center" style={{ background: "#13181f", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <Icon name="Image" size={14} style={{ color: "rgba(138,154,181,0.4)" }} />
                    </div>
                  )}
                </div>
                <div className="col-span-3">
                  <div className="text-sm font-medium" style={{ color: "#e8e0d0" }}>{p.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {p.badge && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(245,124,0,0.15)", color: "#f57c00" }}>{p.badge}</span>}
                    {p.gtin && <span className="text-xs" style={{ color: "#8a9ab5" }}>EAN: {p.gtin}</span>}
                  </div>
                </div>
                <div className="col-span-2 text-xs" style={{ color: "#8a9ab5" }}>{p.category}</div>
                <div className="col-span-2 text-right text-sm font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>
                  {p.base_price.toLocaleString("ru-RU")} ₽
                </div>
                <div className="col-span-2 flex justify-center">
                  <StockBadge status={p.stock_status ?? "in_stock"} />
                </div>
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

      {/* Модальная форма */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
          <div className="w-full max-w-2xl rounded-lg overflow-hidden flex flex-col" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.3)", maxHeight: "92vh" }}>

            {/* Шапка */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(245,124,0,0.2)" }}>
              <h2 className="text-lg font-bold uppercase" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
                {editId !== null ? "Редактировать товар" : "Новый товар"}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "#8a9ab5", cursor: "pointer" }}>
                <Icon name="X" size={20} />
              </button>
            </div>

            {/* Табы */}
            <div className="flex border-b flex-shrink-0" style={{ borderColor: "rgba(245,124,0,0.15)" }}>
              {([
                { id: "main",   label: "Основное",    icon: "FileText" },
                { id: "photos", label: "Фотографии",  icon: "Images" },
                { id: "sizes",  label: "Размерный ряд", icon: "Ruler" },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className="flex items-center gap-1.5 px-5 py-3 text-sm"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontFamily: "'Oswald', sans-serif", letterSpacing: "0.04em",
                    color: activeTab === t.id ? "#f57c00" : "#8a9ab5",
                    borderBottom: activeTab === t.id ? "2px solid #f57c00" : "2px solid transparent",
                  }}>
                  <Icon name={t.icon} size={14} /> {t.label}
                </button>
              ))}
            </div>

            {/* Контент таба */}
            <div className="overflow-y-auto flex-1 px-6 py-5">

              {/* ── Основное ── */}
              {activeTab === "main" && (
                <div className="space-y-4">
                  {/* Главное фото */}
                  <div>
                    <div style={labelStyle} className="mb-2">Главное фото</div>
                    <div className="flex items-center gap-4">
                      {form.image_url ? (
                        <img src={form.image_url} alt="" className="w-20 h-20 rounded object-cover" style={{ border: "1px solid rgba(245,124,0,0.3)" }} />
                      ) : (
                        <div className="w-20 h-20 rounded flex items-center justify-center" style={{ background: "#0d1117", border: "1px dashed rgba(245,124,0,0.3)" }}>
                          <Icon name="Image" size={24} style={{ color: "rgba(138,154,181,0.4)" }} />
                        </div>
                      )}
                      <div>
                        <button onClick={() => fileRef.current?.click()} disabled={uploading}
                          className="px-4 py-2 text-sm rounded"
                          style={{ background: "rgba(245,124,0,0.15)", border: "1px solid rgba(245,124,0,0.3)", color: "#f57c00", cursor: "pointer" }}>
                          {uploading ? "Загружаю..." : "Загрузить фото"}
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleMainPhoto} />
                        <div className="text-xs mt-1" style={{ color: "#8a9ab5" }}>JPG, PNG, WebP</div>
                      </div>
                    </div>
                  </div>

                  {/* Название */}
                  <div>
                    <div style={labelStyle} className="mb-2">Название *</div>
                    <input className={inp} style={inpStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Костюм сварщика КС-01" />
                  </div>

                  {/* Категория */}
                  <div>
                    <div style={labelStyle} className="mb-2">Категория</div>
                    <select className={inp} style={inpStyle} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                      {CATALOG_LEAF_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Описание */}
                  <div>
                    <div style={labelStyle} className="mb-2">Описание</div>
                    <textarea className={inp} style={{ ...inpStyle, resize: "none" }} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Защита от искр и брызг металла..." />
                  </div>

                  {/* ГОСТ + Метка */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div style={labelStyle} className="mb-2">ГОСТ</div>
                      <input className={inp} style={inpStyle} value={form.gost} onChange={e => setForm(f => ({ ...f, gost: e.target.value }))} placeholder="ГОСТ Р 12.4.250" />
                    </div>
                    <div>
                      <div style={labelStyle} className="mb-2">Метка (значок)</div>
                      <input className={inp} style={inpStyle} value={form.badge || ""} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} placeholder="Хит продаж" />
                    </div>
                  </div>

                  {/* GTIN + Штрихкод */}
                  <div>
                    <div style={labelStyle} className="mb-2">GTIN (EAN-13) — штрихкод товара</div>
                    <input className={inp} style={inpStyle} value={form.gtin} onChange={e => setForm(f => ({ ...f, gtin: e.target.value.replace(/\D/g, "").slice(0, 13) }))} placeholder="4600000000000" maxLength={13} />
                    <div className="text-xs mt-1" style={{ color: "#8a9ab5" }}>13 цифр. Штрихкод EAN-13 генерируется автоматически при сохранении.</div>
                  </div>

                  {/* Цена + Порядок */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div style={labelStyle} className="mb-2">Базовая цена, ₽</div>
                      <input type="number" min={0} className={inp} style={inpStyle} value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <div style={labelStyle} className="mb-2">Порядок сортировки</div>
                      <input type="number" min={0} className={inp} style={inpStyle} value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
                    </div>
                  </div>

                  {/* Остаток */}
                  <div>
                    <div style={labelStyle} className="mb-2">Остаток на складе</div>
                    <div className="grid grid-cols-2 gap-2">
                      {STOCK_OPTIONS.map(opt => {
                        const isActive = form.stock_status === opt.value;
                        return (
                          <label key={opt.value} className="flex items-center gap-3 p-3 rounded cursor-pointer"
                            style={{ background: isActive ? "rgba(245,124,0,0.08)" : "#0d1117", border: `1px solid ${isActive ? "rgba(245,124,0,0.4)" : "rgba(255,255,255,0.06)"}` }}>
                            <input type="radio" name="stock_status" value={opt.value} checked={isActive}
                              onChange={() => setForm(f => ({ ...f, stock_status: opt.value }))} className="hidden" />
                            <span className="flex items-center gap-0.5">
                              {[0,1,2,3].map(i => <span key={i} className="rounded-full inline-block" style={{ width: 7, height: 7, background: i < opt.filled ? "#f57c00" : "transparent", border: `1.5px solid ${i < opt.filled ? "#f57c00" : "rgba(245,124,0,0.3)"}` }} />)}
                            </span>
                            <span className="text-sm" style={{ color: isActive ? "#e8e0d0" : "#8a9ab5" }}>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Активен */}
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded" style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ accentColor: "#f57c00", width: 16, height: 16 }} />
                    <span className="text-sm" style={{ color: "#c8bca8" }}>Показывать на сайте</span>
                  </label>
                </div>
              )}

              {/* ── Фотографии ── */}
              {activeTab === "photos" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div style={labelStyle}>Галерея товара</div>
                      <div className="text-xs mt-0.5" style={{ color: "#8a9ab5" }}>До 5 фотографий · первая — главная в карточке</div>
                    </div>
                    <button onClick={() => photoRef.current?.click()} disabled={uploading || formImages.length >= 5}
                      className="flex items-center gap-2 px-4 py-2 text-sm rounded"
                      style={{ background: formImages.length >= 5 ? "rgba(255,255,255,0.05)" : "rgba(245,124,0,0.15)", border: "1px solid rgba(245,124,0,0.3)", color: formImages.length >= 5 ? "#8a9ab5" : "#f57c00", cursor: formImages.length >= 5 ? "default" : "pointer" }}>
                      <Icon name="Plus" size={14} /> {uploading ? "Загружаю..." : "Добавить фото"}
                    </button>
                    <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryPhoto} />
                  </div>

                  {formImages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 rounded-lg"
                      style={{ border: "2px dashed rgba(245,124,0,0.2)", color: "#8a9ab5" }}>
                      <Icon name="Images" size={36} style={{ color: "rgba(138,154,181,0.2)", marginBottom: 8 }} />
                      <div className="text-sm">Нажмите «Добавить фото» для загрузки</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {formImages.map((img, idx) => (
                        <div key={idx} className="relative rounded overflow-hidden group" style={{ aspectRatio: "1/1" }}>
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                          {idx === 0 && (
                            <div className="absolute top-2 left-2 px-2 py-0.5 text-xs rounded font-bold" style={{ background: "#f57c00", color: "#0d1117", fontFamily: "'Oswald', sans-serif" }}>Главное</div>
                          )}
                          <button onClick={() => removeGalleryPhoto(idx)}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: "rgba(248,113,113,0.9)", border: "none", cursor: "pointer" }}>
                            <Icon name="X" size={14} style={{ color: "#fff" }} />
                          </button>
                          <div className="absolute bottom-2 left-2 text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.6)", color: "#8a9ab5" }}>
                            {idx + 1} / 5
                          </div>
                        </div>
                      ))}
                      {formImages.length < 5 && (
                        <button onClick={() => photoRef.current?.click()}
                          className="rounded flex flex-col items-center justify-center gap-2"
                          style={{ aspectRatio: "1/1", border: "2px dashed rgba(245,124,0,0.25)", background: "rgba(245,124,0,0.04)", cursor: "pointer" }}>
                          <Icon name="Plus" size={24} style={{ color: "rgba(245,124,0,0.4)" }} />
                          <span className="text-xs" style={{ color: "#8a9ab5" }}>Добавить</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Размерный ряд ── */}
              {activeTab === "sizes" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div style={labelStyle}>Размеры товара</div>
                      <div className="text-xs mt-0.5" style={{ color: "#8a9ab5" }}>Наценка в рублях к базовой цене для каждого размера</div>
                    </div>
                    <button onClick={addSize} className="flex items-center gap-1.5 px-3 py-2 text-xs rounded"
                      style={{ background: "rgba(245,124,0,0.15)", border: "1px solid rgba(245,124,0,0.3)", color: "#f57c00", cursor: "pointer", fontFamily: "'Oswald', sans-serif" }}>
                      <Icon name="Plus" size={12} /> Добавить размер
                    </button>
                  </div>

                  {/* Шапка */}
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 mb-1 text-xs uppercase tracking-wider" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>
                    <div className="col-span-1 text-center">☑</div>
                    <div className="col-span-5">Размер / Рост</div>
                    <div className="col-span-4">Наценка, ₽</div>
                    <div className="col-span-2"></div>
                  </div>

                  <div className="space-y-2">
                    {formSizes.map((sz, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center px-3 py-2 rounded"
                        style={{ background: sz.is_available ? "#0d1117" : "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", opacity: sz.is_available ? 1 : 0.5 }}>
                        <div className="col-span-1 flex justify-center">
                          <input type="checkbox" checked={sz.is_available} onChange={e => updateSize(idx, "is_available", e.target.checked)}
                            style={{ accentColor: "#f57c00", width: 15, height: 15, cursor: "pointer" }} />
                        </div>
                        <div className="col-span-5">
                          <input className="w-full px-2 py-1.5 rounded text-sm outline-none" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)", color: "#e8e0d0" }}
                            value={sz.size_label} onChange={e => updateSize(idx, "size_label", e.target.value)} placeholder="44-46/170-176" />
                        </div>
                        <div className="col-span-4">
                          <div className="relative">
                            <input type="number" min={0} className="w-full px-2 py-1.5 rounded text-sm outline-none pr-6"
                              style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)", color: "#e8e0d0" }}
                              value={sz.price_add} onChange={e => updateSize(idx, "price_add", Number(e.target.value))} />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: "#8a9ab5" }}>₽</span>
                          </div>
                        </div>
                        <div className="col-span-2 flex justify-end">
                          <button onClick={() => removeSize(idx)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(248,113,113,0.5)", padding: 4 }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                            onMouseLeave={e => (e.currentTarget.style.color = "rgba(248,113,113,0.5)")}>
                            <Icon name="Trash2" size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {formSizes.length === 0 && (
                    <div className="text-center py-8 text-sm" style={{ color: "#8a9ab5" }}>
                      Добавьте размеры через кнопку «Добавить размер»
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Кнопки */}
            <div className="px-6 py-4 flex gap-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(245,124,0,0.15)" }}>
              <button onClick={save} disabled={saving} className="flex-1 py-3 text-sm font-bold rounded"
                style={{ background: "#f57c00", color: "#0d1117", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em", cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Сохраняю..." : editId !== null ? "Сохранить изменения" : "Добавить товар"}
              </button>
              <button onClick={() => setShowForm(false)} className="px-5 py-3 text-sm rounded"
                style={{ background: "transparent", border: "1px solid rgba(138,154,181,0.3)", color: "#8a9ab5", cursor: "pointer" }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
