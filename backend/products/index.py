"""
CRUD товаров, галерея фото, размерный ряд, GTIN/штрихкод, авторизация менеджера.
GET    /              — список товаров с фото и размерами
POST   /              — создать товар
PUT    /              — обновить товар
DELETE /              — удалить товар (?id=)
POST   /upload        — загрузить фото → CDN URL
POST   /images        — добавить фото в галерею товара
DELETE /images        — удалить фото из галереи (?id=)
GET    /sizes?product_id= — размерный ряд товара
POST   /sizes         — добавить/обновить размер
DELETE /sizes         — удалить размер (?id=)
POST   /auth          — проверить пароль менеджера
"""
import json
import os
import base64
import io
import uuid
import hashlib
import psycopg2
import boto3

SCHEMA = "t_p87775074_welding_suit_factory"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Role",
    }


def ok(data):
    return {"statusCode": 200, "headers": {**cors_headers(), "Content-Type": "application/json"}, "body": json.dumps(data, ensure_ascii=False)}


def ean13_barcode_svg(code: str) -> str:
    """Генерирует контрольную цифру EAN-13 и рисует SVG штрихкод."""
    digits = code[:12].zfill(12)
    s = sum(int(d) * (1 if i % 2 == 0 else 3) for i, d in enumerate(digits))
    check = (10 - s % 10) % 10
    full = digits + str(check)

    # EAN-13 encoding tables
    L = ["0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011"]
    G = ["0100111","0110011","0011011","0100001","0011101","0111001","0000101","0010001","0001001","0010111"]
    R = ["1110010","1100110","1101100","1000010","1011100","1001110","1010000","1000100","1001000","1110100"]
    PARITIES = ["LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG","LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL"]

    first = int(full[0])
    parity = PARITIES[first]
    bars = ""
    # Start guard
    bars += "101"
    for i, d in enumerate(full[1:7]):
        enc = L[int(d)] if parity[i] == "L" else G[int(d)]
        bars += enc
    # Middle guard
    bars += "01010"
    for d in full[7:]:
        bars += R[int(d)]
    # End guard
    bars += "101"

    W, H = 200, 80
    bar_w = (W - 20) / len(bars)
    svg_bars = ""
    for i, b in enumerate(bars):
        if b == "1":
            x = 10 + i * bar_w
            svg_bars += f'<rect x="{x:.2f}" y="5" width="{bar_w:.2f}" height="55" fill="black"/>'

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  <rect width="{W}" height="{H}" fill="white"/>
  {svg_bars}
  <text x="10" y="72" font-family="monospace" font-size="11" fill="black">{full[:7]}</text>
  <text x="108" y="72" font-family="monospace" font-size="11" fill="black">{full[7:]}</text>
