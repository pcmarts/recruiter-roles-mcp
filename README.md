# Recruiter Roles MCP server

Query the [Recruiter Roles](https://recruiterroles.com) job board from any
MCP-capable AI client (Claude, Cursor, ChatGPT, VS Code, …). Ask in plain
language and get live recruiter and talent-acquisition jobs, company profiles,
sectors, locations, and market stats — straight from the board.

Read-only. Authenticated with a free Recruiter Roles API key.

- **Hosted (recommended):** `https://recruiterroles.com/api/mcp` (Streamable HTTP)
- **Local (this package):** `npx recruiter-roles-mcp` (stdio, for stdio-only clients)
- **Gemini CLI extension:** `gemini extensions install https://github.com/pcmarts/recruiter-roles-mcp`
- **Get a free API key:** https://recruiterroles.com/api-access
- **Docs:** https://recruiterroles.com/mcp · REST API: https://recruiterroles.com/api-docs

## Tools

| Tool | Description |
| --- | --- |
| `search_jobs` | Search & filter live jobs (sector, location, salary, remote, recency, full-text). |
| `get_job` | Full detail for one job — description, requirements, benefits, apply contact. |
| `list_companies` | Browse recruiting agencies & employers with active job counts. |
| `get_company` | A company profile plus its active jobs. |
| `list_sectors` | All recruiting sectors with live job counts. |
| `list_locations` | Countries, regions, and cities with live job counts. |
| `market_stats` | Aggregate market overview — totals, posting velocity, and breakdowns. |

All tools are annotated `readOnlyHint: true`, `destructiveHint: false`,
`openWorldHint: false`, and expose an `outputSchema`.

## Connect

### Hosted remote server (recommended)

Most clients can connect directly to the hosted Streamable HTTP endpoint with
your API key in the `Authorization` header (or as a `?key=` query param for
clients that can't set headers).

**Cursor** — `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "recruiter-roles": {
      "url": "https://recruiterroles.com/api/mcp",
      "headers": { "Authorization": "Bearer rr_live_YOUR_KEY" }
    }
  }
}
```

**VS Code** — `.vscode/mcp.json`:

```json
{
  "servers": {
    "recruiter-roles": {
      "type": "http",
      "url": "https://recruiterroles.com/api/mcp",
      "headers": { "Authorization": "Bearer rr_live_YOUR_KEY" }
    }
  }
}
```

**Claude / ChatGPT custom connector** — add the URL with your key appended:

```
https://recruiterroles.com/api/mcp?key=rr_live_YOUR_KEY
```

**Gemini CLI** — this repo is also a Gemini CLI extension that wires up the
hosted server. Install it and enter your key when prompted (it is stored in the
system keychain, never in a file):

```bash
gemini extensions install https://github.com/pcmarts/recruiter-roles-mcp
```

To add or change the key later: `gemini extensions config recruiter-roles-mcp`.

### Local stdio server (this npm package)

For stdio-only clients or local development. Set your API key via the
`RECRUITER_ROLES_API_KEY` environment variable:

```json
{
  "mcpServers": {
    "recruiter-roles": {
      "command": "npx",
      "args": ["-y", "recruiter-roles-mcp"],
      "env": { "RECRUITER_ROLES_API_KEY": "rr_live_YOUR_KEY" }
    }
  }
}
```

Run it directly:

```bash
RECRUITER_ROLES_API_KEY=rr_live_YOUR_KEY npx recruiter-roles-mcp
```

## How it works

This is a thin, read-only layer over the public Recruiter Roles
[v1 REST API](https://recruiterroles.com/api-docs). Each tool forwards your API
key to one `GET /api/v1/*` endpoint, so MCP usage shares the same rate limit
(1,000 requests/day per key), caching, and request logging as the REST API. The
server holds no database connection and no secrets of its own.

## Develop

```bash
npm install
npm run build
RECRUITER_ROLES_API_KEY=rr_live_YOUR_KEY node dist/index.js
```

Optional: point at a different origin during development with
`RECRUITER_ROLES_BASE_URL` (default `https://recruiterroles.com`).

## Backlink policy

Any page or product that publishes data obtained through this server must
include a visible, crawlable link back to Recruiter Roles. Keys may be
suspended if the backlink is removed.

## License

MIT — see [LICENSE](./LICENSE).
