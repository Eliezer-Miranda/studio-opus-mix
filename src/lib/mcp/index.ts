import { defineMcp } from "@lovable.dev/mcp-js";
import listBuses from "./tools/list-buses";
import listChannels from "./tools/list-channels";
import convertFaderValue from "./tools/convert-fader-value";

export default defineMcp({
  name: "midnight-mixer-pro",
  title: "Midnight Mixer Pro",
  version: "0.1.0",
  instructions:
    "Tools for the Midnight Mixer Pro monitor console. Use `list_buses` for the monitor mixes, `list_channels` for the channel layout (filter by group or kind), and `convert_fader_value` to translate fader/pan positions into dB and L/C/R labels.",
  tools: [listBuses, listChannels, convertFaderValue],
});
