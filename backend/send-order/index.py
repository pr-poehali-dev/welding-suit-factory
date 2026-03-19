"""
Отправка заявки на email менеджера + сохранение контакта в БД.
POST / — принимает данные формы или корзины калькулятора.
К письму прикрепляется Excel-файл с данными заявки.
"""
import json
import os
import io
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime
import psycopg2
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

SMTP_HOST = "smtp.yandex.ru"
SMTP_PORT = 465
SMTP_USER = "s9308852555@yandex.ru"
TO_EMAIL  = "s9308852555@yandex.ru"
SCHEMA    = "t_p87775074_welding_suit_factory"

ORANGE = "F57C00"
HEADER_FONT = Font(name="Arial", bold=True, color="FFFFFF", size=11)
HEADER_FILL = PatternFill(start_color=ORANGE, end_color=ORANGE, fill_type="solid")
LABEL_FONT  = Font(name="Arial", color="666666", size=10)
VALUE_FONT  = Font(name="Arial", bold=True, size=11)
THIN_BORDER = Border(
    bottom=Side(style="thin", color="DDDDDD")
)


def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def build_contact_excel(org, contact, phone, email, message):
    wb = Workbook()
    ws = wb.active
    ws.title = "Заявка на КП"

    ws.column_dimensions["A"].width = 28
    ws.column_dimensions["B"].width = 45

    ws.merge_cells("A1:B1")
    cell = ws["A1"]
    cell.value = "СПЕЦНАЗ ФАБРИКА — Заявка на КП"
    cell.font = Font(name="Arial", bold=True, color="FFFFFF", size=14)
    cell.fill = HEADER_FILL
    cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 36
    ws["B1"].fill = HEADER_FILL

    ws.merge_cells("A2:B2")
    ws["A2"].value = f"Дата: {datetime.now().strftime('%d.%m.%Y %H:%M')}"
    ws["A2"].font = Font(name="Arial", color="999999", size=9)
    ws["A2"].alignment = Alignment(horizontal="right")

    fields = [
        ("Организация", org),
        ("Контактное лицо", contact),
        ("Телефон", phone),
        ("E-mail", email or "—"),
        ("Что требуется", message),
    ]
    for i, (label, value) in enumerate(fields, start=4):
        ws.cell(row=i, column=1, value=label).font = LABEL_FONT
        ws.cell(row=i, column=1).border = THIN_BORDER
        v = ws.cell(row=i, column=2, value=value)
        v.font = VALUE_FONT
        v.border = THIN_BORDER
        if label == "Что требуется":
            v.alignment = Alignment(wrap_text=True)

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def build_order_excel(org, contact, phone, email, payment, total, items):
    wb = Workbook()
    ws = wb.active
    ws.title = "Заказ"

    ws.column_dimensions["A"].width = 38
    ws.column_dimensions["B"].width = 22
    ws.column_dimensions["C"].width = 12
    ws.column_dimensions["D"].width = 18

    ws.merge_cells("A1:D1")
    cell = ws["A1"]
    cell.value = "СПЕЦНАЗ ФАБРИКА — Заказ из калькулятора"
    cell.font = Font(name="Arial", bold=True, color="FFFFFF", size=14)
    cell.fill = HEADER_FILL
    cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 36
    for c in ["B1", "C1", "D1"]:
        ws[c].fill = HEADER_FILL

    ws.merge_cells("A2:D2")
    ws["A2"].value = f"Дата: {datetime.now().strftime('%d.%m.%Y %H:%M')}"
    ws["A2"].font = Font(name="Arial", color="999999", size=9)
    ws["A2"].alignment = Alignment(horizontal="right")

    info = [
        ("Организация", org),
        ("Контактное лицо", contact),
        ("Телефон", phone),
        ("E-mail", email or "—"),
        ("Условие оплаты", payment),
    ]
    for i, (label, value) in enumerate(info, start=4):
        ws.cell(row=i, column=1, value=label).font = LABEL_FONT
        ws.cell(row=i, column=1).border = THIN_BORDER
        ws.merge_cells(start_row=i, start_column=2, end_row=i, end_column=4)
        v = ws.cell(row=i, column=2, value=value)
        v.font = VALUE_FONT
        v.border = THIN_BORDER

    row = len(info) + 5
    headers = ["Артикул", "Размер", "Кол-во", "Сумма, ₽"]
    for col, h in enumerate(headers, 1):
        c = ws.cell(row=row, column=col, value=h)
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
        c.alignment = Alignment(horizontal="center")
    row += 1

    for item in items:
        ws.cell(row=row, column=1, value=item.get("product", "")).font = Font(name="Arial", size=10)
        ws.cell(row=row, column=2, value=item.get("size", "")).font = Font(name="Arial", size=10)
        ws.cell(row=row, column=2).alignment = Alignment(horizontal="center")
        ws.cell(row=row, column=3, value=item.get("qty", 0)).font = Font(name="Arial", size=10)
        ws.cell(row=row, column=3).alignment = Alignment(horizontal="center")
        ws.cell(row=row, column=4, value=item.get("lineTotal", 0)).font = Font(name="Arial", bold=True, size=10)
        ws.cell(row=row, column=4).alignment = Alignment(horizontal="right")
        ws.cell(row=row, column=4).number_format = '#,##0'
        for col in range(1, 5):
            ws.cell(row=row, column=col).border = THIN_BORDER
        row += 1

    row += 1
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=3)
    ws.cell(row=row, column=1, value="ИТОГО:").font = Font(name="Arial", bold=True, size=13)
    ws.cell(row=row, column=1).alignment = Alignment(horizontal="right")
    t = ws.cell(row=row, column=4, value=total)
    t.font = Font(name="Arial", bold=True, size=13, color=ORANGE)
    t.alignment = Alignment(horizontal="right")
    t.number_format = '#,##0'

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def send_email(subject, html, excel_bytes=None, excel_filename="Заявка.xlsx"):
    pwd = os.environ.get("SMTP_PASSWORD", "")
    try:
        msg = MIMEMultipart("mixed")
        msg["Subject"] = subject
        msg["From"]    = SMTP_USER
        msg["To"]      = TO_EMAIL

        html_part = MIMEMultipart("alternative")
        html_part.attach(MIMEText(html, "html", "utf-8"))
        msg.attach(html_part)

        if excel_bytes:
            part = MIMEBase("application", "vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            part.set_payload(excel_bytes)
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", "attachment", filename=excel_filename)
            msg.attach(part)

        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
            server.login(SMTP_USER, pwd)
            server.sendmail(SMTP_USER, TO_EMAIL, msg.as_string())
        print("SMTP: email sent OK")
        return True
    except Exception as e:
        print(f"SMTP error: {e}")
        return False


def save_lead(org, contact, phone, email, message, kind, order_json, order_total):
    conn = get_conn()
    cur  = conn.cursor()
    cur.execute(
        f"SELECT id FROM {SCHEMA}.leads WHERE phone=%s ORDER BY created_at DESC LIMIT 1",
        (phone,)
    )
    row = cur.fetchone()
    if row:
        cur.execute(
            f"""UPDATE {SCHEMA}.leads
                SET org=%s, contact=%s, email=%s, message=%s, kind=%s,
                    order_json=%s, order_total=%s, created_at=now()
                WHERE id=%s""",
            (org, contact, email, message, kind, order_json, order_total, row[0])
        )
    else:
        cur.execute(
            f"""INSERT INTO {SCHEMA}.leads (org, contact, phone, email, message, kind, order_json, order_total)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
            (org, contact, phone, email, message, kind, order_json, order_total)
        )
    conn.commit()
    conn.close()


def handler(event: dict, context) -> dict:
    """Принимает заявку с сайта спецназфабрика.рф, сохраняет контакт в БД и отправляет письмо с Excel-файлом менеджеру."""

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    body    = json.loads(event.get("body") or "{}")
    kind    = body.get("kind", "contact")
    org     = body.get("org", "—")
    contact = body.get("contact", "—")
    phone   = body.get("phone", "—")
    email   = body.get("email", "")

    if kind == "contact":
        message = body.get("message", "—")
        save_lead(org, contact, phone, email, message, "contact", "", 0)

        excel = build_contact_excel(org, contact, phone, email, message)

        html = f"""
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#f57c00;padding:16px 24px">
    <h1 style="color:#fff;margin:0;font-size:20px;letter-spacing:2px">СПЕЦНАЗ ФАБРИКА — новая заявка</h1>
  </div>
  <div style="background:#f9f9f9;padding:24px;border:1px solid #eee">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px 0;color:#666;width:180px">Организация</td><td style="padding:8px 0;font-weight:bold;color:#222">{org}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Контактное лицо</td><td style="padding:8px 0;font-weight:bold;color:#222">{contact}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Телефон</td><td style="padding:8px 0;font-weight:bold;color:#f57c00;font-size:16px">{phone}</td></tr>
      <tr><td style="padding:8px 0;color:#666">E-mail</td><td style="padding:8px 0;color:#222">{email or '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#666;vertical-align:top">Что требуется</td><td style="padding:8px 0;color:#222">{message}</td></tr>
    </table>
  </div>
  <div style="background:#eee;padding:12px 24px;font-size:12px;color:#999">
    Заявка отправлена с сайта спецназфабрика.рф · Excel-файл во вложении
  </div>
</div>"""
        send_email("Новая заявка на КП — спецназфабрика.рф", html, excel, f"Заявка_КП_{datetime.now().strftime('%d%m%Y_%H%M')}.xlsx")

    elif kind == "order":
        payment = body.get("payment", "—")
        total   = body.get("total", 0)
        items   = body.get("items", [])
        save_lead(org, contact, phone, email, "", "order", json.dumps(items, ensure_ascii=False), total)

        excel = build_order_excel(org, contact, phone, email, payment, total, items)

        rows = ""
        for item in items:
            rows += f"""
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;color:#222">{item.get('product','')}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;color:#666;text-align:center">{item.get('size','')}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">{item.get('qty','')}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:bold">{item.get('lineTotal',0):,} ₽</td>
      </tr>"""

        html = f"""
<div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto">
  <div style="background:#f57c00;padding:16px 24px">
    <h1 style="color:#fff;margin:0;font-size:20px;letter-spacing:2px">СПЕЦНАЗ ФАБРИКА — заявка из калькулятора</h1>
  </div>
  <div style="background:#f9f9f9;padding:24px;border:1px solid #eee">
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr><td style="padding:6px 0;color:#666;width:180px">Организация</td><td style="padding:6px 0;font-weight:bold;color:#222">{org}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Контактное лицо</td><td style="padding:6px 0;font-weight:bold;color:#222">{contact}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Телефон</td><td style="padding:6px 0;font-weight:bold;color:#f57c00;font-size:16px">{phone}</td></tr>
      <tr><td style="padding:6px 0;color:#666">E-mail</td><td style="padding:6px 0;color:#222">{email or '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Условие оплаты</td><td style="padding:6px 0;color:#222">{payment}</td></tr>
    </table>
    <h3 style="color:#333;border-bottom:2px solid #f57c00;padding-bottom:8px;margin-bottom:0">Состав заказа</h3>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f57c00">
          <th style="padding:8px;color:#fff;text-align:left">Артикул</th>
          <th style="padding:8px;color:#fff;text-align:center">Размер</th>
          <th style="padding:8px;color:#fff;text-align:center">Кол-во</th>
          <th style="padding:8px;color:#fff;text-align:right">Сумма</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
    <div style="text-align:right;margin-top:16px;padding:12px;background:#fff3e0;border-radius:4px">
      <span style="color:#666;font-size:14px">ИТОГО К ОПЛАТЕ: </span>
      <span style="color:#f57c00;font-size:22px;font-weight:bold">{total:,} ₽</span>
    </div>
  </div>
  <div style="background:#eee;padding:12px 24px;font-size:12px;color:#999">
    Заявка отправлена с сайта спецназфабрика.рф · Excel-файл во вложении
  </div>
</div>"""
        send_email(f"Заказ из калькулятора на {total:,} ₽ — спецназфабрика.рф", html, excel, f"Заказ_{datetime.now().strftime('%d%m%Y_%H%M')}.xlsx")

    else:
        return {"statusCode": 400, "headers": {**cors(), "Content-Type": "application/json"}, "body": json.dumps({"error": "unknown kind"})}

    return {
        "statusCode": 200,
        "headers": {**cors(), "Content-Type": "application/json"},
        "body": json.dumps({"ok": True}),
    }
