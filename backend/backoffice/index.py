"""
Бэкофис швейного производства — единый API.
Справочники, склад, заказы, производство, заказ-наряды, отчёты.
"""
import json
import os
import traceback
import psycopg2
from datetime import datetime, date, timedelta

SCHEMA = "t_p87775074_welding_suit_factory"

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token, Authorization",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json"
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


# ========== AUTH / ПРАВА ДОСТУПА ==========
import hashlib
import secrets

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
        "stock.view": True, "stock.edit": True,
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

# Сопоставление entity -> модуль права
ENTITY_MODULE = {
    "orders": "orders",
    "order_status": "orders",
    "clients": "clients",
    "workers": "workers",
    "worker_perms": "workers",
    "materials": "materials",
    "suppliers": "materials",
    "vat_rates": "materials",
    "material_receipt": "stock",
    "fittings": "fittings",
    "operations": "operations",
    "semi_products": "semi_products",
    "semi_group_wizard": "semi_products",
    "clone_semi_product": "semi_products",
    "clone_semi_group": "semi_products",
    "stock_materials": "semi_products",
    "catalog_sizes": "semi_products",
    "finished_products": "finished_products",
    "sync_catalog": "finished_products",
    "catalog_products": "finished_products",
    "specifications": "finished_products",
    "specification_activate": "finished_products",
    "copy_semi_to_spec": "finished_products",
    "units": "units",
    "warehouses": "stock",
    "stock": "stock",
    "stock_movement": "stock",
    "stock_movements": "stock",
    "stock_movement_edit": "stock",
    "stock_snapshot": "stock",
    "work_orders": "production",
    "complete_operation": "production",
    "pending_operations": "production",
    "assign_task": "production",
    "task_start": "production",
    "task_finish": "production",
    "worker_payroll": "reports",
    "report_overconsumption": "reports",
    "report_cost": "reports",
    "report_stock_on_date": "stock",
    "report_material_overuse": "stock",
    "requisitions": "stock",
    "requisition_return": "stock",
    "requisition_close": "stock",
    "worker_balances": "stock",
    "groups": None,  # вспомогательное — доступно всем авторизованным
    "period_settings": None,  # чтение всем; изменение проверяется отдельно (только директор)
}


def hash_password(password, salt=None):
    if salt is None:
        salt = secrets.token_hex(16)
    h = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
    return f"{salt}${h}"


def get_auth_user(cur, token):
    if not token:
        return None
    cur.execute(
        f"""SELECT w.id, w.full_name, w.access_level, w.is_blocked
            FROM {SCHEMA}.auth_sessions s
            JOIN {SCHEMA}.workers w ON s.worker_id = w.id
            WHERE s.token=%s AND s.expires_at > now()""",
        (token,),
    )
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "full_name": row[1], "access_level": row[2], "is_blocked": row[3]}


def resolve_permissions(cur, worker_id, access_level):
    template = DEFAULT_TEMPLATES.get(access_level, {})
    if template.get("__all__"):
        return {"__all__": True}
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


def has_perm(perms, key):
    if perms.get("__all__"):
        return True
    return bool(perms.get(key))


def list_worker_perms(cur, worker_id):
    cur.execute(
        f"SELECT permission_key, allowed FROM {SCHEMA}.worker_permissions WHERE worker_id=%s",
        (worker_id,),
    )
    return [{"permission_key": r[0], "allowed": r[1]} for r in cur.fetchall()]


def save_worker_perms(cur, worker_id, perms):
    """perms — список {permission_key, allowed}. Полностью перезаписывает индивидуальные права."""
    cur.execute(f"DELETE FROM {SCHEMA}.worker_permissions WHERE worker_id=%s", (worker_id,))
    for p in perms:
        cur.execute(
            f"INSERT INTO {SCHEMA}.worker_permissions (worker_id, permission_key, allowed) VALUES (%s,%s,%s)",
            (worker_id, p["permission_key"], bool(p.get("allowed", True))),
        )


# ========== ЗАКРЫТИЕ ПЕРИОДА ==========
class PeriodLockedError(Exception):
    pass


def get_period_settings(cur, run_auto=True):
    """Возвращает настройки периода. При run_auto — выполняет еженедельное автозакрытие."""
    cur.execute(f"SELECT id, lock_date, auto_weekly, last_auto_run FROM {SCHEMA}.period_settings WHERE id=1")
    row = cur.fetchone()
    if not row:
        cur.execute(f"INSERT INTO {SCHEMA}.period_settings (id, auto_weekly) VALUES (1, true) RETURNING id, lock_date, auto_weekly, last_auto_run")
        row = cur.fetchone()
    settings = {"lock_date": row[1], "auto_weekly": row[2], "last_auto_run": row[3]}

    # автозакрытие раз в неделю: закрываем всё старше 7 дней
    if run_auto and settings["auto_weekly"]:
        last = settings["last_auto_run"]
        need_run = last is None or (datetime.now(last.tzinfo) - last).days >= 7
        if need_run:
            new_lock = (datetime.now() - timedelta(days=7)).date()
            cur_lock = settings["lock_date"]
            if cur_lock is None or new_lock > cur_lock:
                cur.execute(
                    f"UPDATE {SCHEMA}.period_settings SET lock_date=%s, last_auto_run=now(), updated_at=now() WHERE id=1 RETURNING lock_date, last_auto_run",
                    (new_lock,)
                )
                r2 = cur.fetchone()
                settings["lock_date"] = r2[0]
                settings["last_auto_run"] = r2[1]
            else:
                cur.execute(f"UPDATE {SCHEMA}.period_settings SET last_auto_run=now() WHERE id=1 RETURNING last_auto_run")
                settings["last_auto_run"] = cur.fetchone()[0]

    return {
        "lock_date": settings["lock_date"].isoformat() if settings["lock_date"] else None,
        "auto_weekly": settings["auto_weekly"],
        "last_auto_run": settings["last_auto_run"].isoformat() if settings["last_auto_run"] else None,
    }


def update_period_settings(cur, data, user):
    """Только директор может менять/снимать блокировку периода."""
    if user.get("access_level") != "director":
        raise WorkerValidationError("Изменять закрытие периода может только директор")
    fields, params = [], []
    if "lock_date" in data:
        fields.append("lock_date=%s")
        params.append(data["lock_date"] or None)
    if "auto_weekly" in data:
        fields.append("auto_weekly=%s")
        params.append(bool(data["auto_weekly"]))
    fields.append("updated_by=%s")
    params.append(user["id"])
    fields.append("updated_at=now()")
    cur.execute(f"UPDATE {SCHEMA}.period_settings SET {', '.join(fields)} WHERE id=1", params)
    return get_period_settings(cur, run_auto=False)


def _get_lock_date(cur):
    cur.execute(f"SELECT lock_date FROM {SCHEMA}.period_settings WHERE id=1")
    row = cur.fetchone()
    return row[0] if row and row[0] else None


def _parse_date(val):
    if not val:
        return None
    if isinstance(val, (datetime,)):
        return val.date()
    try:
        return datetime.fromisoformat(str(val)[:10]).date()
    except Exception:
        return None


def assert_period_open(cur, doc_date):
    """Бросает ошибку, если дата документа попадает в закрытый период."""
    lock = _get_lock_date(cur)
    if lock is None:
        return
    d = _parse_date(doc_date)
    if d is not None and d <= lock:
        raise PeriodLockedError(
            f"Период до {lock.isoformat()} закрыт для редактирования. Обратитесь к директору для снятия блокировки."
        )


# ========== GROUPS ==========
def list_groups(cur, entity_type=None):
    if entity_type:
        cur.execute(f"SELECT * FROM {SCHEMA}.groups WHERE entity_type=%s AND is_active=true ORDER BY sort_order, name", (entity_type,))
    else:
        cur.execute(f"SELECT * FROM {SCHEMA}.groups WHERE is_active=true ORDER BY entity_type, sort_order, name")
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def create_group(cur, data):
    cur.execute(
        f"INSERT INTO {SCHEMA}.groups (entity_type, name, sort_order, parent_id) VALUES (%s,%s,%s,%s) RETURNING *",
        (data["entity_type"], data["name"], data.get("sort_order", 0), data.get("parent_id"))
    )
    cols = [d[0] for d in cur.description]
    return dict(zip(cols, cur.fetchone()))


def update_group(cur, gid, data):
    cur.execute(
        f"UPDATE {SCHEMA}.groups SET name=%s, sort_order=%s, parent_id=%s WHERE id=%s RETURNING *",
        (data["name"], data.get("sort_order", 0), data.get("parent_id"), gid)
    )
    cols = [d[0] for d in cur.description]
    row = cur.fetchone()
    return dict(zip(cols, row)) if row else None


def _check_item_usage(cur, entity_type, item_id):
    """Проверяет, используется ли элемент справочника в документах.
    Возвращает строку-описание, где используется, или None."""
    if entity_type == "semi_products":
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.work_orders WHERE semi_product_id=%s", (item_id,))
        if cur.fetchone()[0] > 0:
            return "используется в заказ-нарядах"
    elif entity_type == "finished_products":
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.order_items WHERE finished_product_id=%s", (item_id,))
        if cur.fetchone()[0] > 0:
            return "используется в заказах"
    elif entity_type == "materials":
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.work_order_operations WHERE material_id=%s AND status='completed'", (item_id,))
        if cur.fetchone()[0] > 0:
            return "использован в выполненных операциях"
    elif entity_type == "operations":
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.work_order_operations WHERE operation_id=%s AND status='completed'", (item_id,))
        if cur.fetchone()[0] > 0:
            return "использована в выполненных операциях"
    elif entity_type == "clients":
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.orders WHERE client_id=%s", (item_id,))
        if cur.fetchone()[0] > 0:
            return "используется в заказах"
    return None


def _delete_group_item(cur, entity_type, item_id):
    """Удаляет один элемент справочника вместе со связями."""
    if entity_type == "semi_products":
        cur.execute(f"DELETE FROM {SCHEMA}.semi_product_materials WHERE semi_product_id=%s", (item_id,))
        cur.execute(f"DELETE FROM {SCHEMA}.semi_product_operations WHERE semi_product_id=%s", (item_id,))
        cur.execute(f"DELETE FROM {SCHEMA}.finished_product_semi WHERE semi_product_id=%s", (item_id,))
        cur.execute(f"DELETE FROM {SCHEMA}.semi_products WHERE id=%s", (item_id,))
    elif entity_type == "finished_products":
        cur.execute(f"DELETE FROM {SCHEMA}.finished_product_semi WHERE finished_product_id=%s", (item_id,))
        cur.execute(f"DELETE FROM {SCHEMA}.finished_product_fittings WHERE finished_product_id=%s", (item_id,))
        cur.execute(f"DELETE FROM {SCHEMA}.finished_products WHERE id=%s", (item_id,))
    else:
        cur.execute(f"DELETE FROM {SCHEMA}.{entity_type} WHERE id=%s", (item_id,))


def delete_group(cur, gid, cascade=False):
    """Удаляет группу. При cascade=True удаляет всё содержимое и подгруппы.
    Если хоть один элемент используется в документах — операция блокируется."""
    group_ids = get_group_descendants(cur, gid)
    if not group_ids:
        return None

    # определяем тип сущности группы
    cur.execute(f"SELECT entity_type FROM {SCHEMA}.groups WHERE id=%s", (gid,))
    row = cur.fetchone()
    if not row:
        return None
    entity_type = row[0]

    item_tables = {
        "materials": "materials", "fittings": "fittings", "operations": "operations",
        "clients": "clients", "workers": "workers", "semi_products": "semi_products",
        "finished_products": "finished_products",
    }
    tbl = item_tables.get(entity_type)

    if not cascade:
        # старое поведение — отвязываем элементы, деактивируем группы
        for t in item_tables.values():
            cur.execute(f"UPDATE {SCHEMA}.{t} SET group_id = NULL WHERE group_id = ANY(%s)", (group_ids,))
        cur.execute(f"UPDATE {SCHEMA}.groups SET is_active = false WHERE id = ANY(%s)", (group_ids,))
        return {"deleted": gid, "mode": "detach"}

    # каскад: сначала проверяем, что ничего не используется
    if tbl:
        cur.execute(f"SELECT id, name FROM {SCHEMA}.{tbl} WHERE group_id = ANY(%s)", (group_ids,))
        items = cur.fetchall()
        blocked = []
        for item_id, item_name in items:
            usage = _check_item_usage(cur, entity_type, item_id)
            if usage:
                blocked.append({"id": item_id, "name": item_name, "reason": usage})
        if blocked:
            names = ", ".join(f"«{b['name']}» ({b['reason']})" for b in blocked[:5])
            more = f" и ещё {len(blocked) - 5}" if len(blocked) > 5 else ""
            raise WorkerValidationError(
                f"Нельзя удалить группу: {len(blocked)} элемент(ов) уже использованы: {names}{more}. "
                f"Сначала измените связанные документы."
            )
        # удаляем все элементы
        for item_id, _ in items:
            _delete_group_item(cur, entity_type, item_id)

    # удаляем сами группы (от листьев к корню)
    for g in reversed(group_ids):
        cur.execute(f"DELETE FROM {SCHEMA}.groups WHERE id=%s", (g,))

    return {"deleted": gid, "mode": "cascade", "groups_removed": len(group_ids)}


def get_group_descendants(cur, group_id):
    """Возвращает список id группы + всех потомков (рекурсивно)"""
    cur.execute(f"""
        WITH RECURSIVE tree AS (
            SELECT id FROM {SCHEMA}.groups WHERE id=%s AND is_active=true
            UNION ALL
            SELECT g.id FROM {SCHEMA}.groups g JOIN tree t ON g.parent_id = t.id WHERE g.is_active=true
        )
        SELECT id FROM tree
    """, (group_id,))
    return [r[0] for r in cur.fetchall()]


# ========== UNITS ==========
def list_units(cur):
    cur.execute(f"SELECT * FROM {SCHEMA}.units ORDER BY is_default DESC, name")
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def create_unit(cur, data):
    cur.execute(
        f"INSERT INTO {SCHEMA}.units (name, short_name, is_default) VALUES (%s, %s, false) RETURNING *",
        (data["name"], data["short_name"])
    )
    cols = [d[0] for d in cur.description]
    return dict(zip(cols, cur.fetchone()))


def update_unit(cur, uid, data):
    cur.execute(
        f"UPDATE {SCHEMA}.units SET name=%s, short_name=%s WHERE id=%s RETURNING *",
        (data["name"], data["short_name"], uid)
    )
    cols = [d[0] for d in cur.description]
    row = cur.fetchone()
    return dict(zip(cols, row)) if row else None


# ========== WAREHOUSES ==========
def list_warehouses(cur):
    cur.execute(f"SELECT * FROM {SCHEMA}.warehouses ORDER BY id")
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


# ========== CLIENTS ==========
def list_clients(cur):
    cur.execute(f"""
        SELECT c.*, g.name as group_name
        FROM {SCHEMA}.clients c
        LEFT JOIN {SCHEMA}.groups g ON c.group_id = g.id
        ORDER BY c.name
    """)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def create_client(cur, data):
    cur.execute(
        f"INSERT INTO {SCHEMA}.clients (name, org, phone, email, inn, address, notes, group_id) VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *",
        (data.get("name"), data.get("org"), data.get("phone"), data.get("email"), data.get("inn"), data.get("address"), data.get("notes"), data.get("group_id"))
    )
    cols = [d[0] for d in cur.description]
    return dict(zip(cols, cur.fetchone()))


def update_client(cur, cid, data):
    cur.execute(
        f"UPDATE {SCHEMA}.clients SET name=%s, org=%s, phone=%s, email=%s, inn=%s, address=%s, notes=%s, group_id=%s, updated_at=now() WHERE id=%s RETURNING *",
        (data.get("name"), data.get("org"), data.get("phone"), data.get("email"), data.get("inn"), data.get("address"), data.get("notes"), data.get("group_id"), cid)
    )
    cols = [d[0] for d in cur.description]
    row = cur.fetchone()
    return dict(zip(cols, row)) if row else None


# ========== WORKERS ==========
WORKER_PUBLIC_COLS = "w.id, w.tab_number, w.full_name, w.position, w.phone, w.hourly_rate, w.is_active, w.created_at, w.group_id, w.login, w.access_level, w.is_blocked"


