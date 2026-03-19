"""
Рассылка акционных писем по базе клиентов.
GET  /        — список лидов (для админки)
POST /send    — отправить письмо каждому клиенту отдельно
POST /unsubscribe — отписать клиента по email
POST /import  — импортировать контакты из Excel/CSV (base64)
"""
import json
import os
import base64
import io
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import psycopg2
import openpyxl
import csv

SMTP_HOST = "smtp.yandex.ru"
SMTP_PORT = 465
SMTP_USER = "s9308852555@yandex.ru"
SCHEMA    = "t_p87775074_welding_suit_factory"


def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def send_one(to_email: str, to_name: str, subject: str, html: str):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"СПЕЦНАЗ ФАБРИКА <{SMTP_USER}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
        server.login(SMTP_USER, os.environ["SMTP_PASSWORD"])
        server.sendmail(SMTP_USER, to_email, msg.as_string())


def handler(event: dict, context) -> dict:
    """Управление рассылкой: список клиентов, отправка промо-писем по базе."""

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    path   = event.get("path", "/")

    # ── GET / — список лидов ──
    if method == "GET":
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute(
            f"""SELECT id, org, contact, phone, email, kind, order_total, is_unsubscribed, created_at
                FROM {SCHEMA}.leads ORDER BY created_at DESC"""
        )
        rows = cur.fetchall()
        conn.close()
        cols = ["id", "org", "contact", "phone", "email", "kind", "order_total", "is_unsubscribed", "created_at"]
        leads = []
        for row in rows:
            d = dict(zip(cols, row))
            d["created_at"] = d["created_at"].strftime("%d.%m.%Y %H:%M") if d["created_at"] else ""
            leads.append(d)
        return {
            "statusCode": 200,
            "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps({"leads": leads}, ensure_ascii=False),
        }

    # ── POST /send — рассылка ──
    if method == "POST" and path.endswith("/send"):
        body    = json.loads(event.get("body") or "{}")
        subject = body.get("subject", "Специальное предложение от СПЕЦНАЗ ФАБРИКА")
        text    = body.get("text", "")

        conn = get_conn()
        cur  = conn.cursor()
        cur.execute(
            f"""SELECT email, contact, org FROM {SCHEMA}.leads
                WHERE email != '' AND is_unsubscribed = false"""
        )
        recipients = cur.fetchall()
        conn.close()

        sent_count  = 0
        skip_count  = 0
        seen_emails = set()

        for (email, contact, org) in recipients:
            if not email or email in seen_emails:
                skip_count += 1
                continue
            seen_emails.add(email)

            name = contact if contact and contact != "—" else (org if org and org != "—" else "Клиент")

            html = f"""
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#f57c00;padding:16px 24px">
    <h1 style="color:#fff;margin:0;font-size:20px;letter-spacing:2px">СПЕЦНАЗ ФАБРИКА</h1>
  </div>
  <div style="background:#fff;padding:32px 24px">
    <p style="color:#333;font-size:15px;margin-top:0">Здравствуйте, {name}!</p>
    <div style="color:#444;font-size:14px;line-height:1.7">{text.replace(chr(10), '<br>')}</div>
  </div>
  <div style="background:#f5f5f5;padding:16px 24px;font-size:11px;color:#999;text-align:center">
    Вы получили это письмо, так как оставляли заявку на сайте спецназфабрика.рф<br>
    Телефон: 8-930-885-25-55 · E-mail: {SMTP_USER}
  </div>
</div>"""

            send_one(email, name, subject, html)
            sent_count += 1

        return {
            "statusCode": 200,
            "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps({"ok": True, "sent": sent_count, "skipped": skip_count}, ensure_ascii=False),
        }

    # ── POST /unsubscribe — отписать ──
    if method == "POST" and path.endswith("/unsubscribe"):
        body  = json.loads(event.get("body") or "{}")
        email = body.get("email", "")
        lead_id = body.get("id")
        conn  = get_conn()
        cur   = conn.cursor()
        if lead_id:
            cur.execute(f"UPDATE {SCHEMA}.leads SET is_unsubscribed=true WHERE id=%s", (lead_id,))
        elif email:
            cur.execute(f"UPDATE {SCHEMA}.leads SET is_unsubscribed=true WHERE email=%s", (email,))
        conn.commit()
        conn.close()
        return {
            "statusCode": 200,
            "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps({"ok": True}),
        }

    # ── POST /import — импорт контактов из Excel/CSV ──
    if method == "POST" and path.endswith("/import"):
        body     = json.loads(event.get("body") or "{}")
        file_b64 = body.get("file", "")
        filename = body.get("filename", "file.xlsx").lower()
        raw      = base64.b64decode(file_b64)

        rows = []

        if filename.endswith(".csv"):
            text_data = raw.decode("utf-8-sig", errors="replace")
            reader = csv.DictReader(io.StringIO(text_data))
            for r in reader:
                rows.append(r)
        else:
            wb = openpyxl.load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
            ws = wb.active
            headers = []
            for i, row in enumerate(ws.iter_rows(values_only=True)):
                if i == 0:
                    headers = [str(c).strip().lower() if c else "" for c in row]
                else:
                    rows.append(dict(zip(headers, row)))
            wb.close()

        def pick(d, *keys):
            for k in keys:
                for dk in d:
                    if k in dk.lower():
                        v = d[dk]
                        return str(v).strip() if v is not None else ""
            return ""

        conn = get_conn()
        cur  = conn.cursor()
        added = 0
        skipped = 0

        for r in rows:
            email   = pick(r, "email", "почт", "e-mail")
            phone   = pick(r, "phone", "телефон", "тел")
            org     = pick(r, "org", "компания", "организация", "company", "firm")
            contact = pick(r, "contact", "имя", "name", "контакт", "фио")

            if not email and not phone:
                skipped += 1
                continue

            cur.execute(
                f"SELECT id FROM {SCHEMA}.leads WHERE (phone=%s AND phone!='') OR (email=%s AND email!='')",
                (phone, email)
            )
            if cur.fetchone():
                skipped += 1
                continue

            cur.execute(
                f"""INSERT INTO {SCHEMA}.leads (org, contact, phone, email, message, kind, order_json, order_total)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                (org, contact, phone, email, "импорт из файла", "import", "", 0)
            )
            added += 1

        conn.commit()
        conn.close()

        return {
            "statusCode": 200,
            "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps({"ok": True, "added": added, "skipped": skipped}, ensure_ascii=False),
        }

    return {"statusCode": 405, "headers": cors(), "body": "Method Not Allowed"}