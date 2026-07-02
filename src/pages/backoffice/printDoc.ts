// Утилита печати документов через отдельное окно браузера.
// Открывает новое окно с готовым HTML и запускает системную печать.

export function printHtml(title: string, bodyHtml: string) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert("Разрешите всплывающие окна для печати документа");
    return;
  }
  win.document.write(`<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; margin: 24px; font-size: 13px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 16px 0 6px; }
  .muted { color: #64748b; }
  .row { display: flex; flex-wrap: wrap; gap: 6px 32px; margin-bottom: 4px; }
  .row div { min-width: 200px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { border-bottom: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
  th { border-top: 1px solid #94a3b8; border-bottom: 1px solid #94a3b8; background: #f1f5f9; }
  .r { text-align: right; }
  .c { text-align: center; }
  tfoot td { font-weight: bold; border-top: 2px solid #475569; }
  .total { margin-top: 10px; text-align: right; font-size: 15px; font-weight: bold; }
  .sign { margin-top: 40px; display: flex; justify-content: space-between; gap: 40px; }
  .sign div { flex: 1; }
  .sign .line { border-top: 1px solid #475569; margin-top: 32px; padding-top: 4px; font-size: 11px; color: #64748b; }
  @media print { body { margin: 12mm; } .no-print { display: none; } }
</style>
</head>
<body>
${bodyHtml}
<script>
  window.onload = function () { window.focus(); window.print(); };
</script>
</body>
</html>`);
  win.document.close();
}

export function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const fmtMoney = (v: unknown) =>
  Number(v || 0).toLocaleString("ru", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtQty = (v: unknown) =>
  Number(v || 0).toLocaleString("ru", { maximumFractionDigits: 4 });

export const fmtDate = (v: unknown) =>
  v ? new Date(String(v)).toLocaleDateString("ru") : "—";