def list_workers(cur):
    cur.execute(f"""
        SELECT {WORKER_PUBLIC_COLS}, g.name as group_name,
               (w.password_hash IS NOT NULL) as has_password
        FROM {SCHEMA}.workers w
        LEFT JOIN {SCHEMA}.groups g ON w.group_id = g.id
        ORDER BY w.full_name
    """)
    cols = [d[0].replace("w.", "") if d[0].startswith("w.") else d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def _worker_public(cur, wid):
    cur.execute(f"""
        SELECT {WORKER_PUBLIC_COLS}, g.name as group_name,
               (w.password_hash IS NOT NULL) as has_password
        FROM {SCHEMA}.workers w
        LEFT JOIN {SCHEMA}.groups g ON w.group_id = g.id
        WHERE w.id=%s
    """, (wid,))
    cols = [d[0].replace("w.", "") if d[0].startswith("w.") else d[0] for d in cur.description]
    row = cur.fetchone()
    return dict(zip(cols, row)) if row else None


class WorkerValidationError(Exception):
    pass


def _validate_worker(cur, data, wid=None):
    tab = (data.get("tab_number") or "").strip()
    if not tab:
        raise WorkerValidationError("Укажите табельный номер")
    login = (data.get("login") or "").strip() or None

    # проверка уникальности табельного номера
    if wid:
        cur.execute(f"SELECT id FROM {SCHEMA}.workers WHERE tab_number=%s AND id<>%s", (tab, wid))
    else:
        cur.execute(f"SELECT id FROM {SCHEMA}.workers WHERE tab_number=%s", (tab,))
    if cur.fetchone():
        raise WorkerValidationError(f"Табельный номер «{tab}» уже используется")

    # проверка уникальности логина
    if login:
        if wid:
            cur.execute(f"SELECT id FROM {SCHEMA}.workers WHERE login=%s AND id<>%s", (login, wid))
        else:
            cur.execute(f"SELECT id FROM {SCHEMA}.workers WHERE login=%s", (login,))
        if cur.fetchone():
            raise WorkerValidationError(f"Логин «{login}» уже занят")

    return tab, login


def create_worker(cur, data):
    tab, login = _validate_worker(cur, data)
    pwd = data.get("password")
    pwd_hash = hash_password(pwd) if pwd else None
    cur.execute(
        f"""INSERT INTO {SCHEMA}.workers
            (tab_number, full_name, position, phone, group_id, login, password_hash, access_level, is_blocked)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
        (tab, data["full_name"], data.get("position"), data.get("phone"),
         data.get("group_id"), login, pwd_hash, data.get("access_level"), data.get("is_blocked", False))
    )
    wid = cur.fetchone()[0]
    if "permissions" in data:
        save_worker_perms(cur, wid, data["permissions"])
    return _worker_public(cur, wid)


def update_worker(cur, wid, data):
    tab, login = _validate_worker(cur, data, wid)
    cur.execute(
        f"""UPDATE {SCHEMA}.workers SET tab_number=%s, full_name=%s, position=%s, phone=%s,
            is_active=%s, group_id=%s, login=%s, access_level=%s, is_blocked=%s WHERE id=%s RETURNING id""",
        (tab, data["full_name"], data.get("position"), data.get("phone"),
         data.get("is_active", True), data.get("group_id"), login, data.get("access_level"),
         data.get("is_blocked", False), wid)
    )
    row = cur.fetchone()
    if not row:
        return None
    pwd = data.get("password")
    if pwd:
        cur.execute(f"UPDATE {SCHEMA}.workers SET password_hash=%s WHERE id=%s", (hash_password(pwd), wid))
    if "permissions" in data:
        save_worker_perms(cur, wid, data["permissions"])
    return _worker_public(cur, wid)


# ========== MATERIALS ==========
def list_materials(cur):
    cur.execute(f"""
        SELECT m.*, u.name as unit_name, u.short_name as unit_short, g.name as group_name,
               s.name as supplier_name, vr.name as vat_rate_name, vr.rate as vat_rate,
               COALESCE((SELECT SUM(st.qty) FROM {SCHEMA}.stock st
                         WHERE st.item_type='material' AND st.item_id=m.id), 0) as stock_qty
        FROM {SCHEMA}.materials m
        LEFT JOIN {SCHEMA}.units u ON m.unit_id = u.id
        LEFT JOIN {SCHEMA}.groups g ON m.group_id = g.id
        LEFT JOIN {SCHEMA}.suppliers s ON m.supplier_id = s.id
        LEFT JOIN {SCHEMA}.vat_rates vr ON m.vat_rate_id = vr.id
        ORDER BY m.name
    """)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def create_material(cur, data):
    cur.execute(
        f"""INSERT INTO {SCHEMA}.materials
            (name, sku, unit_id, price_per_unit, description, group_id, color, density, supplier_id, vat_rate_id)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
        (data["name"], data.get("sku"), data.get("unit_id"), data.get("price_per_unit", 0),
         data.get("description"), data.get("group_id"), data.get("color"), data.get("density"),
         data.get("supplier_id"), data.get("vat_rate_id"))
    )
    cols = [d[0] for d in cur.description]
    return dict(zip(cols, cur.fetchone()))


def update_material(cur, mid, data):
    cur.execute(
        f"""UPDATE {SCHEMA}.materials SET name=%s, sku=%s, unit_id=%s, price_per_unit=%s,
            description=%s, is_active=%s, group_id=%s, color=%s, density=%s,
            supplier_id=%s, vat_rate_id=%s, updated_at=now() WHERE id=%s RETURNING *""",
        (data["name"], data.get("sku"), data.get("unit_id"), data.get("price_per_unit", 0),
         data.get("description"), data.get("is_active", True), data.get("group_id"),
         data.get("color"), data.get("density"), data.get("supplier_id"), data.get("vat_rate_id"), mid)
    )
    cols = [d[0] for d in cur.description]
    row = cur.fetchone()
    return dict(zip(cols, row)) if row else None


# ========== SUPPLIERS ==========
def list_suppliers(cur):
    cur.execute(f"SELECT * FROM {SCHEMA}.suppliers ORDER BY name")
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def create_supplier(cur, data):
    cur.execute(
        f"INSERT INTO {SCHEMA}.suppliers (name, inn, phone, contact_person, notes) VALUES (%s,%s,%s,%s,%s) RETURNING *",
        (data["name"], data.get("inn"), data.get("phone"), data.get("contact_person"), data.get("notes"))
    )
    cols = [d[0] for d in cur.description]
    return dict(zip(cols, cur.fetchone()))


def update_supplier(cur, sid, data):
    cur.execute(
        f"UPDATE {SCHEMA}.suppliers SET name=%s, inn=%s, phone=%s, contact_person=%s, notes=%s, is_active=%s WHERE id=%s RETURNING *",
        (data["name"], data.get("inn"), data.get("phone"), data.get("contact_person"),
         data.get("notes"), data.get("is_active", True), sid)
    )
    cols = [d[0] for d in cur.description]
    row = cur.fetchone()
    return dict(zip(cols, row)) if row else None


# ========== VAT RATES ==========
def list_vat_rates(cur):
    cur.execute(f"SELECT * FROM {SCHEMA}.vat_rates WHERE is_active ORDER BY sort_order, rate")
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def create_vat_rate(cur, data):
    cur.execute(
        f"INSERT INTO {SCHEMA}.vat_rates (name, rate, is_no_vat, sort_order) VALUES (%s,%s,%s,%s) RETURNING *",
        (data["name"], data.get("rate", 0), data.get("is_no_vat", False), data.get("sort_order", 0))
    )
    cols = [d[0] for d in cur.description]
    return dict(zip(cols, cur.fetchone()))


def update_vat_rate(cur, vid, data):
    cur.execute(
        f"UPDATE {SCHEMA}.vat_rates SET name=%s, rate=%s, is_no_vat=%s, is_active=%s, sort_order=%s WHERE id=%s RETURNING *",
        (data["name"], data.get("rate", 0), data.get("is_no_vat", False),
         data.get("is_active", True), data.get("sort_order", 0), vid)
    )
    cols = [d[0] for d in cur.description]
    row = cur.fetchone()
    return dict(zip(cols, row)) if row else None


# ========== MATERIAL RECEIPT (мастер поступления) ==========
def material_receipt(cur, data, worker_id=None):
    """Мастер поступления материала на склад.
    data = {
      material_id? (существующий) ИЛИ поля для нового: name, unit_id, group_id, color, density,
      supplier_id, vat_rate_id, has_vat (bool),
      warehouse_id (обязателен), qty (обязателен), amount (сумма, обязательна)
    }
    Цена захода = amount / qty. Обновляет price_per_unit материала."""
    warehouse_id = data.get("warehouse_id")
    qty = float(data.get("qty") or 0)
    amount = float(data.get("amount") or 0)
    if not warehouse_id:
        raise WorkerValidationError("Выберите склад")
    if qty <= 0:
        raise WorkerValidationError("Количество должно быть больше нуля")
    if amount < 0:
        raise WorkerValidationError("Сумма не может быть отрицательной")

    unit_price = round(amount / qty, 2) if qty else 0

    material_id = data.get("material_id")
    if material_id:
        # обновляем цену захода и, при необходимости, поставщика/НДС
        cur.execute(
            f"UPDATE {SCHEMA}.materials SET price_per_unit=%s, updated_at=now() WHERE id=%s RETURNING id, name",
            (unit_price, material_id)
        )
        row = cur.fetchone()
        if not row:
            raise WorkerValidationError("Материал не найден")
        mat_name = row[1]
    else:
        # создаём новый материал
        if not data.get("name"):
            raise WorkerValidationError("Укажите название материала")
        cur.execute(
            f"""INSERT INTO {SCHEMA}.materials
                (name, sku, unit_id, price_per_unit, description, group_id, color, density, supplier_id, vat_rate_id)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id, name""",
            (data["name"], data.get("sku"), data.get("unit_id"), unit_price,
             data.get("description"), data.get("group_id"), data.get("color"), data.get("density"),
             data.get("supplier_id"), data.get("vat_rate_id"))
        )
        row = cur.fetchone()
        material_id = row[0]
        mat_name = row[1]

    # движение прихода + обновление остатка
    stock_movement(cur, {
        "warehouse_id": warehouse_id,
        "item_type": "material",
        "item_id": material_id,
        "movement_type": "in",
        "qty": qty,
        "reason": f"Поступление: {qty} × {unit_price} = {amount}",
        "worker_id": worker_id,
    })
    return {"material_id": material_id, "name": mat_name, "unit_price": unit_price, "qty": qty, "amount": amount}


# ========== ТРЕБОВАНИЯ-НАКЛАДНЫЕ (выдача материала рабочим) ==========
def _adjust_worker_balance(cur, worker_id, material_id, delta):
    cur.execute(
        f"SELECT id, qty FROM {SCHEMA}.worker_material_balance WHERE worker_id=%s AND material_id=%s",
        (worker_id, material_id),
    )
    row = cur.fetchone()
    if row:
        cur.execute(
            f"UPDATE {SCHEMA}.worker_material_balance SET qty = qty + %s, updated_at=now() WHERE id=%s",
            (delta, row[0]),
        )
    else:
        cur.execute(
            f"INSERT INTO {SCHEMA}.worker_material_balance (worker_id, material_id, qty) VALUES (%s,%s,%s)",
            (worker_id, material_id, delta),
        )


def list_requisitions(cur, worker_id=None, work_order_id=None, status=None):
    sql = f"""
        SELECT r.*, w.name AS warehouse_name, wk.full_name AS worker_name,
               ib.full_name AS issued_by_name, wo.work_order_number
        FROM {SCHEMA}.material_requisitions r
        JOIN {SCHEMA}.warehouses w ON r.warehouse_id = w.id
        JOIN {SCHEMA}.workers wk ON r.worker_id = wk.id
        LEFT JOIN {SCHEMA}.workers ib ON r.issued_by = ib.id
        LEFT JOIN {SCHEMA}.work_orders wo ON r.work_order_id = wo.id
        WHERE 1=1
    """
    params = []
    if worker_id:
        sql += " AND r.worker_id=%s"; params.append(int(worker_id))
    if work_order_id:
        sql += " AND r.work_order_id=%s"; params.append(int(work_order_id))
    if status:
        sql += " AND r.status=%s"; params.append(status)
    sql += " ORDER BY r.created_at DESC"
    cur.execute(sql, params)
    cols = [d[0] for d in cur.description]
    rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    for row in rows:
        cur.execute(f"""
            SELECT ri.*, m.name AS material_name, u.short_name AS unit_short
            FROM {SCHEMA}.material_requisition_items ri
            JOIN {SCHEMA}.materials m ON ri.material_id = m.id
            LEFT JOIN {SCHEMA}.units u ON m.unit_id = u.id
            WHERE ri.requisition_id=%s ORDER BY ri.id
        """, (row["id"],))
        ic = [d[0] for d in cur.description]
        row["items"] = [dict(zip(ic, r)) for r in cur.fetchall()]
    return rows


def create_requisition(cur, data, issued_by=None):
    """Выдача материала рабочему. Списывает со склада, добавляет на баланс рабочего.
    data = {warehouse_id, worker_id, work_order_id?, notes?, items:[{material_id, issued_qty, norm_qty?, notes?}]}"""
    warehouse_id = data.get("warehouse_id")
    worker_id = data.get("worker_id")
    items = data.get("items") or []
    if not warehouse_id:
        raise WorkerValidationError("Выберите склад")
    if not worker_id:
        raise WorkerValidationError("Выберите рабочего")
    if not items:
        raise WorkerValidationError("Добавьте хотя бы одну позицию")

    assert_period_open(cur, datetime.now().date())

    # контроль наличия материала на складе (нельзя выдать больше доступного)
    for it in items:
        mid = it.get("material_id")
        qty = float(it.get("issued_qty") or 0)
        if not mid or qty <= 0:
            continue
        cur.execute(
            f"SELECT COALESCE(SUM(qty - reserved_qty),0) FROM {SCHEMA}.stock WHERE item_type='material' AND item_id=%s AND warehouse_id=%s",
            (mid, warehouse_id),
        )
        avail = float(cur.fetchone()[0] or 0)
        if qty > avail + 1e-9:
            cur.execute(f"SELECT name FROM {SCHEMA}.materials WHERE id=%s", (mid,))
            nm = cur.fetchone()
            nm = nm[0] if nm else f"#{mid}"
            raise WorkerValidationError(
                f"Недостаточно материала «{nm}» на складе: нужно {qty:g}, доступно {avail:g}"
            )

    doc_number = "ТН-" + datetime.now().strftime("%y%m%d%H%M%S")
    cur.execute(
        f"""INSERT INTO {SCHEMA}.material_requisitions
            (doc_number, warehouse_id, worker_id, work_order_id, status, issued_by, notes)
            VALUES (%s,%s,%s,%s,'issued',%s,%s) RETURNING id""",
        (doc_number, warehouse_id, worker_id, data.get("work_order_id"), issued_by, data.get("notes")),
    )
    req_id = cur.fetchone()[0]

    for it in items:
        mid = it.get("material_id")
        qty = float(it.get("issued_qty") or 0)
        if not mid or qty <= 0:
            continue
        cur.execute(
            f"""INSERT INTO {SCHEMA}.material_requisition_items
                (requisition_id, material_id, issued_qty, norm_qty, notes)
                VALUES (%s,%s,%s,%s,%s)""",
            (req_id, mid, qty, it.get("norm_qty"), it.get("notes")),
        )
        # списание со склада + движение + баланс рабочего
        stock_movement(cur, {
            "warehouse_id": warehouse_id, "item_type": "material", "item_id": mid,
            "movement_type": "out", "qty": qty, "worker_id": worker_id,
            "reason": f"Выдача по требованию {doc_number}",
        })
        _adjust_worker_balance(cur, worker_id, mid, qty)

    return {"id": req_id, "doc_number": doc_number}


def return_requisition_item(cur, data):
    """Возврат материала с рук рабочего на склад.
    data = {item_id, return_qty}"""
    item_id = data.get("item_id")
    return_qty = float(data.get("return_qty") or 0)
    if not item_id or return_qty <= 0:
        raise WorkerValidationError("Укажите количество возврата")

    cur.execute(f"""
        SELECT ri.requisition_id, ri.material_id, ri.issued_qty, ri.returned_qty,
               r.warehouse_id, r.worker_id
        FROM {SCHEMA}.material_requisition_items ri
        JOIN {SCHEMA}.material_requisitions r ON ri.requisition_id = r.id
        WHERE ri.id=%s
    """, (item_id,))
    row = cur.fetchone()
    if not row:
        raise WorkerValidationError("Позиция не найдена")
    req_id, material_id, issued_qty, returned_qty, warehouse_id, worker_id = row
    remaining = float(issued_qty) - float(returned_qty)
    if return_qty > remaining + 1e-9:
        raise WorkerValidationError(f"Нельзя вернуть больше, чем на руках ({remaining})")

    assert_period_open(cur, datetime.now().date())

    cur.execute(
        f"UPDATE {SCHEMA}.material_requisition_items SET returned_qty = returned_qty + %s WHERE id=%s",
        (return_qty, item_id),
    )
    stock_movement(cur, {
        "warehouse_id": warehouse_id, "item_type": "material", "item_id": material_id,
        "movement_type": "return", "qty": return_qty, "worker_id": worker_id,
        "reason": "Возврат по требованию",
    })
    _adjust_worker_balance(cur, worker_id, material_id, -return_qty)
    return {"ok": True}


def close_requisition(cur, req_id):
    cur.execute(
        f"UPDATE {SCHEMA}.material_requisitions SET status='closed', closed_at=now() WHERE id=%s RETURNING id",
        (req_id,),
    )
    return {"ok": bool(cur.fetchone())}


def list_worker_balances(cur, worker_id=None):
    sql = f"""
        SELECT b.*, wk.full_name AS worker_name, m.name AS material_name,
               u.short_name AS unit_short
        FROM {SCHEMA}.worker_material_balance b
        JOIN {SCHEMA}.workers wk ON b.worker_id = wk.id
        JOIN {SCHEMA}.materials m ON b.material_id = m.id
        LEFT JOIN {SCHEMA}.units u ON m.unit_id = u.id
        WHERE b.qty <> 0
    """
    params = []
    if worker_id:
        sql += " AND b.worker_id=%s"; params.append(int(worker_id))
    sql += " ORDER BY wk.full_name, m.name"
    cur.execute(sql, params)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def report_material_overuse(cur, mode="requisition", work_order_id=None):
    """Отчёт перерасхода материалов.
    mode='requisition' — факт(выдано−возвращено) минус норма по требованиям (для проверки после закрытия).
    mode='writeoff' — списание (actual_material_norm − planned) из заказ-нарядов (оперативный анализ)."""
    if mode == "writeoff":
        sql = f"""
            SELECT wo.id AS work_order_id, wo.work_order_number, wo.qty AS wo_qty,
                   m.id AS material_id, m.name AS material_name, u.short_name AS unit_short,
                   COALESCE(m.price_per_unit,0) AS price,
                   op.planned_material_norm, op.actual_material_norm,
                   wk.full_name AS worker_name
            FROM {SCHEMA}.work_order_operations op
            JOIN {SCHEMA}.work_orders wo ON op.work_order_id = wo.id
            JOIN {SCHEMA}.materials m ON op.material_id = m.id
            LEFT JOIN {SCHEMA}.units u ON m.unit_id = u.id
            LEFT JOIN {SCHEMA}.workers wk ON op.worker_id = wk.id
            WHERE op.material_id IS NOT NULL AND op.actual_material_norm IS NOT NULL
        """
        params = []
        if work_order_id:
            sql += " AND wo.id=%s"; params.append(int(work_order_id))
        sql += " ORDER BY wo.work_order_number"
        cur.execute(sql, params)
        cols = [d[0] for d in cur.description]
        rows = []
        for r in cur.fetchall():
            d = dict(zip(cols, r))
            wo_qty = float(d["wo_qty"] or 1)
            plan = float(d["planned_material_norm"] or 0) * wo_qty
            fact = float(d["actual_material_norm"] or 0) * wo_qty
            overuse = round(fact - plan, 4)
            if overuse <= 0:
                continue
            price = float(d["price"] or 0)
            rows.append({
                "work_order_id": d["work_order_id"], "work_order_number": d["work_order_number"],
                "material_id": d["material_id"], "material_name": d["material_name"],
                "unit_short": d["unit_short"], "worker_name": d["worker_name"],
                "plan_qty": round(plan, 4), "fact_qty": round(fact, 4),
                "overuse_qty": overuse, "price": round(price, 2),
                "overuse_cost": round(overuse * price, 2),
            })
        return {"mode": mode, "rows": rows, "total_cost": round(sum(x["overuse_cost"] for x in rows), 2)}

    # mode == 'requisition'
    sql = f"""
        SELECT r.work_order_id, wo.work_order_number, wo.qty AS wo_qty, ri.material_id,
               m.name AS material_name, u.short_name AS unit_short,
               COALESCE(m.price_per_unit,0) AS price,
               SUM(ri.issued_qty) AS issued, SUM(ri.returned_qty) AS returned,
               MAX(wk.full_name) AS worker_name
        FROM {SCHEMA}.material_requisition_items ri
        JOIN {SCHEMA}.material_requisitions r ON ri.requisition_id = r.id
        LEFT JOIN {SCHEMA}.work_orders wo ON r.work_order_id = wo.id
        JOIN {SCHEMA}.materials m ON ri.material_id = m.id
        LEFT JOIN {SCHEMA}.units u ON m.unit_id = u.id
        LEFT JOIN {SCHEMA}.workers wk ON r.worker_id = wk.id
        WHERE r.work_order_id IS NOT NULL
    """
    params = []
    if work_order_id:
        sql += " AND r.work_order_id=%s"; params.append(int(work_order_id))
    sql += " GROUP BY r.work_order_id, wo.work_order_number, wo.qty, ri.material_id, m.name, u.short_name, m.price_per_unit"
    sql += " ORDER BY wo.work_order_number"
    cur.execute(sql, params)
    cols = [d[0] for d in cur.description]
    rows = []
    for r in cur.fetchall():
        d = dict(zip(cols, r))
        wo_id = d["work_order_id"]
        wo_qty = float(d["wo_qty"] or 1)
        # норма из заказ-наряда для этого материала
        cur.execute(f"""
            SELECT COALESCE(SUM(op.planned_material_norm),0)
            FROM {SCHEMA}.work_order_operations op
            WHERE op.work_order_id=%s AND op.material_id=%s
        """, (wo_id, d["material_id"]))
        norm_per = float(cur.fetchone()[0] or 0)
        norm_total = norm_per * wo_qty
        fact = float(d["issued"] or 0) - float(d["returned"] or 0)
        overuse = round(fact - norm_total, 4)
        if overuse <= 0:
            continue
        price = float(d["price"] or 0)
        rows.append({
            "work_order_id": wo_id, "work_order_number": d["work_order_number"],
            "material_id": d["material_id"], "material_name": d["material_name"],
            "unit_short": d["unit_short"], "worker_name": d["worker_name"],
            "issued_qty": round(float(d["issued"] or 0), 4),
            "returned_qty": round(float(d["returned"] or 0), 4),
            "norm_qty": round(norm_total, 4), "fact_qty": round(fact, 4),
            "overuse_qty": overuse, "price": round(price, 2),
            "overuse_cost": round(overuse * price, 2),
        })
    return {"mode": mode, "rows": rows, "total_cost": round(sum(x["overuse_cost"] for x in rows), 2)}


# ========== FITTINGS ==========
def list_fittings(cur):
    cur.execute(f"""
        SELECT f.*, u.name as unit_name, u.short_name as unit_short, g.name as group_name
        FROM {SCHEMA}.fittings f
        LEFT JOIN {SCHEMA}.units u ON f.unit_id = u.id
        LEFT JOIN {SCHEMA}.groups g ON f.group_id = g.id
        ORDER BY f.name
    """)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def create_fitting(cur, data):
    cur.execute(
        f"INSERT INTO {SCHEMA}.fittings (name, sku, unit_id, price_per_unit, description, group_id) VALUES (%s,%s,%s,%s,%s,%s) RETURNING *",
        (data["name"], data.get("sku"), data.get("unit_id"), data.get("price_per_unit", 0), data.get("description"), data.get("group_id"))
    )
    cols = [d[0] for d in cur.description]
    return dict(zip(cols, cur.fetchone()))


def update_fitting(cur, fid, data):
    cur.execute(
        f"UPDATE {SCHEMA}.fittings SET name=%s, sku=%s, unit_id=%s, price_per_unit=%s, description=%s, is_active=%s, group_id=%s, updated_at=now() WHERE id=%s RETURNING *",
        (data["name"], data.get("sku"), data.get("unit_id"), data.get("price_per_unit", 0), data.get("description"), data.get("is_active", True), data.get("group_id"), fid)
    )
    cols = [d[0] for d in cur.description]
    row = cur.fetchone()
    return dict(zip(cols, row)) if row else None


# ========== OPERATIONS ==========
def list_operations(cur):
    cur.execute(f"""
        SELECT o.*, g.name as group_name
        FROM {SCHEMA}.operations o
        LEFT JOIN {SCHEMA}.groups g ON o.group_id = g.id
        ORDER BY o.sort_order, o.name
    """)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def create_operation(cur, data):
    cur.execute(
        f"INSERT INTO {SCHEMA}.operations (name, description, has_material_norm, default_price, sort_order, group_id) VALUES (%s,%s,%s,%s,%s,%s) RETURNING *",
        (data["name"], data.get("description"), data.get("has_material_norm", False), data.get("default_price", 0), data.get("sort_order", 0), data.get("group_id"))
    )
    cols = [d[0] for d in cur.description]
    return dict(zip(cols, cur.fetchone()))


def update_operation(cur, oid, data):
    cur.execute(
        f"UPDATE {SCHEMA}.operations SET name=%s, description=%s, has_material_norm=%s, default_price=%s, sort_order=%s, is_active=%s, group_id=%s WHERE id=%s RETURNING *",
        (data["name"], data.get("description"), data.get("has_material_norm", False), data.get("default_price", 0), data.get("sort_order", 0), data.get("is_active", True), data.get("group_id"), oid)
    )
    cols = [d[0] for d in cur.description]
    row = cur.fetchone()
    return dict(zip(cols, row)) if row else None


# ========== SEMI PRODUCTS ==========
def _load_sp_details(cur, row):
    cur.execute(f"""
        SELECT spm.*, m.name as material_name, u.short_name as unit_short
        FROM {SCHEMA}.semi_product_materials spm
        JOIN {SCHEMA}.materials m ON spm.material_id = m.id
        LEFT JOIN {SCHEMA}.units u ON m.unit_id = u.id
        WHERE spm.semi_product_id = %s
    """, (row["id"],))
    mc = [d[0] for d in cur.description]
    row["materials"] = [dict(zip(mc, r)) for r in cur.fetchall()]
    cur.execute(f"""
        SELECT spo.*, o.name as operation_name, o.has_material_norm
        FROM {SCHEMA}.semi_product_operations spo
        JOIN {SCHEMA}.operations o ON spo.operation_id = o.id
        WHERE spo.semi_product_id = %s ORDER BY spo.sort_order
    """, (row["id"],))
    oc = [d[0] for d in cur.description]
    row["operations"] = [dict(zip(oc, r)) for r in cur.fetchall()]
    # вложенные полуфабрикаты (для составных)
    cur.execute(f"""
        SELECT spc.*, sp.name as component_name, sp.pf_type as component_type, sp.sku as component_sku
        FROM {SCHEMA}.semi_product_components spc
        JOIN {SCHEMA}.semi_products sp ON spc.component_id = sp.id
        WHERE spc.parent_id = %s
    """, (row["id"],))
    cc = [d[0] for d in cur.description]
    row["components"] = [dict(zip(cc, r)) for r in cur.fetchall()]
    return row


def list_semi_products(cur):
    cur.execute(f"""
        SELECT sp.*, g.name as group_name, pg.name as parent_group_name
        FROM {SCHEMA}.semi_products sp
        LEFT JOIN {SCHEMA}.groups g ON sp.group_id = g.id
        LEFT JOIN {SCHEMA}.groups pg ON g.parent_id = pg.id
        WHERE sp.sku IS DISTINCT FROM '__DEFAULT__'
        ORDER BY sp.name
    """)
    cols = [d[0] for d in cur.description]
    rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    for row in rows:
        _load_sp_details(cur, row)
    return rows


def create_semi_product(cur, data):
    cur.execute(
        f"INSERT INTO {SCHEMA}.semi_products (name, sku, description, group_id, pf_type, size_label, product_id, specification_id, spec_qty) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *",
        (data["name"], data.get("sku"), data.get("description"), data.get("group_id"),
         data.get("pf_type", "material"), data.get("size_label"), data.get("product_id"),
         data.get("specification_id"), data.get("spec_qty", 1))
    )
    cols = [d[0] for d in cur.description]
    sp = dict(zip(cols, cur.fetchone()))
    for mat in data.get("materials", []):
        cur.execute(
            f"INSERT INTO {SCHEMA}.semi_product_materials (semi_product_id, material_id, norm_qty, notes) VALUES (%s,%s,%s,%s)",
            (sp["id"], mat["material_id"], mat.get("norm_qty", 0), mat.get("notes"))
        )
    for op in data.get("operations", []):
        cur.execute(
            f"INSERT INTO {SCHEMA}.semi_product_operations (semi_product_id, operation_id, labor_cost, sort_order, notes) VALUES (%s,%s,%s,%s,%s)",
            (sp["id"], op["operation_id"], op.get("labor_cost", 0), op.get("sort_order", 0), op.get("notes"))
        )
    for comp in data.get("components", []):
        if comp.get("component_id") and comp["component_id"] != sp["id"]:
            cur.execute(
                f"INSERT INTO {SCHEMA}.semi_product_components (parent_id, component_id, qty) VALUES (%s,%s,%s) ON CONFLICT (parent_id, component_id) DO NOTHING",
                (sp["id"], comp["component_id"], comp.get("qty", 1))
            )
    return sp


def update_semi_product(cur, spid, data):
    cur.execute(
        f"UPDATE {SCHEMA}.semi_products SET name=%s, sku=%s, description=%s, is_active=%s, group_id=%s, pf_type=COALESCE(%s, pf_type), size_label=%s, spec_qty=COALESCE(%s, spec_qty), updated_at=now() WHERE id=%s RETURNING *",
        (data["name"], data.get("sku"), data.get("description"), data.get("is_active", True),
         data.get("group_id"), data.get("pf_type"), data.get("size_label"), data.get("spec_qty"), spid)
    )
    cols = [d[0] for d in cur.description]
    row = cur.fetchone()
    if not row:
        return None
    sp = dict(zip(cols, row))
    if "materials" in data:
        # удаляем строки, которых больше нет
        sent_ids = {m["id"] for m in data["materials"] if m.get("id")}
        cur.execute(f"SELECT id FROM {SCHEMA}.semi_product_materials WHERE semi_product_id=%s", (spid,))
        for (mid,) in cur.fetchall():
            if mid not in sent_ids:
                cur.execute(f"DELETE FROM {SCHEMA}.semi_product_materials WHERE id=%s", (mid,))
    if "operations" in data:
        sent_ops = {o["id"] for o in data["operations"] if o.get("id")}
        cur.execute(f"SELECT id FROM {SCHEMA}.semi_product_operations WHERE semi_product_id=%s", (spid,))
        for (oid,) in cur.fetchall():
            if oid not in sent_ops:
                cur.execute(f"DELETE FROM {SCHEMA}.semi_product_operations WHERE id=%s", (oid,))
    if "materials" in data:
        cur.execute(f"SELECT id FROM {SCHEMA}.semi_product_materials WHERE semi_product_id=%s", (spid,))
        existing = {r[0] for r in cur.fetchall()}
        new_ids = set()
        for mat in data["materials"]:
            if mat.get("id"):
                cur.execute(
                    f"UPDATE {SCHEMA}.semi_product_materials SET material_id=%s, norm_qty=%s, notes=%s WHERE id=%s",
                    (mat["material_id"], mat.get("norm_qty", 0), mat.get("notes"), mat["id"])
                )
                new_ids.add(mat["id"])
            else:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.semi_product_materials (semi_product_id, material_id, norm_qty, notes) VALUES (%s,%s,%s,%s)",
                    (spid, mat["material_id"], mat.get("norm_qty", 0), mat.get("notes"))
                )
    if "operations" in data:
        cur.execute(f"SELECT id FROM {SCHEMA}.semi_product_operations WHERE semi_product_id=%s", (spid,))
        existing_ops = {r[0] for r in cur.fetchall()}
        for op in data["operations"]:
            if op.get("id"):
                cur.execute(
                    f"UPDATE {SCHEMA}.semi_product_operations SET operation_id=%s, labor_cost=%s, sort_order=%s, notes=%s WHERE id=%s",
                    (op["operation_id"], op.get("labor_cost", 0), op.get("sort_order", 0), op.get("notes"), op["id"])
                )
            else:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.semi_product_operations (semi_product_id, operation_id, labor_cost, sort_order, notes) VALUES (%s,%s,%s,%s,%s)",
                    (spid, op["operation_id"], op.get("labor_cost", 0), op.get("sort_order", 0), op.get("notes"))
                )
    if "components" in data:
        sent = {(c["component_id"]) for c in data["components"] if c.get("component_id")}
        cur.execute(f"SELECT component_id FROM {SCHEMA}.semi_product_components WHERE parent_id=%s", (spid,))
        existing_comp = {r[0] for r in cur.fetchall()}
        for comp in data["components"]:
            cid = comp.get("component_id")
            if not cid or cid == spid:
                continue
            if cid in existing_comp:
                cur.execute(
                    f"UPDATE {SCHEMA}.semi_product_components SET qty=%s WHERE parent_id=%s AND component_id=%s",
                    (comp.get("qty", 1), spid, cid)
                )
            else:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.semi_product_components (parent_id, component_id, qty) VALUES (%s,%s,%s) ON CONFLICT (parent_id, component_id) DO NOTHING",
                    (spid, cid, comp.get("qty", 1))
                )
        for old_cid in existing_comp:
            if old_cid not in sent:
                cur.execute(f"DELETE FROM {SCHEMA}.semi_product_components WHERE parent_id=%s AND component_id=%s", (spid, old_cid))
    return sp


