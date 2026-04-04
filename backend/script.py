import requests
import re
import json
from concurrent.futures import ThreadPoolExecutor

BASE = "https://hqporner.com"

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}

video_pattern = re.compile(
    r'/hdporn/(\d+)-[^"]+\.html".*?alt="([^"]+)".*?src="([^"]+)',
    re.S
)

def scrape_page(page):

    if page == 1:
        url = BASE + "/?q=hqporm"
    else:
        url = BASE + f"/?q=hqporm&page={page}"

    html = requests.get(url, headers=HEADERS, timeout=10).text

    videos = []

    for vid_id, title, thumb in video_pattern.findall(html):

        if thumb.startswith("//"):
            thumb = "https:" + thumb

        videos.append({
            "id": vid_id,
            "title": title,
            "page": f"{BASE}/hdporn/{vid_id}-{title.replace(' ', '_')}.html",
            "thumbnail": thumb
        })

    return videos


def scrape_many():

    pages = range(1, 11)  # ~500 videos

    videos = []

    with ThreadPoolExecutor(max_workers=10) as pool:
        results = pool.map(scrape_page, pages)

    for r in results:
        videos.extend(r)

    return videos


if __name__ == "__main__":

    videos = scrape_many()

    print(json.dumps(videos))