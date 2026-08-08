import { defineTool } from "@lovable.dev/mcp-js";
import { CATALOG_BUSES } from "../catalog";

export default defineTool({
  name: "list_buses",
  title: "List monitor buses",
  description:
    "List every monitor mix (bus) available on the console, such as Bateria, Voz 1 or Pastor.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify(CATALOG_BUSES) }],
    structuredContent: { buses: CATALOG_BUSES },
  }),
});