def delete_semi_product(cur, spid):
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.work_orders WHERE semi_product_id=%s", (spid,))
    if cur.fetchone()[0] > 0:
        raise WorkerValidationError("Нельзя удалить: полуфабрикат используется в заказ-нарядах")
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.semi_product_components WHERE component_id=%s", (spid,))
    if cur.fetchone()[0] > 0:
        raise WorkerValidationError("Нельзя удалить: полуфабрикат входит в состав другого (составного) полуфабриката")
    cur.execute(f"DELETE FROM {SCHEMA}.semi_product_components WHERE parent_id=%s", (spid,))
    cur.execute(f"DELETE FROM {SCHEMA}.semi_product_materials WHERE semi_product_id=%s", (spid,))
    cur.execute(f"DELETE FROM {SCHEMA}.semi_product_operations WHERE semi_product_id=%s", (spid,))
    cur.execute(f"DELETE FROM {SCHEMA}.finished_product_semi WHERE semi_product_id=%s", (spid,))
    cur.execute(f"DELETE FROM {SCHEMA}.semi_products WHERE id=%s RETURNING id", (spid,))
    row = cur.fetchone()
    return {"deleted": spid} if row else None


def _clone_semi_product(cur, spid, overrides=None):
    """Копирует полуфабрикат со всеми материалами и операциями."""
    overrides = overrides or {}
    cur.execute(f"SELECT * FROM {SCHEMA}.semi_products WHERE id=%s", (spid,))
    cols = [d[0] for d in cur.description]
    src = cur.fetchone()
    if not src:
        return None
    src = dict(zip(cols, src))
    cur.execute(
        f"INSERT INTO {SCHEMA}.semi_products (name, sku, description, group_id, pf_type, size_label, product_id, specification_id, spec_qty, is_active) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
        (
            overrides.get("name", src["name"] + " (копия)"),
            overrides.get("sku", src.get("sku")),
            src.get("description"),
            overrides.get("group_id", src.get("group_id")),
            src.get("pf_type", "material"),
            overrides.get("size_label", src.get("size_label")),
            src.get("product_id"),
            overrides.get("specification_id", src.get("specification_id")),
            overrides.get("spec_qty", src.get("spec_qty", 1)),
            True,
        )
    )
    new_id = cur.fetchone()[0]
    cur.execute(f"""
        INSERT INTO {SCHEMA}.semi_product_materials (semi_product_id, material_id, norm_qty, notes)
        SELECT %s, material_id, norm_qty, notes FROM {SCHEMA}.semi_product_materials WHERE semi_product_id=%s
    """, (new_id, spid))
    cur.execute(f"""
        INSERT INTO {SCHEMA}.semi_product_operations (semi_product_id, operation_id, labor_cost, sort_order, notes)
        SELECT %s, operation_id, labor_cost, sort_order, notes FROM {SCHEMA}.semi_product_operations WHERE semi_product_id=%s
    """, (new_id, spid))
    cur.execute(f"""
        INSERT INTO {SCHEMA}.semi_product_components (parent_id, component_id, qty, notes)
        SELECT %s, component_id, qty, notes FROM {SCHEMA}.semi_product_components WHERE parent_id=%s
    """, (new_id, spid))
    cur.execute(f"SELECT * FROM {SCHEMA}.semi_products WHERE id=%s", (new_id,))
    ncols = [d[0] for d in cur.description]
    return _load_sp_details(cur, dict(zip(ncols, cur.fetchone())))


