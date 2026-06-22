"""Find home-service businesses across Massachusetts that have no real website.

These are the ideal targets for selling a website: owner-operated trades that live
on a Google listing + a phone number. We surface businesses with NO website, AND
those whose only "website" is a social page (Facebook/Instagram) or a Google freebie
(*.business.site, sites.google.com) — those still need a real site, so they're prospects
too. Each such row is flagged in the `web_presence` column.

Built on the same Google Places API (New) plumbing as scraper.py / roofers_ma.py and
the same GOOGLE_MAPS_API_KEY.

Usage:
    cp .env.example .env        # GOOGLE_MAPS_API_KEY=...  (Places API New enabled)
    pip install -r requirements.txt
    python home_services_ma.py
    python home_services_ma.py --limit 3                      # quick smoke test (3 queries)
    python home_services_ma.py --towns Boston Cambridge Quincy
    python home_services_ma.py --categories plumber electrician "hvac contractor"
    python home_services_ma.py --min-reviews 3               # require some traction
    python home_services_ma.py --include-social-as-prospect false  # only TRUE no-website
"""
import os
import sys
import csv
import time
import argparse
from pathlib import Path
from typing import Iterator
from urllib.parse import urlparse

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
    "places.types",
    "places.primaryType",
    "places.rating",
    "places.userRatingCount",
    "places.googleMapsUri",
    "places.businessStatus",
    "nextPageToken",
])

# Home-service trades — owner-operated businesses that come to the home. These skew
# heavily toward "no website, just a Google listing + a cell phone", which is exactly
# who we want to sell a website to.
CATEGORIES = [
    "plumber", "electrician", "hvac contractor", "heating and cooling",
    "roofing contractor", "siding contractor", "gutter installation",
    "painter", "house painter", "drywall contractor", "plasterer",
    "general contractor", "home remodeling", "kitchen remodeling", "bathroom remodeling",
    "handyman", "carpenter", "finish carpentry",
    "flooring contractor", "hardwood floor refinishing", "tile contractor",
    "window installation", "door installation",
    "landscaper", "lawn care service", "tree service", "tree removal",
    "snow removal", "irrigation",
    "masonry contractor", "concrete contractor", "paving contractor", "asphalt driveway",
    "fence contractor", "deck builder",
    "house cleaning service", "maid service", "carpet cleaning",
    "pressure washing", "window cleaning",
    "pest control", "exterminator",
    "garage door repair", "appliance repair",
    "chimney sweep", "waterproofing contractor", "basement remodeling",
    "insulation contractor", "excavation contractor", "demolition contractor",
    "septic service", "junk removal", "dumpster rental",
    "pool service", "pool installation",
    "locksmith", "garage builder",
]

# Broad statewide spread (Greater Boston, North/South Shore, Merrimack Valley,
# MetroWest, Central, Western MA, Cape Cod). Trades serve wide areas, so many queries
# surface the same companies — de-duping by place_id turns that overlap into solid
# statewide coverage rather than noise.
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

# A websiteUri on one of these hosts is NOT a real website — the business still needs one.
SOCIAL_OR_FREEBIE_HOSTS = (
    "facebook.com", "m.facebook.com", "instagram.com", "linktr.ee",
    "business.site", "sites.google.com", "yelp.com", "nextdoor.com",
    "google.com",  # Google Business Profile "website" redirects
)


SOCIAL_HOSTS = ("facebook.com", "instagram.com", "linktr.ee", "nextdoor.com")


def classify_web_presence(website: str) -> str:
    """Return '' for a real website (skip as a prospect), or a label if they need one."""
    if not website:
        return "none"
    host = (urlparse(website).hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]
    for bad in SOCIAL_OR_FREEBIE_HOSTS:
        if host == bad or host.endswith("." + bad):
            return "social-only" if bad in SOCIAL_HOSTS else "freebie"
    return ""  # has a real website -> not a prospect


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
    parser.add_argument("--out", default="data/home_services_ma.csv", help="Output CSV path")
    parser.add_argument("--state", default="MA")
    parser.add_argument("--towns", nargs="*", default=TOWNS)
    parser.add_argument("--categories", nargs="*", default=CATEGORIES)
    parser.add_argument("--min-reviews", type=int, default=1,
                        help="Drop listings with fewer than N reviews (filters dead listings)")
    parser.add_argument("--include-social-as-prospect", default="true",
                        choices=["true", "false"],
                        help="Keep social-only / freebie-site businesses as prospects (default true)")
    parser.add_argument("--limit", type=int, default=0,
                        help="Stop after N (category, town) queries (0 = no limit)")
    args = parser.parse_args()

    if not API_KEY:
        print("ERROR: GOOGLE_MAPS_API_KEY env var not set. Copy .env.example to .env.", file=sys.stderr)
        return 1

    include_social = args.include_social_as_prospect == "true"

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
                    presence = classify_web_presence(place.get("websiteUri", ""))
                    if presence == "":
                        continue  # has a real website -> not a prospect
                    if presence in ("social-only", "freebie") and not include_social:
                        continue
                    leads.append({
                        "name": (place.get("displayName") or {}).get("text", ""),
                        "category_query": cat,
                        "city": extract_city(place, town),
                        "web_presence": presence,
                        "current_url": place.get("websiteUri", ""),
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

    # Most reviews first = most established / best able to pay. "none" before "social".
    presence_rank = {"none": 0, "freebie": 1, "social-only": 2}
    leads.sort(key=lambda r: (presence_rank.get(r["web_presence"], 9), -(r["reviews"] or 0), r["name"]))

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fields = ["name", "category_query", "city", "web_presence", "current_url",
              "primary_type", "address", "phone", "rating", "reviews", "maps_url", "place_id"]
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(leads)

    by_presence: dict[str, int] = {}
    for r in leads:
        by_presence[r["web_presence"]] = by_presence.get(r["web_presence"], 0) + 1
    breakdown = ", ".join(f"{k}: {v}" for k, v in sorted(by_presence.items()))

    print(f"\nDone. {len(leads)} prospects written to {out_path}")
    print(f"  Breakdown -> {breakdown or 'none'}")
    print(f"  Unique businesses inspected: {len(seen)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
