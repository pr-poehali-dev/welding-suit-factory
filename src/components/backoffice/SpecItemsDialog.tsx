import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  boFetch,
  Specification,
  SemiProduct,
  PF_TYPE_LABELS,
  PfType,
} from "@/pages/backoffice/types";
import SemiProductEditorDialog from "@/components/backoffice/SemiProductEditorDialog";
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

interface SpecItemsDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  specification: Specification | null;
  allSpecifications: Specification[];
}

export default function SpecItemsDialog({
  open,
  onOpenChange,
  specification,
  allSpecifications,
}: SpecItemsDialogProps) {
  const qc = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorId, setEditorId] = useState<number | null>(null);
  const [copyForId, setCopyForId] = useState<number | null>(null);

  const finishedProductId = specification?.finished_product_id ?? null;

  const invalidate = () => {
    if (finishedProductId != null) {
      qc.invalidateQueries({ queryKey: ["bo-specifications", finishedProductId] });
    }
    qc.invalidateQueries({ queryKey: ["bo-semi-products"] });
  };

  const removeSp = useMutation({
    mutationFn: (id: number) => boFetch("semi_products", "DELETE", { id }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Полуфабрикат удалён" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const copySp = useMutation({
    mutationFn: (vars: { id: number; targetId: number }) =>
      boFetch("copy_semi_to_spec", "POST", { id: vars.id, specification_id: vars.targetId }),
    onSuccess: () => {
      invalidate();
      setCopyForId(null);
      toast({ title: "Полуфабрикат скопирован" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const otherSpecs = allSpecifications.filter((s) => s.id !== specification?.id);

  const openCreate = () => {
    setEditorId(null);
    setEditorOpen(true);
  };
  const openEdit = (id: number) => {
    setEditorId(id);
    setEditorOpen(true);
  };
  const handleSaved = () => {
    invalidate();
  };

  const items = specification?.semi_products ?? [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl bg-white text-slate-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Полуфабрикаты — {specification?.name ?? ""}</DialogTitle>
          </DialogHeader>

          <div className="mb-3 flex justify-end">
            <Button
              size="sm"
              onClick={openCreate}
              className="gap-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Icon name="Plus" size={14} /> Создать полуфабрикат
            </Button>
          </div>

          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              В спецификации нет полуфабрикатов
            </p>
          ) : (
            <div className="overflow-hidden rounded-md border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Название</th>
                    <th className="px-3 py-2 font-medium">Тип</th>
                    <th className="w-20 px-3 py-2 font-medium">Кол-во</th>
                    <th className="w-32 px-3 py-2 text-right font-medium">Себестоимость</th>
                    <th className="w-32 px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((sp: SemiProduct) => (
                    <tr key={sp.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-800">{sp.name}</td>
                      <td className="px-3 py-2 text-slate-500">
                        {PF_TYPE_LABELS[(sp.pf_type ?? "material") as PfType]}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{sp.spec_qty ?? 1}</td>
                      <td
                        className="px-3 py-2 text-right font-medium text-slate-700"
                        title={`Материалы: ${Number(sp.material_cost ?? 0).toLocaleString("ru")} r. + Работа: ${Number(sp.labor_cost_total ?? 0).toLocaleString("ru")} r. × ${sp.spec_qty ?? 1} шт`}
                      >
                        {Number(sp.total_cost ?? 0).toLocaleString("ru")} r.
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Редактировать"
                            onClick={() => openEdit(sp.id)}
                          >
                            <Icon name="Pencil" size={14} className="text-slate-500" />
                          </Button>
                          <div className="relative">
                            <Button
                              size="sm"
                              variant="ghost"
                              title={
                                otherSpecs.length === 0
                                  ? "Нет других спецификаций для копирования"
                                  : "Копировать в спецификацию"
                              }
                              disabled={otherSpecs.length === 0 || copySp.isPending}
                              onClick={() => setCopyForId(copyForId === sp.id ? null : sp.id)}
                            >
                              <Icon name="Copy" size={14} className="text-slate-500" />
                            </Button>
                            {copyForId === sp.id && otherSpecs.length > 0 && (
                              <div className="absolute right-0 z-10 mt-1 w-56 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                                <p className="mb-1 px-1 text-xs text-slate-500">
                                  Копировать в:
                                </p>
                                <div className="max-h-48 overflow-y-auto">
                                  {otherSpecs.map((target) => (
                                    <button
                                      key={target.id}
                                      type="button"
                                      onClick={() =>
                                        copySp.mutate({ id: sp.id, targetId: target.id })
                                      }
                                      className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm text-slate-700 hover:bg-slate-50"
                                    >
                                      <Icon name="Layers" size={13} className="text-emerald-500" />
                                      <span className="truncate">{target.name}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Удалить"
                            onClick={() => {
                              if (window.confirm(`Удалить полуфабрикат «${sp.name}»?`)) {
                                removeSp.mutate(sp.id);
                              }
                            }}
                          >
                            <Icon name="Trash2" size={14} className="text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50">
                    <td colSpan={3} className="px-3 py-2 text-right text-sm font-medium text-slate-600">
                      Итого плановая себестоимость:
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-bold text-slate-800">
                      {Number(specification?.total_cost ?? 0).toLocaleString("ru")} r.
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
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

      <SemiProductEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        semiProductId={editorId}
        specificationId={specification?.id}
        onSaved={handleSaved}
      />
    </>
  );
}