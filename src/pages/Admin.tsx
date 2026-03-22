import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { API, Product, FormState, ProductSize, emptyForm, DEFAULT_SIZES, sortSizes, authFetch } from "./admin.types";
import AdminProductTable from "./AdminProductTable";
import AdminProductForm from "./AdminProductForm";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminCatalogTree from "./AdminCatalogTree";
import { CATALOG_TREE, CatalogNode } from "@/components/specnaz/constants";

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
  const [activeTab, setActiveTab] = useState<"main" | "photos" | "sizes" | "stock">("main");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}?show_all=1`);
      const data = await res.json();
      setProducts((data.products || []).filter((p: Product) => p.is_active));
    } catch {
      notify("Ошибка загрузки товаров", false);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditId(null);
    const f = emptyForm();
    if (selectedCategory && selectedCategory !== "__uncategorized__") {
      f.category = selectedCategory;
    }
    setForm(f);
    setFormImages([]);
    setFormSizes(DEFAULT_SIZES);
    setActiveTab("main");
    setShowForm(true);
  };

  const openCopy = (p: Product) => {
    setEditId(null);
    setForm({
      name: "", category: p.category, description: p.description,
      gost: p.gost, badge: p.badge || "", base_price: p.base_price,
      image_url: p.image_url, is_active: p.is_active, sort_order: p.sort_order,
      stock_status: p.stock_status ?? "in_stock",
      protection_class: p.protection_class || "", documentation: p.documentation || "",
      materials: p.materials || "", extra_info: p.extra_info || "",
      pack_length: p.pack_length || 0, pack_width: p.pack_width || 0,
      pack_height: p.pack_height || 0, unit_weight: p.unit_weight || 0,
    });
    setFormImages((p.images || []).map(i => ({ url: i.url })));
    setFormSizes(p.sizes?.length ? sortSizes(p.sizes.map(s => ({ ...s, gtin: s.gtin || "", stock_qty: s.stock_qty ?? 0 }))) : DEFAULT_SIZES);
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
      pack_length: p.pack_length || 0, pack_width: p.pack_width || 0,
      pack_height: p.pack_height || 0, unit_weight: p.unit_weight || 0,
    });
    setFormImages((p.images || []).map(i => ({ url: i.url })));
    setFormSizes(p.sizes?.length ? sortSizes(p.sizes.map(s => ({ ...s, gtin: s.gtin || "", stock_qty: s.stock_qty ?? 0 }))) : DEFAULT_SIZES);
    setActiveTab("main");
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) { notify("Введите название товара", false); return; }
    const duplicate = products.find(p => p.name.trim().toLowerCase() === form.name.trim().toLowerCase() && p.id !== editId);
    if (duplicate) { notify("Товар с таким названием уже существует", false); return; }
    setSaving(true);
    try {
      const body = { ...form, badge: form.badge?.trim() || null, base_price: Number(form.base_price), sort_order: Number(form.sort_order) };

      let productId = editId;
      if (editId !== null) {
        const res  = await authFetch(API, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, id: editId }) });
        const data = await res.json();
        if (data.barcode_url) notify("Штрихкод сгенерирован");
      } else {
        const res  = await authFetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", ...body }) });
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
            await authFetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_image", id: ci.id }) });
          }
        }
        for (let i = 0; i < formImages.length; i++) {
          if (!currentImgs.find(ci => ci.url === formImages[i].url)) {
            await authFetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add_image", product_id: productId, url: formImages[i].url, sort_order: i }) });
          }
        }

        for (const s of formSizes) {
          if (s.size_label.trim()) {
            const existingSize = currentProd?.sizes?.find((cs: ProductSize & { id: number }) => cs.id === (s as ProductSize & { id?: number }).id);
            await authFetch(API, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "add_size", ...s, product_id: productId, id: existingSize ? (s as ProductSize & { id?: number }).id : undefined }),
            });
          }
        }
      }

      setShowForm(false);
      notify(editId !== null ? "Товар обновлён" : "Товар добавлен");
      load();
    } catch {
      notify("Ошибка сохранения. Попробуйте ещё раз.", false);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number, name: string) => {
    if (!confirm(`Скрыть товар «${name}»?`)) return;
    await authFetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_product", id }) });
    notify("Товар скрыт");
    load();
  };

  const allLeafTags = CATALOG_TREE.flatMap(function getTags(n: CatalogNode): string[] {
    if (n.categoryTag) return [n.categoryTag];
    return (n.children || []).flatMap(getTags);
  });

  const filteredProducts = selectedCategory === null
    ? products
    : selectedCategory === "__uncategorized__"
      ? products.filter(p => !allLeafTags.includes(p.category))
      : products.filter(p => p.category === selectedCategory);

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e8e0d0", fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-5 py-3 rounded shadow-lg text-sm font-medium" style={{
          background: toast.ok ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)",
          border: `1px solid ${toast.ok ? "rgba(74,222,128,0.4)" : "rgba(248,113,113,0.4)"}`,
          color: toast.ok ? "#4ade80" : "#f87171",
        }}>{toast.msg}</div>
      )}

      <AdminHeader section="Администратор" />

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>ТОВАРЫ</h1>
            <p className="text-sm mt-1" style={{ color: "#8a9ab5" }}>{filteredProducts.length} из {products.length} позиций</p>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-5 py-3 text-sm font-bold rounded"
            style={{ background: "#f57c00", color: "#0d1117", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em", cursor: "pointer" }}>
            <Icon name="Plus" size={16} /> Добавить товар
          </button>
        </div>

        <div className="flex gap-6">
          <div className="hidden md:block flex-shrink-0" style={{ width: 260 }}>
            <div className="sticky top-4">
              <AdminCatalogTree
                products={products}
                selectedCategory={selectedCategory}
                onSelect={setSelectedCategory}
              />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <AdminProductTable
              products={filteredProducts}
              loading={loading}
              onEdit={openEdit}
              onCopy={openCopy}
              onRemove={remove}
            />
          </div>
        </div>
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
          onClose={() => { setSaving(false); setUploading(false); setShowForm(false); }}
          notify={notify}
          lockedCategory={selectedCategory && selectedCategory !== "__uncategorized__" ? selectedCategory : null}
          products={products}
        />
      )}
    </div>
  );
}