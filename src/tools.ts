/**
 * tools.ts
 *
 * Registers the seven Recruiter Roles tools on an MCP server. Each maps 1:1 to a
 * read-only v1 REST endpoint and forwards the configured API key via callV1().
 * Mirrors the hosted server at https://recruiterroles.com/api/mcp.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callV1 } from "./client.js";

export type ToolConfig = { baseUrl: string; token: string };

/**
 * Behaviour hints applied to every tool. The whole API is read-only, so each
 * tool is non-destructive, idempotent, and operates over a closed, well-defined
 * domain (the Recruiter Roles job board) rather than an open world.
 */
const READONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

/* ── Output schemas (permissive — documentation for the model) ───────────── */

const locationSchema = z.object({
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  is_remote: z.boolean().optional(),
  work_arrangement: z.string().nullable().optional(),
});

const salarySchema = z.object({
  disclosed: z.boolean().optional(),
  min_dollars: z.number().nullable().optional(),
  max_dollars: z.number().nullable().optional(),
  currency: z.string().optional(),
});

const disclosableSchema = z.object({
  disclosed: z.boolean().optional(),
  details: z.string().nullable().optional(),
});

const jobBaseFields = {
  id: z.string().optional(),
  slug: z.string().optional(),
  title: z.string().optional(),
  company_name: z.string().nullable().optional(),
  company_website: z.string().nullable().optional(),
  company_logo_url: z.string().nullable().optional(),
  location: locationSchema.optional(),
  employment_type: z.string().nullable().optional(),
  primary_sector: z.string().nullable().optional(),
  secondary_sectors: z.array(z.string()).optional(),
  salary: salarySchema.optional(),
  commission: disclosableSchema.optional(),
  billing_target: disclosableSchema.optional(),
  source_type: z.string().nullable().optional(),
  apply_url: z.string().nullable().optional(),
  url: z.string().optional(),
  canonical_url: z.string().optional(),
  posted_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  is_featured: z.boolean().optional(),
  is_homepage_featured: z.boolean().optional(),
};

const jobListItemSchema = z.object({
  ...jobBaseFields,
  description_excerpt: z.string().optional(),
});

const jobDetailSchema = z.object({
  ...jobBaseFields,
  description: z.string().nullable().optional(),
  requirements: z.string().nullable().optional(),
  benefits: z.string().nullable().optional(),
  tech_stack: z.array(z.string()).optional(),
  team_size: z.union([z.string(), z.number()]).nullable().optional(),
  apply_email: z.string().nullable().optional(),
  is_sticky: z.boolean().optional(),
});

const metaSchema = z.object({
  total: z.number().optional(),
  page: z.number().optional(),
  per_page: z.number().optional(),
  total_pages: z.number().optional(),
  next_page: z.number().nullable().optional(),
  prev_page: z.number().nullable().optional(),
});

const companySchema = z.object({
  slug: z.string().optional(),
  name: z.string().optional(),
  logo_url: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  website_url: z.string().nullable().optional(),
  linkedin_url: z.string().nullable().optional(),
  company_type: z.string().nullable().optional(),
  employee_count_range: z.string().nullable().optional(),
  headquarters: z
    .object({
      city: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
    })
    .optional(),
  specialties: z.array(z.string()).optional(),
  founded_year: z.number().nullable().optional(),
  is_verified: z.boolean().optional(),
  active_job_count: z.number().optional(),
});

const countItemSchema = z.object({
  slug: z.string().optional(),
  name: z.string().optional(),
  count: z.number().optional(),
});

