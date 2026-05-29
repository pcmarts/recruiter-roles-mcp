#!/usr/bin/env node
/**
 * recruiter-roles-mcp
 *
 * A standalone (stdio) MCP server for the Recruiter Roles job board. It is a
 * local proxy over the public read-only v1 REST API — provide your API key via
 * the RECRUITER_ROLES_API_KEY environment variable and the tools forward to
 * https://recruiterroles.com/api/v1/*.
 *
 * Prefer the hosted remote server (Streamable HTTP) at
 * https://recruiterroles.com/api/mcp when your client supports remote MCP;
 * use this package for stdio-only clients or local development.
 *
 * Free API key: https://recruiterroles.com/api-access
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerRecruiterRolesTools } from "./tools.js";

const SERVER_INSTRUCTIONS =
  "Recruiter Roles serves live recruiter and talent-acquisition job listings (read-only). " +
  "Start with search_jobs — filter by sector, location, salary, remote, recency, or full-text q — " +
  "then call get_job with a slug for the full description and apply details. The sector and " +
  "location filters need exact slugs/codes: fetch them from list_sectors and list_locations first. " +
  "Use list_companies/get_company for agencies and market_stats for aggregate trends. " +
  "All tools share one API key and a 1,000 requests/day limit, so prefer narrow filters and " +
  "reasonable per_page values over broad scans. A job's `url` field is a tracked link — prefer it when linking out.";

async function main(): Promise<void> {
  const token = process.env.RECRUITER_ROLES_API_KEY;
  const baseUrl = (process.env.RECRUITER_ROLES_BASE_URL ?? "https://recruiterroles.com").replace(
    /\/$/,
    ""
  );

  if (!token) {
    console.error(
      "Missing RECRUITER_ROLES_API_KEY. Get a free key at https://recruiterroles.com/api-access " +
        "and set it, e.g. RECRUITER_ROLES_API_KEY=rr_live_..."
    );
    process.exit(1);
  }

  const server = new McpServer(
    { name: "recruiter-roles", version: "1.0.0" },
    { instructions: SERVER_INSTRUCTIONS }
  );

  registerRecruiterRolesTools(server, { baseUrl, token });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // stderr only — stdout is the JSON-RPC channel.
  console.error("recruiter-roles-mcp running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting recruiter-roles-mcp:", err);
  process.exit(1);
});
