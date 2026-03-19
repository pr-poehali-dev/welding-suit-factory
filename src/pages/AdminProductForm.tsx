import { useRef } from "react";
import Icon from "@/components/ui/icon";
import { CATALOG_LEAF_CATEGORIES } from "@/components/specnaz/constants";
import { API, STOCK_OPTIONS, FormState, ProductSize } from "./admin.types";

interface AdminProductFormProps {
  editId: number | null;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  formImages: { url: string }[];
  setFormImages: React.Dispatch<React.SetStateAction<{ url: string }[]>>;
  formSizes: ProductSize[];
  setFormSizes: React.Dispatch<React.SetStateAction<ProductSize[]>>;
  activeTab: "main" | "photos" | "sizes";
  setActiveTab: (tab: "main" | "photos" | "sizes") => void;
  uploading: boolean;
  setUploading: (v: boolean) => void;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
  notify: (msg: string, ok?: boolean) => void;
}

const inp = "w-full px-3 py-2.5 rounded text-sm outline-none";
const inpStyle = { background: "#0d1117", border: "1px solid rgba(245,124,0,0.3)", color: "#e8e0d0" };
const labelStyle = { color: "#8a9ab5", fontFamily: "'Oswald', sans-serif", fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.08em" };

export default function AdminProductForm({
  editId, form, setForm,
  formImages, setFormImages,
  formSizes, setFormSizes,
  activeTab, setActiveTab,
  uploading, setUploading,
  saving, onSave, onClose, notify,
}: AdminProductFormProps) {
  const fileRef  = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

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

  const updateSize = (idx: number, field: keyof ProductSize, value: string | number | boolean) => {
    setFormSizes(sz => sz.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };
  const addSize = () => setFormSizes(sz => [...sz, { size_label: "", price_add: 0, is_available: true }]);
  const removeSize = (idx: number) => setFormSizes(sz => sz.filter((_, i) => i !== idx));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-2xl rounded-lg overflow-hidden flex flex-col"
        style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.3)", maxHeight: "92vh" }}>

        {/* Шапка */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(245,124,0,0.2)" }}>
          <h2 className="text-lg font-bold uppercase" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
            {editId !== null ? "Редактировать товар" : "Новый товар"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8a9ab5", cursor: "pointer" }}>
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Табы */}
        <div className="flex border-b flex-shrink-0" style={{ borderColor: "rgba(245,124,0,0.15)" }}>
          {([
            { id: "main",   label: "Основное",      icon: "FileText" },
            { id: "photos", label: "Фотографии",    icon: "Images" },
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

        {/* Контент */}
        <div className="overflow-y-auto flex-1 px-6 py-5">

          {/* ── Основное ── */}
          {activeTab === "main" && (
            <div className="space-y-4">
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

              <div>
                <div style={labelStyle} className="mb-2">Название *</div>
                <input className={inp} style={inpStyle} value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Костюм сварщика КС-01" />
              </div>

              <div>
                <div style={labelStyle} className="mb-2">Категория</div>
                <select className={inp} style={inpStyle} value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATALOG_LEAF_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <div style={labelStyle} className="mb-2">Описание</div>
                <textarea className={inp} style={{ ...inpStyle, resize: "none" }} rows={3} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Защита от искр и брызг металла..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div style={labelStyle} className="mb-2">ГОСТ</div>
                  <input className={inp} style={inpStyle} value={form.gost}
                    onChange={e => setForm(f => ({ ...f, gost: e.target.value }))} placeholder="ГОСТ Р 12.4.250" />
                </div>
                <div>
                  <div style={labelStyle} className="mb-2">Метка (значок)</div>
                  <input className={inp} style={inpStyle} value={form.badge || ""}
                    onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} placeholder="Хит продаж" />
                </div>
              </div>

              <div>
                <div style={labelStyle} className="mb-2">GTIN (EAN-13) — штрихкод товара</div>
                <input className={inp} style={inpStyle} value={form.gtin}
                  onChange={e => setForm(f => ({ ...f, gtin: e.target.value.replace(/\D/g, "").slice(0, 13) }))}
                  placeholder="4600000000000" maxLength={13} />
                <div className="text-xs mt-1" style={{ color: "#8a9ab5" }}>13 цифр. Штрихкод EAN-13 генерируется автоматически при сохранении.</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div style={labelStyle} className="mb-2">Базовая цена, ₽</div>
                  <input type="number" min={0} className={inp} style={inpStyle} value={form.base_price}
                    onChange={e => setForm(f => ({ ...f, base_price: Number(e.target.value) }))} />
                </div>
                <div>
                  <div style={labelStyle} className="mb-2">Порядок сортировки</div>
                  <input type="number" min={0} className={inp} style={inpStyle} value={form.sort_order}
                    onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
                </div>
              </div>

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
                          {[0, 1, 2, 3].map(i => (
                            <span key={i} className="rounded-full inline-block" style={{
                              width: 7, height: 7,
                              background: i < opt.filled ? "#f57c00" : "transparent",
                              border: `1.5px solid ${i < opt.filled ? "#f57c00" : "rgba(245,124,0,0.3)"}`,
                            }} />
                          ))}
                        </span>
                        <span className="text-sm" style={{ color: isActive ? "#e8e0d0" : "#8a9ab5" }}>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded"
                style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.06)" }}>
                <input type="checkbox" checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  style={{ accentColor: "#f57c00", width: 16, height: 16 }} />
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
                  style={{
                    background: formImages.length >= 5 ? "rgba(255,255,255,0.05)" : "rgba(245,124,0,0.15)",
                    border: "1px solid rgba(245,124,0,0.3)",
                    color: formImages.length >= 5 ? "#8a9ab5" : "#f57c00",
                    cursor: formImages.length >= 5 ? "default" : "pointer",
                  }}>
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
                        <div className="absolute top-2 left-2 px-2 py-0.5 text-xs rounded font-bold"
                          style={{ background: "#f57c00", color: "#0d1117", fontFamily: "'Oswald', sans-serif" }}>
                          Главное
                        </div>
                      )}
                      <button onClick={() => removeGalleryPhoto(idx)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "rgba(248,113,113,0.9)", border: "none", cursor: "pointer" }}>
                        <Icon name="X" size={14} style={{ color: "#fff" }} />
                      </button>
                      <div className="absolute bottom-2 left-2 text-xs px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(0,0,0,0.6)", color: "#8a9ab5" }}>
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

              <div className="grid grid-cols-12 gap-2 px-3 py-2 mb-1 text-xs uppercase tracking-wider"
                style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>
                <div className="col-span-1 text-center">☑</div>
                <div className="col-span-5">Размер / Рост</div>
                <div className="col-span-4">Наценка, ₽</div>
                <div className="col-span-2"></div>
              </div>

              <div className="space-y-2">
                {formSizes.map((sz, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center px-3 py-2 rounded"
                    style={{
                      background: sz.is_available ? "#0d1117" : "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      opacity: sz.is_available ? 1 : 0.5,
                    }}>
                    <div className="col-span-1 flex justify-center">
                      <input type="checkbox" checked={sz.is_available}
                        onChange={e => updateSize(idx, "is_available", e.target.checked)}
                        style={{ accentColor: "#f57c00", width: 15, height: 15, cursor: "pointer" }} />
                    </div>
                    <div className="col-span-5">
                      <input className="w-full px-2 py-1.5 rounded text-sm outline-none"
                        style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)", color: "#e8e0d0" }}
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
          <button onClick={onSave} disabled={saving} className="flex-1 py-3 text-sm font-bold rounded"
            style={{ background: "#f57c00", color: "#0d1117", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em", cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Сохраняю..." : editId !== null ? "Сохранить изменения" : "Добавить товар"}
          </button>
          <button onClick={onClose} className="px-5 py-3 text-sm rounded"
            style={{ background: "transparent", border: "1px solid rgba(138,154,181,0.3)", color: "#8a9ab5", cursor: "pointer" }}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
