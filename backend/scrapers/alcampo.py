import aiohttp
import ssl
import re
import json
import asyncio
from bs4 import BeautifulSoup

SSL_CONTEXT = ssl.create_default_context()
SSL_CONTEXT.check_hostname = False
SSL_CONTEXT.verify_mode = ssl.CERT_NONE

BASE = "https://www.compraonline.alcampo.es"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9",
}


async def _get_product_from_page(session: aiohttp.ClientSession, product_url: str, query: str) -> dict | None:
    """Carga la página de producto y extrae precio e imagen del __INITIAL_STATE__."""
    try:
        async with session.get(product_url, headers=HEADERS, timeout=aiohttp.ClientTimeout(total=15)) as resp:
            if resp.status != 200:
                return None
            html = await resp.text()

        # Extraer __INITIAL_STATE__ del HTML
        match = re.search(r'window\.__INITIAL_STATE__\s*=\s*(\{)', html)
        if not match:
            return None

        # Parsear el JSON con un decoder que se detiene al finalizar el objeto
        try:
            state, _ = json.JSONDecoder().raw_decode(html, match.start(1))
        except Exception:
            return None

        # Extraer datos del producto desde productEntities
        product_entities = state.get("data", {}).get("products", {}).get("productEntities", {})
        if not product_entities:
            return None

        # Tomar el primer producto (solo hay uno en la página de producto)
        product = next(iter(product_entities.values()), None)
        if not product:
            return None

        name = product.get("name", "")
        if not name:
            return None

        # Precio
        price = None
        try:
            price = float(product.get("price", {}).get("current", {}).get("amount", 0)) or None
        except Exception:
            pass

        # Precio por unidad
        price_per_unit = ""
        try:
            unit = product.get("price", {}).get("unit", {})
            amt = unit.get("current", {}).get("amount", "")
            label = unit.get("label", "").replace("fop.price.per.", "")
            if amt:
                price_per_unit = f"{amt}€/{label}"
        except Exception:
            pass

        # Imagen
        img = product.get("image", {}).get("src", "")
        if not img:
            images = product.get("images", [])
            if images:
                img = images[0].get("src", "")

        return {
            "supermarket": "Alcampo",
            "name": name,
            "price": price,
            "price_per_unit": price_per_unit,
            "image_url": img,
            "product_url": product_url,
            "query": query,
        }

    except Exception as e:
        print(f"[Alcampo] Error en {product_url}: {e}")
        return None


async def search_alcampo(query: str) -> list[dict]:
    connector = aiohttp.TCPConnector(ssl=SSL_CONTEXT)
    async with aiohttp.ClientSession(connector=connector) as session:

        # Paso 1: obtener URLs de productos desde JSON-LD de la búsqueda
        search_url = f"{BASE}/search?q={query}"
        product_urls = []
        id_to_url = {}

        try:
            async with session.get(search_url, headers=HEADERS, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status == 200:
                    html = await resp.text()
                    soup = BeautifulSoup(html, "html.parser")
                    for script in soup.find_all("script", type="application/ld+json"):
                        try:
                            data = json.loads(script.string)
                            if data.get("@type") == "ItemList":
                                for item in data.get("itemListElement", [])[:20]:
                                    url = item.get("url", "")
                                    if url and "/products/" in url:
                                        product_urls.append(url)
                        except Exception:
                            continue
            print(f"[Alcampo] {len(product_urls)} productos encontrados en búsqueda")
        except Exception as e:
            print(f"[Alcampo] Error búsqueda: {e}")
            return []

        if not product_urls:
            return []

        # Paso 2: cargar cada página de producto en paralelo (máx 5 simultáneas)
        semaphore = asyncio.Semaphore(5)

        async def fetch_with_sem(url):
            async with semaphore:
                return await _get_product_from_page(session, url, query)

        tasks = [fetch_with_sem(url) for url in product_urls]
        results_raw = await asyncio.gather(*tasks, return_exceptions=True)

        results = []
        for r in results_raw:
            if r and isinstance(r, dict):
                results.append(r)
            elif isinstance(r, Exception):
                pass

        # Fallback para productos sin datos
        if len(results) < len(product_urls):
            fetched_urls = {r["product_url"] for r in results}
            for url in product_urls:
                if url not in fetched_urls:
                    m = re.search(r'/products/([^/]+)/\d+$', url)
                    name = m.group(1).replace("-", " ").title() if m else ""
                    if name:
                        results.append({
                            "supermarket": "Alcampo", "name": name, "price": None,
                            "price_per_unit": "", "image_url": "",
                            "product_url": url, "query": query,
                        })

        print(f"[Alcampo] {len(results)} productos con datos completos")
        return results