export function registerRecruiterRolesTools(server: McpServer, config: ToolConfig): void {
  const { baseUrl, token } = config;

  // ── search_jobs ──────────────────────────────────────────────────────
  server.registerTool(
    "search_jobs",
    {
      title: "Search recruiter jobs",
      description:
        "Search live recruiter and talent-acquisition job listings on Recruiter Roles. " +
        "Supports full-text search and filtering by sector, location, employment type, " +
        "work arrangement, salary, and recency. Returns a paginated list with salary, " +
        "company, location, and a tracked apply URL.",
      inputSchema: {
        q: z.string().optional().describe("Full-text search across job title and company name."),
        sector: z
          .string()
          .optional()
          .describe(
            "Sector slug, comma-separated for multiple (e.g. 'technology,financial-services'). Use list_sectors for valid slugs."
          ),
        state: z
          .string()
          .optional()
          .describe(
            "State/region code, comma-separated (e.g. 'TX,NY,BC'). Use list_locations for codes."
          ),
        city: z.string().optional().describe("City slug, comma-separated (e.g. 'dallas-tx')."),
        employment_type: z
          .enum(["full_time", "part_time", "contract", "freelance"])
          .optional()
          .describe("Employment type filter."),
        work_arrangement: z
          .enum(["on_site", "hybrid", "remote"])
          .optional()
          .describe("Work arrangement filter."),
        is_remote: z.boolean().optional().describe("Shorthand for work_arrangement=remote."),
        salary_min: z
          .number()
          .int()
          .optional()
          .describe(
            "Minimum salary in USD. Only returns jobs with a disclosed salary at or above this."
          ),
        salary_disclosed: z
          .boolean()
          .optional()
          .describe("true = only jobs with a disclosed salary; false = only undisclosed."),
        source_type: z
          .enum(["direct", "scraped"])
          .optional()
          .describe("'direct' = employer-posted, 'scraped' = aggregated."),
        posted_since: z
          .string()
          .optional()
          .describe("ISO date — jobs posted on or after this date."),
        updated_since: z
          .string()
          .optional()
          .describe("ISO datetime — for incremental sync; jobs updated on or after this."),
        sort: z.enum(["recent", "salary_desc"]).optional().describe("Sort order. Default: recent."),
        page: z.number().int().min(1).optional().describe("Page number. Default: 1."),
        per_page: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Results per page. Default: 20, max: 100."),
      },
      outputSchema: {
        data: z.array(jobListItemSchema),
        meta: metaSchema,
        response_generated_at: z.string().optional(),
      },
      annotations: READONLY_ANNOTATIONS,
    },
    async (input) => callV1(baseUrl, token, "/jobs", input)
  );

  // ── get_job ──────────────────────────────────────────────────────────
  server.registerTool(
    "get_job",
    {
      title: "Get job detail",
      description:
        "Fetch the full detail for a single job by its slug, including the complete " +
        "description, requirements, benefits, tech stack, and apply contact.",
      inputSchema: {
        slug: z
          .string()
          .describe(
            "The job slug (the last path segment of its URL, or the 'slug' field from search_jobs)."
          ),
      },
      outputSchema: { data: jobDetailSchema },
      annotations: READONLY_ANNOTATIONS,
    },
    async (input) => callV1(baseUrl, token, `/jobs/${encodeURIComponent(input.slug)}`)
  );

  // ── list_companies ───────────────────────────────────────────────────
  server.registerTool(
    "list_companies",
    {
      title: "List recruiting companies",
      description:
        "Browse the directory of recruiting companies and agencies with their active job counts. " +
        "Filter by name, company type, or HQ country.",
      inputSchema: {
        q: z.string().optional().describe("Search company name."),
        company_type: z
          .enum([
            "staffing_agency",
            "executive_search",
            "boutique_firm",
            "corporate_inhouse",
            "rpo",
            "other",
          ])
          .optional()
          .describe("Company type filter."),
        country: z.string().optional().describe("HQ country code (e.g. 'US', 'GB')."),
        sort: z
          .enum(["job_count", "name", "recent"])
          .optional()
          .describe("Sort order. Default: job_count."),
        page: z.number().int().min(1).optional().describe("Page number. Default: 1."),
        per_page: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Results per page. Default: 20, max: 100."),
      },
      outputSchema: {
        data: z.array(companySchema),
        meta: metaSchema,
        response_generated_at: z.string().optional(),
      },
      annotations: READONLY_ANNOTATIONS,
    },
    async (input) => callV1(baseUrl, token, "/companies", input)
  );

  // ── get_company ──────────────────────────────────────────────────────
  server.registerTool(
    "get_company",
    {
      title: "Get company profile",
      description:
        "Fetch a single company's full profile plus a paginated list of its active jobs.",
      inputSchema: {
        slug: z.string().describe("The company slug (e.g. 'robert-half')."),
        page: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("Page of the company's jobs. Default: 1."),
        per_page: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Jobs per page. Default: 20, max: 100."),
      },
      outputSchema: {
        data: companySchema.extend({
          url: z.string().optional(),
          jobs: z.object({ data: z.array(jobListItemSchema), meta: metaSchema }).optional(),
        }),
      },
      annotations: READONLY_ANNOTATIONS,
    },
    async (input) => {
      const { slug, ...params } = input;
      return callV1(baseUrl, token, `/companies/${encodeURIComponent(slug)}`, params);
    }
  );

  // ── list_sectors ─────────────────────────────────────────────────────
  server.registerTool(
    "list_sectors",
    {
      title: "List sectors",
      description:
        "List all recruiting sectors with their current active job counts. Use the returned " +
        "slugs for the 'sector' filter in search_jobs.",
      inputSchema: {},
      outputSchema: {
        data: z.array(
          z.object({
            slug: z.string().optional(),
            name: z.string().optional(),
            job_count: z.number().optional(),
          })
        ),
        response_generated_at: z.string().optional(),
      },
      annotations: READONLY_ANNOTATIONS,
    },
    async () => callV1(baseUrl, token, "/sectors")
  );

  // ── list_locations ───────────────────────────────────────────────────
  server.registerTool(
    "list_locations",
    {
      title: "List locations",
      description:
        "List the location hierarchy (countries, regions, or cities) with active job counts. " +
        "Use the returned codes/slugs for the 'state' and 'city' filters in search_jobs.",
      inputSchema: {
        level: z
          .enum(["countries", "regions", "cities"])
          .optional()
          .describe("Hierarchy level to return. Default: countries."),
        country: z.string().optional().describe("Filter by country code (e.g. 'US', 'GB')."),
        region: z
          .string()
          .optional()
          .describe("Filter cities by region code (e.g. 'TX'). Use with level=cities."),
      },
      outputSchema: {
        data: z.array(z.object({}).passthrough()),
        response_generated_at: z.string().optional(),
      },
      annotations: READONLY_ANNOTATIONS,
    },
    async (input) => callV1(baseUrl, token, "/locations", input)
  );

  // ── market_stats ─────────────────────────────────────────────────────
  server.registerTool(
    "market_stats",
    {
      title: "Recruiter job market stats",
      description:
        "Aggregate market overview: total active jobs, posting velocity (24h / 7d), and " +
        "breakdowns by sector, employment type, work arrangement, and country.",
      inputSchema: {},
      outputSchema: {
        data: z.object({
          total_active_jobs: z.number().optional(),
          jobs_posted_24h: z.number().optional(),
          jobs_posted_7d: z.number().optional(),
          by_sector: z.array(countItemSchema).optional(),
          by_employment_type: z.record(z.number()).optional(),
          by_work_arrangement: z.record(z.number()).optional(),
          top_countries: z
            .array(z.object({ name: z.string().optional(), count: z.number().optional() }))
            .optional(),
        }),
        response_generated_at: z.string().optional(),
      },
      annotations: READONLY_ANNOTATIONS,
    },
    async () => callV1(baseUrl, token, "/stats")
  );
}
