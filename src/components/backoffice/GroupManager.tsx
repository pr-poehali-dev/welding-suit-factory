import { useState, useRef, useEffect, useCallback } from "react";
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

export type TreeGroup = Group & { children: TreeGroup[] };

export function buildTree(groups: Group[]): TreeGroup[] {
  const map: Record<number, TreeGroup> = {};
  groups.forEach((g) => { map[g.id] = { ...g, children: [] }; });
  const roots: TreeGroup[] = [];
  groups.forEach((g) => {
    if (g.parent_id && map[g.parent_id]) {
      map[g.parent_id].children.push(map[g.id]);
    } else {
      roots.push(map[g.id]);
    }
  });
  return roots;
}

export function collectIds(node: TreeGroup): number[] {
  let ids = [node.id];
  node.children.forEach((c) => { ids = ids.concat(collectIds(c)); });
  return ids;
}

interface TreeNodeProps {
  node: TreeGroup;
  depth: number;
  selectedGroupId: number | null;
  onSelect: (id: number) => void;
  onEdit: (g: Group, e: React.MouseEvent) => void;
  onDelete: (g: Group, e: React.MouseEvent) => void;
  onAddChild: (parentId: number, e: React.MouseEvent) => void;
  counts: Record<number | string, number>;
  expandedIds: Set<number>;
  toggleExpand: (id: number) => void;
}

function TreeNode({ node, depth, selectedGroupId, onSelect, onEdit, onDelete, onAddChild, counts, expandedIds, toggleExpand }: TreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedGroupId === node.id;
  const count = counts[node.id] ?? 0;

  return (
    <>
      <div
        onClick={() => onSelect(node.id)}
        className={`group/item w-full flex items-center justify-between pr-2 py-1.5 text-sm cursor-pointer transition-colors ${
          isSelected ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600 hover:bg-slate-50"
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <span className="flex items-center gap-1.5 truncate min-w-0">
          {hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
              className="p-0.5 shrink-0"
            >
              <Icon name={isExpanded ? "ChevronDown" : "ChevronRight"} size={14} />
            </button>
          ) : (
            <span className="w-[18px] shrink-0" />
          )}
          <Icon name="Folder" size={14} className="shrink-0" />
          <span className="truncate">{node.name}</span>
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {count > 0 && <span className="text-xs text-slate-400">{count}</span>}
          <span className="hidden group-hover/item:flex items-center gap-0.5 ml-1">
            <button onClick={(e) => onAddChild(node.id, e)} className="p-0.5 text-slate-400 hover:text-green-600 rounded" title="Подгруппа">
              <Icon name="Plus" size={11} />
            </button>
            <button onClick={(e) => onEdit(node, e)} className="p-0.5 text-slate-400 hover:text-blue-600 rounded">
              <Icon name="Pencil" size={11} />
            </button>
            <button onClick={(e) => onDelete(node, e)} className="p-0.5 text-slate-400 hover:text-red-500 rounded">
              <Icon name="Trash2" size={11} />
            </button>
          </span>
        </span>
      </div>
      {isExpanded && node.children.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedGroupId={selectedGroupId}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
          counts={counts}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
        />
      ))}
    </>
  );
}

export default function GroupManager({ entityType, selectedGroupId, onSelect, counts = {} }: GroupManagerProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [parentIdForNew, setParentIdForNew] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  /* --- изменяемая ширина панели --- */
  const STORAGE_KEY = `bo-group-width-${entityType}`;
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return saved ? Number(saved) : 224;
  });
  const draggingRef = useRef(false);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      setPanelWidth((prev) => {
        const next = Math.min(500, Math.max(180, prev + e.movementX));
        return next;
      });
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(panelWidth));
  }, [panelWidth, STORAGE_KEY]);

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["bo-groups", entityType],
    queryFn: () => boFetch("groups", "GET", undefined, { entity_type: entityType }),
  });

  const tree = buildTree(groups);

  const save = useMutation({
    mutationFn: (data: { id?: number; entity_type: string; name: string; parent_id?: number | null }) =>
      boFetch("groups", data.id ? "PUT" : "POST", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-groups", entityType] });
      toast({ title: "Группа сохранена" });
      setOpen(false);
      setEditGroup(null);
      setParentIdForNew(null);
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

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openNew = (parentId: number | null = null) => {
    setEditGroup(null);
    setParentIdForNew(parentId);
    setName("");
    setOpen(true);
  };

  const openEdit = (g: Group, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditGroup(g);
    setParentIdForNew(null);
    setName(g.name);
    setOpen(true);
  };

  const handleDelete = (g: Group, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Удалить группу «${g.name}»? Записи останутся без группы.`)) {
      del.mutate(g.id);
    }
  };

  const handleAddChild = (parentId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => new Set(prev).add(parentId));
    openNew(parentId);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const payload: { id?: number; entity_type: string; name: string; parent_id?: number | null } = {
      entity_type: entityType,
      name: name.trim(),
    };
    if (editGroup) {
      payload.id = editGroup.id;
      payload.parent_id = editGroup.parent_id;
    } else {
      payload.parent_id = parentIdForNew;
    }
    save.mutate(payload);
  };

  const totalCount = counts["all"] ?? 0;
  const ungroupedCount = counts["ungrouped"] ?? 0;
  const parentName = parentIdForNew ? groups.find((g) => g.id === parentIdForNew)?.name : null;

  return (
    <div className="relative flex shrink-0" style={{ width: `${panelWidth}px` }}>
      <div className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Группы</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-slate-400 hover:text-blue-600"
            onClick={() => openNew(null)}
          >
            <Icon name="Plus" size={14} />
          </Button>
        </div>

        <div className="py-1 max-h-[60vh] overflow-y-auto">
          <button
            onClick={() => onSelect(null)}
            className={`w-full flex items-center justify-between px-3 py-1.5 text-sm transition-colors ${
              selectedGroupId === null
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span className="flex items-center gap-2">
              <Icon name="List" size={15} />
              Все
            </span>
            {totalCount > 0 && <span className="text-xs text-slate-400">{totalCount}</span>}
          </button>

          {tree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              selectedGroupId={selectedGroupId}
              onSelect={onSelect}
              onEdit={openEdit}
              onDelete={handleDelete}
              onAddChild={handleAddChild}
              counts={counts}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}

          {ungroupedCount > 0 && groups.length > 0 && (
            <button
              onClick={() => onSelect(-1)}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-sm transition-colors ${
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

      {/* ручка изменения ширины */}
      <div
        onMouseDown={startResize}
        title="Потяните, чтобы изменить ширину"
        className="group/resize absolute right-0 top-0 h-full w-2 -mr-1 cursor-col-resize flex items-center justify-center"
      >
        <div className="h-10 w-1 rounded-full bg-slate-200 transition-colors group-hover/resize:bg-blue-400" />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm bg-white text-slate-800">
          <DialogHeader>
            <DialogTitle>
              {editGroup ? "Редактировать группу" : parentName ? `Подгруппа в «${parentName}»` : "Новая группа"}
            </DialogTitle>
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