def clone_semi_product(cur, data):
    return _clone_semi_product(cur, data["id"], {
        k: v for k, v in {
            "name": data.get("name"),
            "sku": data.get("sku"),
            "size_label": data.get("size_label"),
            "group_id": data.get("group_id"),
        }.items() if v is not None
    })


# ========== СПЕЦИФИКАЦИИ (варианты состава изделия) ==========
def _sp_cost(cur, sp_id, _seen=None):
    """Плановая себестоимость полуфабриката: материалы + работа (+ вложенные ПФ). Возвращает (material_cost, labor_cost)."""
    if _seen is None:
        _seen = set()
    if sp_id in _seen:
        return 0.0, 0.0
    _seen.add(sp_id)
    cur.execute(f"""
        SELECT COALESCE(SUM(spm.norm_qty * COALESCE(m.price_per_unit, 0)), 0)
        FROM {SCHEMA}.semi_product_materials spm
        JOIN {SCHEMA}.materials m ON spm.material_id = m.id
        WHERE spm.semi_product_id = %s
    """, (sp_id,))
    mat = float(cur.fetchone()[0] or 0)
    cur.execute(f"SELECT COALESCE(SUM(labor_cost), 0) FROM {SCHEMA}.semi_product_operations WHERE semi_product_id=%s", (sp_id,))
    lab = float(cur.fetchone()[0] or 0)
    cur.execute(f"SELECT component_id, qty FROM {SCHEMA}.semi_product_components WHERE parent_id=%s", (sp_id,))
    for cid, cqty in cur.fetchall():
        cm, cl = _sp_cost(cur, cid, _seen)
        q = float(cqty or 1)
        mat += cm * q
        lab += cl * q
    return mat, lab


def list_specifications(cur, finished_product_id):
    """Список спецификаций изделия с их полуфабрикатами и плановой себестоимостью."""
    if not finished_product_id:
        raise WorkerValidationError("Не указано изделие")
    cur.execute(
        f"SELECT * FROM {SCHEMA}.specifications WHERE finished_product_id=%s ORDER BY is_active DESC, id",
        (int(finished_product_id),),
    )
    cols = [d[0] for d in cur.description]
    specs = [dict(zip(cols, r)) for r in cur.fetchall()]
    for sp in specs:
        cur.execute(f"""
            SELECT s.* FROM {SCHEMA}.semi_products s
            WHERE s.specification_id=%s ORDER BY s.name
        """, (sp["id"],))
        sc = [d[0] for d in cur.description]
        items = [dict(zip(sc, r)) for r in cur.fetchall()]
        spec_mat = 0.0
        spec_lab = 0.0
        for it in items:
            _load_sp_details(cur, it)
            m, l = _sp_cost(cur, it["id"])
            q = float(it.get("spec_qty") or 1)
            it["material_cost"] = round(m, 2)
            it["labor_cost_total"] = round(l, 2)
            it["total_cost"] = round((m + l) * q, 2)
            spec_mat += m * q
            spec_lab += l * q
        sp["semi_products"] = items
        sp["material_cost"] = round(spec_mat, 2)
        sp["labor_cost"] = round(spec_lab, 2)
        sp["total_cost"] = round(spec_mat + spec_lab, 2)
    return specs


def create_specification(cur, data):
    fp_id = data.get("finished_product_id")
    if not fp_id:
        raise WorkerValidationError("Не указано изделие")
    name = (data.get("name") or "").strip() or "Новая спецификация"
    # первая спецификация изделия — активна автоматически
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.specifications WHERE finished_product_id=%s", (fp_id,))
    is_first = cur.fetchone()[0] == 0
    make_active = bool(data.get("is_active")) or is_first
    if make_active:
        cur.execute(f"UPDATE {SCHEMA}.specifications SET is_active=false WHERE finished_product_id=%s", (fp_id,))
    cur.execute(
        f"INSERT INTO {SCHEMA}.specifications (finished_product_id, name, is_active) VALUES (%s,%s,%s) RETURNING *",
        (fp_id, name, make_active),
    )
    cols = [d[0] for d in cur.description]
    return dict(zip(cols, cur.fetchone()))


def update_specification(cur, spec_id, data):
    cur.execute(
        f"UPDATE {SCHEMA}.specifications SET name=%s WHERE id=%s RETURNING *",
        ((data.get("name") or "").strip() or "Спецификация", spec_id),
    )
    cols = [d[0] for d in cur.description]
    row = cur.fetchone()
    return dict(zip(cols, row)) if row else None


def set_active_specification(cur, spec_id):
    cur.execute(f"SELECT finished_product_id FROM {SCHEMA}.specifications WHERE id=%s", (spec_id,))
    r = cur.fetchone()
    if not r:
        raise WorkerValidationError("Спецификация не найдена")
    fp_id = r[0]
    cur.execute(f"UPDATE {SCHEMA}.specifications SET is_active=false WHERE finished_product_id=%s", (fp_id,))
    cur.execute(f"UPDATE {SCHEMA}.specifications SET is_active=true WHERE id=%s", (spec_id,))
    return {"ok": True, "active_id": spec_id}


def delete_specification(cur, spec_id):
    cur.execute(f"SELECT finished_product_id, is_active FROM {SCHEMA}.specifications WHERE id=%s", (spec_id,))
    r = cur.fetchone()
    if not r:
        return None
    fp_id, was_active = r
    # запрет удаления, если ПФ спецификации используются в заказ-нарядах
    cur.execute(f"""
        SELECT COUNT(*) FROM {SCHEMA}.work_orders wo
        JOIN {SCHEMA}.semi_products s ON wo.semi_product_id = s.id
        WHERE s.specification_id=%s
    """, (spec_id,))
    if cur.fetchone()[0] > 0:
        raise WorkerValidationError("Нельзя удалить: полуфабрикаты спецификации используются в заказ-нарядах")
    # удаляем ПФ спецификации со всем составом
    cur.execute(f"SELECT id FROM {SCHEMA}.semi_products WHERE specification_id=%s", (spec_id,))
    sp_ids = [row[0] for row in cur.fetchall()]
    for sp_id in sp_ids:
        cur.execute(f"DELETE FROM {SCHEMA}.semi_product_components WHERE parent_id=%s OR component_id=%s", (sp_id, sp_id))
        cur.execute(f"DELETE FROM {SCHEMA}.semi_product_materials WHERE semi_product_id=%s", (sp_id,))
        cur.execute(f"DELETE FROM {SCHEMA}.semi_product_operations WHERE semi_product_id=%s", (sp_id,))
        cur.execute(f"DELETE FROM {SCHEMA}.finished_product_semi WHERE semi_product_id=%s", (sp_id,))
        cur.execute(f"DELETE FROM {SCHEMA}.semi_products WHERE id=%s", (sp_id,))
    cur.execute(f"DELETE FROM {SCHEMA}.specifications WHERE id=%s RETURNING id", (spec_id,))
    deleted = cur.fetchone()
    # если удалили активную — сделать активной другую
    if was_active:
        cur.execute(f"SELECT id FROM {SCHEMA}.specifications WHERE finished_product_id=%s ORDER BY id LIMIT 1", (fp_id,))
        nxt = cur.fetchone()
        if nxt:
            cur.execute(f"UPDATE {SCHEMA}.specifications SET is_active=true WHERE id=%s", (nxt[0],))
    return {"deleted": spec_id} if deleted else None


def copy_semi_to_spec(cur, data):
    """Копирует полуфабрикат в другую спецификацию (копия принадлежит целевой)."""
    sp_id = data.get("id")
    target_spec = data.get("specification_id")
    if not sp_id or not target_spec:
        raise WorkerValidationError("Не указан полуфабрикат или спецификация")
    overrides = {"specification_id": target_spec}
    if data.get("name"):
        overrides["name"] = data["name"]
    if data.get("spec_qty") is not None:
        overrides["spec_qty"] = data["spec_qty"]
    return _clone_semi_product(cur, sp_id, overrides)


def clone_semi_group(cur, data):
    """Копирует группу со всеми полуфабрикатами внутри (и подгруппами)."""
    src_group_id = data["group_id"]
    new_name = data.get("name")
    cur.execute(f"SELECT * FROM {SCHEMA}.groups WHERE id=%s", (src_group_id,))
    gcols = [d[0] for d in cur.description]
    grow = cur.fetchone()
    if not grow:
        return None
    grp = dict(zip(gcols, grow))

    def copy_group(old_id, parent_id, name_override=None):
        cur.execute(f"SELECT * FROM {SCHEMA}.groups WHERE id=%s", (old_id,))
        c = [d[0] for d in cur.description]
        g = dict(zip(c, cur.fetchone()))
        cur.execute(
            f"INSERT INTO {SCHEMA}.groups (entity_type, name, sort_order, parent_id) VALUES (%s,%s,%s,%s) RETURNING id",
            (g["entity_type"], name_override or g["name"], g.get("sort_order", 0), parent_id)
        )
        new_gid = cur.fetchone()[0]
        # копируем полуфабрикаты этой группы (имена сохраняем)
        cur.execute(f"SELECT id, name FROM {SCHEMA}.semi_products WHERE group_id=%s", (old_id,))
        for (sp_id, sp_name) in cur.fetchall():
            _clone_semi_product(cur, sp_id, {"group_id": new_gid, "name": sp_name})
        # рекурсивно копируем подгруппы
        cur.execute(f"SELECT id FROM {SCHEMA}.groups WHERE parent_id=%s AND is_active=true", (old_id,))
        for (child_id,) in cur.fetchall():
            copy_group(child_id, new_gid)
        return new_gid

    new_root = copy_group(src_group_id, grp.get("parent_id"), new_name)
    return {"new_group_id": new_root}


def list_stock_materials(cur, warehouse_id=None):
    """Материалы с остатками со склада (для подбора спецификации)."""
    params = []
    stock_join = f"LEFT JOIN {SCHEMA}.stock s ON s.item_type='material' AND s.item_id = m.id"
    if warehouse_id:
        stock_join += " AND s.warehouse_id=%s"
        params.append(warehouse_id)
    sql = f"""
        SELECT m.id, m.name, m.sku, m.price_per_unit, m.unit_id,
               u.short_name as unit_short,
               COALESCE(SUM(s.qty - s.reserved_qty), 0) as available_qty
        FROM {SCHEMA}.materials m
        LEFT JOIN {SCHEMA}.units u ON m.unit_id = u.id
        {stock_join}
        WHERE m.is_active = true
        GROUP BY m.id, m.name, m.sku, m.price_per_unit, m.unit_id, u.short_name
        ORDER BY m.name
    """
    cur.execute(sql, params)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


PF_TYPE_DEFAULTS = {
    "leather_cut": {"name": "Крой кожа", "pf_type": "material"},
    "layers_cut": {"name": "Крой настилы", "pf_type": "material"},
    "fittings": {"name": "Фурнитура", "pf_type": "fittings"},
}


def create_semi_group_wizard(cur, data):
    """Мастер: создаёт группу по артикулу, подгруппы по размерам и набор п/ф в каждом размере.
    data = {product_id, article, sizes: [str], sets: [{name, pf_type, components:[{set_index?, semi_product_id?, qty}]}]}
    Составной п/ф (pf_type='composite') может включать другие п/ф набора (по set_index)
    и существующие п/ф из базы (по semi_product_id)."""
    article = data.get("article") or "Артикул"
    product_id = data.get("product_id")
    sizes = data.get("sizes") or []
    sets = data.get("sets") or []
    if not sizes:
        raise WorkerValidationError("Выберите хотя бы один размер")
    if not sets:
        raise WorkerValidationError("Выберите хотя бы один полуфабрикат для набора")

    # корневая группа = артикул
    cur.execute(
        f"INSERT INTO {SCHEMA}.groups (entity_type, name, sort_order, parent_id) VALUES ('semi_products', %s, 0, NULL) RETURNING id",
        (article,)
    )
    root_gid = cur.fetchone()[0]

    created_count = 0
    for idx, size in enumerate(sizes):
        # подгруппа = размер
        cur.execute(
            f"INSERT INTO {SCHEMA}.groups (entity_type, name, sort_order, parent_id) VALUES ('semi_products', %s, %s, %s) RETURNING id",
            (str(size), idx, root_gid)
        )
        size_gid = cur.fetchone()[0]

        # шаг 1: создаём все п/ф размера, запоминаем id по индексу набора
        set_ids = {}
        for s_idx, item in enumerate(sets):
            pf_name = item.get("name")
            pf_type = item.get("pf_type", "material")
            sku = f"{article}-{size}-{s_idx+1}"
            cur.execute(
                f"INSERT INTO {SCHEMA}.semi_products (name, sku, description, group_id, pf_type, size_label, product_id) VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                (f"{pf_name} {size}", sku, None, size_gid, pf_type, str(size), product_id)
            )
            set_ids[s_idx] = cur.fetchone()[0]
            created_count += 1

        # шаг 2: привязываем компоненты для составных п/ф
        for s_idx, item in enumerate(sets):
            if item.get("pf_type") != "composite":
                continue
            parent_id = set_ids[s_idx]
            for comp in item.get("components", []):
                comp_id = None
                if comp.get("set_index") is not None:
                    comp_id = set_ids.get(int(comp["set_index"]))
                elif comp.get("semi_product_id"):
                    comp_id = int(comp["semi_product_id"])
                if not comp_id or comp_id == parent_id:
                    continue
                cur.execute(
                    f"INSERT INTO {SCHEMA}.semi_product_components (parent_id, component_id, qty) VALUES (%s,%s,%s) ON CONFLICT (parent_id, component_id) DO NOTHING",
                    (parent_id, comp_id, comp.get("qty", 1))
                )
    return {"group_id": root_gid, "article": article, "created": created_count}


