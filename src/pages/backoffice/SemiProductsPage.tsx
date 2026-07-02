import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  boFetch,
  SemiProduct,
  Group,
  PfType,
  PF_TYPE_LABELS,
} from "@/pages/backoffice/types";
import GroupManager, { buildTree, collectIds, TreeGroup } from "@/components/backoffice/GroupManager";
import SemiGroupWizard from "@/components/backoffice/SemiGroupWizard";
import SemiProductEditorDialog from "@/components/backoffice/SemiProductEditorDialog";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

const PF_TYPE_BADGE: Record<PfType, string> = {
  material: "bg-blue-100 text-blue-700",
  labor: "bg-orange-100 text-orange-700",
  fittings: "bg-purple-100 text-purple-700",
  composite: "bg-emerald-100 text-emerald-700",
};

export default function SemiProductsPage() {
  const qc = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorId, setEditorId] = useState<number | null>(null);
  const [groupFilter, setGroupFilter] = useState<number | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  /* --- данные --- */
  const { data: items = [], isLoading } = useQuery<SemiProduct[]>({
    queryKey: ["bo-semi-products"],
    queryFn: () => boFetch("semi_products"),
  });
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["bo-groups", "semi_products"],
    queryFn: () => boFetch("groups", "GET", undefined, { entity_type: "semi_products" }),
  });

  /* --- мутации --- */
  const remove = useMutation({
    mutationFn: (id: number) => boFetch("semi_products", "DELETE", { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-semi-products"] });
      toast({ title: "Удалено" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const cloneSp = useMutation({
    mutationFn: (sp: SemiProduct) => {
      const name = window.prompt("Название копии:", sp.name + " (копия)");
      if (name === null) return Promise.reject(new Error("cancel"));
      return boFetch("clone_semi_product", "POST", { id: sp.id, name, group_id: sp.group_id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-semi-products"] });
      toast({ title: "Полуфабрикат скопирован" });
    },
    onError: (e: Error) => {
      if (e.message !== "cancel")
        toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    },
  });

  const cloneGroup = useMutation({
    mutationFn: (groupId: number) => {
      const name = window.prompt("Название новой группы:");
      if (name === null || !name.trim()) return Promise.reject(new Error("cancel"));
      return boFetch("clone_semi_group", "POST", { group_id: groupId, name: name.trim() });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-semi-products"] });
      qc.invalidateQueries({ queryKey: ["bo-groups", "semi_products"] });
      toast({ title: "Группа скопирована" });
    },
    onError: (e: Error) => {
      if (e.message !== "cancel")
        toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    },
  });

  /* --- helpers --- */
  const openNew = () => {
    setEditorId(null);
    setEditorOpen(true);
  };

  const openEdit = (sp: SemiProduct) => {
    setEditorId(sp.id);
    setEditorOpen(true);
  };

  /* --- группы: подсчёт и фильтрация --- */
  const groupCounts = (() => {
    const c: Record<number | string, number> = { all: items.length, ungrouped: 0 };
    items.forEach((sp) => {
      if (sp.group_id) c[sp.group_id] = (c[sp.group_id] || 0) + 1;
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

  const filtered = items.filter((sp) => {
    if (groupFilter === null) return true;
    if (groupFilter === -1) return !sp.group_id;
    const node = findNode(tree, groupFilter);
    if (!node) return sp.group_id === groupFilter;
    const ids = collectIds(node);
    return ids.includes(sp.group_id as number);
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Полуфабрикаты</h1>
        <div className="flex gap-2">
          <Button onClick={() => setWizardOpen(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Icon name="Wand2" size={16} /> Мастер создания ПФ модели
          </Button>
          <Button onClick={openNew} variant="outline" className="gap-1.5 border-slate-300 text-slate-600">
            <Icon name="Plus" size={16} /> Добавить
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <GroupManager entityType="semi_products" selectedGroupId={groupFilter} onSelect={setGroupFilter} counts={groupCounts} />

        <div className="flex-1 min-w-0">
          {groupFilter !== null && groupFilter !== -1 && (
            <div className="mb-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => cloneGroup.mutate(groupFilter)}
                disabled={cloneGroup.isPending}
                className="gap-1.5 border-slate-300 text-slate-600"
              >
                <Icon name="Copy" size={14} /> Копировать группу
              </Button>
            </div>
          )}
          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-400"><Icon name="Loader2" size={20} className="animate-spin" /> Загрузка...</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Название</th>
                    <th className="px-4 py-3">Тип</th>
                    <th className="px-4 py-3">Артикул / размер</th>
                    <th className="px-4 py-3">Мат.</th>
                    <th className="px-4 py-3">Опер.</th>
                    <th className="px-4 py-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sp, i) => (
                    <tr key={sp.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="px-4 py-2.5 font-medium text-slate-700">
                        {sp.name}
                        {!sp.is_active && (
                          <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">неактивен</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded px-2 py-0.5 text-xs ${PF_TYPE_BADGE[(sp.pf_type ?? "material") as PfType]}`}>
                          {PF_TYPE_LABELS[(sp.pf_type ?? "material") as PfType]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {sp.parent_group_name && <div className="text-slate-700">{sp.parent_group_name}</div>}
                        {sp.size_label && <div>{sp.size_label}</div>}
                        {!sp.parent_group_name && !sp.size_label && <span className="font-mono">{sp.sku}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{sp.materials?.length ?? 0}</td>
                      <td className="px-4 py-2.5 text-slate-600">{sp.operations?.length ?? 0}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" title="Редактировать" onClick={() => openEdit(sp)}>
                            <Icon name="Pencil" size={15} />
                          </Button>
                          <Button variant="ghost" size="sm" title="Копировать" onClick={() => cloneSp.mutate(sp)}>
                            <Icon name="Copy" size={15} className="text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Удалить" onClick={() => remove.mutate(sp.id)}>
                            <Icon name="Trash2" size={15} className="text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Нет записей</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <SemiProductEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        semiProductId={editorId}
        onSaved={() => {}}
      />

      <SemiGroupWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}
