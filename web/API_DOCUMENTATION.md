# API Documentation

## 1. Generate LLMs Text API
**Endpoint:** `GET /api/generateLLMsTxt`
**Receives:** URL parameter (`?url=https://example.com/conference`)
**Does:** Scrapes conference content and saves to database
**Output:**
```json
{
  "success": true,
  "data": {
    "conferenceId": "conf_1758319371820_k1keqzjik",
    "contentLength": 15420,
    "url": "https://example.com/conference"
  }
}
```

## 2. Conference Data API
**Endpoint:** `GET /api/conference/[conferenceId]`
**Receives:** Conference ID in URL path
**Does:** Retrieves conference data from database
**Output:**
```json
{
  "success": true,
  "data": {
    "conferenceId": "conf_1758319371820_k1keqzjik",
    "url": "https://example.com/conference",
    "markdownContent": "# Conference Schedule\n\n## Day 1...",
    "createdAt": "2024-01-20T10:30:00Z"
  }
}
```

## 3. Personalized Schedule API
**Endpoint:** `POST /api/schedule`
**Receives:** JSON body with `conferenceId` and `userProfile` (string)
**Does:** Generates personalized schedule using OpenAI GPT-5
**Output:**
```json
{
  "success": true,
  "schedule": "9:00 AM - AI/ML Workshop\n10:30 AM - React Best Practices"
}
```
