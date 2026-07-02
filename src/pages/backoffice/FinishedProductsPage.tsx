import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  boFetch,
  FinishedProduct,
  FinishedProductFitting,
  Fitting,
  Group,
} from "@/pages/backoffice/types";
import GroupManager, { buildTree, collectIds, TreeGroup } from "@/components/backoffice/GroupManager";
import SpecificationsDialog from "@/components/backoffice/SpecificationsDialog";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const EMPTY: Partial<FinishedProduct> = {
  name: "", sku: "", description: "", base_price: 0, is_active: true,
  fittings: [], group_id: null,
};

interface ModelGroup {
  key: string;
  name: string;
  category: string;
  catalogProductId: number | null;
  items: FinishedProduct[];
}

export default function FinishedProductsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<FinishedProduct>>(EMPTY);
  const [fitRows, setFitRows] = useState<Partial<FinishedProductFitting>[]>([]);
  const [groupFilter, setGroupFilter] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [specsDialogOpen, setSpecsDialogOpen] = useState(false);

  const { data: items = [], isLoading } = useQuery<FinishedProduct[]>({
    queryKey: ["bo-finished-products"],
    queryFn: () => boFetch("finished_products"),
  });
  const { data: fittings = [] } = useQuery<Fitting[]>({
    queryKey: ["bo-fittings"],
    queryFn: () => boFetch("fittings"),
  });
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["bo-groups", "finished_products"],
    queryFn: () => boFetch("groups", "GET", undefined, { entity_type: "finished_products" }),
  });

  const save = useMutation({
    mutationFn: (data: Partial<FinishedProduct>) =>
      boFetch("finished_products", data.id ? "PUT" : "POST", {
        ...data,
        fittings: fitRows,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-finished-products"] });
      toast({ title: "Сохранено" });
      setOpen(false);
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => boFetch("finished_products", "DELETE", { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-finished-products"] });
      toast({ title: "Удалено" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await boFetch("sync_catalog", "POST", {});
      qc.invalidateQueries({ queryKey: ["bo-finished-products"] });
      qc.invalidateQueries({ queryKey: ["bo-groups", "finished_products"] });
      toast({ title: "Каталог синхронизирован", description: `Создано: ${result.created}, обновлено: ${result.updated}` });
    } catch (e: unknown) {
      toast({ title: "Ошибка синхронизации", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const openNew = () => {
    setForm(EMPTY);
    setFitRows([]);
    setOpen(true);
  };

  const openEdit = (fp: FinishedProduct) => {
    setForm({
      id: fp.id, name: fp.name, sku: fp.sku, description: fp.description,
      base_price: fp.base_price, is_active: fp.is_active, group_id: fp.group_id,
    });
    setFitRows(fp.fittings?.map((f) => ({ ...f })) ?? []);
    setOpen(true);
  };

  const updateFit = (idx: number, patch: Partial<FinishedProductFitting>) =>
    setFitRows((p) => p.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const removeFit = (idx: number) => setFitRows((p) => p.filter((_, i) => i !== idx));

  const groupCounts = (() => {
    const c: Record<number | string, number> = { all: items.length, ungrouped: 0 };
    items.forEach((fp) => {
      if (fp.group_id) c[fp.group_id] = (c[fp.group_id] || 0) + 1;
      else c["ungrouped"] = (c["ungrouped"] || 0) + 1;
    });
    return c;
  })();

  const tree = buildTree(groups);
  function findNode(nodes: TreeGroup[], id: number): TreeGroup | null {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = findNode(n.children, id);
      if (found) return found;
    }
    return null;
  }

  const filtered = items.filter((fp) => {
    const q = search.toLowerCase();
    const matchSearch = !q || fp.name.toLowerCase().includes(q) || (fp.sku || "").toLowerCase().includes(q) || (fp.size_label || "").toLowerCase().includes(q) || (fp.catalog_product_name || "").toLowerCase().includes(q);
    const matchGroup = (() => {
      if (groupFilter === null) return true;
      if (groupFilter === -1) return !fp.group_id;
      const node = findNode(tree, groupFilter);
      if (!node) return fp.group_id === groupFilter;
      const ids = collectIds(node);
      return ids.includes(fp.group_id as number);
    })();
    return matchSearch && matchGroup;
  });

  const modelGroups = useMemo(() => {
    const map = new Map<string, ModelGroup>();
    for (const fp of filtered) {
      const key = fp.catalog_product_id
        ? `catalog_${fp.catalog_product_id}`
        : `manual_${fp.id}`;

      if (fp.catalog_product_id) {
        let group = map.get(key);
        if (!group) {
          group = {
            key,
            name: fp.catalog_product_name || fp.name.replace(/\s*\[.*?\]\s*$/, ""),
            category: fp.catalog_category || fp.group_name || "",
            catalogProductId: fp.catalog_product_id,
            items: [],
          };
          map.set(key, group);
        }
        group.items.push(fp);
      } else {
        map.set(key, {
          key,
          name: fp.name,
          category: fp.group_name || "",
          catalogProductId: null,
          items: [fp],
        });
      }
    }
    return Array.from(map.values());
  }, [filtered]);

  const toggleModel = (key: string) => {
    setExpandedModels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedModels(new Set(modelGroups.map((g) => g.key)));
  };

  const collapseAll = () => {
    setExpandedModels(new Set());
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Готовая продукция</h1>
        <div className="flex gap-2">
          <Input
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 bg-white text-slate-800 border-slate-300"
          />
          <Button onClick={handleSync} disabled={syncing} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
            <Icon name={syncing ? "Loader2" : "RefreshCw"} size={16} className={syncing ? "animate-spin" : ""} />
            Импорт из каталога
          </Button>
          <Button onClick={openNew} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
            <Icon name="Plus" size={16} /> Добавить
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <GroupManager entityType="finished_products" selectedGroupId={groupFilter} onSelect={setGroupFilter} counts={groupCounts} />

        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-400"><Icon name="Loader2" size={20} className="animate-spin" /> Загрузка...</div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  {modelGroups.length} моделей, {filtered.length} позиций
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs text-slate-500">
                    <Icon name="ChevronsDown" size={14} className="mr-1" /> Развернуть все
                  </Button>
                  <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs text-slate-500">
                    <Icon name="ChevronsUp" size={14} className="mr-1" /> Свернуть все
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {modelGroups.map((mg) => {
                  const isExpanded = expandedModels.has(mg.key);
                  const hasSizes = mg.items.length > 1 || (mg.items.length === 1 && mg.catalogProductId);
                  const totalSemi = mg.items.reduce((s, fp) => s + (fp.semi_products?.length ?? 0), 0);
                  const totalFit = mg.items.reduce((s, fp) => s + (fp.fittings?.length ?? 0), 0);
                  const priceRange = (() => {
                    const prices = mg.items.map((fp) => Number(fp.base_price));
                    const min = Math.min(...prices);
                    const max = Math.max(...prices);
                    return min === max ? `${min.toLocaleString("ru")} р.` : `${min.toLocaleString("ru")} — ${max.toLocaleString("ru")} р.`;
                  })();
                  const costRange = (() => {
                    const costs = mg.items.map((fp) => Number(fp.plan_cost ?? 0)).filter((c) => c > 0);
                    if (costs.length === 0) return null;
                    const min = Math.min(...costs);
                    const max = Math.max(...costs);
                    return min === max ? `${min.toLocaleString("ru")} р.` : `${min.toLocaleString("ru")} — ${max.toLocaleString("ru")} р.`;
                  })();

                  return (
                    <div key={mg.key} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                      <div
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => toggleModel(mg.key)}
                      >
                        <Icon
                          name={isExpanded ? "ChevronDown" : "ChevronRight"}
                          size={18}
                          className="text-slate-400 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 truncate">{mg.name}</span>
                            {mg.category && (
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 flex-shrink-0">{mg.category}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 flex-shrink-0">
                          <span>{mg.items.length} размер{mg.items.length === 1 ? "" : mg.items.length < 5 ? "а" : "ов"}</span>
                          <span className="font-medium text-slate-700">{priceRange}</span>
                          {costRange && <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded" title="Плановая себестоимость по активной спецификации">с/с: {costRange}</span>}
                          {totalSemi > 0 && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">ПФ: {totalSemi}</span>}
                          {totalFit > 0 && <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">Ф: {totalFit}</span>}
                        </div>
                        {!hasSizes && (
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(mg.items[0])}>
                              <Icon name="Pencil" size={15} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => remove.mutate(mg.items[0].id)}>
                              <Icon name="Trash2" size={15} className="text-red-500" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {isExpanded && hasSizes && (
                        <div className="border-t border-slate-100">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-50/80 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                                <th className="px-4 py-2 pl-12">Размер</th>
                                <th className="px-4 py-2">Артикул</th>
                                <th className="px-4 py-2">Цена</th>
                                <th className="px-4 py-2">Себестоимость</th>
                                <th className="px-4 py-2">ПФ</th>
                                <th className="px-4 py-2">Фурнитура</th>
                                <th className="px-4 py-2">Активен</th>
                                <th className="px-4 py-2 text-right">Действия</th>
                              </tr>
                            </thead>
                            <tbody>
                              {mg.items.map((fp, i) => (
                                <tr key={fp.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}>
                                  <td className="px-4 py-2 pl-12 font-medium text-slate-700">
                                    {fp.size_label || fp.name}
                                  </td>
                                  <td className="px-4 py-2 font-mono text-slate-500 text-xs">{fp.sku || "—"}</td>
                                  <td className="px-4 py-2 text-slate-600">{Number(fp.base_price).toLocaleString("ru")} р.</td>
                                  <td className="px-4 py-2 text-slate-600" title={fp.active_spec_name ? `Спецификация: ${fp.active_spec_name}` : "Нет активной спецификации"}>
                                    {fp.plan_cost ? `${Number(fp.plan_cost).toLocaleString("ru")} р.` : "—"}
                                  </td>
                                  <td className="px-4 py-2 text-slate-500">{fp.semi_products?.length ?? 0}</td>
                                  <td className="px-4 py-2 text-slate-500">{fp.fittings?.length ?? 0}</td>
                                  <td className="px-4 py-2">
                                    {fp.is_active ? (
                                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Да</span>
                                    ) : (
                                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">Нет</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button variant="ghost" size="sm" onClick={() => openEdit(fp)}>
                                        <Icon name="Pencil" size={15} />
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => remove.mutate(fp.id)}>
                                        <Icon name="Trash2" size={15} className="text-red-500" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
                {modelGroups.length === 0 && (
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-slate-400">
                    Нет записей
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl bg-white text-slate-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Редактирование продукции" : "Новая продукция"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Название</label>
                <Input className="bg-white text-slate-800 border-slate-300" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Артикул</label>
                <Input className="bg-white text-slate-800 border-slate-300" value={form.sku ?? ""} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Базовая цена</label>
              <Input
                className="bg-white text-slate-800 border-slate-300"
                type="number"
                step="0.01"
                value={form.base_price ?? 0}
                onChange={(e) => setForm({ ...form, base_price: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Описание</label>
              <Textarea className="bg-white text-slate-800 border-slate-300" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Группа</label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                value={form.group_id ?? ""}
                onChange={(e) => setForm({ ...form, group_id: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">— без группы —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
              <label className="text-sm text-slate-600">Активен</label>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Спецификации</h3>
              <Button
                size="sm"
                variant="outline"
                disabled={!form.id}
                onClick={() => setSpecsDialogOpen(true)}
                className="gap-1 text-slate-600 border-slate-300"
              >
                <Icon name="Layers" size={14} /> Спецификации
              </Button>
            </div>
            {!form.id && (
              <p className="text-xs text-slate-400">
                Сохраните изделие, чтобы добавить спецификации
              </p>
            )}
          </div>

          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Фурнитура</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setFitRows([...fitRows, { fitting_id: 0, qty: 1 }])}
                className="gap-1 text-slate-600 border-slate-300"
              >
                <Icon name="Plus" size={14} /> Добавить
              </Button>
            </div>
            {fitRows.map((row, idx) => (
              <div key={idx} className="mb-2 flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-slate-500">Фурнитура</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
                    value={row.fitting_id ?? 0}
                    onChange={(e) => updateFit(idx, { fitting_id: Number(e.target.value) })}
                  >
                    <option value={0}>-- выберите --</option>
                    {fittings.filter((f) => f.is_active).map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label className="mb-1 block text-xs text-slate-500">Кол-во</label>
                  <Input
                    className="h-9 bg-white text-slate-800 border-slate-300"
                    type="number"
                    min={1}
                    value={row.qty ?? 1}
                    onChange={(e) => updateFit(idx, { qty: Number(e.target.value) })}
                  />
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeFit(idx)}>
                  <Icon name="X" size={14} className="text-red-500" />
                </Button>
              </div>
            ))}
            {fitRows.length === 0 && <p className="text-xs text-slate-400">Нет фурнитуры</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="text-slate-600 border-slate-300">
              Отмена
            </Button>
            <Button
              onClick={() => save.mutate(form)}
              disabled={save.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {save.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SpecificationsDialog
        open={specsDialogOpen}
        onOpenChange={setSpecsDialogOpen}
        finishedProductId={form.id ?? null}
        productName={form.name}
      />
    </div>
  );
}