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
}

export default function GroupManager({ entityType, selectedGroupId, onSelect }: GroupManagerProps) {
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

  const openNew = () => {
    setEditGroup(null);
    setName("");
    setOpen(true);
  };

  const openEdit = (g: Group) => {
    setEditGroup(g);
    setName(g.name);
    setOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    save.mutate({
      ...(editGroup ? { id: editGroup.id } : {}),
      entity_type: entityType,
      name: name.trim(),
    });
  };

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={selectedGroupId === null ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(null)}
          className={selectedGroupId === null
            ? "bg-blue-600 hover:bg-blue-700 text-white"
            : "text-slate-600 border-slate-300"}
        >
          Все
        </Button>
        {groups.map((g) => (
          <div key={g.id} className="flex items-center gap-0.5">
            <Button
              variant={selectedGroupId === g.id ? "default" : "outline"}
              size="sm"
              onClick={() => onSelect(g.id)}
              className={selectedGroupId === g.id
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "text-slate-600 border-slate-300"}
            >
              {g.name}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
              onClick={(e) => { e.stopPropagation(); openEdit(g); }}
            >
              <Icon name="Pencil" size={12} />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={openNew}
          className="gap-1 text-slate-500 border-dashed border-slate-300 hover:border-slate-400"
        >
          <Icon name="Plus" size={14} /> Группа
        </Button>
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
