"""
Бэкофис швейного производства — единый API.
Справочники, склад, заказы, производство, заказ-наряды, отчёты.
"""
import json
import os
import psycopg2
from datetime import datetime, date

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

# Сопоставление entity -> модуль права
ENTITY_MODULE = {
    "orders": "orders",
    "order_status": "orders",
    "clients": "clients",
    "workers": "workers",
    "worker_perms": "workers",
    "materials": "materials",
    "fittings": "fittings",
    "operations": "operations",
    "semi_products": "semi_products",
    "finished_products": "finished_products",
    "sync_catalog": "finished_products",
    "catalog_products": "finished_products",
    "units": "units",
    "warehouses": "stock",
    "stock": "stock",
    "stock_movement": "stock",
    "stock_movements": "stock",
    "work_orders": "production",
    "complete_operation": "production",
    "pending_operations": "production",
    "report_overconsumption": "reports",
    "report_cost": "reports",
    "groups": None,  # вспомогательное — доступно всем авторизованным
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
    return {"ok": True, "count": len(perms)}


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


def delete_group(cur, gid):
    for tbl in ("materials", "fittings", "operations", "clients", "workers", "semi_products", "finished_products"):
        cur.execute(f"UPDATE {SCHEMA}.{tbl} SET group_id = NULL WHERE group_id = %s", (gid,))
    cur.execute(f"UPDATE {SCHEMA}.groups SET parent_id = NULL WHERE parent_id = %s", (gid,))
    cur.execute(f"UPDATE {SCHEMA}.groups SET is_active = false WHERE id=%s RETURNING id", (gid,))
    row = cur.fetchone()
    if not row:
        return None
    return {"deleted": gid}


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
        SELECT m.*, u.name as unit_name, u.short_name as unit_short, g.name as group_name
        FROM {SCHEMA}.materials m
        LEFT JOIN {SCHEMA}.units u ON m.unit_id = u.id
        LEFT JOIN {SCHEMA}.groups g ON m.group_id = g.id
        ORDER BY m.name
    """)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def create_material(cur, data):
    cur.execute(
        f"INSERT INTO {SCHEMA}.materials (name, sku, unit_id, price_per_unit, description, group_id) VALUES (%s,%s,%s,%s,%s,%s) RETURNING *",
        (data["name"], data.get("sku"), data.get("unit_id"), data.get("price_per_unit", 0), data.get("description"), data.get("group_id"))
    )
    cols = [d[0] for d in cur.description]
    return dict(zip(cols, cur.fetchone()))


def update_material(cur, mid, data):
    cur.execute(
        f"UPDATE {SCHEMA}.materials SET name=%s, sku=%s, unit_id=%s, price_per_unit=%s, description=%s, is_active=%s, group_id=%s, updated_at=now() WHERE id=%s RETURNING *",
        (data["name"], data.get("sku"), data.get("unit_id"), data.get("price_per_unit", 0), data.get("description"), data.get("is_active", True), data.get("group_id"), mid)
    )
    cols = [d[0] for d in cur.description]
    row = cur.fetchone()
    return dict(zip(cols, row)) if row else None


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
def list_semi_products(cur):
    cur.execute(f"""
        SELECT sp.*, g.name as group_name
        FROM {SCHEMA}.semi_products sp
        LEFT JOIN {SCHEMA}.groups g ON sp.group_id = g.id
        ORDER BY sp.name
    """)
    cols = [d[0] for d in cur.description]
    rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    for row in rows:
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
    return rows


def create_semi_product(cur, data):
    cur.execute(
        f"INSERT INTO {SCHEMA}.semi_products (name, sku, description, group_id) VALUES (%s,%s,%s,%s) RETURNING *",
        (data["name"], data.get("sku"), data.get("description"), data.get("group_id"))
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
    return sp


def update_semi_product(cur, spid, data):
    cur.execute(
        f"UPDATE {SCHEMA}.semi_products SET name=%s, sku=%s, description=%s, is_active=%s, group_id=%s, updated_at=now() WHERE id=%s RETURNING *",
        (data["name"], data.get("sku"), data.get("description"), data.get("is_active", True), data.get("group_id"), spid)
    )
    cols = [d[0] for d in cur.description]
    row = cur.fetchone()
    if not row:
        return None
    sp = dict(zip(cols, row))
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
    return sp


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


def update_order_status(cur, oid, status):
    cur.execute(f"UPDATE {SCHEMA}.orders SET status=%s, updated_at=now() WHERE id=%s RETURNING *", (status, oid))
    cols = [d[0] for d in cur.description]
    row = cur.fetchone()
    return dict(zip(cols, row)) if row else None


def update_order(cur, oid, data):
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


def _create_single_work_order(cur, order_id, order_item_id, semi_product_id, qty, warehouse_id, overrides=None):
    """Создаёт один заказ-наряд по полуфабрикату + его операции.
    overrides: список {operation_id, material_id, planned_material_norm, labor_cost} для правки спецификации."""
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


def create_work_order(cur, data):
    order_id = data["order_id"]
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

    # берём полуфабрикаты из состава изделия
    semi_ids = []
    if not explicit_sp and fp_id:
        cur.execute(f"SELECT semi_product_id, qty FROM {SCHEMA}.finished_product_semi WHERE finished_product_id=%s", (fp_id,))
        semi_ids = [(row[0], float(row[1] or 1)) for row in cur.fetchall()]

    created = []
    if explicit_sp:
        created.append(_create_single_work_order(cur, order_id, order_item_id, explicit_sp, qty, warehouse_id, overrides))
    elif semi_ids:
        for sp_id, sp_qty in semi_ids:
            created.append(_create_single_work_order(cur, order_id, order_item_id, sp_id, int(qty * sp_qty), warehouse_id, overrides))
    else:
        # у изделия нет состава — создаём ЗН на изделие целиком со всеми операциями
        default_sp = _get_default_semi_product(cur)
        created.append(_create_single_work_order(cur, order_id, order_item_id, default_sp, qty, warehouse_id, overrides))

    return created[0] if len(created) == 1 else {"created": created, "count": len(created)}


def complete_work_order_operation(cur, woo_id, data):
    """Работник закрывает операцию в заказ-наряде"""
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
            elif entity == "fittings":
                return ok(list_fittings(cur))
            elif entity == "operations":
                return ok(list_operations(cur))
            elif entity == "semi_products":
                return ok(list_semi_products(cur))
            elif entity == "finished_products":
                return ok(list_finished_products(cur))
            elif entity == "catalog_products":
                return ok(list_catalog_products(cur))
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
            elif entity == "report_overconsumption":
                return ok(report_overconsumption(cur))
            elif entity == "report_cost" and qs.get("order_id"):
                return ok(report_cost(cur, int(qs["order_id"])))
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
            elif entity == "fittings":
                result = create_fitting(cur, data)
            elif entity == "operations":
                result = create_operation(cur, data)
            elif entity == "semi_products":
                result = create_semi_product(cur, data)
            elif entity == "finished_products":
                result = create_finished_product(cur, data)
            elif entity == "sync_catalog":
                result = sync_catalog_to_finished(cur)
            elif entity == "stock_movement":
                result = stock_movement(cur, data)
            elif entity == "orders":
                result = create_order(cur, data)
            elif entity == "work_orders":
                result = create_work_order(cur, data)
            elif entity == "complete_operation":
                result = complete_work_order_operation(cur, int(data["operation_id"]), data)
            elif entity == "worker_perms":
                result = save_worker_perms(cur, int(data["worker_id"]), data.get("permissions", []))
            else:
                return err("Unknown entity for POST")
            conn.commit()
            return ok(result, 201)

        if method == "PUT":
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
            elif entity == "fittings":
                result = update_fitting(cur, item_id, data)
            elif entity == "operations":
                result = update_operation(cur, item_id, data)
            elif entity == "semi_products":
                result = update_semi_product(cur, item_id, data)
            elif entity == "finished_products":
                result = update_finished_product(cur, item_id, data)
            elif entity == "order_status":
                result = update_order_status(cur, item_id, data.get("status"))
            elif entity == "orders":
                result = update_order(cur, item_id, data)
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
            if entity == "groups":
                result = delete_group(cur, item_id)
            elif entity == "finished_products":
                result = delete_finished_product(cur, item_id)
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

    except WorkerValidationError as e:
        conn.rollback()
        return err(str(e), 400)
    except Exception as e:
        conn.rollback()
        msg = str(e)
        if "unique" in msg.lower() or "duplicate" in msg.lower():
            return err("Запись с такими данными уже существует", 400)
        return err(msg, 500)
    finally:
        cur.close()
        conn.close()