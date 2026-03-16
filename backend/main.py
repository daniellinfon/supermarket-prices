from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Query, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import aiohttp
import ssl
from urllib.parse import urlparse

from database import init_db, save_products, get_history, add_favorite, remove_favorite, get_favorites
from fastapi import Header
from scrapers.mercadona import search_mercadona
from scrapers.alcampo import search_alcampo
from scrapers.dia import search_dia

app = FastAPI(title="Supermarket Prices API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SSL_CONTEXT = ssl.create_default_context()
SSL_CONTEXT.check_hostname = False
SSL_CONTEXT.verify_mode = ssl.CERT_NONE

@app.on_event("startup")
async def startup():
    await init_db()

SCRAPER_MAP = {
    "mercadona": search_mercadona,
    "alcampo": search_alcampo,
    "dia": search_dia,
}

@app.get("/search")
async def search(q: str = Query(...), supermarkets: str = Query("mercadona,alcampo,dia"), request_device_id: str = Header(None, alias="x-device-id")):
    if not q.strip():
        raise HTTPException(400, "El parámetro q no puede estar vacío")
    selected = [s.strip().lower() for s in supermarkets.split(",")]
    tasks = [SCRAPER_MAP[s](q) for s in selected if s in SCRAPER_MAP]
    labels = [s for s in selected if s in SCRAPER_MAP]
    if not tasks:
        raise HTTPException(400, "Ningún supermercado válido")

    results_list = await asyncio.gather(*tasks, return_exceptions=True)
    all_results = []
    errors = []
    for label, res in zip(labels, results_list):
        if isinstance(res, Exception):
            errors.append({"supermarket": label, "error": str(res)})
        elif res:
            all_results.extend(res)

    if all_results:
        await save_products(all_results)

    # Marcar favoritos
    device_id = request_device_id or "default"
    favs = await get_favorites(device_id)
    fav_keys = {(f["name"], f["supermarket"]): f["id"] for f in favs}
    for item in all_results:
        item["favorite_id"] = fav_keys.get((item["name"], item["supermarket"]))

    grouped = {}
    for item in all_results:
        grouped.setdefault(item["supermarket"], []).append(item)

    return {"query": q, "total": len(all_results), "results": grouped, "errors": errors}

@app.get("/history")
async def history(q: str = Query(...)):
    return {"query": q, "history": await get_history(q)}

@app.get("/supermarkets")
async def get_supermarkets():
    return {"supermarkets": [
        {"id": "mercadona", "name": "Mercadona", "color": "#00A651"},
        {"id": "alcampo",   "name": "Alcampo",   "color": "#0072CE"},
        {"id": "dia",       "name": "Dia",        "color": "#E2001A"},
    ]}

# ── Favoritos ──────────────────────────────────────────────

class FavoriteIn(BaseModel):
    supermarket: str
    name: str
    price: float | None = None
    price_per_unit: str = ""
    description: str = ""
    image_url: str = ""
    product_url: str = ""

@app.get("/favorites")
async def list_favorites(device_id: str = Header(None, alias="x-device-id")):
    favs = await get_favorites(device_id or "default")
    return {"favorites": favs}

@app.post("/favorites")
async def create_favorite(product: FavoriteIn, device_id: str = Header(None, alias="x-device-id")):
    result = await add_favorite(product.model_dump(), device_id or "default")
    return result

@app.delete("/favorites/{favorite_id}")
async def delete_favorite(favorite_id: int, device_id: str = Header(None, alias="x-device-id")):
    await remove_favorite(favorite_id, device_id or "default")
    return {"deleted": favorite_id}

# ── Image proxy ───────────────────────────────────────────

ALLOWED_DOMAINS = [
    "prod-mercadona.imgix.net", "tienda.mercadona.es",
    "compraonline.alcampo.es", "www.compraonline.alcampo.es",
    "www.dia.es", "dia.es",
]

@app.get("/image-proxy")
async def image_proxy(url: str = Query(...)):
    parsed = urlparse(url)
    if not any(parsed.netloc.endswith(d) for d in ALLOWED_DOMAINS):
        raise HTTPException(400, "Dominio no permitido")
    try:
        connector = aiohttp.TCPConnector(ssl=SSL_CONTEXT)
        async with aiohttp.ClientSession(connector=connector) as session:
            headers = {"User-Agent": "Mozilla/5.0", "Referer": f"{parsed.scheme}://{parsed.netloc}/"}
            async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status != 200:
                    raise HTTPException(404, "Imagen no encontrada")
                content = await resp.read()
                ct = resp.headers.get("Content-Type", "image/jpeg")
                return Response(content=content, media_type=ct, headers={"Cache-Control": "public, max-age=86400"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))
