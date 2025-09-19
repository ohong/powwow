# Session Prep Research – Testing Notes

## Prerequisites

1. Create the **Conference Session Prep** pipeline in Airia (see `specs/airia-session-prep.md`) and copy its pipeline ID.
2. Update `web/.env` with:
   ```
   AIRIA_SESSION_PREP_PIPELINE_ID=<your-pipeline-id>
   REDIS_URL=redis://localhost:6379
   BRIGHT_DATA_DATASET_ID=gd_l1viktl72bvl7bjuj0
   ```
3. Ensure Redis is running locally and that the API keys in `.env` are valid.
4. Install dependencies and run the Next.js dev server:
   ```bash
   cd web
   npm install
   npm run dev
   ```

## Manual Verifications

| Scenario | Steps | Expected |
| --- | --- | --- |
| Generate prep for example session | 1. Visit `http://localhost:3000`.<br>2. Keep Session ID `933474`.<br>3. Click **Generate prep**. | UI shows session overview, brief sections, sources, and research traces. API response contains `result.session.sessionId === "933474"`. |
| Cache hit | 1. Run the scenario above twice.<br>2. Observe the “Research cache” badge. | Second request should show `cache:hit` in the UI and response payload. |
| Force refresh | 1. Check **Force refresh**.<br>2. Generate prep again. | Response should recompute research; UI badge reads `cache:miss`. |
| Invalid session ID | 1. Enter a bogus ID (e.g., `999`).<br>2. Submit. | API returns 500 with helpful message (`Session ... not found`). UI displays error banner. |
| Airia failure handling | Temporarily blank out `AIRIA_SESSION_PREP_PIPELINE_ID` and submit. | API responds with clear error message and UI surfaces it. |

## curl Helper

```bash
curl -X POST http://localhost:3000/api/research/session-prep \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "933474",
    "forceRefresh": true
  }'
```

The response structure mirrors the UI expectations:

```json
{
  "result": {
    "session": { "sessionId": "933474", ... },
    "brief": { "session_summary": { ... } },
    "research": {
      "conferenceContext": "...",
      "companyResearch": [ ... ],
      "topicResearch": [ ... ],
      "speakerResearch": [ ... ],
      "relatedLinks": [ ... ],
      "cacheInfo": "cache:miss"
    },
    "generatedAt": "2025-02-15T18:42:11.123Z"
  }
}
```

## Follow-up

- Replace the Bright Data placeholder with live LinkedIn enrichment once ready.
- Expand automated tests using mocked fetches (Serper, Apify, Airia) via `vitest` or similar before productionizing.
