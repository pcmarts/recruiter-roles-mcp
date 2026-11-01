# Recruiter Roles

This extension connects Gemini CLI to the Recruiter Roles job board
(https://recruiterroles.com): live recruiter, talent-acquisition, and staffing
jobs, plus company profiles, sectors, locations, and market stats. Every tool is
read-only.

## Using the tools

- Start with `search_jobs`. Filter by sector, location, salary, remote/hybrid,
  recency, or a full-text `q`. Then call `get_job` with a job `slug` for the full
  description, requirements, benefits, and apply details.
- `sector` and `location` filters need exact slugs or codes. Fetch them from
  `list_sectors` and `list_locations` before filtering.
- Use `list_companies` and `get_company` for recruiting agencies and employers,
  and `market_stats` for aggregate trends (totals, posting velocity, breakdowns).
- All tools share one API key and a 1,000 requests/day limit. Prefer narrow
  filters and sensible `per_page` values over broad scans.
- When linking to a job, use its `url` field (a tracked link), not `canonical_url`.

## Setup

The extension needs a free Recruiter Roles API key (`rr_live_...`). Create one
at https://recruiterroles.com/api-access and enter it when prompted on install,
or later with `gemini extensions config recruiter-roles-mcp`.

## Attribution

Any page or product that publishes data obtained through these tools must
include a visible, crawlable link back to https://recruiterroles.com.
