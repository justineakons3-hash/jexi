"""
script.py — HQPorner metadata scraper (fast, no browser)

Scrapes title, thumbnail, page URL and duration only.
CDN URL resolution happens on-demand when the user clicks a video
via the POST /videos/resolve backend endpoint.

Dependencies:
    pip install requests beautifulsoup4

Output: JSON array to stdout, consumed by Node.js scrape.js.
"""

import sys
import json
import time
import re
import requests
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE        = "https://hqporner.com"
LIST_PAGES  = range(1, 11)   # 10 pages ≈ 500 videos
MAX_WORKERS = 5
DELAY       = 0.3

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


def get_listing_url(page: int) -> str:
    return BASE + "/" if page == 1 else f"{BASE}/?page={page}"


def scrape_listing_page(page: int) -> list:
    url = get_listing_url(page)
    try:
        res = requests.get(url, headers=HEADERS, timeout=15)
        res.raise_for_status()
    except Exception as e:
        print(f"[page {page}] error: {e}", file=sys.stderr)
        return []

    soup  = BeautifulSoup(res.text, "html.parser")
    links = soup.find_all("a", href=re.compile(r"/hdporn/\d+"))
    seen, items = set(), []

    for link in links:
        href     = link.get("href", "")
        id_match = re.search(r"/hdporn/(\d+)", href)
        if not id_match:
            continue

        vid_id = id_match.group(1)
        if vid_id in seen:
            continue
        seen.add(vid_id)

        page_url  = href if href.startswith("http") else BASE + href
        img       = link.find("img")
        thumbnail = ""

        if img:
            for attr in ("data-src", "data-lazy", "src"):
                val = img.get(attr, "")
                if val and "blank" not in val and not val.startswith("data:"):
                    thumbnail = ("https:" + val) if val.startswith("//") else val
                    break

        title = (img.get("alt", "").strip() if img else "") or link.get_text(strip=True)
        if not title:
            slug  = re.search(r"/hdporn/\d+-(.+?)\.html", href)
            title = slug.group(1).replace("-", " ").title() if slug else f"Video {vid_id}"

        dur_el   = link.find(class_=re.compile(r"duration|time", re.I))
        duration = dur_el.get_text(strip=True) if dur_el else "Unknown"

        # url = page_url for now — resolved to CDN on-demand when user clicks
        items.append({
            "id":        vid_id,
            "title":     title,
            "page":      page_url,
            "url":       page_url,
            "thumbnail": thumbnail,
            "duration":  duration,
            "type":      "hqporner",
            "views":     0,
        })

    print(f"[page {page}] {len(items)} videos", file=sys.stderr)
    return items


def scrape_all() -> list:
    all_videos, seen_ids = [], set()

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(scrape_listing_page, p): p for p in LIST_PAGES}
        for future in as_completed(futures):
            for item in future.result():
                if item["id"] not in seen_ids:
                    seen_ids.add(item["id"])
                    all_videos.append(item)

    print(f"Total: {len(all_videos)} videos", file=sys.stderr)
    return all_videos


if __name__ == "__main__":
    print(json.dumps(scrape_all(), ensure_ascii=False))
