# Powwow: Your AI Conference Companion

Powwow is an AI-powered conference companion that helps attendees navigate large industry events and get the most out of their experience.

## The Problem

Attendees at large conferences face an overwhelming paradox of choice. With dozens, or even hundreds, of concurrent sessions, it's difficult to parse schedules, identify the most relevant talks, and arrive prepared. This often leads to a suboptimal return on investment for conference attendance, both in time and opportunity cost.

## The Solution

Powwow uses a system of specialized AI agents to create a personalized and strategic conference experience. After a quick 30-second onboarding conversation, Powwow delivers a complete conference strategy tailored to each attendee's specific goals.

## Key Features

*   **Conversational Onboarding:** A quick, guided chat to capture your role, goals, and preferences.
*   **Automated Conference Data Extraction:** Transforms any conference website into structured, usable data.
*   **Intelligent Schedule Generation:** Creates a conflict-free, personalized itinerary based on your objectives.
*   **Progressive Context Delivery:** Provides just-in-time context for each session, including key terms, speaker backgrounds, and topic relevance.
*   **Strategic Networking Recommendations:** Identifies high-value connections and provides personalized email drafts to facilitate introductions.

## How It Works

1.  **Conference Setup:** You provide the conference URL, and Powwow's Extractor agent crawls the site to gather all the necessary data.
2.  **Personalization Journey:** A 30-second chat captures your objectives and preferences. The Planning agent then generates a personalized, conflict-free schedule. You can manually adjust sessions, and the planner will re-optimize around your choices.
3.  **Preparation & Context:** Browse your personalized schedule and click on any session to get detailed preparation materials from the Research agent, including key terms, speaker bios, and suggested questions.

## Technical Stack

*   **Primary language:** TypeScript
*   **Framework:** Next.js
*   **Styling:** Tailwind CSS
*   **Database:** Redis vector DB
*   **Hosting:** Vercel
*   **Agent Orchestration:** Airia
*   **External MCPs + APIs:** Bright Data MCP, ???