# ========== FINISHED PRODUCTS ==========
def list_finished_products(cur):
    cur.execute(f"""
        SELECT fp.*, g.name as group_name, p.category as catalog_category, p.name as catalog_product_name
        FROM {SCHEMA}.finished_products fp
        LEFT JOIN {SCHEMA}.groups g ON fp.group_id = g.id
        LEFT JOIN {SCHEMA}.products p ON fp.catalog_product_id = p.id
        ORDER BY p.name NULLS LAST, fp.name, fp.size_label
    """)
    cols = [d[0] for d in cur.description]
    rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    fp_ids = [r["id"] for r in rows]
    fp_map = {r["id"]: r for r in rows}
    for r in rows:
        r["semi_products"] = []
        r["fittings"] = []
    if fp_ids:
        cur.execute(f"""
            SELECT fps.*, sp.name as semi_product_name
            FROM {SCHEMA}.finished_product_semi fps
            JOIN {SCHEMA}.semi_products sp ON fps.semi_product_id = sp.id
            WHERE fps.finished_product_id = ANY(%s)
        """, (fp_ids,))
        sc = [d[0] for d in cur.description]
        for r in cur.fetchall():
            row = dict(zip(sc, r))
            fp_map[row["finished_product_id"]]["semi_products"].append(row)
        cur.execute(f"""
            SELECT fpf.*, f.name as fitting_name
            FROM {SCHEMA}.finished_product_fittings fpf
            JOIN {SCHEMA}.fittings f ON fpf.fitting_id = f.id
            WHERE fpf.finished_product_id = ANY(%s)
        """, (fp_ids,))
        fc = [d[0] for d in cur.description]
        for r in cur.fetchall():
            row = dict(zip(fc, r))
            fp_map[row["finished_product_id"]]["fittings"].append(row)
        # плановая себестоимость по активной спецификации
        for r in rows:
            r["active_spec_name"] = None
            r["plan_cost"] = 0
        cur.execute(f"""
            SELECT spec.finished_product_id, spec.name,
                   COALESCE(SUM(
                       COALESCE(s.spec_qty,1) * (
                           COALESCE((SELECT SUM(spm.norm_qty * COALESCE(m.price_per_unit,0))
                                     FROM {SCHEMA}.semi_product_materials spm
                                     JOIN {SCHEMA}.materials m ON spm.material_id=m.id
                                     WHERE spm.semi_product_id=s.id),0)
                         + COALESCE((SELECT SUM(spo.labor_cost)
                                     FROM {SCHEMA}.semi_product_operations spo
                                     WHERE spo.semi_product_id=s.id),0)
                       )
                   ),0) as plan_cost
            FROM {SCHEMA}.specifications spec
            LEFT JOIN {SCHEMA}.semi_products s ON s.specification_id=spec.id
            WHERE spec.finished_product_id = ANY(%s) AND spec.is_active=true
            GROUP BY spec.finished_product_id, spec.name
        """, (fp_ids,))
        for fpid, sname, pcost in cur.fetchall():
            if fpid in fp_map:
                fp_map[fpid]["active_spec_name"] = sname
                fp_map[fpid]["plan_cost"] = float(pcost or 0)
    return rows


def create_finished_product(cur, data):
    cur.execute(
        f"INSERT INTO {SCHEMA}.finished_products (name, sku, description, base_price, group_id, catalog_product_id, catalog_size_id, size_label) VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *",
        (data["name"], data.get("sku"), data.get("description"), data.get("base_price", 0), data.get("group_id"), data.get("catalog_product_id"), data.get("catalog_size_id"), data.get("size_label"))
    )
    cols = [d[0] for d in cur.description]
    fp = dict(zip(cols, cur.fetchone()))
    for sp in data.get("semi_products", []):
        cur.execute(
            f"INSERT INTO {SCHEMA}.finished_product_semi (finished_product_id, semi_product_id, qty) VALUES (%s,%s,%s)",
            (fp["id"], sp["semi_product_id"], sp.get("qty", 1))
        )
    for ft in data.get("fittings", []):
        cur.execute(
            f"INSERT INTO {SCHEMA}.finished_product_fittings (finished_product_id, fitting_id, qty) VALUES (%s,%s,%s)",
            (fp["id"], ft["fitting_id"], ft.get("qty", 1))
        )
    return fp


def update_finished_product(cur, fpid, data):
    cur.execute(
        f"UPDATE {SCHEMA}.finished_products SET name=%s, sku=%s, description=%s, base_price=%s, is_active=%s, group_id=%s, updated_at=now() WHERE id=%s RETURNING *",
        (data["name"], data.get("sku"), data.get("description"), data.get("base_price", 0), data.get("is_active", True), data.get("group_id"), fpid)
    )
    cols = [d[0] for d in cur.description]
    row = cur.fetchone()
    if not row:
        return None
    fp = dict(zip(cols, row))
    if "semi_products" in data:
        for sp in data["semi_products"]:
            if sp.get("id"):
                cur.execute(f"UPDATE {SCHEMA}.finished_product_semi SET semi_product_id=%s, qty=%s WHERE id=%s", (sp["semi_product_id"], sp.get("qty", 1), sp["id"]))
            else:
                cur.execute(f"INSERT INTO {SCHEMA}.finished_product_semi (finished_product_id, semi_product_id, qty) VALUES (%s,%s,%s)", (fpid, sp["semi_product_id"], sp.get("qty", 1)))
    if "fittings" in data:
        for ft in data["fittings"]:
            if ft.get("id"):
                cur.execute(f"UPDATE {SCHEMA}.finished_product_fittings SET fitting_id=%s, qty=%s WHERE id=%s", (ft["fitting_id"], ft.get("qty", 1), ft["id"]))
            else:
                cur.execute(f"INSERT INTO {SCHEMA}.finished_product_fittings (finished_product_id, fitting_id, qty) VALUES (%s,%s,%s)", (fpid, ft["fitting_id"], ft.get("qty", 1)))
    return fp


def sync_catalog_to_finished(cur):
    """Импорт товаров из каталога в готовую продукцию (по размерам). Обновляет названия."""
    cur.execute(f"""
        SELECT p.id, p.name, p.category, p.base_price, ps.id as size_id, ps.size_label, ps.price_add
        FROM {SCHEMA}.products p
        JOIN {SCHEMA}.product_sizes ps ON ps.product_id = p.id
        WHERE p.is_active = true AND p.name != '' AND ps.is_available = true
        ORDER BY p.category, p.name, ps.size_label
    """)
    cols = [d[0] for d in cur.description]
    catalog_rows = [dict(zip(cols, r)) for r in cur.fetchall()]

    cur.execute(f"SELECT id, name FROM {SCHEMA}.groups WHERE entity_type='finished_products' AND is_active=true")
    existing_groups = {r[1]: r[0] for r in cur.fetchall()}
    categories = {}
    needed_cats = set()
    for cr in catalog_rows:
        needed_cats.add(cr["category"] or "Без категории")
    for cat in needed_cats:
        if cat in existing_groups:
            categories[cat] = existing_groups[cat]
        else:
            cur.execute(f"INSERT INTO {SCHEMA}.groups (entity_type, name) VALUES ('finished_products', %s) RETURNING id", (cat,))
            categories[cat] = cur.fetchone()[0]

    cur.execute(f"SELECT id, name, catalog_product_id, catalog_size_id FROM {SCHEMA}.finished_products WHERE catalog_product_id IS NOT NULL")
    existing_map = {}
    for r in cur.fetchall():
        existing_map[(r[2], r[3])] = {"id": r[0], "name": r[1]}

    created = 0
    updated = 0
    for cr in catalog_rows:
        full_name = f"{cr['name']} [{cr['size_label']}]"
        price = cr["base_price"] + cr["price_add"]
        cat = cr["category"] or "Без категории"
        group_id = categories.get(cat)
        key = (cr["id"], cr["size_id"])

        existing = existing_map.get(key)
        if existing:
            if existing["name"] != full_name:
                cur.execute(f"UPDATE {SCHEMA}.finished_products SET name=%s, base_price=%s, group_id=%s, size_label=%s, updated_at=now() WHERE id=%s",
                    (full_name, price, group_id, cr["size_label"], existing["id"]))
                updated += 1
        else:
            cur.execute(
                f"INSERT INTO {SCHEMA}.finished_products (name, sku, base_price, catalog_product_id, catalog_size_id, size_label, group_id) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                (full_name, "", price, cr["id"], cr["size_id"], cr["size_label"], group_id)
            )
            created += 1

    return {"created": created, "updated": updated, "total_catalog": len(catalog_rows)}


def delete_finished_product(cur, fpid):
    """Удаление готовой продукции по id"""
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.order_items WHERE finished_product_id=%s", (fpid,))
    if cur.fetchone()[0] > 0:
        raise WorkerValidationError("Нельзя удалить: продукция используется в заказах. Сначала измените заказ.")
    cur.execute(f"DELETE FROM {SCHEMA}.finished_product_semi WHERE finished_product_id=%s", (fpid,))
    cur.execute(f"DELETE FROM {SCHEMA}.finished_product_fittings WHERE finished_product_id=%s", (fpid,))
    cur.execute(f"DELETE FROM {SCHEMA}.finished_products WHERE id=%s RETURNING id", (fpid,))
    row = cur.fetchone()
    if not row:
        return None
    return {"deleted": fpid}


def list_catalog_products(cur):
    """Список товаров каталога для UI"""
    cur.execute(f"""
        SELECT p.id, p.name, p.category, p.base_price, COUNT(ps.id) as sizes_count
        FROM {SCHEMA}.products p
        LEFT JOIN {SCHEMA}.product_sizes ps ON ps.product_id = p.id AND ps.is_available = true
        WHERE p.is_active = true AND p.name != ''
        GROUP BY p.id, p.name, p.category, p.base_price
        ORDER BY p.category, p.name
    """)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def list_catalog_sizes(cur, product_id):
    """Размерный ряд выбранной модели каталога."""
    cur.execute(f"""
        SELECT id, size_label
        FROM {SCHEMA}.product_sizes
        WHERE product_id = %s AND is_available = true
        ORDER BY size_label
    """, (product_id,))
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


# ========== STOCK ==========
def list_stock(cur, warehouse_id=None, item_type=None):
    sql = f"SELECT s.*, w.name as warehouse_name FROM {SCHEMA}.stock s JOIN {SCHEMA}.warehouses w ON s.warehouse_id = w.id WHERE 1=1"
    params = []
    if warehouse_id:
        sql += " AND s.warehouse_id = %s"
        params.append(warehouse_id)
    if item_type:
        sql += " AND s.item_type = %s"
        params.append(item_type)
    sql += " ORDER BY s.item_type, s.item_id"
    cur.execute(sql, params)
    cols = [d[0] for d in cur.description]
    rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    for row in rows:
        t = row["item_type"]
        table = {"material": "materials", "fitting": "fittings", "semi_product": "semi_products", "finished": "finished_products"}.get(t)
        if table:
            cur.execute(f"SELECT name FROM {SCHEMA}.{table} WHERE id=%s", (row["item_id"],))
            n = cur.fetchone()
            row["item_name"] = n[0] if n else "?"
    return rows


def stock_movement(cur, data):
    # движение склада датируется текущей датой — блокируем, если сегодня в закрытом периоде
    assert_period_open(cur, datetime.now().date())
    # если движение привязано к заказу — проверяем дату заказа
    rel_order = data.get("related_order_id")
    if rel_order:
        cur.execute(f"SELECT deadline, created_at FROM {SCHEMA}.orders WHERE id=%s", (rel_order,))
        r = cur.fetchone()
        if r:
            assert_period_open(cur, r[0] or r[1])
    wid = data["warehouse_id"]
    itype = data["item_type"]
    iid = data["item_id"]
    mtype = data["movement_type"]
    qty = float(data["qty"])

    cur.execute(
        f"INSERT INTO {SCHEMA}.stock_movements (warehouse_id, item_type, item_id, movement_type, qty, reason, related_order_id, worker_id) VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
        (wid, itype, iid, mtype, qty, data.get("reason"), data.get("related_order_id"), data.get("worker_id"))
    )

    cur.execute(f"SELECT id, qty FROM {SCHEMA}.stock WHERE warehouse_id=%s AND item_type=%s AND item_id=%s", (wid, itype, iid))
    existing = cur.fetchone()
    if mtype == "in":
        delta = qty
    elif mtype in ("out", "write_off"):
        delta = -qty
    elif mtype == "return":
        delta = qty
    else:
        delta = 0

    if existing:
        cur.execute(f"UPDATE {SCHEMA}.stock SET qty = qty + %s, updated_at=now() WHERE id=%s", (delta, existing[0]))
    else:
        cur.execute(
            f"INSERT INTO {SCHEMA}.stock (warehouse_id, item_type, item_id, qty) VALUES (%s,%s,%s,%s)",
            (wid, itype, iid, max(0, delta))
        )
    return {"ok": True}


def list_stock_movements(cur, warehouse_id=None, item_type=None, item_id=None, limit=100):
    sql = f"SELECT sm.*, w.name as warehouse_name FROM {SCHEMA}.stock_movements sm JOIN {SCHEMA}.warehouses w ON sm.warehouse_id = w.id WHERE 1=1"
    params = []
    if warehouse_id:
        sql += " AND sm.warehouse_id=%s"
        params.append(warehouse_id)
    if item_type:
        sql += " AND sm.item_type=%s"
        params.append(item_type)
    if item_id:
        sql += " AND sm.item_id=%s"
        params.append(item_id)
    sql += " ORDER BY sm.created_at DESC LIMIT %s"
    params.append(limit)
    cur.execute(sql, params)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def edit_stock_movement(cur, mv_id, data):
    """Редактирование движения (поступления): корректирует остаток на разницу."""
    cur.execute(f"SELECT warehouse_id, item_type, item_id, movement_type, qty FROM {SCHEMA}.stock_movements WHERE id=%s", (mv_id,))
    old = cur.fetchone()
    if not old:
        return None
    wid, itype, iid, mtype, old_qty = old
    old_qty = float(old_qty or 0)
    new_qty = float(data.get("qty", old_qty))
    new_reason = data.get("reason")

    def signed(t, q):
        if t in ("in", "return"):
            return q
        if t in ("out", "write_off"):
            return -q
        return 0

    delta = signed(mtype, new_qty) - signed(mtype, old_qty)
    cur.execute(
        f"UPDATE {SCHEMA}.stock_movements SET qty=%s, reason=COALESCE(%s, reason) WHERE id=%s",
        (new_qty, new_reason, mv_id)
    )
    if delta != 0:
        cur.execute(f"SELECT id FROM {SCHEMA}.stock WHERE warehouse_id=%s AND item_type=%s AND item_id=%s", (wid, itype, iid))
        ex = cur.fetchone()
        if ex:
            cur.execute(f"UPDATE {SCHEMA}.stock SET qty = qty + %s, updated_at=now() WHERE id=%s", (delta, ex[0]))
        else:
            cur.execute(f"INSERT INTO {SCHEMA}.stock (warehouse_id, item_type, item_id, qty) VALUES (%s,%s,%s,%s)", (wid, itype, iid, max(0, delta)))
    return {"ok": True, "id": mv_id}


def take_stock_snapshot(cur, snap_date=None):
    """Сохраняет текущие остатки склада в снимок за указанную дату (по умолчанию сегодня)."""
    d = _parse_date(snap_date) if snap_date else datetime.now().date()
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.stock_snapshots WHERE snapshot_date=%s", (d,))
    if cur.fetchone()[0] > 0:
        return {"ok": True, "date": d.isoformat(), "already": True}
    cur.execute(f"""
        INSERT INTO {SCHEMA}.stock_snapshots (snapshot_date, warehouse_id, item_type, item_id, qty, reserved_qty)
        SELECT %s, warehouse_id, item_type, item_id, qty, COALESCE(reserved_qty,0)
        FROM {SCHEMA}.stock
    """, (d,))
    return {"ok": True, "date": d.isoformat(), "created": True}


