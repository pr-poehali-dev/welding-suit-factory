import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boFetch, Group } from "@/pages/backoffice/types";
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

interface GroupManagerProps {
  entityType: string;
  selectedGroupId: number | null;
  onSelect: (groupId: number | null) => void;
  counts?: Record<number | string, number>;
}

export default function GroupManager({ entityType, selectedGroupId, onSelect, counts = {} }: GroupManagerProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [name, setName] = useState("");

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["bo-groups", entityType],
    queryFn: () => boFetch("groups", "GET", undefined, { entity_type: entityType }),
  });

  const save = useMutation({
    mutationFn: (data: { id?: number; entity_type: string; name: string }) =>
      boFetch("groups", data.id ? "PUT" : "POST", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-groups", entityType] });
      toast({ title: "Группа сохранена" });
      setOpen(false);
      setEditGroup(null);
      setName("");
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => boFetch("groups", "DELETE", { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-groups", entityType] });
      onSelect(null);
      toast({ title: "Группа удалена" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const openNew = () => {
    setEditGroup(null);
    setName("");
    setOpen(true);
  };

  const openEdit = (g: Group, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditGroup(g);
    setName(g.name);
    setOpen(true);
  };

  const handleDelete = (g: Group, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Удалить группу «${g.name}»? Записи останутся без группы.`)) {
      del.mutate(g.id);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;
    save.mutate({
      ...(editGroup ? { id: editGroup.id } : {}),
      entity_type: entityType,
      name: name.trim(),
    });
  };

  const totalCount = counts["all"] ?? 0;
  const ungroupedCount = counts["ungrouped"] ?? 0;

  return (
    <div className="w-56 shrink-0">
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Группы</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-slate-400 hover:text-blue-600"
            onClick={openNew}
          >
            <Icon name="Plus" size={14} />
          </Button>
        </div>

        <div className="py-1">
          <button
            onClick={() => onSelect(null)}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
              selectedGroupId === null
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span className="flex items-center gap-2">
              <Icon name="List" size={15} />
              Все
            </span>
            {totalCount > 0 && (
              <span className="text-xs text-slate-400">{totalCount}</span>
            )}
          </button>

          {groups.map((g) => (
            <div
              key={g.id}
              onClick={() => onSelect(g.id)}
              className={`group w-full flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors ${
                selectedGroupId === g.id
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <Icon name="Folder" size={15} />
                <span className="truncate">{g.name}</span>
              </span>
              <span className="flex items-center gap-1">
                {(counts[g.id] ?? 0) > 0 && (
                  <span className="text-xs text-slate-400">{counts[g.id]}</span>
                )}
                <span className="hidden group-hover:flex items-center gap-0.5">
                  <button
                    onClick={(e) => openEdit(g, e)}
                    className="p-0.5 text-slate-400 hover:text-blue-600 rounded"
                  >
                    <Icon name="Pencil" size={12} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(g, e)}
                    className="p-0.5 text-slate-400 hover:text-red-500 rounded"
                  >
                    <Icon name="Trash2" size={12} />
                  </button>
                </span>
              </span>
            </div>
          ))}

          {ungroupedCount > 0 && groups.length > 0 && (
            <button
              onClick={() => onSelect(-1)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                selectedGroupId === -1
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-slate-400 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon name="FolderOpen" size={15} />
                Без группы
              </span>
              <span className="text-xs text-slate-400">{ungroupedCount}</span>
            </button>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm bg-white text-slate-800">
          <DialogHeader>
            <DialogTitle>{editGroup ? "Редактировать группу" : "Новая группа"}</DialogTitle>
          </DialogHeader>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Название</label>
            <Input
              className="bg-white text-slate-800 border-slate-300"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="text-slate-600 border-slate-300">Отмена</Button>
            <Button onClick={handleSave} disabled={save.isPending || !name.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
              {save.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
