import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { CATALOG_CHANNELS } from "../catalog";

export default defineTool({
  name: "list_channels",
  title: "List mixer channels",
  description:
    "List the console channels in fader order, optionally filtered by group (tracks, ritmo, cordas, teclas, vozes, fala) or kind (live/backing).",
  inputSchema: {
    group: z.string().optional().describe("Group id to filter by."),
    kind: z.enum(["live", "backing"]).optional().describe("Channel kind filter."),
  },
  outputSchema: {
    channels: z.array(
      z.object({ id: z.string(), name: z.string(), kind: z.string(), group: z.string() }),
    ),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ group, kind }) => {
    const channels = CATALOG_CHANNELS.filter(
      (c) =>
        (!group || c.group === group.toLowerCase()) && (!kind || c.kind === kind),
    );
    return {
      content: [{ type: "text", text: JSON.stringify(channels) }],
      structuredContent: { channels },
    };
  },
});
