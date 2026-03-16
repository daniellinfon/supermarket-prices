import aiosqlite
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "products.db")

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                supermarket TEXT NOT NULL,
                name TEXT NOT NULL,
                price REAL,
                price_per_unit TEXT,
                image_url TEXT,
                product_url TEXT,
                query TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL DEFAULT 'default',
                supermarket TEXT NOT NULL,
                name TEXT NOT NULL,
                price REAL,
                price_per_unit TEXT,
                description TEXT,
                image_url TEXT,
                product_url TEXT,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Migración: añadir device_id si no existe
        try:
            await db.execute("ALTER TABLE favorites ADD COLUMN device_id TEXT NOT NULL DEFAULT 'default'")
            await db.commit()
        except Exception:
            pass
        await db.commit()

async def save_products(products: list[dict]):
    async with aiosqlite.connect(DB_PATH) as db:
        for p in products:
            await db.execute("""
                INSERT INTO products (supermarket, name, price, price_per_unit, image_url, product_url, query)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (p["supermarket"], p["name"], p.get("price"), p.get("price_per_unit", ""),
                  p.get("image_url", ""), p.get("product_url", ""), p["query"]))
        await db.commit()

async def get_history(query: str) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT * FROM products WHERE query LIKE ? ORDER BY created_at DESC LIMIT 50
        """, (f"%{query}%",)) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

async def add_favorite(product: dict, device_id: str) -> dict:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT id FROM favorites WHERE name = ? AND supermarket = ? AND device_id = ?",
            (product["name"], product["supermarket"], device_id)
        ) as cursor:
            existing = await cursor.fetchone()
        if existing:
            return {"id": existing[0], "already_exists": True}
        cursor = await db.execute("""
            INSERT INTO favorites (device_id, supermarket, name, price, price_per_unit, description, image_url, product_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            device_id, product["supermarket"], product["name"], product.get("price"),
            product.get("price_per_unit", ""), product.get("description", ""),
            product.get("image_url", ""), product.get("product_url", "")
        ))
        await db.commit()
        return {"id": cursor.lastrowid, "already_exists": False}

async def remove_favorite(favorite_id: int, device_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM favorites WHERE id = ? AND device_id = ?", (favorite_id, device_id))
        await db.commit()

async def get_favorites(device_id: str) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM favorites WHERE device_id = ? ORDER BY added_at DESC",
            (device_id,)
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
