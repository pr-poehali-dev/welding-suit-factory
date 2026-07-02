import { Order, WorkOrder, Requisition } from "@/pages/backoffice/types";
import { printHtml, escapeHtml, fmtMoney, fmtQty, fmtDate } from "@/pages/backoffice/printDoc";

const OP_STATUS: Record<string, string> = {
  pending: "Ожидает",
  in_progress: "В работе",
  completed: "Выполнена",
};

export function printOrder(order: Order) {
  const items = order.items ?? [];
  const rows = items
    .map(
      (it, i) => `<tr>
        <td class="c">${i + 1}</td>
        <td>${escapeHtml(it.product_name || "#" + it.finished_product_id)}</td>
        <td class="r">${fmtQty(it.qty)}</td>
        <td class="r">${fmtMoney(it.unit_price)}</td>
        <td class="r">${fmtMoney(it.total_price)}</td>
      </tr>`,
    )
    .join("");

  const body = `
    <h1>Заказ № ${escapeHtml(order.order_number)}</h1>
    <p class="muted">Дата печати: ${fmtDate(new Date().toISOString())}</p>
    <div class="row">
      <div><span class="muted">Клиент:</span> <b>${escapeHtml(order.client_name || "—")}</b></div>
      <div><span class="muted">Организация:</span> <b>${escapeHtml(order.client_org || "—")}</b></div>
    </div>
    <div class="row">
      <div><span class="muted">Менеджер:</span> <b>${escapeHtml(order.manager_name || "—")}</b></div>
      <div><span class="muted">Срок:</span> <b>${fmtDate(order.deadline)}</b></div>
    </div>
    ${order.notes ? `<div class="row"><div><span class="muted">Примечание:</span> ${escapeHtml(order.notes)}</div></div>` : ""}

    <h2>Позиции заказа</h2>
    <table>
      <thead>
        <tr>
          <th class="c" style="width:32px">№</th>
          <th>Наименование</th>
          <th class="r" style="width:90px">Кол-во</th>
          <th class="r" style="width:110px">Цена</th>
          <th class="r" style="width:120px">Сумма</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="5" class="c muted">Нет позиций</td></tr>`}</tbody>
      <tfoot>
        <tr><td colspan="4" class="r">Итого:</td><td class="r">${fmtMoney(order.total_amount)}</td></tr>
      </tfoot>
    </table>

    <div class="sign">
      <div><div class="line">Заказ передал (подпись / ФИО)</div></div>
      <div><div class="line">Заказ принял (подпись / ФИО)</div></div>
    </div>
  `;
  printHtml(`Заказ ${order.order_number}`, body);
}

export function printWorkOrder(wo: WorkOrder) {
  const ops = [...(wo.operations ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const rows = ops
    .map(
      (op, i) => `<tr>
        <td class="c">${i + 1}</td>
        <td>${escapeHtml(op.operation_name || "Операция #" + op.operation_id)}</td>
        <td>${escapeHtml(op.worker_name || "—")}</td>
        <td class="r">${op.has_material_norm ? fmtQty(op.planned_material_norm) : "—"}</td>
        <td class="r">${op.has_material_norm && op.actual_material_norm != null ? fmtQty(op.actual_material_norm) : "—"}</td>
        <td class="c">${OP_STATUS[op.status] || op.status}</td>
      </tr>`,
    )
    .join("");

  const body = `
    <h1>Заказ-наряд № ${escapeHtml(wo.work_order_number)}</h1>
    <p class="muted">Дата печати: ${fmtDate(new Date().toISOString())}</p>
    <div class="row">
      <div><span class="muted">Заказ:</span> <b>${escapeHtml(wo.order_number || "#" + wo.order_id)}</b></div>
      <div><span class="muted">Изделие/ПФ:</span> <b>${escapeHtml(wo.semi_product_name || "#" + wo.semi_product_id)}</b></div>
    </div>
    <div class="row">
      <div><span class="muted">Количество:</span> <b>${fmtQty(wo.qty)}</b></div>
      <div><span class="muted">Склад:</span> <b>${escapeHtml(wo.warehouse_name || "—")}</b></div>
    </div>

    <h2>Операции и ответственные</h2>
    <table>
      <thead>
        <tr>
          <th class="c" style="width:32px">№</th>
          <th>Операция</th>
          <th style="width:180px">Ответственный</th>
          <th class="r" style="width:90px">Норма (план)</th>
          <th class="r" style="width:90px">Норма (факт)</th>
          <th class="c" style="width:90px">Статус</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="6" class="c muted">Нет операций</td></tr>`}</tbody>
    </table>

    <div class="sign">
      <div><div class="line">Выдал (кладовщик)</div></div>
      <div><div class="line">Принял (исполнитель)</div></div>
    </div>
  `;
  printHtml(`Заказ-наряд ${wo.work_order_number}`, body);
}

export function printRequisition(req: Requisition) {
  const items = req.items ?? [];
  const rows = items
    .map((it, i) => {
      const remaining = Number(it.issued_qty) - Number(it.returned_qty);
      return `<tr>
        <td class="c">${i + 1}</td>
        <td>${escapeHtml(it.material_name || "#" + it.material_id)}</td>
        <td class="c">${escapeHtml(it.unit_short || "")}</td>
        <td class="r">${it.norm_qty != null ? fmtQty(it.norm_qty) : "—"}</td>
        <td class="r">${fmtQty(it.issued_qty)}</td>
        <td class="r">${fmtQty(it.returned_qty)}</td>
        <td class="r">${fmtQty(remaining)}</td>
      </tr>`;
    })
    .join("");

  const body = `
    <h1>Требование-накладная № ${escapeHtml(req.doc_number)}</h1>
    <p class="muted">Дата: ${fmtDate(req.created_at)}</p>
    <div class="row">
      <div><span class="muted">Получатель:</span> <b>${escapeHtml(req.worker_name || "—")}</b></div>
      <div><span class="muted">Склад:</span> <b>${escapeHtml(req.warehouse_name || "—")}</b></div>
    </div>
    <div class="row">
      <div><span class="muted">Заказ-наряд:</span> <b>${escapeHtml(req.work_order_number || "—")}</b></div>
      <div><span class="muted">Выдал:</span> <b>${escapeHtml(req.issued_by_name || "—")}</b></div>
    </div>
    ${req.notes ? `<div class="row"><div><span class="muted">Примечание:</span> ${escapeHtml(req.notes)}</div></div>` : ""}

    <h2>Материалы</h2>
    <table>
      <thead>
        <tr>
          <th class="c" style="width:32px">№</th>
          <th>Материал</th>
          <th class="c" style="width:50px">Ед.</th>
          <th class="r" style="width:80px">Норма</th>
          <th class="r" style="width:90px">Выдано</th>
          <th class="r" style="width:90px">Возвращено</th>
          <th class="r" style="width:90px">На руках</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="7" class="c muted">Нет позиций</td></tr>`}</tbody>
    </table>

    <div class="sign">
      <div><div class="line">Выдал (кладовщик)</div></div>
      <div><div class="line">Получил (рабочий)</div></div>
    </div>
  `;
  printHtml(`Требование ${req.doc_number}`, body);
}