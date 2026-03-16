import aiohttp
import ssl

SSL_CONTEXT = ssl.create_default_context()
SSL_CONTEXT.check_hostname = False
SSL_CONTEXT.verify_mode = ssl.CERT_NONE

DIA_BASE = "https://www.dia.es"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "es-ES,es;q=0.9",
    "Referer": "https://www.dia.es/",
}

UNIT_LABELS = {
    "KILO": "kg",
    "LITRE": "l",
    "UNIT": "ud",
    "100ML": "100ml",
    "100G": "100g",
}

def fix_image(url: str) -> str:
    if not url:
        return ""
    return url if url.startswith("http") else DIA_BASE + url

def build_price_per_unit(prices: dict) -> str:
    ppu = prices.get("price_per_unit")
    unit = prices.get("measure_unit", "")
    unit_label = UNIT_LABELS.get(unit, unit.lower() if unit else "")
    if ppu and unit_label:
        return f"{float(ppu):.2f} €/{unit_label}".replace(".", ",")
    return ""

async def search_dia(query: str) -> list[dict]:
    connector = aiohttp.TCPConnector(ssl=SSL_CONTEXT)
    async with aiohttp.ClientSession(connector=connector) as session:
        url = f"{DIA_BASE}/api/v1/search-back/search/reduced?q={query}&page=1"
        try:
            async with session.get(url, headers=HEADERS, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status == 200:
                    data = await resp.json(content_type=None)
                    products = data.get("search_items", []) if isinstance(data, dict) else data

                    results = []
                    for item in products:
                        if not isinstance(item, dict):
                            continue
                        name = item.get("display_name") or item.get("name") or ""
                        if not name:
                            continue

                        prices = item.get("prices", {})
                        price = None
                        price_per_unit = ""
                        is_offer = False
                        if isinstance(prices, dict):
                            try:
                                price = float(prices.get("price") or 0) or None
                            except Exception:
                                pass
                            price_per_unit = build_price_per_unit(prices)
                            try:
                                sp = prices.get("strikethrough_price")
                                is_offer = bool(sp and float(sp) != float(prices.get("price") or 0))
                            except Exception:
                                pass

                        img = item.get("image") or ""
                        if isinstance(img, dict):
                            img = img.get("url") or img.get("src") or ""

                        product_url = item.get("url") or ""
                        if product_url and not product_url.startswith("http"):
                            product_url = DIA_BASE + product_url

                        results.append({
                            "supermarket": "Dia",
                            "name": name,
                            "price": price,
                            "price_per_unit": price_per_unit,
                            "description": "",
                            "is_offer": is_offer,
                            "image_url": fix_image(img),
                            "product_url": product_url or f"{DIA_BASE}/search?q={query}",
                            "query": query,
                        })

                    print(f"[Dia] {len(results)} productos:")
                    for r in results:
                        price_str = f"{r['price']:.2f}€" if r['price'] else "sin precio"
                        unit_str = f" ({r['price_per_unit']})" if r['price_per_unit'] else ""
                        print(f"  • {r['name']} — {price_str}{unit_str}")
                    return results
        except Exception as e:
            print(f"[Dia] Error: {e}")
    return []