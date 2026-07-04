import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  boFetch,
  Worker,
  Group,
  WorkerPermission,
  Permissions,
  ACCESS_LEVELS,
  accessLevelLabel,
  ROLE_TEMPLATES,
  PERM_MODULES,
} from "@/pages/backoffice/types";
import GroupManager, { buildTree, collectIds, TreeGroup } from "@/components/backoffice/GroupManager";
import PermissionEditor from "@/components/backoffice/PermissionEditor";
import { useAuth } from "@/context/AuthContext";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const EMPTY: Partial<Worker> = {
  tab_number: "", full_name: "", position: "", phone: "", is_active: true, group_id: null,
  login: "", access_level: "", is_blocked: false,
};

// все известные ключи прав
const ALL_PERM_KEYS = PERM_MODULES.flatMap((m) => [
  `${m.module}.view`,
  ...(m.hasEdit ? [`${m.module}.edit`] : []),
  ...(m.extra?.map((e) => e.key) ?? []),
]);

function templateFor(level?: string | null): Permissions {
  const t = ROLE_TEMPLATES[level || ""] || {};
  if (t.__all__) {
    const all: Permissions = {};
    ALL_PERM_KEYS.forEach((k) => (all[k] = true));
    return all;
  }
  return { ...t };
}

export default function WorkersPage() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const canEdit = can("workers.edit");

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"data" | "access">("data");
  const [form, setForm] = useState<Partial<Worker>>(EMPTY);
  const [password, setPassword] = useState("");
  const [perms, setPerms] = useState<Permissions>({});
  const [groupFilter, setGroupFilter] = useState<number | null>(null);

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["bo-groups", "workers"],
    queryFn: () => boFetch("groups", "GET", undefined, { entity_type: "workers" }),
  });

  const { data: workers = [], isLoading } = useQuery<Worker[]>({
    queryKey: ["bo-workers"],
    queryFn: () => boFetch("workers"),
  });

  const save = useMutation({
    mutationFn: async (data: Partial<Worker>) => {
      // вычисляем переопределения: что отличается от шаблона роли
      const template = templateFor(data.access_level);
      const overrides: WorkerPermission[] = [];
      for (const key of ALL_PERM_KEYS) {
        const want = !!perms[key];
        const base = !!template[key];
        if (want !== base) overrides.push({ permission_key: key, allowed: want });
      }
      const payload: Record<string, unknown> = { ...data, permissions: overrides };
      if (password) payload.password = password;
      return boFetch("workers", data.id ? "PUT" : "POST", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-workers"] });
      toast({ title: "Сохранено" });
      setOpen(false);
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => boFetch("workers", "DELETE", { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-workers"] });
      toast({ title: "Удалено" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const blockToggle = useMutation({
    mutationFn: (w: Worker) =>
      boFetch("workers", "PUT", { ...w, is_blocked: !w.is_blocked }),
    onSuccess: (_d, w) => {
      qc.invalidateQueries({ queryKey: ["bo-workers"] });
      toast({ title: w.is_blocked ? "Доступ разблокирован" : "Доступ заблокирован" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const openNew = () => {
    setForm(EMPTY);
    setPassword("");
    setPerms({});
    setTab("data");
    setOpen(true);
  };

  const openEdit = async (w: Worker) => {
    setForm({ ...w });
    setPassword("");
    setTab("data");
    setOpen(true);
    // итоговые галочки = шаблон роли + индивидуальные переопределения
    const base = templateFor(w.access_level);
    try {
      const individual: WorkerPermission[] = await boFetch("worker_perms", "GET", undefined, {
        worker_id: String(w.id),
      });
      const merged = { ...base };
      individual.forEach((p) => {
        if (p.allowed) merged[p.permission_key] = true;
        else delete merged[p.permission_key];
      });
      setPerms(merged);
    } catch {
      setPerms(base);
    }
  };

  const onRoleChange = (level: string) => {
    setForm({ ...form, access_level: level });
    setPerms(templateFor(level));
  };

  const f = (key: keyof Worker) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const tree = buildTree(groups);
  function findNode(nodes: TreeGroup[], id: number): TreeGroup | null {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = findNode(n.children, id);
      if (found) return found;
    }
    return null;
  }

  const filtered = workers.filter((w) => {
    if (groupFilter === null) return true;
    if (groupFilter === -1) return !w.group_id;
    const node = findNode(tree, groupFilter);
    if (!node) return w.group_id === groupFilter;
    const ids = collectIds(node);
    return ids.includes(w.group_id as number);
  });

  const groupCounts = (() => {
    const c: Record<number | string, number> = { all: workers.length, ungrouped: 0 };
    workers.forEach((w) => {
      if (w.group_id) c[w.group_id] = (c[w.group_id] || 0) + 1;
      else c["ungrouped"] = (c["ungrouped"] || 0) + 1;
    });
    return c;
  })();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Сотрудники</h1>
        {canEdit && (
          <Button onClick={openNew} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
            <Icon name="Plus" size={16} /> Добавить
          </Button>
        )}
      </div>

      <div className="flex gap-4">
        <GroupManager entityType="workers" selectedGroupId={groupFilter} onSelect={setGroupFilter} counts={groupCounts} />

        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-400"><Icon name="Loader2" size={20} className="animate-spin" /> Загрузка...</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">ФИО</th>
                    <th className="px-4 py-3">Должность</th>
                    <th className="px-4 py-3">Уровень доступа</th>
                    <th className="px-4 py-3">Логин</th>
                    <th className="px-4 py-3">Статус</th>
                    <th className="px-4 py-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((w, i) => (
                    <tr key={w.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="px-4 py-2.5 font-medium text-slate-700">{w.full_name}</td>
                      <td className="px-4 py-2.5 text-slate-600">{w.position || "—"}</td>
                      <td className="px-4 py-2.5 text-slate-600">{accessLevelLabel(w.access_level)}</td>
                      <td className="px-4 py-2.5 font-mono text-slate-500">{w.login || "—"}</td>
                      <td className="px-4 py-2.5">
                        {w.is_blocked ? (
                          <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">Заблокирован</span>
                        ) : w.login ? (
                          <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Активен</span>
                        ) : (
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Без доступа</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          {canEdit && w.login && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title={w.is_blocked ? "Разблокировать" : "Заблокировать"}
                              onClick={() => blockToggle.mutate(w)}
                            >
                              <Icon name={w.is_blocked ? "LockOpen" : "Lock"} size={15} className={w.is_blocked ? "text-green-600" : "text-amber-600"} />
                            </Button>
                          )}
                          {canEdit && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => openEdit(w)}>
                                <Icon name="Pencil" size={15} />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => remove.mutate(w.id)}>
                                <Icon name="Trash2" size={15} className="text-red-500" />
                              </Button>
                            </>
                          )}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg bg-white text-slate-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Редактирование сотрудника" : "Новый сотрудник"}</DialogTitle>
          </DialogHeader>

          <div className="flex gap-1 border-b border-slate-200">
            <button
              onClick={() => setTab("data")}
              className={`px-4 py-2 text-sm font-medium ${tab === "data" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500"}`}
            >
              Данные
            </button>
            <button
              onClick={() => setTab("access")}
              className={`px-4 py-2 text-sm font-medium ${tab === "access" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500"}`}
            >
              Доступ и права
            </button>
          </div>

          {tab === "data" && (
            <div className="grid gap-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">Табельный номер</label>
                  <Input
                    className="bg-white text-slate-800 border-slate-300"
                    value={form.tab_number ?? ""}
                    onChange={f("tab_number")}
                    placeholder={form.id ? "" : "Присвоится автоматически"}
                  />
                  {!form.id && (
                    <p className="mt-1 text-xs text-slate-400">Оставьте пустым — номер присвоится автоматически</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">Телефон</label>
                  <Input className="bg-white text-slate-800 border-slate-300" value={form.phone ?? ""} onChange={f("phone")} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">ФИО</label>
                <Input className="bg-white text-slate-800 border-slate-300" value={form.full_name ?? ""} onChange={f("full_name")} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Должность</label>
                <Input className="bg-white text-slate-800 border-slate-300" value={form.position ?? ""} onChange={f("position")} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Группа / подразделение</label>
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
                <label className="text-sm text-slate-600">Работает (активен)</label>
              </div>
            </div>
          )}

          {tab === "access" && (
            <div className="grid gap-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">Логин для входа</label>
                  <Input className="bg-white text-slate-800 border-slate-300" value={form.login ?? ""} onChange={f("login")} placeholder="например ivanov" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">
                    {form.id ? "Новый пароль" : "Пароль"}
                  </label>
                  <Input
                    type="password"
                    className="bg-white text-slate-800 border-slate-300"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={form.id ? "оставьте пустым" : "задайте пароль"}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Уровень доступа (роль)</label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                  value={form.access_level ?? ""}
                  onChange={(e) => onRoleChange(e.target.value)}
                >
                  <option value="">— не выбрана —</option>
                  {ACCESS_LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-400">При выборе роли галочки заполнятся по умолчанию. Их можно поправить вручную.</p>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_blocked ?? false} onChange={(e) => setForm({ ...form, is_blocked: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
                <label className="text-sm text-slate-600">Заблокировать доступ</label>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Права доступа</label>
                <PermissionEditor value={perms} onChange={setPerms} disabled={form.access_level === "director"} />
                {form.access_level === "director" && (
                  <p className="mt-1 text-xs text-slate-400">Генеральный директор имеет полный доступ ко всему.</p>
                )}
              </div>
            </div>
          )}

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