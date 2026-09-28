import { queryKeys } from "../hooks/queries";
import { clearAllListFilterMemory } from "./listFilterMemory";

/** Drop cached candidate/report data and SPA filter memory when the logged-in user changes. */
export function resetAuthScopedClientState(client) {
  client.removeQueries({ queryKey: ["candidates"] });
  client.removeQueries({ queryKey: ["candidate"] });
  client.removeQueries({ queryKey: queryKeys.reportFilterOptions });
  client.removeQueries({ queryKey: queryKeys.documentFilterOptions });
  clearAllListFilterMemory();
}
