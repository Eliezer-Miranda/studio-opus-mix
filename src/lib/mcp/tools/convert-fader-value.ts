import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { formatDb, formatPan, positionToDb } from "@/lib/mixer-types";

export default defineTool({
  name: "convert_fader_value",
  title: "Convert fader value",
  description:
    "Convert a 0-100 fader position to its dB label, and optionally a -50..50 pan position to its L/C/R label.",
  inputSchema: {
    position: z.number().describe("Fader position from 0 to 100."),
    pan: z.number().optional().describe("Pan position from -50 (L) to 50 (R)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ position, pan }) => {
    const result = {
      db: positionToDb(position),
      dbLabel: formatDb(position),
      panLabel: pan === undefined ? undefined : formatPan(pan),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  },
});
