"""
Отправка заявки на email менеджера + сохранение контакта в БД.
POST / — принимает данные формы или корзины калькулятора
"""
import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import psycopg2

SMTP_HOST = "smtp.yandex.ru"
SMTP_PORT = 465
SMTP_USER = "s9308852555@yandex.ru"
TO_EMAIL  = "s9308852555@yandex.ru"
SCHEMA    = "t_p87775074_welding_suit_factory"


def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def send_email(subject: str, html: str):
    pwd = os.environ.get("SMTP_PASSWORD", "")
    print(f"SMTP debug: user={SMTP_USER}, pwd_len={len(pwd)}, pwd_first2={pwd[:2] if pwd else 'EMPTY'}")
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = SMTP_USER
        msg["To"]      = TO_EMAIL
        msg.attach(MIMEText(html, "html", "utf-8"))
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
    """Принимает заявку с сайта спецназфабрика.рф, сохраняет контакт в БД и отправляет письмо менеджеру."""

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    body    = json.loads(event.get("body") or "{}")
    kind    = body.get("kind", "contact")
    org     = body.get("org", "—")
    contact = body.get("contact", "—")
    phone   = body.get("phone", "—")
    email   = body.get("email", "")

    # ── Заявка на КП из формы контактов ──
    if kind == "contact":
        message = body.get("message", "—")

        save_lead(org, contact, phone, email, message, "contact", "", 0)

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
    Заявка отправлена с сайта спецназфабрика.рф
  </div>
</div>"""
        send_email("Новая заявка на КП — спецназфабрика.рф", html)

    # ── Заявка из калькулятора (корзина) ──
    elif kind == "order":
        payment = body.get("payment", "—")
        total   = body.get("total", 0)
        items   = body.get("items", [])

        save_lead(org, contact, phone, email, "", "order", json.dumps(items, ensure_ascii=False), total)

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
    Заявка отправлена с сайта спецназфабрика.рф
  </div>
</div>"""
        send_email(f"Заказ из калькулятора на {total:,} ₽ — спецназфабрика.рф", html)

    else:
        return {"statusCode": 400, "headers": {**cors(), "Content-Type": "application/json"}, "body": json.dumps({"error": "unknown kind"})}

    return {
        "statusCode": 200,
        "headers": {**cors(), "Content-Type": "application/json"},
        "body": json.dumps({"ok": True}),
    }