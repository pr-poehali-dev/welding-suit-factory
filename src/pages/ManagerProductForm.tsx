import { useRef } from "react";
import Icon from "@/components/ui/icon";
import { CATALOG_LEAF_CATEGORIES } from "@/components/specnaz/constants";
import { API, STOCK_OPTIONS, ManagerForm, ProductSize, inp, inpSt, lbl } from "./managerTypes";

type TabId = "main" | "photos" | "sizes" | "stock" | "specs";

interface ManagerProductFormProps {
  editId: number | null;
  form: ManagerForm;
  setForm: React.Dispatch<React.SetStateAction<ManagerForm>>;
  formImages: { url: string }[];
  setFormImages: React.Dispatch<React.SetStateAction<{ url: string }[]>>;
  formSizes: ProductSize[];
  setFormSizes: React.Dispatch<React.SetStateAction<ProductSize[]>>;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  uploading: boolean;
  setUploading: (v: boolean) => void;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
  notify: (msg: string, ok?: boolean) => void;
}

const SHIPPING_CALCS = [
  { name: "СДЭК", url: "https://www.cdek.ru/ru/calculate", color: "#00B33C" },
  { name: "Деловые Линии", url: "https://www.dellin.ru/calculator/", color: "#E31E24" },
  { name: "ПЭК", url: "https://pecom.ru/services-and-tariffs/calculator/", color: "#FF6600" },
  { name: "Энергия", url: "https://nrg-tk.ru/client/calculator/", color: "#0072C6" },
  { name: "Байкал Сервис", url: "https://www.baikalsr.ru/calculator/", color: "#1A4B8C" },
  { name: "КИТ", url: "https://tk-kit.ru/calculator", color: "#E8272C" },
  { name: "Почта России", url: "https://www.pochta.ru/parcels", color: "#0055A5" },
];

