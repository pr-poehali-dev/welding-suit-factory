import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { API, Product, FormState, ProductSize, emptyForm, DEFAULT_SIZES } from "./admin.types";
import AdminProductTable from "./AdminProductTable";
import AdminProductForm from "./AdminProductForm";

export default function Admin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formImages, setFormImages] = useState<{ url: string }[]>([]);
  const [formSizes, setFormSizes] = useState<ProductSize[]>(DEFAULT_SIZES);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"main" | "photos" | "sizes">("main");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    const res  = await fetch(`${API}?show_all=1`);
    const data = await res.json();
    setProducts((data.products || []).filter((p: Product) => p.is_active));
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
      stock_status: p.stock_status ?? "in_stock",
      protection_class: p.protection_class || "", documentation: p.documentation || "",
      materials: p.materials || "", extra_info: p.extra_info || "",
    });
    setFormImages((p.images || []).map(i => ({ url: i.url })));
    setFormSizes(p.sizes?.length ? p.sizes.map(s => ({ ...s, gtin: s.gtin || "" })) : DEFAULT_SIZES);
    setActiveTab("main");
    setShowForm(true);
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
      const res  = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", ...body }) });
      const data = await res.json();
      productId  = data.id;
      if (data.barcode_url) notify("Штрихкод сгенерирован");
    }

    if (productId) {
      const currentRes  = await fetch(`${API}?show_all=1`);
      const currentData = await currentRes.json();
      const currentProd = (currentData.products || []).find((p: Product) => p.id === productId);
      const currentImgs: { id: number; url: string }[] = currentProd?.images || [];

      for (const ci of currentImgs) {
        if (!formImages.find(fi => fi.url === ci.url)) {
          await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_image", id: ci.id }) });
        }
      }
      for (let i = 0; i < formImages.length; i++) {
        if (!currentImgs.find(ci => ci.url === formImages[i].url)) {
          await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add_image", product_id: productId, url: formImages[i].url, sort_order: i }) });
        }
      }

      for (const s of formSizes) {
        if (s.size_label.trim()) {
          const existingSize = currentProd?.sizes?.find((cs: ProductSize & { id: number }) => cs.id === (s as ProductSize & { id?: number }).id);
          await fetch(API, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "add_size", ...s, product_id: productId, id: existingSize ? (s as ProductSize & { id?: number }).id : undefined }),
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
    await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_product", id }) });
    notify("Товар скрыт");
    load();
  };

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

        <AdminProductTable
          products={products}
          loading={loading}
          onEdit={openEdit}
          onRemove={remove}
        />
      </div>

      {showForm && (
        <AdminProductForm
          editId={editId}
          form={form}
          setForm={setForm}
          formImages={formImages}
          setFormImages={setFormImages}
          formSizes={formSizes}
          setFormSizes={setFormSizes}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          uploading={uploading}
          setUploading={setUploading}
          saving={saving}
          onSave={save}
          onClose={() => setShowForm(false)}
          notify={notify}
        />
      )}
    </div>
  );
}