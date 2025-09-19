# PRD: Powwow v1 (Conference Companion)
## Problem Alignment
### The Problem
Attendees at large conferences face an overwhelming paradox of choice. With dozens up to hundreds of concurrent sessions across multiple tracks, they spend hours manually parsing schedules, missing valuable sessions that align with their goals, and arriving unprepared without context on the speakers or topics. The result: suboptimal ROI on conference attendance, both in time and opportunity cost.

E.g. TechCrunch Disrupt 2025, with its anticipated 10,000+ attendees and 80+ sessions, presents this very challenge. Attendees continually refer to a one-size-fits-all schedule throughout their time at the conference and decide the sessions to attend on-the-fly—a fundamentally broken experience in an era where every other aspect of their professional life is personalized, efficient, and strategic.

### High-level Approach
Powwow 💥 improves the conference experience for attendees with its agentic AI system. For the MVP (v1), five specialized agents work in concert to extract relevant conference data, understand the attendee’s background & goals, propose a personalized schedule, present just-in-time context for each session, and facilitate helpful introductions. 

The system operates autonomously after a 30-second onboarding conversation, delivering a complete conference strategy tailored to each attendee's specific goals.

### Goals & Success
****Primary Goal:**** Enable 500+ attendees to intelligently navigate a large industry conference by Octoboer 2025.
**Success Metrics:** 500+ unique attendess generating personalized schedules
****Non-Goals for v1:****
- Monetisation
- Persistent profile across multiple conferences
- Real-time schedule updates
- Social features beyond the email outreach
## Solution Alignment
### Key Features
****1. Conversational Onboarding (30 seconds)****
Captures attendee profile through guided conversation:
- Name, role, company
- Primary conference objective (pre-filled options + freeform)
- Experience preferences (focused vs. diverse, packed vs. breathing room)
****2. Automated Conference Data Extraction****
Transforms any conference website into structured `llms.txt`:
- Sessions with descriptions, speakers, times, locations
- Tracks and themes
- Logistics and venue information
****3. Intelligent Schedule Generation****
Creates conflict-free, personalized itinerary:
- Optimizes for stated objectives
- Respects manual edits as immutable anchors
- Handles up to 100 distinct sessions
****4. Progressive Context Delivery****
Accordion UI revealing session preparation materials:
- Glossary of key terms
- Speaker backgrounds
- Topic relevance and industry context
- Suggested questions to ask
****5. Strategic Networking Recommendations****
Identifies up to 10 high-value speaker connections:
- Aligned with attendee's objectives
- One-click personalized cold email drafts
### Key Flows
****Flow 1: Conference Setup****
1. Attendee enters conference URL
2. Extractor agent crawls site via Firecrawl MCP
3. Generates comprehensive `llms.txt`, per system prompt in `generate_llmstxt.txt`
4. System ready to onboard the user (attendee)
****Flow 2: Personalization Journey****
1. 30-second chat captures objectives and preferences
2. Planning agent filters full schedule against profile
3. Generates conflict-free personalized schedule
4. User manually adjusts specific sessions
5. Planning agent re-optimizes around anchored choices
****Flow 3: Preparation & Context****
1. User browses personalized schedule
2. Clicks session for expanded view
3. Research agent fetches context via Exa MCP
4. Accordion reveals progressive information layers
### Open Issues & Key Decisions
****Resolved Decisions:****
- Single LLM model (one of:Claude Sonnet/GPT-5/Gemini 2.5) across all agents
- No authentication for v1—each session starts fresh
- Accordion UI for progressive disclosure of information
- Assume static conference schedule post-extraction, i.e. no updates from organisers
****Open Issues:****
- {add here}
## MVP Functional Requirements
### 1. Onboarding Agent aka Onboarder
****Input:**** Fresh session, no authentication required
****Conversation:**** Maximum 5 exchanges, 30-second completion target
****Data Captured:****
- Name (required)
- Role & Company (required)
- Social links, LinkedIn/Twitter URLs (optional)
- Primary objective (select from 3-5 conference-specific options or freeform)
- Schedule density preference (light/moderate/packed)
- Topic diversity preference (focused/balanced/exploratory)
****Output:**** Export the info captured to a `attendee_profile.txt`
### 2. Extractor Agent
****Input:**** Conference website URL
****Process:**** Firecrawl MCP server integration
****Parsing Targets:****
- Schedule pages and session listings
- Speaker directories
- Track descriptions
- Venue and logistics
****Output:**** `llms.txt` following specified format (see prompt: `generate_llmstxt.txt`)
****Constraints:**** Handle up to 100 sessions, single extraction (no updates post-extraction)
### 3. Planning Agent aka Planner
****Inputs:**** 
- Attendee profile from the Onboarder
- `llms.txt` from Extractor
****Logic:****
- LLM-based: Prompt an LLM to consider the attendee’s perferences to select the best fit sessions for each time block on their schedule, resolve any time conflicts with a smart tie-break
- Respect user's manual edits as immutable
****Output:**** Display a personalized schedule with no timing conflicts in the web interface
****Interaction:**** Allow post-generation manual swaps with re-optimization
### 4. Research Agent aka Researcher
****Trigger:**** User clicks into a specific session
****Process:**** Agent calls Exa MCP web search
****Content Generated (per session):****
- 3-5 key terms with definitions
- Speaker background (100 words max)
- "Why this matters now" context (150 words)
- 2-3 suggested questions for the speakers / panelists
****UI:**** Accordion interface with progressive reveal
****Constraint:**** Cache results to minimize API calls
### 5. Networking Agent aka “Superconnector”
****Input:**** Attendee profile and full speaker list
****Algorithm:**** Match objectives to speaker expertise
****Output:**** Ranked list of 10 speakers with rationale
****Email Generation:**** 
- Template: 3-4 sentences maximum
- Personalization: Reference specific shared interest
- One-click copy to clipboard
### Technical Stack
- ****Primary language:**** TypeScript
- ****Framework:**** Next.js
- ****Styling:**** Tailwind CSS
- ****Database:**** Redis vector DB
- ****Hosting:**** Vercel
- ****Agent Orchestration:**** Find a framework
- ****External MCPs & APIs:**** Bright Data MCP, ???
### MVP Constraints
- Maximum 100 sessions per conference
- No mid-session room hopping
- No real-time updates post-extraction
- Desktop-first (mobile optimization deferred)
- English-only interface
- Single conference per user session
### Quality Requirements
- Onboarding completion: <30 seconds
- Schedule generation: <10 seconds
- Research context loading: <5 seconds per session
## Order of Implementation
- [ ] Extractor Agent + `llms.txt` generation
- [ ] Onboarder Agent to capture attendee’s profile
- [ ] Planner Agent to propose a personalised schedule
- [ ] Research Agent + progressive UI
- [ ] Superconnector agent to suggest top people to reach out to + email templates
- [ ] End-to-end testing with a real conference, e.g. [AI Infra Summit 2025](https://www.kisacoresearch.com/events/ai-infra-summit/agenda)
- [ ] Performance optimization, bug fixes, polish UI