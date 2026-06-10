# Clients

Per-client folders. **This directory should be gitignored** (or moved to a private repo) once it contains real client data — training data, transcripts, contact info, etc.

## Recommended layout

```
clients/
└── [client-name]/
    ├── overview.md          # contact, contract, pricing, vertical
    ├── training-data.md     # services, pricing, FAQs, qualification criteria
    ├── ai-prompt.md         # the actual prompt powering their AI
    ├── transcripts/         # interesting conversation samples (good and bad)
    └── metrics.md           # response time, qualification %, bookings, revenue
```

## Gitignore reminder

Add to `.gitignore` before the first real client:

```
clients/*
!clients/README.md
```
