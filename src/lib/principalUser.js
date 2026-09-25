/** Role `user` with a Principal (`owner_id`) assigned. */
export function isAssignedPrincipalUser(user) {
  if (String(user?.role || "").trim().toLowerCase() !== "user") return false;
  const id = Number(user?.owner_id);
  return Number.isInteger(id) && id > 0;
}