def _auto_daily_snapshot(cur):
    """Ленивый автоснимок: если сегодня уже 8:00+ и снимок за сегодня не сделан — создать."""
    now = datetime.now()
    if now.hour < 8:
        return
    today = now.date()
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.stock_snapshots WHERE snapshot_date=%s", (today,))
    if cur.fetchone()[0] == 0:
        take_stock_snapshot(cur, today)


def report_stock_on_date(cur, on_date, warehouse_id=None, hide_zero=True):
    """Остатки товаров на выбранную дату (включительно), восстановленные из движений.
    Группируется по типам: material, fitting, semi_product, finished.
    Возвращает {date, warehouse_id, sections: [{item_type, label, rows:[...], total_amount}]}."""
    d = _parse_date(on_date) or datetime.now().date()

    # автоснимок за сегодня (если уже 8:00+)
    _auto_daily_snapshot(cur)

    # приоритет: если на дату есть сохранённый снимок остатков — берём из него
    snap_params = [d]
    snap_wh = ""
    if warehouse_id:
        snap_wh = " AND warehouse_id = %s"
        snap_params.append(int(warehouse_id))
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.stock_snapshots WHERE snapshot_date=%s", (d,))
    has_snapshot = cur.fetchone()[0] > 0
    source = "snapshot" if has_snapshot else "movements"

    if has_snapshot:
        cur.execute(f"""
            SELECT item_type, item_id, SUM(qty) AS qty
            FROM {SCHEMA}.stock_snapshots
            WHERE snapshot_date=%s{snap_wh}
            GROUP BY item_type, item_id
        """, snap_params)
        raw = cur.fetchall()
    else:
        params = [d]
        wh_filter = ""
        if warehouse_id:
            wh_filter = " AND sm.warehouse_id = %s"
            params.append(int(warehouse_id))
        cur.execute(f"""
            SELECT sm.item_type, sm.item_id,
                   SUM(CASE WHEN sm.movement_type IN ('in','return') THEN sm.qty
                            WHEN sm.movement_type IN ('out','write_off') THEN -sm.qty
                            ELSE 0 END) AS qty
            FROM {SCHEMA}.stock_movements sm
            WHERE sm.created_at::date <= %s{wh_filter}
            GROUP BY sm.item_type, sm.item_id
        """, params)
        raw = cur.fetchall()

    type_meta = {
        "material": {"label": "Материалы", "table": "materials", "priced": True},
        "fitting": {"label": "Фурнитура", "table": "fittings", "priced": True},
        "semi_product": {"label": "Полуфабрикаты", "table": "semi_products", "priced": False},
        "finished": {"label": "Готовая продукция", "table": "finished_products", "priced": False},
    }

    sections = {k: {"item_type": k, "label": v["label"], "rows": [], "total_amount": 0.0}
                for k, v in type_meta.items()}

    for item_type, item_id, qty in raw:
        qty = float(qty or 0)
        if hide_zero and qty == 0:
            continue
        meta = type_meta.get(item_type)
        if not meta:
            continue
        name, unit_short, price = "?", "", 0.0
        if meta["priced"]:
            cur.execute(f"""
                SELECT t.name, u.short_name, COALESCE(t.price_per_unit, 0)
                FROM {SCHEMA}.{meta['table']} t
                LEFT JOIN {SCHEMA}.units u ON t.unit_id = u.id
                WHERE t.id = %s
            """, (item_id,))
        else:
            cur.execute(f"SELECT t.name, NULL, 0 FROM {SCHEMA}.{meta['table']} t WHERE t.id = %s", (item_id,))
        r = cur.fetchone()
        if r:
            name = r[0]
            unit_short = r[1] or ""
            price = float(r[2] or 0)
        amount = round(qty * price, 2)
        sections[item_type]["rows"].append({
            "item_type": item_type,
            "item_id": item_id,
            "name": name,
            "unit_short": unit_short,
            "qty": round(qty, 4),
            "price": round(price, 2),
            "amount": amount,
        })
        sections[item_type]["total_amount"] += amount

    result_sections = []
    for k in ("material", "fitting", "semi_product", "finished"):
        sec = sections[k]
        sec["rows"].sort(key=lambda x: x["name"].lower())
        sec["total_amount"] = round(sec["total_amount"], 2)
        result_sections.append(sec)

    return {
        "date": d.isoformat(),
        "warehouse_id": int(warehouse_id) if warehouse_id else None,
        "source": source,
        "sections": result_sections,
    }


# ========== ORDERS ==========
def list_orders(cur, status=None, hide_client=False):
    sql = f"""
        SELECT o.*, c.name as client_name, c.org as client_org
        FROM {SCHEMA}.orders o
        LEFT JOIN {SCHEMA}.clients c ON o.client_id = c.id
        WHERE 1=1
    """
    params = []
    if status:
        sql += " AND o.status=%s"
        params.append(status)
    sql += " ORDER BY o.created_at DESC"
    cur.execute(sql, params)
    cols = [d[0] for d in cur.description]
    rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    if hide_client:
        for row in rows:
            row["client_name"] = None
            row["client_org"] = None
            row["client_id"] = None
            row["manager_name"] = None
    for row in rows:
        cur.execute(f"""
            SELECT oi.*, fp.name as product_name
            FROM {SCHEMA}.order_items oi
            JOIN {SCHEMA}.finished_products fp ON oi.finished_product_id = fp.id
            WHERE oi.order_id = %s
        """, (row["id"],))
        ic = [d[0] for d in cur.description]
        row["items"] = [dict(zip(ic, r)) for r in cur.fetchall()]
    return rows


def create_order(cur, data):
    num = data.get("order_number") or ("ЗАК-" + datetime.now().strftime("%y%m%d%H%M%S"))
    cur.execute(
        f"INSERT INTO {SCHEMA}.orders (order_number, client_id, status, manager_name, priority, deadline, total_amount, notes) VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *",
        (num, data.get("client_id"), "confirmed", data.get("manager_name"), data.get("priority", 0), data.get("deadline"), data.get("total_amount", 0), data.get("notes"))
    )
    cols = [d[0] for d in cur.description]
    order = dict(zip(cols, cur.fetchone()))
    for item in data.get("items", []):
        total = float(item.get("unit_price", 0)) * int(item.get("qty", 1))
        cur.execute(
            f"INSERT INTO {SCHEMA}.order_items (order_id, finished_product_id, qty, unit_price, total_price, notes) VALUES (%s,%s,%s,%s,%s,%s)",
            (order["id"], item["finished_product_id"], item.get("qty", 1), item.get("unit_price", 0), total, item.get("notes"))
        )
    return order


def _assert_order_period(cur, oid):
    cur.execute(f"SELECT deadline, created_at FROM {SCHEMA}.orders WHERE id=%s", (oid,))
    r = cur.fetchone()
    if r:
        assert_period_open(cur, r[0] or r[1])


def update_order_status(cur, oid, status):
    _assert_order_period(cur, oid)
    cur.execute(f"UPDATE {SCHEMA}.orders SET status=%s, updated_at=now() WHERE id=%s RETURNING *", (status, oid))
    cols = [d[0] for d in cur.description]
    row = cur.fetchone()
    return dict(zip(cols, row)) if row else None


def update_order(cur, oid, data):
    _assert_order_period(cur, oid)
    # если пришёл только статус — обновляем статус
    if "status" in data and not any(
        k in data for k in ("client_id", "manager_name", "priority", "deadline", "notes", "items")
    ):
        return update_order_status(cur, oid, data.get("status"))

    fields = []
    params = []
    for col in ("client_id", "manager_name", "priority", "deadline", "total_amount", "notes", "status"):
        if col in data:
            fields.append(f"{col}=%s")
            params.append(data[col])
    if fields:
        fields.append("updated_at=now()")
        params.append(oid)
        cur.execute(
            f"UPDATE {SCHEMA}.orders SET {', '.join(fields)} WHERE id=%s RETURNING *", params
        )
    else:
        cur.execute(f"SELECT * FROM {SCHEMA}.orders WHERE id=%s", (oid,))
    cols = [d[0] for d in cur.description]
    row = cur.fetchone()
    if not row:
        return None
    order = dict(zip(cols, row))

    # обновляем позиции, если переданы
    if "items" in data:
        cur.execute(f"DELETE FROM {SCHEMA}.order_items WHERE order_id=%s", (oid,))
        for item in data.get("items", []):
            total = float(item.get("unit_price", 0)) * int(item.get("qty", 1))
            cur.execute(
                f"INSERT INTO {SCHEMA}.order_items (order_id, finished_product_id, qty, unit_price, total_price, notes) VALUES (%s,%s,%s,%s,%s,%s)",
                (oid, item["finished_product_id"], item.get("qty", 1), item.get("unit_price", 0), total, item.get("notes"))
            )
    return order


# ========== WORK ORDERS (ЗАКАЗ-НАРЯДЫ) ==========
def list_work_orders(cur, order_id=None, status=None):
    sql = f"""
        SELECT wo.*, o.order_number, sp.name as semi_product_name, w.name as warehouse_name
        FROM {SCHEMA}.work_orders wo
        JOIN {SCHEMA}.orders o ON wo.order_id = o.id
        JOIN {SCHEMA}.semi_products sp ON wo.semi_product_id = sp.id
        LEFT JOIN {SCHEMA}.warehouses w ON wo.warehouse_id = w.id
        WHERE 1=1
    """
    params = []
    if order_id:
        sql += " AND wo.order_id=%s"
        params.append(order_id)
    if status:
        sql += " AND wo.status=%s"
        params.append(status)
    sql += " ORDER BY wo.created_at DESC"
    cur.execute(sql, params)
    cols = [d[0] for d in cur.description]
    rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    for row in rows:
        cur.execute(f"""
            SELECT woo.*, op.name as operation_name, op.has_material_norm, wk.full_name as worker_name, m.name as material_name
            FROM {SCHEMA}.work_order_operations woo
            JOIN {SCHEMA}.operations op ON woo.operation_id = op.id
            LEFT JOIN {SCHEMA}.workers wk ON woo.worker_id = wk.id
            LEFT JOIN {SCHEMA}.materials m ON woo.material_id = m.id
            WHERE woo.work_order_id = %s ORDER BY woo.sort_order
        """, (row["id"],))
        oc = [d[0] for d in cur.description]
        row["operations"] = [dict(zip(oc, r)) for r in cur.fetchall()]
        # задания сотрудникам
        cur.execute(f"""
            SELECT t.*, wk.full_name as worker_name
            FROM {SCHEMA}.work_order_tasks t
            JOIN {SCHEMA}.workers wk ON t.worker_id = wk.id
            WHERE t.work_order_id = %s ORDER BY t.created_at
        """, (row["id"],))
        tc = [d[0] for d in cur.description]
        tasks = [dict(zip(tc, r)) for r in cur.fetchall()]
        row["tasks"] = tasks
        row["assigned_qty"] = sum(float(t.get("qty") or 0) for t in tasks)
        row["done_qty"] = sum(float(t.get("qty") or 0) for t in tasks if t.get("status") == "done")
    return rows


def _get_default_semi_product(cur):
    """Служебный полуфабрикат-заглушка для изделий без явного состава."""
    cur.execute(f"SELECT id FROM {SCHEMA}.semi_products WHERE sku='__DEFAULT__' LIMIT 1")
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute(
        f"INSERT INTO {SCHEMA}.semi_products (name, sku, description) VALUES (%s,%s,%s) RETURNING id",
        ("Изделие (без полуфабрикатов)", "__DEFAULT__", "Автоматический полуфабрикат для изделий без состава")
    )
    return cur.fetchone()[0]


def _assert_composite_available(cur, semi_product_id, qty, warehouse_id):
    """Для составного п/ф проверяет наличие всех вложенных п/ф на складе."""
    cur.execute(f"""
        SELECT spc.component_id, spc.qty, sp.name
        FROM {SCHEMA}.semi_product_components spc
        JOIN {SCHEMA}.semi_products sp ON spc.component_id = sp.id
        WHERE spc.parent_id = %s
    """, (semi_product_id,))
    comps = cur.fetchall()
    if not comps:
        return
    missing = []
    for comp_id, comp_qty, comp_name in comps:
        need = float(comp_qty or 1) * int(qty or 1)
        if warehouse_id:
            cur.execute(
                f"SELECT COALESCE(SUM(qty - reserved_qty),0) FROM {SCHEMA}.stock WHERE item_type='semi_product' AND item_id=%s AND warehouse_id=%s",
                (comp_id, warehouse_id)
            )
        else:
            cur.execute(
                f"SELECT COALESCE(SUM(qty - reserved_qty),0) FROM {SCHEMA}.stock WHERE item_type='semi_product' AND item_id=%s",
                (comp_id,)
            )
        avail = float(cur.fetchone()[0] or 0)
        if avail < need:
            missing.append(f"«{comp_name}» (нужно {need:g}, есть {avail:g})")
    if missing:
        raise WorkerValidationError(
            "Недостаточно полуфабрикатов для составного изделия: " + ", ".join(missing) +
            ". Сначала изготовьте недостающие полуфабрикаты."
        )


def _create_single_work_order(cur, order_id, order_item_id, semi_product_id, qty, warehouse_id, overrides=None):
    """Создаёт один заказ-наряд по полуфабрикату + его операции.
    overrides: список {operation_id, material_id, planned_material_norm, labor_cost} для правки спецификации.
    Наличие полуфабрикатов НЕ проверяется при формировании ЗН (проверяется при назначении задания)."""
    num = "ЗН-" + datetime.now().strftime("%y%m%d%H%M%S%f")[:-3]
    cur.execute(
        f"INSERT INTO {SCHEMA}.work_orders (work_order_number, order_id, order_item_id, semi_product_id, qty, warehouse_id) VALUES (%s,%s,%s,%s,%s,%s) RETURNING *",
        (num, order_id, order_item_id, semi_product_id, qty, warehouse_id)
    )
    cols = [d[0] for d in cur.description]
    wo = dict(zip(cols, cur.fetchone()))

    ov_map = {}
    for o in (overrides or []):
        if o.get("operation_id") is not None:
            ov_map[int(o["operation_id"])] = o

    # операции полуфабриката
    cur.execute(f"""
        SELECT spo.operation_id, spo.labor_cost, spo.sort_order, o.has_material_norm
        FROM {SCHEMA}.semi_product_operations spo
        JOIN {SCHEMA}.operations o ON spo.operation_id = o.id
        WHERE spo.semi_product_id = %s ORDER BY spo.sort_order
    """, (semi_product_id,))
    ops = cur.fetchall()

    # если у полуфабриката нет своих операций — берём все активные операции (fallback)
    if not ops:
        cur.execute(f"""
            SELECT id, COALESCE(default_price,0), COALESCE(sort_order,0), has_material_norm
            FROM {SCHEMA}.operations WHERE is_active = true ORDER BY sort_order
        """)
        ops = cur.fetchall()

    for op_id, lcost, sorder, has_norm in ops:
        mat_id = None
        planned_norm = None
        # значения из спецификации полуфабриката
        if has_norm:
            cur.execute(f"SELECT material_id, norm_qty FROM {SCHEMA}.semi_product_materials WHERE semi_product_id=%s LIMIT 1", (semi_product_id,))
            mat = cur.fetchone()
            if mat:
                mat_id = mat[0]
                planned_norm = float(mat[1]) * int(qty or 1)
        # ручное переопределение технологом (выбор материала/нормы)
        ov = ov_map.get(int(op_id))
        if ov:
            if ov.get("material_id") is not None:
                mat_id = ov["material_id"]
            if ov.get("planned_material_norm") is not None:
                planned_norm = float(ov["planned_material_norm"])
            if ov.get("labor_cost") is not None:
                lcost = ov["labor_cost"]
        cur.execute(
            f"INSERT INTO {SCHEMA}.work_order_operations (work_order_id, operation_id, labor_cost, planned_material_norm, material_id, sort_order) VALUES (%s,%s,%s,%s,%s,%s)",
            (wo["id"], op_id, lcost, planned_norm, mat_id, sorder)
        )
    return wo


