import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boFetch, Specification } from "@/pages/backoffice/types";
import SpecItemsDialog from "@/components/backoffice/SpecItemsDialog";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface SpecificationsDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  finishedProductId: number | null;
  productName?: string;
}

export default function SpecificationsDialog({
  open,
  onOpenChange,
  finishedProductId,
  productName,
}: SpecificationsDialogProps) {
  const qc = useQueryClient();
  const [itemsOpen, setItemsOpen] = useState(false);
  const [activeSpec, setActiveSpec] = useState<Specification | null>(null);

  const { data: specifications = [], isLoading } = useQuery<Specification[]>({
    queryKey: ["bo-specifications", finishedProductId],
    queryFn: () =>
      boFetch("specifications", "GET", undefined, {
        finished_product_id: String(finishedProductId),
      }),
    enabled: open && !!finishedProductId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["bo-specifications", finishedProductId] });
    qc.invalidateQueries({ queryKey: ["bo-finished-products"] });
  };

  const activate = useMutation({
    mutationFn: (id: number) => boFetch("specification_activate", "POST", { id }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Спецификация активирована" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const rename = useMutation({
    mutationFn: (vars: { id: number; name: string }) =>
      boFetch("specifications", "PUT", { id: vars.id, name: vars.name }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Переименовано" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const create = useMutation({
    mutationFn: (name: string) =>
      boFetch("specifications", "POST", { finished_product_id: finishedProductId, name }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Спецификация создана" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => boFetch("specifications", "DELETE", { id }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Спецификация удалена" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const handleCreate = () => {
    const name = window.prompt(
      "Название спецификации",
      `Спецификация ${specifications.length + 1}`,
    );
    if (name && name.trim()) create.mutate(name.trim());
  };

  const handleRename = (spec: Specification) => {
    const name = window.prompt("Новое название спецификации", spec.name);
    if (name && name.trim() && name.trim() !== spec.name) {
      rename.mutate({ id: spec.id, name: name.trim() });
    }
  };

  const handleRemove = (spec: Specification) => {
    if (window.confirm(`Удалить спецификацию «${spec.name}» и её полуфабрикаты?`)) {
      remove.mutate(spec.id);
    }
  };

  const openItems = (spec: Specification) => {
    setActiveSpec(spec);
    setItemsOpen(true);
  };

  const currentSpec = activeSpec
    ? specifications.find((s) => s.id === activeSpec.id) ?? activeSpec
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl bg-white text-slate-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Спецификации{productName ? ` — ${productName}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="mb-3 flex justify-end">
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={create.isPending}
              className="gap-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Icon name="Plus" size={14} /> Создать спецификацию
            </Button>
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-sm text-slate-400">Загрузка...</p>
          ) : specifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Спецификаций пока нет</p>
          ) : (
            <div className="flex flex-col gap-2">
              {specifications.map((spec) => (
                <div
                  key={spec.id}
                  className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2"
                >
                  <button
                    type="button"
                    title="Сделать активной"
                    onClick={() => !spec.is_active && activate.mutate(spec.id)}
                    className="flex-shrink-0"
                  >
                    <Icon
                      name={spec.is_active ? "CircleCheck" : "Circle"}
                      size={18}
                      className={spec.is_active ? "text-green-600" : "text-slate-300"}
                    />
                  </button>

                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-800">
                      {spec.name}
                    </span>
                    {spec.is_active && (
                      <span className="flex-shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                        Активная
                      </span>
                    )}
                    <button
                      type="button"
                      title="Переименовать"
                      onClick={() => handleRename(spec)}
                      className="flex-shrink-0 text-slate-400 hover:text-slate-600"
                    >
                      <Icon name="Pencil" size={13} />
                    </button>
                  </div>

                  <span className="flex-shrink-0 text-xs text-slate-400">
                    ПФ: {spec.semi_products.length}
                  </span>

                  <Button
                    size="sm"
                    variant="ghost"
                    title="Редактировать спецификацию"
                    onClick={() => openItems(spec)}
                  >
                    <Icon name="ListChecks" size={15} className="text-slate-600" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Удалить"
                    onClick={() => handleRemove(spec)}
                  >
                    <Icon name="Trash2" size={15} className="text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-slate-600 border-slate-300"
            >
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SpecItemsDialog
        open={itemsOpen}
        onOpenChange={setItemsOpen}
        specification={currentSpec}
        allSpecifications={specifications}
      />
    </>
  );
}
