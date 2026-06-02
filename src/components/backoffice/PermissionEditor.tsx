import { PERM_MODULES, Permissions } from "@/pages/backoffice/types";
import Icon from "@/components/ui/icon";

interface PermissionEditorProps {
  // итоговые галочки: ключ права -> вкл/выкл
  value: Permissions;
  onChange: (next: Permissions) => void;
  disabled?: boolean;
}

export default function PermissionEditor({ value, onChange, disabled }: PermissionEditorProps) {
  const toggle = (key: string) => {
    if (disabled) return;
    const next = { ...value };
    if (next[key]) delete next[key];
    else next[key] = true;
    onChange(next);
  };

  return (
    <div className="rounded-lg border border-slate-200">
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium uppercase tracking-wider text-slate-400">
        <span>Раздел</span>
        <span className="w-16 text-center">Видеть</span>
        <span className="w-20 text-center">Менять</span>
      </div>
      <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
        {PERM_MODULES.map((m) => {
          const viewKey = `${m.module}.view`;
          const editKey = `${m.module}.edit`;
          return (
            <div key={m.module}>
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-3 py-2">
                <span className="text-sm text-slate-700">{m.label}</span>
                <div className="flex w-16 justify-center">
                  <Checkbox checked={!!value[viewKey]} onClick={() => toggle(viewKey)} disabled={disabled} />
                </div>
                <div className="flex w-20 justify-center">
                  {m.hasEdit ? (
                    <Checkbox checked={!!value[editKey]} onClick={() => toggle(editKey)} disabled={disabled} />
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </div>
              </div>
              {m.extra?.map((ex) => (
                <div key={ex.key} className="flex items-center gap-2 bg-amber-50/40 px-3 py-1.5 pl-6">
                  <Checkbox checked={!!value[ex.key]} onClick={() => toggle(ex.key)} disabled={disabled} />
                  <span className="text-xs text-slate-500">{ex.label}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Checkbox({ checked, onClick, disabled }: { checked: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
        checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
      } ${disabled ? "opacity-50" : "hover:border-blue-400"}`}
    >
      {checked && <Icon name="Check" size={13} />}
    </button>
  );
}