def _material_shortage_warnings(cur, semi_qty_list, warehouse_id):
    """Считает нехватку материалов по списку [(semi_product_id, qty)] и возвращает предупреждения (не блокирует)."""
    need = {}  # material_id -> кол-во
    for sp_id, sp_qty in semi_qty_list:
        cur.execute(f"""
            SELECT spm.material_id, spm.norm_qty
            FROM {SCHEMA}.semi_product_materials spm
            WHERE spm.semi_product_id=%s
        """, (sp_id,))
        for mat_id, norm in cur.fetchall():
            need[mat_id] = need.get(mat_id, 0) + float(norm or 0) * float(sp_qty or 1)
    warnings = []
    for mat_id, need_qty in need.items():
        if warehouse_id:
            cur.execute(f"SELECT COALESCE(SUM(qty - reserved_qty),0) FROM {SCHEMA}.stock WHERE item_type='material' AND item_id=%s AND warehouse_id=%s", (mat_id, warehouse_id))
        else:
            cur.execute(f"SELECT COALESCE(SUM(qty - reserved_qty),0) FROM {SCHEMA}.stock WHERE item_type='material' AND item_id=%s", (mat_id,))
        avail = float(cur.fetchone()[0] or 0)
        if avail < need_qty:
            cur.execute(f"SELECT name FROM {SCHEMA}.materials WHERE id=%s", (mat_id,))
            nm = cur.fetchone()
            warnings.append({
                "material_id": mat_id,
                "material_name": nm[0] if nm else f"#{mat_id}",
                "need": round(need_qty, 3),
                "available": round(avail, 3),
                "shortage": round(need_qty - avail, 3),
            })
    return warnings


def create_work_order(cur, data):
    order_id = data["order_id"]
    _assert_order_period(cur, order_id)
    order_item_id = data["order_item_id"]
    qty = int(data.get("qty", 1) or 1)
    warehouse_id = data.get("warehouse_id")
    overrides = data.get("operations") or data.get("overrides") or []

    # если явно передан semi_product_id — старое поведение (один п/ф)
    explicit_sp = data.get("semi_product_id")

    # определяем изделие позиции заказа
    fp_id = data.get("finished_product_id")
    if not fp_id:
        cur.execute(f"SELECT finished_product_id FROM {SCHEMA}.order_items WHERE id=%s", (order_item_id,))
        r = cur.fetchone()
        fp_id = r[0] if r else None

    # берём полуфабрикаты из активной спецификации изделия
    semi_ids = []
    if not explicit_sp and fp_id:
        cur.execute(f"""
            SELECT s.id, COALESCE(s.spec_qty, 1)
            FROM {SCHEMA}.semi_products s
            JOIN {SCHEMA}.specifications spec ON s.specification_id = spec.id
            WHERE spec.finished_product_id=%s AND spec.is_active=true
            ORDER BY s.name
        """, (fp_id,))
        semi_ids = [(row[0], float(row[1] or 1)) for row in cur.fetchall()]
        # fallback на старую связь, если спецификаций ещё нет
        if not semi_ids:
            cur.execute(f"SELECT semi_product_id, qty FROM {SCHEMA}.finished_product_semi WHERE finished_product_id=%s", (fp_id,))
            semi_ids = [(row[0], float(row[1] or 1)) for row in cur.fetchall()]

    created = []
    used_semi = []
    if explicit_sp:
        created.append(_create_single_work_order(cur, order_id, order_item_id, explicit_sp, qty, warehouse_id, overrides))
        used_semi.append((explicit_sp, qty))
    elif semi_ids:
        for sp_id, sp_qty in semi_ids:
            wq = int(qty * sp_qty)
            created.append(_create_single_work_order(cur, order_id, order_item_id, sp_id, wq, warehouse_id, overrides))
            used_semi.append((sp_id, wq))
    else:
        # у изделия нет состава — создаём ЗН на изделие целиком со всеми операциями
        default_sp = _get_default_semi_product(cur)
        created.append(_create_single_work_order(cur, order_id, order_item_id, default_sp, qty, warehouse_id, overrides))
        used_semi.append((default_sp, qty))

    # предупреждение о нехватке материалов (НЕ блокирует создание ЗН)
    warnings = _material_shortage_warnings(cur, used_semi, warehouse_id)
    return {"created": created, "count": len(created), "material_warnings": warnings}


def complete_work_order_operation(cur, woo_id, data):
    """Работник закрывает операцию в заказ-наряде"""
    # проверка закрытого периода по дате связанного заказа
    cur.execute(f"""
        SELECT o.deadline, o.created_at
        FROM {SCHEMA}.work_order_operations woo
        JOIN {SCHEMA}.work_orders wo ON woo.work_order_id = wo.id
        JOIN {SCHEMA}.orders o ON wo.order_id = o.id
        WHERE woo.id = %s
    """, (woo_id,))
    r = cur.fetchone()
    if r:
        assert_period_open(cur, r[0] or r[1])
    worker_id = data.get("worker_id")
    actual_norm = data.get("actual_material_norm")
    cur.execute(
        f"UPDATE {SCHEMA}.work_order_operations SET worker_id=%s, actual_material_norm=%s, status='completed', completed_at=now() WHERE id=%s RETURNING *",
        (worker_id, actual_norm, woo_id)
    )
    cols = [d[0] for d in cur.description]
    row = cur.fetchone()
    if not row:
        return None
    op = dict(zip(cols, row))
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.work_order_operations WHERE work_order_id=%s AND status != 'completed'", (op["work_order_id"],))
    remaining = cur.fetchone()[0]
    if remaining == 0:
        cur.execute(f"UPDATE {SCHEMA}.work_orders SET status='completed', updated_at=now() WHERE id=%s", (op["work_order_id"],))
    else:
        cur.execute(f"UPDATE {SCHEMA}.work_orders SET status='in_progress', updated_at=now() WHERE id=%s", (op["work_order_id"],))
    return op


# ========== ЗАДАНИЯ СОТРУДНИКАМ (work_order_tasks) ==========
def _wo_full(cur, wo_id):
    cur.execute(f"SELECT id, order_id, order_item_id, semi_product_id, qty, warehouse_id, status FROM {SCHEMA}.work_orders WHERE id=%s", (wo_id,))
    r = cur.fetchone()
    if not r:
        return None
    return {"id": r[0], "order_id": r[1], "order_item_id": r[2], "semi_product_id": r[3],
            "qty": float(r[4] or 0), "warehouse_id": r[5], "status": r[6]}


def assign_work_order_task(cur, data):
    """Назначает изготовление N полуфабрикатов сотруднику. Блокирует при нехватке материалов/вложенных ПФ на складе."""
    wo_id = data.get("work_order_id")
    worker_id = data.get("worker_id")
    qty = float(data.get("qty") or 0)
    if not wo_id or not worker_id or qty <= 0:
        raise WorkerValidationError("Укажите заказ-наряд, сотрудника и количество")
    wo = _wo_full(cur, wo_id)
    if not wo:
        raise WorkerValidationError("Заказ-наряд не найден")
    # проверка: не назначить больше, чем в ЗН
    cur.execute(f"SELECT COALESCE(SUM(qty),0) FROM {SCHEMA}.work_order_tasks WHERE work_order_id=%s", (wo_id,))
    already = float(cur.fetchone()[0] or 0)
    if already + qty > wo["qty"] + 1e-9:
        raise WorkerValidationError(f"Нельзя назначить {qty:g}: в заказ-наряде {wo['qty']:g}, уже назначено {already:g}")
    sp_id = wo["semi_product_id"]
    wh = wo["warehouse_id"]

    # блок: наличие материалов на складе под это задание
    cur.execute(f"SELECT material_id, norm_qty FROM {SCHEMA}.semi_product_materials WHERE semi_product_id=%s", (sp_id,))
    for mat_id, norm in cur.fetchall():
        need = float(norm or 0) * qty
        if need <= 0:
            continue
        if wh:
            cur.execute(f"SELECT COALESCE(SUM(qty - reserved_qty),0) FROM {SCHEMA}.stock WHERE item_type='material' AND item_id=%s AND warehouse_id=%s", (mat_id, wh))
        else:
            cur.execute(f"SELECT COALESCE(SUM(qty - reserved_qty),0) FROM {SCHEMA}.stock WHERE item_type='material' AND item_id=%s", (mat_id,))
        avail = float(cur.fetchone()[0] or 0)
        if avail < need:
            cur.execute(f"SELECT name FROM {SCHEMA}.materials WHERE id=%s", (mat_id,))
            nm = cur.fetchone()
            raise WorkerValidationError(f"Недостаточно материала «{nm[0] if nm else mat_id}»: нужно {need:g}, на складе {avail:g}")

    # блок: наличие вложенных ПФ (для составного) под это задание
    cur.execute(f"SELECT component_id, qty FROM {SCHEMA}.semi_product_components WHERE parent_id=%s", (sp_id,))
    for comp_id, comp_qty in cur.fetchall():
        need = float(comp_qty or 1) * qty
        if wh:
            cur.execute(f"SELECT COALESCE(SUM(qty - reserved_qty),0) FROM {SCHEMA}.stock WHERE item_type='semi_product' AND item_id=%s AND warehouse_id=%s", (comp_id, wh))
        else:
            cur.execute(f"SELECT COALESCE(SUM(qty - reserved_qty),0) FROM {SCHEMA}.stock WHERE item_type='semi_product' AND item_id=%s", (comp_id,))
        avail = float(cur.fetchone()[0] or 0)
        if avail < need:
            cur.execute(f"SELECT name FROM {SCHEMA}.semi_products WHERE id=%s", (comp_id,))
            nm = cur.fetchone()
            raise WorkerValidationError(f"Недостаточно полуфабриката «{nm[0] if nm else comp_id}»: нужно {need:g}, на складе {avail:g}")

    cur.execute(
        f"INSERT INTO {SCHEMA}.work_order_tasks (work_order_id, worker_id, qty, status) VALUES (%s,%s,%s,'assigned') RETURNING *",
        (wo_id, worker_id, qty)
    )
    if wo["status"] == "pending":
        cur.execute(f"UPDATE {SCHEMA}.work_orders SET status='in_progress', updated_at=now() WHERE id=%s", (wo_id,))
    cols = [d[0] for d in cur.description]
    return dict(zip(cols, cur.fetchone()))


def start_work_order_task(cur, task_id):
    """Сотрудник начинает выполнение задания (фиксируется время старта)."""
    cur.execute(f"UPDATE {SCHEMA}.work_order_tasks SET status='in_progress', started_at=now() WHERE id=%s AND status='assigned' RETURNING *", (task_id,))
    row = cur.fetchone()
    if not row:
        raise WorkerValidationError("Задание не найдено или уже выполняется")
    cols = [d[0] for d in cur.description]
    return dict(zip(cols, row))


def finish_work_order_task(cur, task_id, data):
    """Завершение задания: списание материалов, приход ПФ на склад, расчёт ФОТ, авто-готовое изделие."""
    cur.execute(f"SELECT * FROM {SCHEMA}.work_order_tasks WHERE id=%s", (task_id,))
    cols = [d[0] for d in cur.description]
    trow = cur.fetchone()
    if not trow:
        raise WorkerValidationError("Задание не найдено")
    task = dict(zip(cols, trow))
    if task["status"] == "done":
        raise WorkerValidationError("Задание уже выполнено")
    wo = _wo_full(cur, task["work_order_id"])
    sp_id = wo["semi_product_id"]
    wh = wo["warehouse_id"]
    qty = float(task["qty"] or 0)

    # время выполнения
    started = task.get("started_at")
    duration = None
    if started:
        cur.execute("SELECT EXTRACT(EPOCH FROM (now() - %s))::int", (started,))
        duration = int(cur.fetchone()[0] or 0)

    # фактический расход материала (сумма) — если передан, иначе по норме
    actual_material = data.get("actual_material_qty")

    # списываем материалы со склада
    cur.execute(f"SELECT material_id, norm_qty FROM {SCHEMA}.semi_product_materials WHERE semi_product_id=%s", (sp_id,))
    mats = cur.fetchall()
    for mat_id, norm in mats:
        planned = float(norm or 0) * qty
        used = float(actual_material) if (actual_material is not None and len(mats) == 1) else planned
        if used > 0 and wh:
            stock_movement(cur, {
                "warehouse_id": wh, "item_type": "material", "item_id": mat_id,
                "movement_type": "out", "qty": used, "worker_id": task["worker_id"],
                "reason": f"Расход на ПФ (задание #{task_id})"
            })

    # списываем вложенные ПФ (для составного)
    cur.execute(f"SELECT component_id, qty FROM {SCHEMA}.semi_product_components WHERE parent_id=%s", (sp_id,))
    for comp_id, comp_qty in cur.fetchall():
        need = float(comp_qty or 1) * qty
        if need > 0 and wh:
            stock_movement(cur, {
                "warehouse_id": wh, "item_type": "semi_product", "item_id": comp_id,
                "movement_type": "out", "qty": need, "worker_id": task["worker_id"],
                "reason": f"Расход вложенного ПФ (задание #{task_id})"
            })

    # приход готового ПФ на склад
    if wh:
        stock_movement(cur, {
            "warehouse_id": wh, "item_type": "semi_product", "item_id": sp_id,
            "movement_type": "in", "qty": qty, "worker_id": task["worker_id"],
            "reason": f"Изготовлено (задание #{task_id})"
        })

    # ФОТ = сумма стоимости операций ПФ × кол-во
    cur.execute(f"SELECT COALESCE(SUM(labor_cost),0) FROM {SCHEMA}.semi_product_operations WHERE semi_product_id=%s", (sp_id,))
    op_cost = float(cur.fetchone()[0] or 0)
    labor_amount = round(op_cost * qty, 2)

    cur.execute(
        f"UPDATE {SCHEMA}.work_order_tasks SET status='done', finished_at=now(), duration_seconds=%s, actual_material_qty=%s, labor_amount=%s WHERE id=%s",
        (duration, actual_material, labor_amount, task_id)
    )

    # если по ЗН всё изготовлено — закрываем ЗН
    cur.execute(f"SELECT COALESCE(SUM(qty),0) FROM {SCHEMA}.work_order_tasks WHERE work_order_id=%s AND status='done'", (wo["id"],))
    done_qty = float(cur.fetchone()[0] or 0)
    if done_qty >= wo["qty"] - 1e-9:
        cur.execute(f"UPDATE {SCHEMA}.work_orders SET status='completed', updated_at=now() WHERE id=%s", (wo["id"],))
        _maybe_finish_finished_product(cur, wo)

    return {"ok": True, "labor_amount": labor_amount, "duration_seconds": duration}


def _maybe_finish_finished_product(cur, wo):
    """Если все ЗН позиции заказа завершены — оприходовать готовое изделие на склад ГП."""
    order_item_id = wo["order_item_id"]
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.work_orders WHERE order_item_id=%s AND status != 'completed'", (order_item_id,))
    if cur.fetchone()[0] > 0:
        return
    cur.execute(f"SELECT finished_product_id, qty FROM {SCHEMA}.order_items WHERE id=%s", (order_item_id,))
    r = cur.fetchone()
    if not r:
        return
    fp_id, item_qty = r[0], float(r[1] or 1)
    wh = wo["warehouse_id"]
    if fp_id and wh:
        stock_movement(cur, {
            "warehouse_id": wh, "item_type": "finished", "item_id": fp_id,
            "movement_type": "in", "qty": item_qty,
            "reason": f"Готовое изделие по заказу (позиция #{order_item_id})"
        })


def list_worker_payroll(cur, date_from=None, date_to=None, worker_id=None):
    """ФОТ по сотрудникам за период (по завершённым заданиям)."""
    sql = f"""
        SELECT t.worker_id, wk.full_name as worker_name,
               COUNT(*) as tasks_count,
               COALESCE(SUM(t.qty),0) as total_qty,
               COALESCE(SUM(t.labor_amount),0) as total_amount
        FROM {SCHEMA}.work_order_tasks t
        JOIN {SCHEMA}.workers wk ON t.worker_id = wk.id
        WHERE t.status='done'
    """
    params = []
    if date_from:
        sql += " AND t.finished_at::date >= %s"
        params.append(date_from)
    if date_to:
        sql += " AND t.finished_at::date <= %s"
        params.append(date_to)
    if worker_id:
        sql += " AND t.worker_id=%s"
        params.append(int(worker_id))
    sql += " GROUP BY t.worker_id, wk.full_name ORDER BY total_amount DESC"
    cur.execute(sql, params)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def get_pending_operations(cur, worker_id=None):
    """Актуальные операции для выполнения"""
    sql = f"""
        SELECT woo.*, op.name as operation_name, op.has_material_norm,
               wo.work_order_number, o.order_number, sp.name as semi_product_name,
               m.name as material_name
        FROM {SCHEMA}.work_order_operations woo
        JOIN {SCHEMA}.work_orders wo ON woo.work_order_id = wo.id
        JOIN {SCHEMA}.orders o ON wo.order_id = o.id
        JOIN {SCHEMA}.semi_products sp ON wo.semi_product_id = sp.id
        JOIN {SCHEMA}.operations op ON woo.operation_id = op.id
        LEFT JOIN {SCHEMA}.materials m ON woo.material_id = m.id
        WHERE woo.status = 'pending' AND wo.status IN ('pending', 'in_progress')
    """
    params = []
    if worker_id:
        sql += " AND (woo.worker_id = %s OR woo.worker_id IS NULL)"
        params.append(worker_id)
    prev_completed = f"""
        AND NOT EXISTS (
            SELECT 1 FROM {SCHEMA}.work_order_operations prev
            WHERE prev.work_order_id = woo.work_order_id
            AND prev.sort_order < woo.sort_order
            AND prev.status != 'completed'
        )
    """
    sql += prev_completed
    sql += " ORDER BY o.priority DESC, o.deadline ASC, woo.sort_order ASC"
    cur.execute(sql, params)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


