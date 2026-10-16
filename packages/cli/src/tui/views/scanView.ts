// Scan result shaping — pure data helpers, no Ink/React imports.
// Grouping mirrors the command-mode `renderEndpoints` grouping
// (by sourceFile) but returns data instead of printing it.

import { Endpoint } from "../../domain/endpoint.js";

export interface EndpointGroup {
  sourceFile: string;
  endpoints: Endpoint[];
}

/** Group endpoints by source file, preserving first-seen file order. */
export function groupEndpointsByFile(endpoints: Endpoint[]): EndpointGroup[] {
  const groups: EndpointGroup[] = [];
  const byFile = new Map<string, Endpoint[]>();

  for (const endpoint of endpoints) {
    const group = byFile.get(endpoint.sourceFile);

    if (group) {
      group.push(endpoint);
    } else {
      byFile.set(endpoint.sourceFile, [endpoint]);
    }
  }

  for (const [sourceFile, group] of byFile) {
    groups.push({ sourceFile, endpoints: group });
  }

  return groups;
}