export default function ManagerProductForm({
  editId, form, setForm,
  formImages, setFormImages,
  formSizes, setFormSizes,
  activeTab, setActiveTab,
  uploading, setUploading,
  saving, onSave, onClose, notify,
}: ManagerProductFormProps) {
  const fileRef  = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const handleMainPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = (reader.result as string).split(",")[1];
      const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "upload", file: b64, contentType: file.type }) });
      const d   = await res.json();
      setForm(f => ({ ...f, image_url: d.url }));
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleGalleryPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (formImages.length >= 5) { notify("Максимум 5 фото", false); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = (reader.result as string).split(",")[1];
      const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "upload", file: b64, contentType: file.type }) });
      const d   = await res.json();
      setFormImages(imgs => [...imgs, { url: d.url }]);
      setUploading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const updateSize = (idx: number, field: keyof ProductSize, value: string | number | boolean) =>
    setFormSizes(sz => sz.map((s, i) => i === idx ? { ...s, [field]: value } : s));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-2xl rounded-lg overflow-hidden flex flex-col" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.3)", maxHeight: "92vh" }}>
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(245,124,0,0.2)" }}>
          <h2 className="text-lg font-bold uppercase" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
            {editId !== null ? "Редактировать товар" : "Новый товар"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8a9ab5", cursor: "pointer" }}>
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="flex border-b flex-shrink-0 overflow-x-auto" style={{ borderColor: "rgba(245,124,0,0.15)" }}>
          {([
            { id: "main" as TabId,   label: "Основное",      icon: "FileText" },
            { id: "photos" as TabId, label: "Фотографии",    icon: "Images" },
            { id: "sizes" as TabId,  label: "Размерный ряд", icon: "Ruler" },
            { id: "stock" as TabId,  label: "Остатки",        icon: "Package" },
            { id: "specs" as TabId,  label: "Спецификация",   icon: "Truck" },
          ]).map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="flex items-center gap-1.5 px-4 py-3 text-sm whitespace-nowrap"
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.04em",
                color: activeTab === t.id ? "#f57c00" : "#8a9ab5",
                borderBottom: activeTab === t.id ? "2px solid #f57c00" : "2px solid transparent" }}>
              <Icon name={t.icon} size={14} /> {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          {activeTab === "main" && (
            <div className="space-y-4">
              <div>
                <div style={lbl} className="mb-2">Главное фото</div>
                <div className="flex items-center gap-4">
                  {form.image_url
                    ? <img src={form.image_url} alt="" className="w-20 h-20 rounded object-cover" style={{ border: "1px solid rgba(245,124,0,0.3)" }} />
                    : <div className="w-20 h-20 rounded flex items-center justify-center" style={{ background: "#0d1117", border: "1px dashed rgba(245,124,0,0.3)" }}><Icon name="Image" size={24} style={{ color: "rgba(138,154,181,0.4)" }} /></div>
                  }
                  <div>
                    <button onClick={() => fileRef.current?.click()} disabled={uploading} className="px-4 py-2 text-sm rounded"
                      style={{ background: "rgba(245,124,0,0.15)", border: "1px solid rgba(245,124,0,0.3)", color: "#f57c00", cursor: "pointer" }}>
                      {uploading ? "Загружаю..." : "Загрузить фото"}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleMainPhoto} />
                    <div className="text-xs mt-1" style={{ color: "#8a9ab5" }}>JPG, PNG, WebP</div>
                  </div>
                </div>
              </div>
              <div><div style={lbl} className="mb-2">Название *</div>
                <input className={inp} style={inpSt} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Костюм сварщика КС-01" /></div>
              <div><div style={lbl} className="mb-2">Категория</div>
                <select className={inp} style={inpSt} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATALOG_LEAF_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
              <div><div style={lbl} className="mb-2">Описание</div>
                <textarea className={inp} style={{ ...inpSt, resize: "none" }} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Защита от искр и брызг металла..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><div style={lbl} className="mb-2">ГОСТ</div><input className={inp} style={inpSt} value={form.gost} onChange={e => setForm(f => ({ ...f, gost: e.target.value }))} placeholder="ГОСТ Р 12.4.250" /></div>
                <div><div style={lbl} className="mb-2">Метка (значок)</div><input className={inp} style={inpSt} value={form.badge || ""} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} placeholder="Хит продаж" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><div style={lbl} className="mb-2">Класс защиты</div><input className={inp} style={inpSt} value={form.protection_class} onChange={e => setForm(f => ({ ...f, protection_class: e.target.value }))} placeholder="II класс" /></div>
                <div><div style={lbl} className="mb-2">Базовая цена, ₽</div><input type="text" inputMode="numeric" className={inp} style={inpSt} value={form.base_price || ""} onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ""); setForm(f => ({ ...f, base_price: v === "" ? 0 : parseInt(v, 10) })); }} /></div>
              </div>
              <div><div style={lbl} className="mb-2">Материалы</div>
                <textarea className={inp} style={{ ...inpSt, resize: "none" }} rows={2} value={form.materials} onChange={e => setForm(f => ({ ...f, materials: e.target.value }))} placeholder="Брезент ОП, плотность 550 г/м²..." /></div>
              <div><div style={lbl} className="mb-2">Техническая документация</div>
                <textarea className={inp} style={{ ...inpSt, resize: "none" }} rows={2} value={form.documentation} onChange={e => setForm(f => ({ ...f, documentation: e.target.value }))} placeholder="Паспорт изделия, сертификат..." /></div>
              <div><div style={lbl} className="mb-2">Дополнительная информация</div>
                <textarea className={inp} style={{ ...inpSt, resize: "none" }} rows={2} value={form.extra_info} onChange={e => setForm(f => ({ ...f, extra_info: e.target.value }))} placeholder="Условия эксплуатации, особенности..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><div style={lbl} className="mb-2">Порядок сортировки</div><input type="text" inputMode="numeric" className={inp} style={inpSt} value={form.sort_order || ""} onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ""); setForm(f => ({ ...f, sort_order: v === "" ? 0 : parseInt(v, 10) })); }} /></div>
              </div>
              <div><div style={lbl} className="mb-2">Остаток на складе</div>
                <div className="grid grid-cols-2 gap-2">
                  {STOCK_OPTIONS.map(opt => {
                    const isActive = form.stock_status === opt.value;
                    return (
                      <label key={opt.value} className="flex items-center gap-3 p-3 rounded cursor-pointer"
                        style={{ background: isActive ? "rgba(245,124,0,0.08)" : "#0d1117", border: `1px solid ${isActive ? "rgba(245,124,0,0.4)" : "rgba(255,255,255,0.06)"}` }}>
                        <input type="radio" name="stock_status_m" value={opt.value} checked={isActive}
                          onChange={() => setForm(f => ({ ...f, stock_status: opt.value }))} className="hidden" />
                        <span className="flex gap-0.5">{[0,1,2,3].map(i => <span key={i} className="rounded-full inline-block" style={{ width: 7, height: 7, background: i < opt.filled ? "#f57c00" : "transparent", border: `1.5px solid ${i < opt.filled ? "#f57c00" : "rgba(245,124,0,0.3)"}` }} />)}</span>
                        <span className="text-sm" style={{ color: isActive ? "#e8e0d0" : "#8a9ab5" }}>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded" style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.06)" }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ accentColor: "#f57c00", width: 16, height: 16 }} />
                <span className="text-sm" style={{ color: "#c8bca8" }}>Показывать на сайте</span>
              </label>
            </div>
          )}

          {activeTab === "photos" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div><div style={lbl}>Галерея (до 5 фото)</div></div>
                <button onClick={() => photoRef.current?.click()} disabled={uploading || formImages.length >= 5}
                  className="flex items-center gap-2 px-4 py-2 text-sm rounded"
                  style={{ background: "rgba(245,124,0,0.15)", border: "1px solid rgba(245,124,0,0.3)", color: "#f57c00", cursor: "pointer" }}>
                  <Icon name="Plus" size={14} /> Добавить
                </button>
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryPhoto} />
              </div>
              {formImages.length === 0 ? (
                <div className="flex flex-col items-center py-12 rounded-lg" style={{ border: "2px dashed rgba(245,124,0,0.2)", color: "#8a9ab5" }}>
                  <Icon name="Images" size={36} style={{ color: "rgba(138,154,181,0.2)", marginBottom: 8 }} />
                  <div className="text-sm">Нажмите «Добавить» для загрузки</div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {formImages.map((img, idx) => (
                    <div key={idx} className="relative rounded overflow-hidden group" style={{ aspectRatio: "1/1" }}>
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                      {idx === 0 && <div className="absolute top-2 left-2 px-2 py-0.5 text-xs rounded font-bold" style={{ background: "#f57c00", color: "#0d1117" }}>Главное</div>}
                      <button onClick={() => setFormImages(imgs => imgs.filter((_, i) => i !== idx))}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"
                        style={{ background: "rgba(248,113,113,0.9)", border: "none", cursor: "pointer" }}>
                        <Icon name="X" size={14} style={{ color: "#fff" }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "sizes" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div style={lbl}>Размерный ряд</div>
                  <div className="text-xs mt-0.5" style={{ color: "#8a9ab5" }}>{formSizes.filter(s => s.is_available).length} из {formSizes.length} активных</div>
                </div>
                <button onClick={() => setFormSizes(sz => [...sz, { size_label: "", price_add: 0, is_available: true, gtin: "", stock_qty: 0 }])}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs rounded"
                  style={{ background: "rgba(245,124,0,0.15)", border: "1px solid rgba(245,124,0,0.3)", color: "#f57c00", cursor: "pointer" }}>
                  <Icon name="Plus" size={12} /> Добавить
                </button>
              </div>
              <div className="grid gap-1 mb-1 px-2 text-xs uppercase tracking-wider" style={{ gridTemplateColumns: "28px 1fr 80px 110px 28px", color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>
                <div className="text-center">☑</div>
                <div>Размер / Рост</div>
                <div>Наценка</div>
                <div>GTIN</div>
                <div></div>
              </div>
              <div className="space-y-1" style={{ maxHeight: 360, overflowY: "auto" }}>
                {formSizes.map((sz, idx) => {
                  const group = sz.size_label.split("/")[0];
                  const isFirstInGroup = idx === 0 || formSizes[idx - 1].size_label.split("/")[0] !== group;
                  return (
                    <div key={idx}>
                      {isFirstInGroup && group && (
                        <div className="px-2 py-1 text-xs font-bold mt-2 first:mt-0" style={{ color: "#f57c00", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}>
                          Полнота {group}
                        </div>
                      )}
                      <div className="grid gap-1 items-center px-2 py-1.5 rounded"
                        style={{ gridTemplateColumns: "28px 1fr 80px 110px 28px", background: "#0d1117", border: "1px solid rgba(255,255,255,0.05)", opacity: sz.is_available ? 1 : 0.45 }}>
                        <div className="flex justify-center">
                          <input type="checkbox" checked={sz.is_available} onChange={e => updateSize(idx, "is_available", e.target.checked)} style={{ accentColor: "#f57c00", width: 14, height: 14, cursor: "pointer" }} />
                        </div>
                        <input className="w-full px-2 py-1 rounded text-xs outline-none" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.15)", color: "#e8e0d0" }}
                          value={sz.size_label} onChange={e => updateSize(idx, "size_label", e.target.value)} placeholder="44-46/170-176" />
                        <div className="relative">
                          <input type="text" inputMode="numeric" className="w-full px-2 py-1 rounded text-xs outline-none pr-5"
                            style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.15)", color: "#e8e0d0" }}
                            value={sz.price_add || ""} onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ""); updateSize(idx, "price_add", v === "" ? 0 : parseInt(v, 10)); }} />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: "#8a9ab5" }}>₽</span>
                        </div>
                        <input className="w-full px-2 py-1 rounded text-xs outline-none" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.15)", color: "#e8e0d0" }}
                          value={sz.gtin} onChange={e => updateSize(idx, "gtin", e.target.value.replace(/\D/g, "").slice(0, 13))}
                          placeholder="4600000000000" maxLength={13} />
                        <button onClick={() => setFormSizes(sz2 => sz2.filter((_, i) => i !== idx))}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(248,113,113,0.4)", padding: 2 }}>
                          <Icon name="X" size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "stock" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <div style={lbl}>Остатки по размерам</div>
                <div className="text-xs" style={{ color: "#8a9ab5" }}>
                  Всего: <span style={{ color: "#f57c00", fontWeight: "bold" }}>{formSizes.reduce((s, sz) => s + (sz.stock_qty || 0), 0)} шт</span>
                </div>
              </div>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: "1fr 100px", padding: "0 0 8px" }}>
                <div className="text-xs uppercase tracking-wider" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Размер</div>
                <div className="text-xs uppercase tracking-wider text-center" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Кол-во, шт</div>
              </div>
              <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
                {formSizes.map((sz, idx) => {
                  const q = sz.stock_qty || 0;
                  const clr = !sz.is_available || q === 0 ? "#f87171" : q < 20 ? "#facc15" : q <= 100 ? "#4ade80" : "#60a5fa";
                  const bg = !sz.is_available || q === 0 ? "rgba(248,113,113,0.06)" : q < 20 ? "rgba(250,204,21,0.06)" : q <= 100 ? "rgba(74,222,128,0.06)" : "rgba(96,165,250,0.06)";
                  const bdr = !sz.is_available || q === 0 ? "rgba(248,113,113,0.2)" : q < 20 ? "rgba(250,204,21,0.2)" : q <= 100 ? "rgba(74,222,128,0.2)" : "rgba(96,165,250,0.2)";
                  return (
                    <div key={idx} className="grid items-center gap-1.5 p-2 rounded"
                      style={{ gridTemplateColumns: "1fr 100px", background: bg, border: `1px solid ${bdr}` }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: clr }} />
                        <span className="text-sm" style={{ color: "#e8e0d0" }}>{sz.size_label || "—"}</span>
                        {!sz.is_available && <span className="text-xs" style={{ color: "#f87171" }}>неактивен</span>}
                      </div>
                      <input type="text" inputMode="numeric" className="w-full text-center px-2 py-1.5 rounded text-sm outline-none"
                        style={{ background: "#13181f", border: `1px solid ${bdr}`, color: clr, fontWeight: "bold" }}
                        value={q || ""} onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ""); updateSize(idx, "stock_qty", v === "" ? 0 : parseInt(v, 10)); }} />
                    </div>
                  );
                })}
              </div>
              {formSizes.length === 0 && (
                <div className="text-center py-8 text-sm" style={{ color: "#8a9ab5" }}>
                  Сначала добавьте размеры во вкладке «Размерный ряд»
                </div>
              )}
            </div>
          )}

          {activeTab === "specs" && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg" style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.2)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Icon name="Box" size={16} style={{ color: "#f57c00" }} />
                  <span className="text-sm font-bold uppercase" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00", letterSpacing: "0.05em" }}>Габариты и вес (справочно)</span>
                </div>
                <div className="text-xs mb-3" style={{ color: "#8a9ab5" }}>Данные для расчёта стоимости доставки. Не отображаются в каталоге.</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div style={lbl} className="mb-1">Длина упаковки, см</div>
                    <input className={inp} style={inpSt} placeholder="60" readOnly value="" />
                  </div>
                  <div>
                    <div style={lbl} className="mb-1">Ширина упаковки, см</div>
                    <input className={inp} style={inpSt} placeholder="40" readOnly value="" />
                  </div>
                  <div>
                    <div style={lbl} className="mb-1">Высота упаковки, см</div>
                    <input className={inp} style={inpSt} placeholder="15" readOnly value="" />
                  </div>
                  <div>
                    <div style={lbl} className="mb-1">Вес единицы, кг</div>
                    <input className={inp} style={inpSt} placeholder="1.8" readOnly value="" />
                  </div>
                </div>
                <div className="mt-3 p-3 rounded text-xs" style={{ background: "rgba(245,124,0,0.06)", border: "1px solid rgba(245,124,0,0.15)", color: "#c8bca8" }}>
                  <Icon name="Info" size={12} style={{ color: "#f57c00", display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                  Габариты и вес заполняются в разделе <strong style={{ color: "#f57c00" }}>Админка</strong> при добавлении этих полей в базу. Используйте калькуляторы ТК ниже для предварительного расчёта.
                </div>
              </div>

              <div className="p-4 rounded-lg" style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.2)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Icon name="Truck" size={16} style={{ color: "#f57c00" }} />
                  <span className="text-sm font-bold uppercase" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00", letterSpacing: "0.05em" }}>Калькуляторы транспортных компаний</span>
                </div>
                <div className="text-xs mb-4" style={{ color: "#8a9ab5" }}>Перейдите на сайт ТК для расчёта стоимости доставки</div>
                <div className="grid grid-cols-2 gap-2">
                  {SHIPPING_CALCS.map(tk => (
                    <a key={tk.name} href={tk.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded text-sm no-underline transition-all hover:scale-[1.02]"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#e8e0d0", cursor: "pointer" }}>
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: tk.color }} />
                      <span className="flex-1">{tk.name}</span>
                      <Icon name="ExternalLink" size={12} style={{ color: "#8a9ab5" }} />
                    </a>
                  ))}
                </div>
                <div className="mt-3 text-xs" style={{ color: "#8a9ab5" }}>
                  Город отправления: <strong style={{ color: "#e8e0d0" }}>Иваново</strong>
                </div>
              </div>
            </div>
          )}
        </div>

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
