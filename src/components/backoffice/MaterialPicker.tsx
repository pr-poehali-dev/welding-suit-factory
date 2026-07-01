import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { boFetch, StockMaterial } from "@/pages/backoffice/types";
import Icon from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface MaterialPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (material: StockMaterial, norm: number) => void;
  onlyInStock?: boolean;
}

export default function MaterialPicker({
  open,
  onClose,
  onPick,
  onlyInStock = true,
}: MaterialPickerProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<StockMaterial | null>(null);
  const [norm, setNorm] = useState<number>(0);

  const { data: materials = [], isLoading } = useQuery<StockMaterial[]>({
    queryKey: ["bo-stock-materials"],
    queryFn: () => boFetch("stock_materials"),
    enabled: open,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return materials.filter((m) => {
      if (onlyInStock && Number(m.available_qty) <= 0) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) || (m.sku || "").toLowerCase().includes(q)
      );
    });
  }, [materials, query, onlyInStock]);

  const overNorm = selected && norm > Number(selected.available_qty);

  const handlePick = () => {
    if (!selected) return;
    onPick(selected, norm);
    setSelected(null);
    setNorm(0);
    setQuery("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-white text-slate-800">
        <DialogHeader>
          <DialogTitle>Подбор материала</DialogTitle>
        </DialogHeader>

        <div className="mb-2 flex items-center gap-2 rounded-md border border-slate-300 px-2">
          <Icon name="Search" size={16} className="text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию или артикулу..."
            className="h-9 w-full bg-transparent text-sm text-slate-800 outline-none"
          />
        </div>

        <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2">Материал</th>
                <th className="px-3 py-2">Артикул</th>
                <th className="px-3 py-2 text-right">Остаток</th>
                <th className="px-3 py-2 text-right">Цена</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                    Загрузка...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                    {onlyInStock ? "Нет материалов в наличии" : "Ничего не найдено"}
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => setSelected(m)}
                    className={`cursor-pointer border-t border-slate-100 ${
                      selected?.id === m.id ? "bg-blue-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-3 py-2 font-medium text-slate-700">{m.name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">{m.sku}</td>
                    <td className="px-3 py-2 text-right text-slate-600">
                      {Number(m.available_qty).toLocaleString("ru")} {m.unit_short}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {Number(m.price_per_unit).toLocaleString("ru")} р.
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 text-sm text-slate-600">
              Выбрано: <b className="text-slate-800">{selected.name}</b>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Норма расхода:</label>
              <Input
                type="number"
                step="0.001"
                min={0}
                value={norm}
                onChange={(e) => setNorm(Number(e.target.value))}
                className="h-9 w-32 border-slate-300 bg-white text-slate-800"
              />
              <span className="text-sm text-slate-500">{selected.unit_short}</span>
            </div>
            {overNorm && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
                <Icon name="TriangleAlert" size={13} />
                Норма превышает остаток на складе ({Number(selected.available_qty).toLocaleString("ru")} {selected.unit_short})
              </p>
            )}
          </div>
        )}

        <DialogFooter className="mt-3">
          <Button variant="outline" onClick={onClose} className="border-slate-300 text-slate-600">
            Отмена
          </Button>
          <Button
            onClick={handlePick}
            disabled={!selected || norm <= 0}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
