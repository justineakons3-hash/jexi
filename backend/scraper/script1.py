import requests
import re
import json
from concurrent.futures import ThreadPoolExecutor

BASE = "https://hqporner.com"

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}

# video cards on listing pages
video_pattern = re.compile(
    r'/hdporn/(\d+)-([^"]+)\.html".*?alt="([^"]+)".*?src="([^"]+)',
    re.S
)


def extract_metadata(page_url):

    try:
        html = requests.get(page_url, headers=HEADERS, timeout=10).text

        duration = None
        pornstar = None
        category = None
        views = None

        # duration extraction
        d = re.search(r'Video duration is ([^\.]+)', html)
        if d:
            raw_duration = d.group(1).strip()

            # convert "34min 52sec" → "34:52"
            m = re.search(r'(\d+)min\s*(\d+)sec', raw_duration)
            if m:
                duration = f"{m.group(1)}:{m.group(2)}"

        # pornstar
        p = re.search(r'/pornstar/[^"]+">([^<]+)', html)
        if p:
            pornstar = p.group(1).strip()

        # category (from tags)
        tag_match = re.search(r'Tags related to this video: ([^"]+)', html)
        if tag_match:
            category = tag_match.group(1).split(",")[0].strip()

        return duration, views, pornstar, category

    except:
        return None, None, None, None


def scrape_page(page):

    if page == 1:
        url = BASE
    else:
        url = f"{BASE}/?page={page}"

    html = requests.get(url, headers=HEADERS, timeout=10).text

    videos = []
    seen = set()

    for vid_id, slug, title, thumb in video_pattern.findall(html):

        if vid_id in seen:
            continue
        seen.add(vid_id)

        if thumb.startswith("//"):
            thumb = "https:" + thumb

        page_url = f"{BASE}/hdporn/{vid_id}-{slug}.html"

        duration, views, pornstar, category = extract_metadata(page_url)

        videos.append({
            "id": vid_id,
            "title": title,
            "page": page_url,
            "thumbnail": thumb,
            "duration": duration,
            "views": views,
            "pornstar": pornstar,
            "category": category
        })

    return videos


def scrape_many():

    pages = range(1, 15)   # adjust for more videos

    videos = []

    with ThreadPoolExecutor(max_workers=10) as pool:
        results = pool.map(scrape_page, pages)

    for r in results:
        videos.extend(r)

    return videos


if __name__ == "__main__":

    videos = scrape_many()

    print(json.dumps(videos))