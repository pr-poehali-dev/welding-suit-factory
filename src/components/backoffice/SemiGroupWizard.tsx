import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  boFetch,
  CatalogProduct,
  CatalogSize,
  PfType,
  SemiProduct,
} from "@/pages/backoffice/types";
import Icon from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface CompRef {
  set_index?: number; // ссылка на другой элемент набора
  semi_product_id?: number; // ссылка на существующий п/ф
  label: string;
  qty: number;
}

interface SetItem {
  name: string;
  pf_type: PfType;
  checked: boolean;
  components: CompRef[]; // только для composite
}

const DEFAULT_SETS: SetItem[] = [
  { name: "Крой кожа", pf_type: "material", checked: true, components: [] },
  { name: "Крой настилы", pf_type: "material", checked: true, components: [] },
  { name: "Фурнитура", pf_type: "fittings", checked: true, components: [] },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SemiGroupWizard({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [productId, setProductId] = useState<number | null>(null);
  const [article, setArticle] = useState("");
  const [prodQuery, setProdQuery] = useState("");
  const [checkedSizes, setCheckedSizes] = useState<Set<string>>(new Set());
  const [sets, setSets] = useState<SetItem[]>(DEFAULT_SETS.map((s) => ({ ...s })));

  const { data: products = [] } = useQuery<CatalogProduct[]>({
    queryKey: ["bo-catalog-products"],
    queryFn: () => boFetch("catalog_products"),
    enabled: open,
  });

  const { data: sizes = [] } = useQuery<CatalogSize[]>({
    queryKey: ["bo-catalog-sizes", productId],
    queryFn: () =>
      boFetch("catalog_sizes", "GET", undefined, { product_id: String(productId) }),
    enabled: open && !!productId,
  });

  const { data: allSemi = [] } = useQuery<SemiProduct[]>({
    queryKey: ["bo-semi-products"],
    queryFn: () => boFetch("semi_products"),
    enabled: open,
  });

  const filteredProducts = useMemo(() => {
    const q = prodQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q),
    );
  }, [products, prodQuery]);

  const create = useMutation({
    mutationFn: () => {
      const activeSets = sets.filter((s) => s.checked && s.name.trim());
      // индексы активных наборов -> позиция среди отправляемых
      const activeOriginalIdx = sets
        .map((s, i) => ({ s, i }))
        .filter((x) => x.s.checked && x.s.name.trim());
      const idxMap = new Map<number, number>();
      activeOriginalIdx.forEach((x, newIdx) => idxMap.set(x.i, newIdx));

      return boFetch("semi_group_wizard", "POST", {
        product_id: productId,
        article: article.trim(),
        sizes: Array.from(checkedSizes),
        sets: activeSets.map((s) => ({
          name: s.name,
          pf_type: s.pf_type,
          components:
            s.pf_type === "composite"
              ? s.components
                  .map((c) => ({
                    set_index: c.set_index !== undefined ? idxMap.get(c.set_index) : undefined,
                    semi_product_id: c.semi_product_id,
                    qty: c.qty,
                  }))
                  .filter((c) => c.set_index !== undefined || c.semi_product_id)
              : undefined,
        })),
      });
    },
    onSuccess: (res: { created: number }) => {
      qc.invalidateQueries({ queryKey: ["bo-semi-products"] });
      qc.invalidateQueries({ queryKey: ["bo-groups", "semi_products"] });
      toast({ title: "Группа создана", description: `Создано полуфабрикатов: ${res.created}` });
      handleClose();
    },
    onError: (e: Error) =>
      toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const handleClose = () => {
    setProductId(null);
    setArticle("");
    setProdQuery("");
    setCheckedSizes(new Set());
    setSets(DEFAULT_SETS.map((s) => ({ ...s })));
    onClose();
  };

  const pickProduct = (p: CatalogProduct) => {
    setProductId(p.id);
    setArticle(p.name);
    setCheckedSizes(new Set());
  };

  const toggleSize = (label: string) =>
    setCheckedSizes((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  const allSizes = () => setCheckedSizes(new Set(sizes.map((s) => s.size_label)));
  const noSizes = () => setCheckedSizes(new Set());

  const updateSet = (idx: number, patch: Partial<SetItem>) =>
    setSets((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  const addSet = () =>
    setSets((prev) => [...prev, { name: "", pf_type: "material", checked: true, components: [] }]);
  const removeSet = (idx: number) =>
    setSets((prev) => prev.filter((_, i) => i !== idx));

  // управление компонентами составного п/ф
  const addCompFromSet = (setIdx: number, targetIdx: number) => {
    const target = sets[targetIdx];
    setSets((prev) =>
      prev.map((s, i) =>
        i === setIdx
          ? {
              ...s,
              components: s.components.some((c) => c.set_index === targetIdx)
                ? s.components
                : [...s.components, { set_index: targetIdx, label: target.name || `Позиция ${targetIdx + 1}`, qty: 1 }],
            }
          : s,
      ),
    );
  };
  const addCompFromBase = (setIdx: number, sp: SemiProduct) => {
    setSets((prev) =>
      prev.map((s, i) =>
        i === setIdx
          ? {
              ...s,
              components: s.components.some((c) => c.semi_product_id === sp.id)
                ? s.components
                : [...s.components, { semi_product_id: sp.id, label: sp.name, qty: 1 }],
            }
          : s,
      ),
    );
  };
  const removeComp = (setIdx: number, compIdx: number) =>
    setSets((prev) =>
      prev.map((s, i) =>
        i === setIdx ? { ...s, components: s.components.filter((_, ci) => ci !== compIdx) } : s,
      ),
    );
  const updateCompQty = (setIdx: number, compIdx: number, qty: number) =>
    setSets((prev) =>
      prev.map((s, i) =>
        i === setIdx
          ? { ...s, components: s.components.map((c, ci) => (ci === compIdx ? { ...c, qty } : c)) }
          : s,
      ),
    );

  const canCreate =
    !!productId &&
    article.trim() &&
    checkedSizes.size > 0 &&
    sets.some((s) => s.checked && s.name.trim());

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-5xl w-[95vw] bg-white text-slate-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Мастер создания: группа полуфабрикатов</DialogTitle>
        </DialogHeader>

        {/* 1. Модель */}
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="mb-2 text-sm font-semibold text-slate-700">1. Модель / артикул</div>
          <div className="mb-2 flex items-center gap-2 rounded-md border border-slate-300 px-2">
            <Icon name="Search" size={16} className="text-slate-400" />
            <input
              value={prodQuery}
              onChange={(e) => setProdQuery(e.target.value)}
              placeholder="Поиск модели..."
              className="h-9 w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="max-h-40 overflow-y-auto rounded-md border border-slate-100">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pickProduct(p)}
                className={`flex w-full items-start justify-between gap-2 px-3 py-1.5 text-left text-sm ${
                  productId === p.id ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span className="break-words whitespace-normal">{p.name}</span>
                <span className="flex-shrink-0 whitespace-nowrap text-xs text-slate-400">
                  {p.sizes_count} разм.
                </span>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-slate-400">Ничего не найдено</div>
            )}
          </div>
          <div className="mt-2">
            <label className="mb-1 block text-xs text-slate-500">Название группы (артикул)</label>
            <Input
              value={article}
              onChange={(e) => setArticle(e.target.value)}
              placeholder="Название артикула для группы"
              className="h-9 border-slate-300 bg-white text-slate-800"
            />
          </div>
        </div>

        {/* 2. Размеры */}
        <div className="mt-3 rounded-lg border border-slate-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-700">
              2. Размеры {checkedSizes.size > 0 && `(выбрано: ${checkedSizes.size})`}
            </div>
            <div className="flex gap-2 text-xs">
              <button onClick={() => toggleSize("Универсальный")} className="text-emerald-600 hover:underline">
                + Универсальный
              </button>
              {productId && sizes.length > 0 && (
                <>
                  <button onClick={allSizes} className="text-blue-600 hover:underline">Все</button>
                  <button onClick={noSizes} className="text-slate-400 hover:underline">Сбросить</button>
                </>
              )}
            </div>
          </div>
          {!productId ? (
            <p className="text-xs text-slate-400">Сначала выберите модель</p>
          ) : (
            <div className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-3">
              {checkedSizes.has("Универсальный") && (
                <label className="flex cursor-pointer items-center gap-2 rounded bg-emerald-50 px-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked
                    onChange={() => toggleSize("Универсальный")}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="font-medium text-emerald-700">Универсальный</span>
                </label>
              )}
              {sizes.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={checkedSizes.has(s.size_label)}
                    onChange={() => toggleSize(s.size_label)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-slate-700">{s.size_label}</span>
                </label>
              ))}
              {sizes.length === 0 && !checkedSizes.has("Универсальный") && (
                <p className="col-span-full text-xs text-slate-400">
                  У модели нет размеров — используйте «Универсальный»
                </p>
              )}
            </div>
          )}
        </div>

        {/* 3. Набор полуфабрикатов */}
        <div className="mt-3 rounded-lg border border-slate-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-700">3. Набор полуфабрикатов</div>
            <Button size="sm" variant="outline" onClick={addSet} className="gap-1 border-slate-300 text-slate-600">
              <Icon name="Plus" size={14} /> Добавить
            </Button>
          </div>
          {sets.map((s, idx) => (
            <div key={idx} className="mb-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={s.checked}
                  onChange={(e) => updateSet(idx, { checked: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <Input
                  value={s.name}
                  onChange={(e) => updateSet(idx, { name: e.target.value })}
                  placeholder="Название полуфабриката"
                  className="h-9 flex-1 border-slate-300 bg-white text-slate-800"
                />
                <select
                  value={s.pf_type}
                  onChange={(e) => updateSet(idx, { pf_type: e.target.value as PfType })}
                  className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800"
                >
                  <option value="material">Материальный</option>
                  <option value="labor">ФОТ (труд)</option>
                  <option value="fittings">Фурнитура</option>
                  <option value="composite">Составной</option>
                </select>
                <Button size="sm" variant="ghost" onClick={() => removeSet(idx)}>
                  <Icon name="X" size={14} className="text-red-500" />
                </Button>
              </div>

              {s.pf_type === "composite" && (
                <CompositeEditor
                  setIdx={idx}
                  sets={sets}
                  comps={s.components}
                  allSemi={allSemi}
                  onAddFromSet={addCompFromSet}
                  onAddFromBase={addCompFromBase}
                  onRemove={removeComp}
                  onQty={updateCompQty}
                />
              )}
            </div>
          ))}
          <p className="mt-1 text-xs text-slate-400">
            Итого будет создано: {checkedSizes.size * sets.filter((s) => s.checked && s.name.trim()).length} полуфабрикатов
          </p>
        </div>

        <DialogFooter className="mt-3">
          <Button variant="outline" onClick={handleClose} className="border-slate-300 text-slate-600">
            Отмена
          </Button>
          <Button
            onClick={() => create.mutate()}
            disabled={!canCreate || create.isPending}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {create.isPending ? "Создание..." : "Создать группу"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CompRefLocal {
  set_index?: number;
  semi_product_id?: number;
  label: string;
  qty: number;
}

interface SetItemLocal {
  name: string;
  pf_type: PfType;
  checked: boolean;
  components: CompRefLocal[];
}

function CompositeEditor({
  setIdx,
  sets,
  comps,
  allSemi,
  onAddFromSet,
  onAddFromBase,
  onRemove,
  onQty,
}: {
  setIdx: number;
  sets: SetItemLocal[];
  comps: CompRefLocal[];
  allSemi: SemiProduct[];
  onAddFromSet: (setIdx: number, targetIdx: number) => void;
  onAddFromBase: (setIdx: number, sp: SemiProduct) => void;
  onRemove: (setIdx: number, compIdx: number) => void;
  onQty: (setIdx: number, compIdx: number, qty: number) => void;
}) {
  const [baseQuery, setBaseQuery] = useState("");
  const [showBase, setShowBase] = useState(false);

  const baseFiltered = useMemo(() => {
    const q = baseQuery.trim().toLowerCase();
    return allSemi
      .filter((sp) => sp.pf_type !== "composite")
      .filter((sp) => !q || sp.name.toLowerCase().includes(q) || (sp.sku || "").toLowerCase().includes(q))
      .slice(0, 30);
  }, [allSemi, baseQuery]);

  const otherSets = sets
    .map((s, i) => ({ s, i }))
    .filter((x) => x.i !== setIdx && x.s.name.trim());

  return (
    <div className="ml-6 mt-1 rounded-md border border-purple-200 bg-purple-50/50 p-2">
      <div className="mb-1 text-xs font-medium text-purple-700">Состав (вложенные полуфабрикаты)</div>

      {comps.length > 0 && (
        <div className="mb-2 space-y-1">
          {comps.map((c, ci) => (
            <div key={ci} className="flex items-center gap-2 rounded bg-white px-2 py-1 text-sm">
              <Icon name="CornerDownRight" size={13} className="text-purple-400" />
              <span className="flex-1 truncate text-slate-700">{c.label}</span>
              <Input
                type="number"
                min={0.001}
                step="0.001"
                value={c.qty}
                onChange={(e) => onQty(setIdx, ci, Number(e.target.value))}
                className="h-7 w-20 border-slate-300 bg-white text-slate-800"
              />
              <Button size="sm" variant="ghost" onClick={() => onRemove(setIdx, ci)}>
                <Icon name="X" size={13} className="text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {/* из текущего набора */}
        {otherSets.map((x) => (
          <button
            key={x.i}
            type="button"
            onClick={() => onAddFromSet(setIdx, x.i)}
            className="rounded border border-purple-300 bg-white px-2 py-0.5 text-xs text-purple-700 hover:bg-purple-100"
          >
            + {x.s.name}
          </button>
        ))}
        {/* из базы */}
        <button
          type="button"
          onClick={() => setShowBase((v) => !v)}
          className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
        >
          + Из базы
        </button>
      </div>

      {showBase && (
        <div className="mt-2 rounded-md border border-slate-200 bg-white p-2">
          <input
            value={baseQuery}
            onChange={(e) => setBaseQuery(e.target.value)}
            placeholder="Поиск полуфабриката..."
            className="mb-1 h-8 w-full rounded border border-slate-300 px-2 text-sm outline-none"
          />
          <div className="max-h-32 overflow-y-auto">
            {baseFiltered.map((sp) => (
              <button
                key={sp.id}
                type="button"
                onClick={() => {
                  onAddFromBase(setIdx, sp);
                  setShowBase(false);
                  setBaseQuery("");
                }}
                className="flex w-full items-center justify-between gap-2 px-2 py-1 text-left text-sm hover:bg-slate-50"
              >
                <span className="truncate text-slate-700">{sp.name}</span>
                {sp.sku && <span className="flex-shrink-0 font-mono text-xs text-slate-400">{sp.sku}</span>}
              </button>
            ))}
            {baseFiltered.length === 0 && (
              <div className="px-2 py-3 text-center text-xs text-slate-400">Ничего не найдено</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}