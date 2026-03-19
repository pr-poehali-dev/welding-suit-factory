import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { CATALOG_LEAF_CATEGORIES } from "@/components/specnaz/constants";
import { API, Product, ProductImage, ProductSize, ManagerForm, DEFAULT_SIZES, emptyForm } from "./managerTypes";
import ManagerAuth from "./ManagerAuth";
import ManagerProductForm from "./ManagerProductForm";

export default function Manager() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"main"|"photos"|"sizes">("main");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [form, setForm] = useState<ManagerForm>(emptyForm());
  const [formImages, setFormImages] = useState<{ url: string }[]>([]);
  const [formSizes, setFormSizes] = useState<ProductSize[]>(DEFAULT_SIZES);

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res  = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auth", role: "manager", password }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem("manager_auth", "1");
        setAuthed(true);
        load();
      } else {
        setAuthError("Неверный пароль");
      }
    } catch {
      setAuthError("Ошибка соединения. Попробуйте ещё раз.");
    }
    setAuthLoading(false);
  };

  useEffect(() => {
    if (sessionStorage.getItem("manager_auth")) { setAuthed(true); load(); }
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch(API);
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      setProducts([]);
    }
    setLoading(false);
  };

  const openEdit = (p: Product) => {
    setEditId(p.id);
    setForm({ name: p.name, category: p.category, description: p.description, gost: p.gost,
      badge: p.badge || "", base_price: p.base_price, image_url: p.image_url, is_active: p.is_active,
      sort_order: p.sort_order, stock_status: p.stock_status ?? "in_stock", gtin: p.gtin || "" });
    setFormImages((p.images || []).map(i => ({ url: i.url })));
    setFormSizes(p.sizes?.length ? p.sizes.map(s => ({ ...s, gtin: s.gtin || "" })) : DEFAULT_SIZES);
    setActiveTab("main");
    setShowForm(true);
  };

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm());
    setFormImages([]);
    setFormSizes(DEFAULT_SIZES);
    setActiveTab("main");
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) { notify("Введите название", false); return; }
    setSaving(true);
    const body = { ...form, badge: form.badge?.trim() || null, base_price: Number(form.base_price), sort_order: Number(form.sort_order) };
    let productId = editId;
    if (editId !== null) {
      await fetch(API, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, id: editId }) });
    } else {
      const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", ...body }) });
      productId = (await res.json()).id;
    }
    if (productId) {
      const currentRes  = await fetch(API);
      const currentProd = ((await currentRes.json()).products || []).find((p: Product) => p.id === productId);
      const currentImgs: ProductImage[] = currentProd?.images || [];
      for (const ci of currentImgs) {
        if (!formImages.find(fi => fi.url === ci.url))
          await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_image", id: ci.id }) });
      }
      for (let i = 0; i < formImages.length; i++) {
        if (!currentImgs.find(ci => ci.url === formImages[i].url))
          await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add_image", product_id: productId, url: formImages[i].url, sort_order: i }) });
      }
      for (const s of formSizes) {
        if (s.size_label.trim())
          await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add_size", ...s, product_id: productId }) });
      }
    }
    setSaving(false);
    setShowForm(false);
    notify(editId !== null ? "Товар обновлён" : "Товар добавлен");
    load();
  };

  if (!authed) return (
    <ManagerAuth
      password={password} setPassword={setPassword}
      authError={authError} setAuthError={setAuthError}
      authLoading={authLoading} onAuth={handleAuth}
    />
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

      <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(245,124,0,0.2)", background: "#080c11" }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 flex items-center justify-center" style={{ background: "#f57c00" }}>
            <Icon name="Flame" size={14} style={{ color: "#0d1117" }} />
          </div>
          <span className="font-bold tracking-widest uppercase" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>СПЕЦНАЗ</span>
          <span className="text-sm" style={{ color: "#8a9ab5" }}>/ Менеджер</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => { sessionStorage.removeItem("manager_auth"); setAuthed(false); }}
            className="text-sm flex items-center gap-1" style={{ background: "none", border: "none", cursor: "pointer", color: "#8a9ab5" }}>
            <Icon name="LogOut" size={14} /> Выйти
          </button>
          <a href="/" className="text-sm flex items-center gap-1" style={{ color: "#8a9ab5" }}>
            <Icon name="ArrowLeft" size={14} /> На сайт
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>УПРАВЛЕНИЕ ТОВАРАМИ</h1>
            <p className="text-sm mt-1" style={{ color: "#8a9ab5" }}>{products.length} позиций · только редактирование карточек</p>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-5 py-3 text-sm font-bold rounded"
            style={{ background: "#f57c00", color: "#0d1117", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em", cursor: "pointer" }}>
            <Icon name="Plus" size={16} /> Добавить товар
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20" style={{ color: "#8a9ab5" }}>Загрузка...</div>
        ) : (
          <div className="rounded overflow-hidden" style={{ border: "1px solid rgba(245,124,0,0.2)" }}>
            <div className="grid grid-cols-12 px-5 py-3 text-xs uppercase tracking-wider"
              style={{ background: "#13181f", color: "#8a9ab5", fontFamily: "'Oswald', sans-serif", borderBottom: "1px solid rgba(245,124,0,0.15)" }}>
              <div className="col-span-1">Фото</div>
              <div className="col-span-4">Название</div>
              <div className="col-span-3">Категория</div>
              <div className="col-span-2 text-right">Цена</div>
              <div className="col-span-2 text-right">Действие</div>
            </div>
            {products.map((p, idx) => (
              <div key={p.id} className="grid grid-cols-12 px-5 py-3 items-center gap-2"
                style={{ borderBottom: idx < products.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: idx % 2 === 0 ? "#0d1117" : "#0a0e14" }}>
                <div className="col-span-1">
                  {p.image_url
                    ? <img src={p.image_url} alt="" className="w-10 h-10 rounded object-cover" style={{ border: "1px solid rgba(245,124,0,0.2)" }} />
                    : <div className="w-10 h-10 rounded flex items-center justify-center" style={{ background: "#13181f", border: "1px solid rgba(255,255,255,0.06)" }}><Icon name="Image" size={14} style={{ color: "rgba(138,154,181,0.4)" }} /></div>
                  }
                </div>
                <div className="col-span-4">
                  <div className="text-sm font-medium" style={{ color: "#e8e0d0" }}>{p.name}</div>
                  {p.badge && <span className="text-xs px-1.5 py-0.5 rounded mt-0.5 inline-block" style={{ background: "rgba(245,124,0,0.15)", color: "#f57c00" }}>{p.badge}</span>}
                </div>
                <div className="col-span-3 text-xs" style={{ color: "#8a9ab5" }}>{p.category}</div>
                <div className="col-span-2 text-right text-sm font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>
                  {p.base_price.toLocaleString("ru-RU")} ₽
                </div>
                <div className="col-span-2 flex justify-end">
                  <button onClick={() => openEdit(p)} className="text-xs px-3 py-1.5 rounded"
                    style={{ background: "rgba(245,124,0,0.1)", border: "1px solid rgba(245,124,0,0.3)", color: "#f57c00", cursor: "pointer" }}>
                    Изменить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <ManagerProductForm
          editId={editId}
          form={form} setForm={setForm}
          formImages={formImages} setFormImages={setFormImages}
          formSizes={formSizes} setFormSizes={setFormSizes}
          activeTab={activeTab} setActiveTab={setActiveTab}
          uploading={uploading} setUploading={setUploading}
          saving={saving}
          onSave={save}
          onClose={() => setShowForm(false)}
          notify={notify}
        />
      )}
    </div>
  );
}
