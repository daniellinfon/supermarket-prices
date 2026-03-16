import aiohttp
import ssl

SSL_CONTEXT = ssl.create_default_context()
SSL_CONTEXT.check_hostname = False
SSL_CONTEXT.verify_mode = ssl.CERT_NONE

ALGOLIA_URL = "https://7uzjkl1dj0-dsn.algolia.net/1/indexes/products_prod_vlc1_es/query"
ALGOLIA_HEADERS = {
    "X-Algolia-Application-Id": "7UZJKL1DJ0",
    "X-Algolia-API-Key": "9d8f2e39e90df472b4f2e559a116fe17",
    "Content-Type": "application/json",
}

async def search_mercadona(query: str) -> list[dict]:
    try:
        connector = aiohttp.TCPConnector(ssl=SSL_CONTEXT)
        async with aiohttp.ClientSession(connector=connector) as session:
            payload = {
                "query": query,
                "hitsPerPage": 20,
                "attributesToRetrieve": ["display_name", "price_instructions", "thumbnail", "share_url", "photos"]
            }
            async with session.post(ALGOLIA_URL, headers=ALGOLIA_HEADERS, json=payload, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    hits = data.get("hits", [])

                    # Debug del primer producto
                    if hits:
                        pi = hits[0].get("price_instructions", {})
                        print(f"[Mercadona] price_instructions keys: {list(pi.keys())}")
                        print(f"[Mercadona] unit_name={pi.get('unit_name')} unit_size={pi.get('unit_size')} reference_format={pi.get('reference_format')}")

                    results = []
                    for hit in hits:
                        price_info = hit.get("price_instructions", {})
                        price = price_info.get("unit_price") or price_info.get("bulk_price")
                        price_per_unit = _build_price_per_unit(price_info)

                        img = hit.get("thumbnail", "")
                        if not img:
                            photos = hit.get("photos", [])
                            if photos:
                                img = photos[0].get("zoom", "") or photos[0].get("regular", "")

                        results.append({
                            "supermarket": "Mercadona",
                            "name": hit.get("display_name", ""),
                            "price": float(price) if price else None,
                            "price_per_unit": price_per_unit,
                            "description": _build_description(price_info),
                            "image_url": img,
                            "product_url": hit.get("share_url", "https://tienda.mercadona.es"),
                            "is_offer": bool(price_info.get("price_decreased")),
                            "query": query,
                        })

                    print(f"[Mercadona] {len(results)} productos:")
                    for r in results:
                        price_str = f"{r['price']:.2f}€" if r['price'] else "sin precio"
                        unit_str = f" ({r['price_per_unit']})" if r['price_per_unit'] else ""
                        print(f"  • {r['name']} — {price_str}{unit_str}")
                    return results
    except Exception as e:
        print(f"[Mercadona] Error: {e}")
    return []


def _build_price_per_unit(pi: dict) -> str:
    # Usar reference_price + size_format (ej: "6,20 €/kg")
    ref_price = pi.get("reference_price")
    size_format = str(pi.get("size_format", "") or "").strip()

    if ref_price is not None and size_format:
        try:
            price_str = f"{float(ref_price):.2f}".replace(".", ",")
            return f"{price_str} \u20ac/{size_format}"
        except Exception:
            pass

    # Fallback: reference_format si ya tiene €
    ref_fmt = str(pi.get("reference_format", "") or "").strip()
    if ref_fmt and "\u20ac" in ref_fmt:
        return ref_fmt

    return ""

def _build_description(pi: dict) -> str:
    """Construye descripción del formato/cantidad del producto (ej: 12 uds, 500 g)."""
    unit_size = pi.get("unit_size")
    size_format = str(pi.get("size_format", "") or "").strip()
    if unit_size is None:
        return ""
    try:
        unit_size = float(unit_size)
    except Exception:
        return ""
    if size_format == "kg":
        return f"{int(unit_size * 1000)} g" if unit_size < 1 else f"{unit_size:g} kg"
    elif size_format == "l":
        return f"{int(unit_size * 1000)} ml" if unit_size < 1 else f"{unit_size:g} l"
    elif size_format == "ud":
        return f"{int(unit_size)} uds" if unit_size > 1 else ""
    elif size_format in ("g", "ml"):
        return f"{unit_size:g} {size_format}"
    elif unit_size > 0 and size_format:
        return f"{unit_size:g} {size_format}".strip()
    return ""