</svg>'''
    return svg


def upload_svg_to_s3(svg: str, key: str) -> str:
    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )
    s3.put_object(Bucket="files", Key=key, Body=svg.encode("utf-8"), ContentType="image/svg+xml")
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers(), "body": ""}

    method = event.get("httpMethod", "GET")
    path   = event.get("path", "/")

    # ── POST (action=auth) — авторизация ──
    if method == "POST":
        body_raw = json.loads(event.get("body") or "{}")
        if body_raw.get("action") == "auth":
            role       = body_raw.get("role", "admin")
            password   = body_raw.get("password", "")
            secret_key = "ADMIN_PASSWORD" if role == "admin" else "MANAGER_PASSWORD"
            expected   = os.environ.get(secret_key, "")
            if password and password == expected:
                return ok({"ok": True, "role": role})
            return {"statusCode": 401, "headers": {**cors_headers(), "Content-Type": "application/json"}, "body": json.dumps({"ok": False})}

    # ── POST /upload — загрузка фото ──
    if path.endswith("/upload") and method == "POST":
        body = json.loads(event.get("body") or "{}")
        file_b64     = body.get("file")
        content_type = body.get("contentType", "image/jpeg")
        ext = content_type.split("/")[-1].replace("jpeg", "jpg")
        key = f"products/{uuid.uuid4()}.{ext}"
        s3 = boto3.client("s3", endpoint_url="https://bucket.poehali.dev",
                          aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
                          aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"])
        s3.put_object(Bucket="files", Key=key, Body=base64.b64decode(file_b64), ContentType=content_type)
        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        return ok({"url": cdn_url})

    # ── GET /sizes — размерный ряд товара ──
    if path.endswith("/sizes") and method == "GET":
        params     = event.get("queryStringParameters") or {}
        product_id = int(params.get("product_id", 0))
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute(f"SELECT id, size_label, price_add, is_available FROM {SCHEMA}.product_sizes WHERE product_id=%s ORDER BY id", (product_id,))
        rows = [{"id": r[0], "size_label": r[1], "price_add": r[2], "is_available": r[3]} for r in cur.fetchall()]
        conn.close()
        return ok({"sizes": rows})

    # ── POST /sizes — добавить или обновить размер ──
    if path.endswith("/sizes") and method == "POST":
        body = json.loads(event.get("body") or "{}")
        conn = get_conn()
        cur  = conn.cursor()
        if body.get("id"):
            cur.execute(f"UPDATE {SCHEMA}.product_sizes SET size_label=%s, price_add=%s, is_available=%s WHERE id=%s",
                        (body["size_label"], int(body.get("price_add", 0)), bool(body.get("is_available", True)), int(body["id"])))
        else:
            cur.execute(f"INSERT INTO {SCHEMA}.product_sizes (product_id, size_label, price_add, is_available) VALUES (%s,%s,%s,%s) RETURNING id",
                        (int(body["product_id"]), body["size_label"], int(body.get("price_add", 0)), bool(body.get("is_available", True))))
            body["id"] = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return ok({"ok": True, "id": body.get("id")})

    # ── DELETE /sizes — удалить размер ──
    if path.endswith("/sizes") and method == "DELETE":
        params = event.get("queryStringParameters") or {}
        conn   = get_conn()
        cur    = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.product_sizes SET is_available=false WHERE id=%s", (int(params.get("id", 0)),))
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── POST /images — добавить фото в галерею ──
    if path.endswith("/images") and method == "POST":
        body = json.loads(event.get("body") or "{}")
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.product_images WHERE product_id=%s", (int(body["product_id"]),))
        count = cur.fetchone()[0]
        if count >= 5:
            conn.close()
            return {"statusCode": 400, "headers": {**cors_headers(), "Content-Type": "application/json"}, "body": json.dumps({"error": "max 5 photos"})}
        cur.execute(f"INSERT INTO {SCHEMA}.product_images (product_id, url, sort_order) VALUES (%s,%s,%s) RETURNING id",
                    (int(body["product_id"]), body["url"], int(body.get("sort_order", count))))
        new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return ok({"ok": True, "id": new_id})

    # ── DELETE /images — удалить фото из галереи ──
    if path.endswith("/images") and method == "DELETE":
        params = event.get("queryStringParameters") or {}
        conn   = get_conn()
        cur    = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.product_images SET url='' WHERE id=%s", (int(params.get("id", 0)),))
        conn.commit()
        conn.close()
        return ok({"ok": True})

    conn = get_conn()
    cur  = conn.cursor()

    # ── GET / — список товаров с галереей и размерами ──
    if method == "GET":
        cur.execute(
            f"SELECT id, name, category, description, gost, badge, base_price, image_url, is_active, sort_order, stock_status, gtin, barcode_url "
            f"FROM {SCHEMA}.products ORDER BY sort_order, id"
        )
        cols     = ["id","name","category","description","gost","badge","base_price","image_url","is_active","sort_order","stock_status","gtin","barcode_url"]
        products = [dict(zip(cols, r)) for r in cur.fetchall()]

        # Подгружаем фото
        if products:
            ids = [str(p["id"]) for p in products]
            cur.execute(f"SELECT id, product_id, url, sort_order FROM {SCHEMA}.product_images WHERE product_id IN ({','.join(ids)}) AND url!='' ORDER BY sort_order")
            imgs = {}
            for r in cur.fetchall():
                imgs.setdefault(r[1], []).append({"id": r[0], "url": r[2], "sort_order": r[3]})
            for p in products:
                p["images"] = imgs.get(p["id"], [])

            # Подгружаем размеры
            cur.execute(f"SELECT id, product_id, size_label, price_add, is_available FROM {SCHEMA}.product_sizes WHERE product_id IN ({','.join(ids)})")
            szs = {}
            for r in cur.fetchall():
                szs.setdefault(r[1], []).append({"id": r[0], "size_label": r[2], "price_add": r[3], "is_available": r[4]})
            for p in products:
                p["sizes"] = szs.get(p["id"], [])

        conn.close()
        return ok({"products": products})

    # ── POST / — создать товар ──
    if method == "POST":
        body  = json.loads(event.get("body") or "{}")
        gtin  = body.get("gtin", "")
        barcode_url = ""
        if gtin:
            svg = ean13_barcode_svg(gtin)
            barcode_url = upload_svg_to_s3(svg, f"barcodes/{uuid.uuid4()}.svg")
        cur.execute(
            f"""INSERT INTO {SCHEMA}.products
                (name, category, description, gost, badge, base_price, image_url, is_active, sort_order, stock_status, gtin, barcode_url)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
            (body.get("name",""), body.get("category",""), body.get("description",""), body.get("gost",""),
             body.get("badge") or None, int(body.get("base_price",0)), body.get("image_url") or None,
             bool(body.get("is_active",True)), int(body.get("sort_order",0)),
             body.get("stock_status","in_stock"), gtin, barcode_url),
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return {"statusCode": 201, "headers": {**cors_headers(), "Content-Type": "application/json"}, "body": json.dumps({"id": new_id, "barcode_url": barcode_url})}

    # ── PUT / — обновить товар ──
    if method == "PUT":
        body = json.loads(event.get("body") or "{}")
        gtin = body.get("gtin", "")
        # Пересчитываем штрихкод только если GTIN изменился
        cur.execute(f"SELECT gtin, barcode_url FROM {SCHEMA}.products WHERE id=%s", (int(body["id"]),))
        row = cur.fetchone()
        barcode_url = row[1] if row else ""
        if gtin and (not row or row[0] != gtin):
            svg = ean13_barcode_svg(gtin)
            barcode_url = upload_svg_to_s3(svg, f"barcodes/{uuid.uuid4()}.svg")
        cur.execute(
            f"""UPDATE {SCHEMA}.products
                SET name=%s, category=%s, description=%s, gost=%s, badge=%s,
                    base_price=%s, image_url=%s, is_active=%s, sort_order=%s,
                    stock_status=%s, gtin=%s, barcode_url=%s, updated_at=NOW()
                WHERE id=%s""",
            (body.get("name",""), body.get("category",""), body.get("description",""), body.get("gost",""),
             body.get("badge") or None, int(body.get("base_price",0)), body.get("image_url") or None,
             bool(body.get("is_active",True)), int(body.get("sort_order",0)),
             body.get("stock_status","in_stock"), gtin, barcode_url, int(body["id"])),
        )
        conn.commit()
        conn.close()
        return ok({"ok": True, "barcode_url": barcode_url})

    # ── DELETE / — удалить товар ──
    if method == "DELETE":
        params = event.get("queryStringParameters") or {}
        cur.execute(f"UPDATE {SCHEMA}.products SET is_active=false WHERE id=%s", (int(params.get("id", 0)),))
        conn.commit()
        conn.close()
        return ok({"ok": True})

    conn.close()
    return {"statusCode": 405, "headers": cors_headers(), "body": "Method Not Allowed"}