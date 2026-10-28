/** Back target for Candidate Details. Report callers opt in with location state. */
export function candidateDetailsBackTarget(state) {
  if (state?.from === "reports") {
    return {
      path: state.backTo || "/admin/report",
      label: state.backLabel || "Back to Reports",
    };
  }
  return { path: "/admin/candidates", label: "Back to Candidates" };
}
