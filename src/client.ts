/**
 * client.ts
 *
 * Thin HTTP client the tools use to call the public Recruiter Roles v1 REST API.
 * Forwarding through /api/v1/* means the REST layer handles rate limiting,
 * caching, request logging, and ref_code click-tracking — the MCP server holds
 * no database connection and no secrets of its own.
 */

export type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

/**
 * Calls a v1 endpoint with the configured API key and returns the JSON body
 * both as a text content block (for clients without structured-output support)
 * and as `structuredContent` (validated against each tool's outputSchema).
 * Non-2xx responses are surfaced as tool errors so the model can relay them.
 */
export async function callV1(
  baseUrl: string,
  token: string,
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>
): Promise<ToolResult> {
  const url = new URL(`${baseUrl}/api/v1${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Failed to reach the Recruiter Roles API: ${
            err instanceof Error ? err.message : String(err)
          }`,
        },
      ],
    };
  }

  const text = await res.text();

  if (!res.ok) {
    return { isError: true, content: [{ type: "text", text }] };
  }

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return { content: [{ type: "text", text }], structuredContent: parsed };
  } catch {
    return {
      isError: true,
      content: [{ type: "text", text: `Unexpected non-JSON response: ${text.slice(0, 500)}` }],
    };
  }
}
