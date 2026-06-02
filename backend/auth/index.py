"""
Авторизация бэкофиса: вход по логину/паролю, сессии, права доступа.
Логин привязан к сотруднику из справочника. Уровень доступа (роль) + индивидуальные права.
"""
import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta
import psycopg2

SCHEMA = "t_p87775074_welding_suit_factory"

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
}

# Уровни доступа (роли)
ACCESS_LEVELS = [
    "director",        # Генеральный директор — полный доступ
    "manager",         # Менеджер
    "storekeeper",     # Кладовщик
    "economist",       # Экономист
    "production_head", # Начальник производства
    "worker",          # Рабочий (швея, раскройщик, упаковщик)
    "technologist",    # Технолог
]

# Шаблоны прав по умолчанию для каждого уровня доступа.
# Ключи прав: "<модуль>.<действие>"; действия: view (видеть), edit (редактировать).
# Спец-право "orders.hide_client" — скрывать имя заказчика (видно только № заявки).
DEFAULT_TEMPLATES = {
    "director": {"__all__": True},
    "manager": {
        "dashboard.view": True,
        "orders.view": True, "orders.edit": True,
        "clients.view": True, "clients.edit": True,
        "finished_products.view": True,
        "stock.view": True,
        "reports.view": True,
    },
    "storekeeper": {
        "dashboard.view": True,
        "stock.view": True, "stock.edit": True,
        "materials.view": True,
        "fittings.view": True,
        "orders.view": True, "orders.hide_client": True,
    },
    "economist": {
        "dashboard.view": True,
        "orders.view": True,
        "reports.view": True,
        "materials.view": True,
        "fittings.view": True,
        "finished_products.view": True,
        "stock.view": True,
    },
    "production_head": {
        "dashboard.view": True,
        "production.view": True, "production.edit": True,
        "orders.view": True, "orders.hide_client": True,
        "operations.view": True,
        "semi_products.view": True,
        "stock.view": True,
        "workers.view": True,
        "reports.view": True,
    },
    "worker": {
        "production.view": True, "production.edit": True,
        "orders.hide_client": True,
    },
    "technologist": {
        "dashboard.view": True,
        "operations.view": True, "operations.edit": True,
        "semi_products.view": True, "semi_products.edit": True,
        "finished_products.view": True, "finished_products.edit": True,
        "materials.view": True,
        "fittings.view": True,
        "orders.view": True, "orders.hide_client": True,
    },
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def ok(data, status=200):
    return {"statusCode": status, "headers": CORS_HEADERS, "body": json.dumps(data, default=str, ensure_ascii=False)}


def err(msg, status=400):
    return {"statusCode": status, "headers": CORS_HEADERS, "body": json.dumps({"error": msg}, ensure_ascii=False)}


def parse_body(event):
    body = event.get("body", "")
    if not body:
        return {}
    if event.get("isBase64Encoded"):
        import base64
        body = base64.b64decode(body).decode("utf-8")
    return json.loads(body)


def hash_password(password, salt=None):
    if salt is None:
        salt = secrets.token_hex(16)
    h = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
    return f"{salt}${h}"


def verify_password(password, stored):
    if not stored or "$" not in stored:
        return False
    salt, _ = stored.split("$", 1)
    return hash_password(password, salt) == stored


def resolve_permissions(cur, worker_id, access_level):
    """Итоговые права = шаблон роли + индивидуальные переопределения."""
    template = DEFAULT_TEMPLATES.get(access_level, {})
    perms = {}
    if template.get("__all__"):
        perms["__all__"] = True
    else:
        cur.execute(
            f"SELECT permission_key, allowed FROM {SCHEMA}.level_perm_templates WHERE access_level=%s",
            (access_level,),
        )
        db_template = {r[0]: r[1] for r in cur.fetchall()}
        merged = dict(template)
        merged.update(db_template)
        perms = {k: v for k, v in merged.items() if v}

    cur.execute(
        f"SELECT permission_key, allowed FROM {SCHEMA}.worker_permissions WHERE worker_id=%s",
        (worker_id,),
    )
    for key, allowed in cur.fetchall():
        if allowed:
            perms[key] = True
        else:
            perms.pop(key, None)
    return perms


def get_session_worker(cur, token):
    if not token:
        return None
    cur.execute(
        f"""SELECT w.id, w.full_name, w.access_level, w.is_blocked, w.tab_number, w.position
            FROM {SCHEMA}.auth_sessions s
            JOIN {SCHEMA}.workers w ON s.worker_id = w.id
            WHERE s.token=%s AND s.expires_at > now()""",
        (token,),
    )
    row = cur.fetchone()
    if not row:
        return None
    return {
        "id": row[0], "full_name": row[1], "access_level": row[2],
        "is_blocked": row[3], "tab_number": row[4], "position": row[5],
    }


def do_login(cur, data):
    login = (data.get("login") or "").strip()
    password = data.get("password") or ""
    if not login or not password:
        return err("Укажите логин и пароль")
    cur.execute(
        f"SELECT id, full_name, access_level, password_hash, is_blocked FROM {SCHEMA}.workers WHERE login=%s",
        (login,),
    )
    row = cur.fetchone()
    if not row or not verify_password(password, row[3]):
        return err("Неверный логин или пароль", 401)
    if row[4]:
        return err("Учётная запись заблокирована", 403)
    worker_id, full_name, access_level = row[0], row[1], row[2]
    token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(days=7)
    cur.execute(
        f"INSERT INTO {SCHEMA}.auth_sessions (token, worker_id, expires_at) VALUES (%s,%s,%s)",
        (token, worker_id, expires),
    )
    perms = resolve_permissions(cur, worker_id, access_level)
    return ok({
        "token": token,
        "user": {"id": worker_id, "full_name": full_name, "access_level": access_level},
        "permissions": perms,
    })


def do_me(cur, token):
    user = get_session_worker(cur, token)
    if not user:
        return err("Не авторизован", 401)
    if user["is_blocked"]:
        return err("Учётная запись заблокирована", 403)
    perms = resolve_permissions(cur, user["id"], user["access_level"])
    return ok({
        "user": {"id": user["id"], "full_name": user["full_name"], "access_level": user["access_level"]},
        "permissions": perms,
    })


def do_logout(cur, token):
    if token:
        cur.execute(f"UPDATE {SCHEMA}.auth_sessions SET expires_at = now() WHERE token=%s", (token,))
    return ok({"ok": True})


def do_seed_admin(cur, data):
    """Создание первого гендиректора. Работает только если ещё нет ни одного директора."""
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.workers WHERE access_level='director'")
    if cur.fetchone()[0] > 0:
        return err("Администратор уже создан", 409)
    login = (data.get("login") or "admin").strip()
    password = data.get("password") or ""
    full_name = data.get("full_name") or "Генеральный директор"
    if len(password) < 4:
        return err("Пароль слишком короткий (минимум 4 символа)")
    tab = "DIR-" + secrets.token_hex(3)
    cur.execute(
        f"""INSERT INTO {SCHEMA}.workers (tab_number, full_name, position, login, password_hash, access_level, is_active)
            VALUES (%s,%s,%s,%s,%s,'director',true) RETURNING id""",
        (tab, full_name, "Генеральный директор", login, hash_password(password)),
    )
    return ok({"ok": True, "login": login}, 201)


def handler(event, context):
    """Авторизация бэкофиса: вход, выход, текущий пользователь, права доступа."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    qs = event.get("queryStringParameters") or {}
    action = qs.get("action", "")
    headers = event.get("headers") or {}
    token = headers.get("X-Auth-Token") or headers.get("x-auth-token")

    conn = get_conn()
    conn.autocommit = False
    cur = conn.cursor()
    try:
        if action == "login":
            res = do_login(cur, parse_body(event))
        elif action == "me":
            res = do_me(cur, token)
        elif action == "logout":
            res = do_logout(cur, token)
        elif action == "seed_admin":
            res = do_seed_admin(cur, parse_body(event))
        else:
            res = err("Unknown action")
        conn.commit()
        return res
    except Exception as e:
        conn.rollback()
        return err(str(e), 500)
    finally:
        cur.close()
        conn.close()
