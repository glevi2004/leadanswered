# Sales

Pipeline tracking, prospect lists, call notes. Once we hit ~20 prospects, this should probably move to a proper CRM (Pipedrive, HubSpot, etc.). For now, flat files are fine.

## Structure (when populated)

- `pipeline.csv` — current deals with stage, source, last-touched date
- `prospect-lists/` — raw outreach lists, segmented by vertical and source
- `call-notes/` — date-stamped notes from substantive conversations (skip for unanswered dials)

## Pipeline stages

1. **Prospected** — added to list, no contact yet
2. **Contacted** — first touch made
3. **Engaged** — replied or picked up
4. **Demo booked** — calendar slot confirmed
5. **Demo done** — call happened
6. **Pilot** — paying client in first 30 days
7. **Client** — past 30 days, ongoing
8. **Lost** — explicit no, or 14+ days no response
