import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boFetch, Client, Group } from "@/pages/backoffice/types";
import GroupManager, { buildTree, collectIds, TreeGroup } from "@/components/backoffice/GroupManager";
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

const EMPTY: Partial<Client> = {
  name: "", org: "", phone: "", email: "", inn: "", address: "", notes: "", group_id: null,
};

export default function ClientsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Client>>(EMPTY);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<number | null>(null);

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["bo-groups", "clients"],
    queryFn: () => boFetch("groups", "GET", undefined, { entity_type: "clients" }),
  });

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["bo-clients"],
    queryFn: () => boFetch("clients"),
  });

  const save = useMutation({
    mutationFn: (data: Partial<Client>) =>
      boFetch("clients", data.id ? "PUT" : "POST", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-clients"] });
      toast({ title: "Сохранено" });
      setOpen(false);
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => boFetch("clients", "DELETE", { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-clients"] });
      toast({ title: "Удалено" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const openNew = () => { setForm(EMPTY); setOpen(true); };
  const openEdit = (c: Client) => { setForm({ ...c }); setOpen(true); };

  const tree = buildTree(groups);
  function findNode(nodes: TreeGroup[], id: number): TreeGroup | null {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = findNode(n.children, id);
      if (found) return found;
    }
    return null;
  }

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      c.name.toLowerCase().includes(q) ||
      c.org.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.inn.includes(q);
    const matchGroup = (() => {
      if (groupFilter === null) return true;
      if (groupFilter === -1) return !c.group_id;
      const node = findNode(tree, groupFilter);
      if (!node) return c.group_id === groupFilter;
      const ids = collectIds(node);
      return ids.includes(c.group_id as number);
    })();
    return matchSearch && matchGroup;
  });

  const groupCounts = (() => {
    const c: Record<number | string, number> = { all: clients.length, ungrouped: 0 };
    clients.forEach((cl) => {
      if (cl.group_id) c[cl.group_id] = (c[cl.group_id] || 0) + 1;
      else c["ungrouped"] = (c["ungrouped"] || 0) + 1;
    });
    return c;
  })();

  const f = (key: keyof Client) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [key]: e.target.value });

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Клиенты</h1>
        <div className="flex gap-2">
          <Input
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 bg-white text-slate-800 border-slate-300"
          />
          <Button onClick={openNew} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
            <Icon name="Plus" size={16} /> Добавить
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <GroupManager entityType="clients" selectedGroupId={groupFilter} onSelect={setGroupFilter} counts={groupCounts} />

        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-400"><Icon name="Loader2" size={20} className="animate-spin" /> Загрузка...</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Название</th>
                    <th className="px-4 py-3">Организация</th>
                    <th className="px-4 py-3">Телефон</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">ИНН</th>
                    <th className="px-4 py-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr key={c.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="px-4 py-2.5 font-medium text-slate-700">{c.name}</td>
                      <td className="px-4 py-2.5 text-slate-600">{c.org || "-"}</td>
                      <td className="px-4 py-2.5 text-slate-600">{c.phone || "-"}</td>
                      <td className="px-4 py-2.5 text-slate-600">{c.email || "-"}</td>
                      <td className="px-4 py-2.5 text-slate-600">{c.inn || "-"}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                            <Icon name="Pencil" size={15} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => remove.mutate(c.id)}>
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

      {/* --- Dialog --- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg bg-white text-slate-800">
          <DialogHeader>
            <DialogTitle>{form.id ? "Редактирование клиента" : "Новый клиент"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {([
              ["name", "Название"],
              ["org", "Организация"],
              ["phone", "Телефон"],
              ["email", "Email"],
              ["inn", "ИНН"],
              ["address", "Адрес"],
            ] as [keyof Client, string][]).map(([key, label]) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium text-slate-600">{label}</label>
                <Input
                  className="bg-white text-slate-800 border-slate-300"
                  value={(form[key] as string) ?? ""}
                  onChange={f(key)}
                />
              </div>
            ))}
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
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Примечания</label>
              <Textarea
                className="bg-white text-slate-800 border-slate-300"
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="text-slate-600 border-slate-300">Отмена</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {save.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}