# ========== REPORTS ==========
def report_overconsumption(cur):
    """Перерасход материалов по работникам"""
    cur.execute(f"""
        SELECT woo.id, woo.planned_material_norm, woo.actual_material_norm,
               (woo.actual_material_norm - woo.planned_material_norm) as overuse_qty,
               m.name as material_name, m.price_per_unit,
               ((woo.actual_material_norm - woo.planned_material_norm) * m.price_per_unit) as overuse_cost,
               wk.full_name as worker_name, wk.tab_number,
               wo.work_order_number, o.order_number
        FROM {SCHEMA}.work_order_operations woo
        JOIN {SCHEMA}.work_orders wo ON woo.work_order_id = wo.id
        JOIN {SCHEMA}.orders o ON wo.order_id = o.id
        LEFT JOIN {SCHEMA}.workers wk ON woo.worker_id = wk.id
        LEFT JOIN {SCHEMA}.materials m ON woo.material_id = m.id
        WHERE woo.status = 'completed'
          AND woo.planned_material_norm IS NOT NULL
          AND woo.actual_material_norm IS NOT NULL
          AND woo.actual_material_norm > woo.planned_material_norm
        ORDER BY overuse_cost DESC
    """)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def report_cost(cur, order_id):
    """Себестоимость заказа по фактически потраченным материалам, фурнитуре и труду."""
    cur.execute(f"""
        SELECT oi.id as order_item_id, oi.finished_product_id, fp.name as product_name,
               oi.qty, oi.unit_price, oi.total_price
        FROM {SCHEMA}.order_items oi
        JOIN {SCHEMA}.finished_products fp ON oi.finished_product_id = fp.id
        WHERE oi.order_id = %s
    """, (order_id,))
    cols = [d[0] for d in cur.description]
    items = [dict(zip(cols, r)) for r in cur.fetchall()]

    total_mat = 0.0
    total_fit = 0.0
    total_labor = 0.0

    for item in items:
        oi_id = item["order_item_id"]
        fp_id = item["finished_product_id"]
        qty = float(item.get("qty") or 0)

        # --- труд (фактически выполненные операции) ---
        cur.execute(f"""
            SELECT COALESCE(SUM(woo.labor_cost), 0)
            FROM {SCHEMA}.work_order_operations woo
            JOIN {SCHEMA}.work_orders wo ON woo.work_order_id = wo.id
            WHERE wo.order_item_id = %s AND woo.status = 'completed'
        """, (oi_id,))
        labor = float(cur.fetchone()[0])

        # --- материалы: фактический расход из заказ-нарядов ---
        cur.execute(f"""
            SELECT m.id, m.name, COALESCE(m.price_per_unit, 0) as price,
                   COALESCE(SUM(COALESCE(woo.actual_material_norm, woo.planned_material_norm, 0)), 0) as used_qty,
                   COALESCE(MAX(u.short_name), '') as unit_short
            FROM {SCHEMA}.work_order_operations woo
            JOIN {SCHEMA}.work_orders wo ON woo.work_order_id = wo.id
            JOIN {SCHEMA}.materials m ON woo.material_id = m.id
            LEFT JOIN {SCHEMA}.units u ON m.unit_id = u.id
            WHERE wo.order_item_id = %s AND woo.status = 'completed' AND woo.material_id IS NOT NULL
            GROUP BY m.id, m.name, m.price_per_unit
        """, (oi_id,))
        mat_rows = []
        item_mat = 0.0
        for r in cur.fetchall():
            used = float(r[3])
            price = float(r[2])
            cost = used * price
            item_mat += cost
            mat_rows.append({
                "material_id": r[0], "material_name": r[1], "price": price,
                "used_qty": used, "unit_short": r[4], "cost": round(cost, 2),
            })

        # --- фурнитура: по нормам состава готовой продукции × кол-во ---
        cur.execute(f"""
            SELECT f.id, f.name, COALESCE(f.price_per_unit, 0) as price, fpf.qty,
                   COALESCE(u.short_name, '') as unit_short
            FROM {SCHEMA}.finished_product_fittings fpf
            JOIN {SCHEMA}.fittings f ON fpf.fitting_id = f.id
            LEFT JOIN {SCHEMA}.units u ON f.unit_id = u.id
            WHERE fpf.finished_product_id = %s
        """, (fp_id,))
        fit_rows = []
        item_fit = 0.0
        for r in cur.fetchall():
            per_unit = float(r[3] or 0)
            total_used = per_unit * qty
            price = float(r[2])
            cost = total_used * price
            item_fit += cost
            fit_rows.append({
                "fitting_id": r[0], "fitting_name": r[1], "price": price,
                "qty_per_item": per_unit, "total_qty": total_used,
                "unit_short": r[4], "cost": round(cost, 2),
            })

        item["labor_cost"] = round(labor, 2)
        item["materials_cost"] = round(item_mat, 2)
        item["fittings_cost"] = round(item_fit, 2)
        item["materials"] = mat_rows
        item["fittings"] = fit_rows
        item["cost"] = round(labor + item_mat + item_fit, 2)
        item["revenue"] = float(item.get("total_price") or 0)
        item["margin"] = round(item["revenue"] - item["cost"], 2)

        total_labor += labor
        total_mat += item_mat
        total_fit += item_fit

    total_cost = total_mat + total_fit + total_labor
    total_revenue = sum(float(i.get("total_price") or 0) for i in items)

    return {
        "order_id": order_id,
        "items": items,
        "total_materials": round(total_mat, 2),
        "total_fittings": round(total_fit, 2),
        "total_labor": round(total_labor, 2),
        "total_cost": round(total_cost, 2),
        "total_revenue": round(total_revenue, 2),
        "total_margin": round(total_revenue - total_cost, 2),
    }


# ========== ROUTER ==========
def handler(event, context):
    """Бэкофис швейного производства — API для управления заказами, складом, производством и отчётами."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    entity = qs.get("entity", "")
    action = qs.get("action", "")
    headers = event.get("headers") or {}
    token = headers.get("X-Auth-Token") or headers.get("x-auth-token")

    conn = get_conn()
    conn.autocommit = False
    cur = conn.cursor()

    try:
        # ---- авторизация ----
        user = get_auth_user(cur, token)
        if not user:
            return err("Не авторизован", 401)
        if user["is_blocked"]:
            return err("Учётная запись заблокирована", 403)
        perms = resolve_permissions(cur, user["id"], user["access_level"])

        # ---- проверка прав ----
        module = ENTITY_MODULE.get(entity, "__deny__")
        if module is not None and module != "__deny__":
            need = f"{module}.view" if method == "GET" else f"{module}.edit"
            if not has_perm(perms, need):
                return err("Недостаточно прав", 403)
            # удаление материала требует отдельного права materials.delete
            if method == "DELETE" and entity == "materials" and not has_perm(perms, "materials.delete"):
                return err("Недостаточно прав для удаления", 403)
        elif module == "__deny__" and entity not in ("",):
            return err("Недостаточно прав", 403)

        hide_client = has_perm(perms, "orders.hide_client") and not has_perm(perms, "__all__")

        if method == "GET":
            if entity == "groups":
                return ok(list_groups(cur, qs.get("entity_type")))
            elif entity == "units":
                return ok(list_units(cur))
            elif entity == "warehouses":
                return ok(list_warehouses(cur))
            elif entity == "clients":
                return ok(list_clients(cur))
            elif entity == "workers":
                return ok(list_workers(cur))
            elif entity == "worker_perms":
                return ok(list_worker_perms(cur, int(qs.get("worker_id", 0))))
            elif entity == "materials":
                return ok(list_materials(cur))
            elif entity == "suppliers":
                return ok(list_suppliers(cur))
            elif entity == "vat_rates":
                return ok(list_vat_rates(cur))
            elif entity == "fittings":
                return ok(list_fittings(cur))
            elif entity == "operations":
                return ok(list_operations(cur))
            elif entity == "semi_products":
                return ok(list_semi_products(cur))
            elif entity == "finished_products":
                return ok(list_finished_products(cur))
            elif entity == "specifications":
                return ok(list_specifications(cur, qs.get("finished_product_id")))
            elif entity == "catalog_products":
                return ok(list_catalog_products(cur))
            elif entity == "catalog_sizes" and qs.get("product_id"):
                return ok(list_catalog_sizes(cur, int(qs["product_id"])))
            elif entity == "stock_materials":
                return ok(list_stock_materials(cur, qs.get("warehouse_id")))
            elif entity == "stock":
                return ok(list_stock(cur, qs.get("warehouse_id"), qs.get("item_type")))
            elif entity == "stock_movements":
                return ok(list_stock_movements(cur, qs.get("warehouse_id"), qs.get("item_type"), qs.get("item_id")))
            elif entity == "orders":
                return ok(list_orders(cur, qs.get("status"), hide_client))
            elif entity == "work_orders":
                return ok(list_work_orders(cur, qs.get("order_id"), qs.get("status")))
            elif entity == "pending_operations":
                return ok(get_pending_operations(cur, qs.get("worker_id")))
            elif entity == "worker_payroll":
                return ok(list_worker_payroll(cur, qs.get("date_from"), qs.get("date_to"), qs.get("worker_id")))
            elif entity == "report_overconsumption":
                return ok(report_overconsumption(cur))
            elif entity == "report_cost" and qs.get("order_id"):
                return ok(report_cost(cur, int(qs["order_id"])))
            elif entity == "report_stock_on_date":
                hide_zero = str(qs.get("hide_zero", "1")).lower() not in ("0", "false", "no")
                return ok(report_stock_on_date(cur, qs.get("date"), qs.get("warehouse_id"), hide_zero))
            elif entity == "requisitions":
                return ok(list_requisitions(cur, qs.get("worker_id"), qs.get("work_order_id"), qs.get("status")))
            elif entity == "worker_balances":
                return ok(list_worker_balances(cur, qs.get("worker_id")))
            elif entity == "report_material_overuse":
                return ok(report_material_overuse(cur, qs.get("mode", "requisition"), qs.get("work_order_id")))
            elif entity == "period_settings":
                result = get_period_settings(cur, run_auto=True)
                conn.commit()
                return ok(result)
            else:
                return ok({"entities": ["groups","units","warehouses","clients","workers","materials","fittings","operations","semi_products","finished_products","stock","stock_movements","orders","work_orders","pending_operations","report_overconsumption","report_cost"]})

        data = parse_body(event)

        if method == "POST":
            if entity == "groups":
                result = create_group(cur, data)
            elif entity == "units":
                result = create_unit(cur, data)
            elif entity == "clients":
                result = create_client(cur, data)
            elif entity == "workers":
                result = create_worker(cur, data)
            elif entity == "materials":
                result = create_material(cur, data)
            elif entity == "suppliers":
                result = create_supplier(cur, data)
            elif entity == "vat_rates":
                result = create_vat_rate(cur, data)
            elif entity == "material_receipt":
                result = material_receipt(cur, data, user["id"])
            elif entity == "requisitions":
                result = create_requisition(cur, data, user["id"])
            elif entity == "requisition_return":
                result = return_requisition_item(cur, data)
            elif entity == "requisition_close":
                result = close_requisition(cur, int(data["id"]))
            elif entity == "fittings":
                result = create_fitting(cur, data)
            elif entity == "operations":
                result = create_operation(cur, data)
            elif entity == "semi_products":
                result = create_semi_product(cur, data)
            elif entity == "semi_group_wizard":
                result = create_semi_group_wizard(cur, data)
            elif entity == "clone_semi_product":
                result = clone_semi_product(cur, data)
            elif entity == "clone_semi_group":
                result = clone_semi_group(cur, data)
            elif entity == "finished_products":
                result = create_finished_product(cur, data)
            elif entity == "specifications":
                result = create_specification(cur, data)
            elif entity == "specification_activate":
                result = set_active_specification(cur, int(data["id"]))
            elif entity == "copy_semi_to_spec":
                result = copy_semi_to_spec(cur, data)
            elif entity == "sync_catalog":
                result = sync_catalog_to_finished(cur)
            elif entity == "stock_movement":
                result = stock_movement(cur, data)
            elif entity == "stock_snapshot":
                result = take_stock_snapshot(cur, data.get("date"))
            elif entity == "orders":
                result = create_order(cur, data)
            elif entity == "work_orders":
                result = create_work_order(cur, data)
            elif entity == "assign_task":
                result = assign_work_order_task(cur, data)
            elif entity == "task_start":
                result = start_work_order_task(cur, int(data["id"]))
            elif entity == "task_finish":
                result = finish_work_order_task(cur, int(data["id"]), data)
            elif entity == "complete_operation":
                result = complete_work_order_operation(cur, int(data["operation_id"]), data)
            elif entity == "worker_perms":
                result = save_worker_perms(cur, int(data["worker_id"]), data.get("permissions", []))
            else:
                return err("Unknown entity for POST")
            conn.commit()
            return ok(result, 201)

        if method == "PUT":
            if entity == "period_settings":
                result = update_period_settings(cur, data, user)
                conn.commit()
                return ok(result)
            item_id = int(qs.get("id", 0) or data.get("id", 0))
            if not item_id:
                return err("id required")
            if entity == "groups":
                result = update_group(cur, item_id, data)
            elif entity == "units":
                result = update_unit(cur, item_id, data)
            elif entity == "clients":
                result = update_client(cur, item_id, data)
            elif entity == "workers":
                result = update_worker(cur, item_id, data)
            elif entity == "materials":
                result = update_material(cur, item_id, data)
            elif entity == "suppliers":
                result = update_supplier(cur, item_id, data)
            elif entity == "vat_rates":
                result = update_vat_rate(cur, item_id, data)
            elif entity == "fittings":
                result = update_fitting(cur, item_id, data)
            elif entity == "operations":
                result = update_operation(cur, item_id, data)
            elif entity == "semi_products":
                result = update_semi_product(cur, item_id, data)
            elif entity == "finished_products":
                result = update_finished_product(cur, item_id, data)
            elif entity == "specifications":
                result = update_specification(cur, item_id, data)
            elif entity == "order_status":
                result = update_order_status(cur, item_id, data.get("status"))
            elif entity == "orders":
                result = update_order(cur, item_id, data)
            elif entity == "stock_movement_edit":
                result = edit_stock_movement(cur, item_id, data)
            else:
                return err("Unknown entity for PUT")
            conn.commit()
            if result is None:
                return err("Not found", 404)
            return ok(result)

        if method == "DELETE":
            data = parse_body(event)
            item_id = int(qs.get("id", 0) or data.get("id", 0))
            if not item_id:
                return err("id required")
            cascade = str(qs.get("cascade", "") or data.get("cascade", "")).lower() in ("1", "true", "yes")
            if entity == "groups":
                result = delete_group(cur, item_id, cascade=cascade)
            elif entity == "finished_products":
                result = delete_finished_product(cur, item_id)
            elif entity == "specifications":
                result = delete_specification(cur, item_id)
            elif entity == "semi_products":
                result = delete_semi_product(cur, item_id)
            elif entity in ("materials", "fittings", "operations", "clients"):
                usage = _check_item_usage(cur, entity, item_id)
                if usage:
                    raise WorkerValidationError(f"Нельзя удалить: элемент {usage}. Сначала измените связанный документ.")
                _delete_group_item(cur, entity, item_id)
                result = {"deleted": item_id}
            elif entity == "workers":
                cur.execute(f"DELETE FROM {SCHEMA}.worker_permissions WHERE worker_id=%s", (item_id,))
                cur.execute(f"DELETE FROM {SCHEMA}.auth_sessions WHERE worker_id=%s", (item_id,))
                cur.execute(f"DELETE FROM {SCHEMA}.workers WHERE id=%s RETURNING id", (item_id,))
                result = {"ok": True} if cur.fetchone() else None
            else:
                return err("Unknown entity for DELETE")
            conn.commit()
            if result is None:
                return err("Not found", 404)
            return ok(result)

        return err("Method not allowed", 405)

    except PeriodLockedError as e:
        conn.rollback()
        return err(str(e), 423)
    except WorkerValidationError as e:
        conn.rollback()
        return err(str(e), 400)
    except Exception as e:
        conn.rollback()
        msg = str(e)
        print(f"ERROR entity={entity} method={method}: {msg}\n{traceback.format_exc()}")
        if "unique" in msg.lower() or "duplicate" in msg.lower():
            return err("Запись с такими данными уже существует", 400)
        return err(msg, 500)
    finally:
        cur.close()
        conn.close()