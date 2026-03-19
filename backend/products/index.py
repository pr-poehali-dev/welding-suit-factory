"""
CRUD товаров и загрузка изображений для панели администратора.
GET    /         — список всех товаров
POST   /         — создать товар
PUT    /         — обновить товар (передать id)
DELETE /         — удалить товар (передать id в query)
POST   /upload   — загрузить фото, вернуть CDN URL
"""
import json
import os
import base64
import uuid
import psycopg2
import boto3

SCHEMA = "t_p87775074_welding_suit_factory"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers(), "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")

    # --- ЗАГРУЗКА ФОТО ---
    if path.endswith("/upload") and method == "POST":
        body = json.loads(event.get("body") or "{}")
        file_b64 = body.get("file")
        content_type = body.get("contentType", "image/jpeg")
        ext = content_type.split("/")[-1].replace("jpeg", "jpg")
        key = f"products/{uuid.uuid4()}.{ext}"

        s3 = boto3.client(
            "s3",
            endpoint_url="https://bucket.poehali.dev",
            aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        )
        s3.put_object(
            Bucket="files",
            Key=key,
            Body=base64.b64decode(file_b64),
            ContentType=content_type,
        )
        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        return {
            "statusCode": 200,
            "headers": {**cors_headers(), "Content-Type": "application/json"},
            "body": json.dumps({"url": cdn_url}),
        }

    conn = get_conn()
    cur = conn.cursor()

    # --- СПИСОК ТОВАРОВ ---
    if method == "GET":
        cur.execute(
            f"SELECT id, name, category, description, gost, badge, base_price, image_url, is_active, sort_order "
            f"FROM {SCHEMA}.products ORDER BY sort_order, id"
        )
        rows = cur.fetchall()
        cols = ["id", "name", "category", "description", "gost", "badge", "base_price", "image_url", "is_active", "sort_order"]
        products = [dict(zip(cols, row)) for row in rows]
        conn.close()
        return {
            "statusCode": 200,
            "headers": {**cors_headers(), "Content-Type": "application/json"},
            "body": json.dumps({"products": products}),
        }

    # --- СОЗДАТЬ ТОВАР ---
    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        cur.execute(
            f"""INSERT INTO {SCHEMA}.products (name, category, description, gost, badge, base_price, image_url, is_active, sort_order)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (
                body.get("name", ""),
                body.get("category", ""),
                body.get("description", ""),
                body.get("gost", ""),
                body.get("badge") or None,
                int(body.get("base_price", 0)),
                body.get("image_url") or None,
                bool(body.get("is_active", True)),
                int(body.get("sort_order", 0)),
            ),
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return {
            "statusCode": 201,
            "headers": {**cors_headers(), "Content-Type": "application/json"},
            "body": json.dumps({"id": new_id}),
        }

    # --- ОБНОВИТЬ ТОВАР ---
    if method == "PUT":
        body = json.loads(event.get("body") or "{}")
        cur.execute(
            f"""UPDATE {SCHEMA}.products
                SET name=%s, category=%s, description=%s, gost=%s, badge=%s,
                    base_price=%s, image_url=%s, is_active=%s, sort_order=%s, updated_at=NOW()
                WHERE id=%s""",
            (
                body.get("name", ""),
                body.get("category", ""),
                body.get("description", ""),
                body.get("gost", ""),
                body.get("badge") or None,
                int(body.get("base_price", 0)),
                body.get("image_url") or None,
                bool(body.get("is_active", True)),
                int(body.get("sort_order", 0)),
                int(body["id"]),
            ),
        )
        conn.commit()
        conn.close()
        return {
            "statusCode": 200,
            "headers": {**cors_headers(), "Content-Type": "application/json"},
            "body": json.dumps({"ok": True}),
        }

    # --- УДАЛИТЬ ТОВАР ---
    if method == "DELETE":
        params = event.get("queryStringParameters") or {}
        product_id = int(params.get("id", 0))
        cur.execute(f"DELETE FROM {SCHEMA}.products WHERE id=%s", (product_id,))
        conn.commit()
        conn.close()
        return {
            "statusCode": 200,
            "headers": {**cors_headers(), "Content-Type": "application/json"},
            "body": json.dumps({"ok": True}),
        }

    conn.close()
    return {"statusCode": 405, "headers": cors_headers(), "body": "Method Not Allowed"}
