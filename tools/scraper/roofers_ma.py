"""Scrape roofing contractors across Massachusetts via the Google Places API (New).

Extracts, per business: company name, city, phone, website, number of Google reviews.

Uses the same GOOGLE_MAPS_API_KEY as scraper.py. Unlike scraper.py (which hunts for
businesses WITHOUT a website), this keeps every roofer and records its website as a
field — it's a prospect list, not a no-website filter.

Usage:
    cp .env.example .env        # GOOGLE_MAPS_API_KEY=...  (Places API New enabled)
    pip install -r requirements.txt
    python roofers_ma.py
    python roofers_ma.py --towns Worcester Springfield Cambridge
    python roofers_ma.py --categories "roofing contractor" "roof repair" "metal roofing"
    python roofers_ma.py --min-reviews 5     # drop listings with few/no reviews
    python roofers_ma.py --limit 3           # quick test: only run 3 queries
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
    "places.addressComponents",
    "places.formattedAddress",
    "places.nationalPhoneNumber",
    "places.websiteUri",
    "places.rating",
    "places.userRatingCount",
    "places.googleMapsUri",
    "places.businessStatus",
    "nextPageToken",
])

CATEGORIES = ["roofing contractor"]

# A broad spread of MA cities/towns across every region (Greater Boston, North & South
# Shore, Merrimack Valley, MetroWest, Central, Western MA, Cape Cod). Roofers serve wide
# areas, so many of these queries surface the same companies — de-duping by place_id
# turns that overlap into solid statewide coverage rather than noise.
TOWNS = [
    # Greater Boston
    "Boston", "Cambridge", "Somerville", "Newton", "Quincy", "Brookline",
    "Medford", "Malden", "Waltham", "Everett", "Revere", "Arlington",
    "Watertown", "Belmont", "Braintree", "Weymouth", "Needham", "Dedham", "Milton",
    # North Shore / Merrimack Valley
    "Lynn", "Salem", "Peabody", "Beverly", "Gloucester", "Lawrence",
    "Haverhill", "Methuen", "Andover", "Woburn", "Danvers", "Saugus",
    # South Shore / Southeast
    "Brockton", "Plymouth", "Taunton", "Randolph", "Stoughton",
    "New Bedford", "Fall River", "Dartmouth", "Attleboro", "Franklin",
    # MetroWest
    "Framingham", "Natick", "Marlborough", "Milford", "Wellesley",
    "Shrewsbury", "Westborough",
    # Central MA
    "Worcester", "Leominster", "Fitchburg", "Gardner", "Auburn",
    # Western MA
    "Springfield", "Chicopee", "Holyoke", "Westfield", "West Springfield",
    "Agawam", "Pittsfield", "Northampton", "Amherst", "Greenfield",
    # Cape Cod
    "Barnstable", "Falmouth", "Sandwich", "Bourne",
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


def extract_city(place: dict, fallback: str) -> str:
    """Pull the business's real city from address components, with sensible fallbacks."""
    comps = place.get("addressComponents", [])
    for wanted in ("locality", "postal_town", "administrative_area_level_3"):
        for comp in comps:
            if wanted in comp.get("types", []):
                return comp.get("longText") or comp.get("shortText") or fallback
    return fallback


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--out", default="data/roofers_ma.csv", help="Output CSV path")
    parser.add_argument("--state", default="MA")
    parser.add_argument("--towns", nargs="*", default=TOWNS)
    parser.add_argument("--categories", nargs="*", default=CATEGORIES)
    parser.add_argument("--min-reviews", type=int, default=0,
                        help="Drop listings with fewer than N reviews (0 = keep all)")
    parser.add_argument("--limit", type=int, default=0,
                        help="Stop after N (category, town) queries (0 = no limit)")
    args = parser.parse_args()

    if not API_KEY:
        print("ERROR: GOOGLE_MAPS_API_KEY env var not set. Copy .env.example to .env.", file=sys.stderr)
        return 1

    seen: set[str] = set()
    leads: list[dict] = []
    queries_run = 0
    total_queries = len(args.categories) * len(args.towns)
    if args.limit:
        total_queries = min(total_queries, args.limit)

    for cat in args.categories:
        for town in args.towns:
            if args.limit and queries_run >= args.limit:
                break
            queries_run += 1
            query = f"{cat} in {town}, {args.state}"
            print(f"[{queries_run}/{total_queries}] {query}")
            try:
                for place in iter_results(query):
                    pid = place.get("id")
                    if not pid or pid in seen:
                        continue
                    seen.add(pid)
                    if place.get("businessStatus", "OPERATIONAL") != "OPERATIONAL":
                        continue
                    if (place.get("userRatingCount") or 0) < args.min_reviews:
                        continue
                    leads.append({
                        "name": (place.get("displayName") or {}).get("text", ""),
                        "city": extract_city(place, town),
                        "phone": place.get("nationalPhoneNumber", ""),
                        "website": place.get("websiteUri", ""),
                        "reviews": place.get("userRatingCount", ""),
                    })
            except httpx.HTTPStatusError as e:
                print(f"  ! HTTP {e.response.status_code}: {e.response.text[:300]}", file=sys.stderr)
            except Exception as e:
                print(f"  ! {e}", file=sys.stderr)
        if args.limit and queries_run >= args.limit:
            break

    leads.sort(key=lambda r: (-(r["reviews"] or 0), r["name"]))

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fields = ["name", "city", "phone", "website", "reviews"]
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(leads)

    print(f"\nDone. {len(leads)} roofers written to {out_path}")
    print(f"Unique businesses inspected: {len(seen)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
