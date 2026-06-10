"""Find Boston small businesses without websites via Google Places API (v1).

Usage:
    cp .env.example .env  # add your GOOGLE_MAPS_API_KEY
    pip install -r requirements.txt
    python scraper.py
    python scraper.py --neighborhoods Allston Brighton --categories "barber shop" "nail salon"
    python scraper.py --limit 5  # quick test: only run 5 queries
"""
import os
import sys
import csv
import time
import argparse
from pathlib import Path
from typing import Iterator

import httpx
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY")
ENDPOINT = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = ",".join([
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.nationalPhoneNumber",
    "places.websiteUri",
    "places.types",
    "places.primaryType",
    "places.rating",
    "places.userRatingCount",
    "places.googleMapsUri",
    "places.businessStatus",
    "nextPageToken",
])

# Categories of small businesses most likely to lack a website.
CATEGORIES = [
    "barber shop", "hair salon", "nail salon", "tattoo parlor",
    "auto repair shop", "auto body shop", "locksmith", "tire shop",
    "plumber", "electrician", "hvac contractor", "handyman", "general contractor",
    "landscaper", "lawn care", "tree service", "snow removal",
    "dry cleaner", "tailor", "shoe repair", "alterations",
    "convenience store", "bodega", "corner store", "smoke shop", "vape shop",
    "house cleaning service", "carpet cleaning",
    "bakery", "deli", "pizza shop", "sandwich shop", "diner",
    "ice cream shop", "donut shop", "independent coffee shop",
    "pet groomer", "dog walker", "pet sitter",
    "florist", "framing shop", "print shop", "sign shop",
    "moving company", "junk removal",
    "yoga studio", "martial arts dojo", "dance studio", "boxing gym",
    "daycare", "tutoring center", "music lessons",
    "thrift store", "consignment shop", "vintage clothing store",
    "jeweler", "watch repair",
    "upholstery", "furniture repair",
]

# Boston + immediately adjacent neighborhoods/cities small businesses cluster in.
NEIGHBORHOODS = [
    "Allston", "Brighton", "Back Bay", "Beacon Hill", "North End",
    "South End", "Downtown Boston", "Fenway", "Mission Hill", "Roxbury",
    "Dorchester", "Mattapan", "Roslindale", "West Roxbury", "Hyde Park",
    "Jamaica Plain", "East Boston", "Charlestown", "South Boston",
    "Chinatown Boston",
]


def search_text(query: str, page_token: str | None = None) -> dict:
    body: dict = {"textQuery": query, "pageSize": 20}
    if page_token:
        body["pageToken"] = page_token
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
    }
    last_exc: Exception | None = None
    for attempt in range(5):
        try:
            r = httpx.post(ENDPOINT, json=body, headers=headers, timeout=30)
            if r.status_code >= 500 or r.status_code == 429:
                raise httpx.HTTPStatusError(f"retryable {r.status_code}", request=r.request, response=r)
            r.raise_for_status()
            return r.json()
        except (httpx.TransportError, httpx.HTTPStatusError) as e:
            last_exc = e
            time.sleep(2 ** attempt)  # 1, 2, 4, 8, 16s
    assert last_exc is not None
    raise last_exc


def iter_results(query: str) -> Iterator[dict]:
    token: str | None = None
    for _ in range(3):  # Places API caps Text Search at 3 pages of 20 = 60 results.
        data = search_text(query, token)
        for place in data.get("places", []):
            yield place
        token = data.get("nextPageToken")
        if not token:
            return
        time.sleep(2)  # nextPageToken takes a moment to become valid.


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--out", default="leads.csv", help="Output CSV path")
    parser.add_argument("--city", default="Boston, MA")
    parser.add_argument("--neighborhoods", nargs="*", default=NEIGHBORHOODS)
    parser.add_argument("--categories", nargs="*", default=CATEGORIES)
    parser.add_argument("--min-reviews", type=int, default=5,
                        help="Drop places with fewer than N reviews (filters out abandoned listings)")
    parser.add_argument("--limit", type=int, default=0,
                        help="Stop after N (category, neighborhood) queries (0 = no limit)")
    args = parser.parse_args()

    if not API_KEY:
        print("ERROR: GOOGLE_MAPS_API_KEY env var not set. Copy .env.example to .env.", file=sys.stderr)
        return 1

    seen: set[str] = set()
    leads: list[dict] = []
    queries_run = 0
    total_queries = len(args.categories) * len(args.neighborhoods)
    if args.limit:
        total_queries = min(total_queries, args.limit)

    for cat in args.categories:
        for hood in args.neighborhoods:
            if args.limit and queries_run >= args.limit:
                break
            queries_run += 1
            query = f"{cat} in {hood}, {args.city}"
            print(f"[{queries_run}/{total_queries}] {query}")
            try:
                for place in iter_results(query):
                    pid = place.get("id")
                    if not pid or pid in seen:
                        continue
                    seen.add(pid)
                    if place.get("businessStatus", "OPERATIONAL") != "OPERATIONAL":
                        continue
                    if place.get("websiteUri"):
                        continue
                    if (place.get("userRatingCount") or 0) < args.min_reviews:
                        continue
                    leads.append({
                        "name": (place.get("displayName") or {}).get("text", ""),
                        "category_query": cat,
                        "neighborhood": hood,
                        "primary_type": place.get("primaryType", ""),
                        "address": place.get("formattedAddress", ""),
                        "phone": place.get("nationalPhoneNumber", ""),
                        "rating": place.get("rating", ""),
                        "reviews": place.get("userRatingCount", ""),
                        "maps_url": place.get("googleMapsUri", ""),
                        "place_id": pid,
                    })
            except httpx.HTTPStatusError as e:
                print(f"  ! HTTP {e.response.status_code}: {e.response.text[:300]}", file=sys.stderr)
            except Exception as e:
                print(f"  ! {e}", file=sys.stderr)
        if args.limit and queries_run >= args.limit:
            break

    leads.sort(key=lambda r: (-(r["reviews"] or 0), r["name"]))

    out_path = Path(args.out)
    fields = ["name", "category_query", "neighborhood", "primary_type",
              "address", "phone", "rating", "reviews", "maps_url", "place_id"]
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(leads)

    print(f"\nDone. {len(leads)} leads (no website) written to {out_path}")
    print(f"Unique businesses inspected: {len(seen)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
