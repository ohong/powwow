# Airia Session Prep Pipeline

These notes describe the pipeline we will use in Airia to turn our collected research into a 5-minute preparation brief.

## High-level Flow

1. The Next.js backend gathers all external context (session metadata, conference overview, company research via Serper/Apify, speaker profile, etc.).
2. We call Airia with a single pipeline whose job is to turn that structured context into the final coaching brief.
3. Airia returns a JSON payload we normalize for the demo UI.

Because we already orchestrate the research from code, the Airia side can stay focused on prompt engineering and formatting. This keeps the pipeline stable while we iterate on data-fetch logic independently.

## Pipeline Setup (Airia UI)

- **Name**: `Conference Session Prep`
- **Execution name**: `session_prep_brief`
- **Model**: GPT-4o (or the strongest model available to your account).
- **Steps**: single LLM step titled `ComposePrepBrief`.
- **Prompt type**: system prompt with structured variables.
- **Output**: JSON-formatted string (we’ll parse it server-side).

### Prompt Variables

Define the following prompt variables so we can pass each ingredient explicitly:

| Variable | Description |
| --- | --- |
| `session_outline` | Raw object describing the specific session (title, abstract, room, time, track). |
| `conference_context` | High-level info about the conference (audience, major tracks, tone). |
| `company_research` | Bulleted or paragraph summary of the speaker’s company. |
| `topic_research` | Key insights about the session’s technical topic. |
| `speaker_profile` | Summary of the speaker’s background, goals, and recent activity. |
| `related_links` | Array of source URLs the research pulled from. |
| `redis_cache_state` | Optional note about whether data came from cache (helps with debugging). |

### System Prompt Template

```
You are the research coach helping an attendee prepare minutes before a conference session.

Use the structured JSON variables supplied in this pipeline:
- Session Outline: {{session_outline}}
- Conference Context: {{conference_context}}
- Company Research: {{company_research}}
- Topic Research: {{topic_research}}
- Speaker Profile: {{speaker_profile}}
- Related Links: {{related_links}}
- Cache Info: {{redis_cache_state}}

Return a UTF-8 JSON object with the exact schema below (no markdown, no commentary outside JSON):
{
  "session_summary": { "headline": string, "why_it_matters": string, "attendee_fit": string },
  "key_takeaways": [ string, string, string ],
  "company_brief": { "positioning": string, "recent_moves": string, "competitive_angle": string },
  "speaker_brief": { "bio": string, "conference_goal": string, "conversation_starter": string },
  "smart_questions": [ string, string, string ],
  "sources": [ { "title": string, "url": string } ]
}

Guidelines:
- Keep every field under 700 characters.
- When data is missing, write concise best-effort guidance and note the gap (e.g., "Speaker profile not found; suggest asking about ...").
- Tailor tone for a technical attendee with only a few minutes to prep.
- Leverage conference context to set expectations (size of audience, track tone, etc.).
```

Set “Expect JSON” / “Strict JSON” if the UI provides such an option.

### Input Mapping

Configure the step so each prompt variable is filled from the pipeline request’s `promptVariables`. We will POST something like:

```json
{
  "promptVariables": {
    "session_outline": "{...}",
    "conference_context": "{...}",
    "company_research": "...",
    "topic_research": "...",
    "speaker_profile": "...",
    "related_links": "[...]",
    "redis_cache_state": "cache:miss"
  },
  "userInput": "Generate conference prep brief"
}
```

No conversation history is required. Leave voice/streaming disabled.

## Testing Checklist

1. Use the “Test” feature in Airia UI and paste the sample variables from our local runs.
2. Confirm the response is valid JSON and matches the schema.
3. Export the pipeline definition (optional) so we can version it if needed: `GET /v1/PipelinesConfig/export/{id}`.
4. Share the pipeline ID so we can reference it from our Next.js API route.

Once this is ready, drop the pipeline ID into our `.env` as `AIRIA_SESSION_PREP_PIPELINE_ID`.
