/**
 * S73K: the one place a group's stored name becomes rendered text.
 *
 * `bootstrap_groups.name` is "Group A".."Group Z" and stays that way -- it is the
 * join key `createBootstrapGroups`' UNIQUE(session_id, name) and the SQL bridge
 * `g.name = 'Group ' || chr(64 + v.group_number)` both rely on. S72C (Section E)
 * decided no letter reaches a person; it only converted the check-in flow, and
 * S73B/C/D/G then added the queue, the visit table and the admin group list,
 * every one of which rendered the raw name again.
 *
 * This is the exact inverse of that `chr(64 + n)` bridge, in TS rather than SQL
 * because the label is needed off five different queries in three payload shapes.
 * `bootstrap_volunteers.group_number` is not usable here: it lives on the LEAD's
 * row, not the group's, and is NULL for any group whose lead was never swept.
 * The name is the only always-present source.
 *
 * Anything that is not exactly "Group <single capital>" is passed through
 * unchanged rather than mangled -- a hand-edited or future group name should
 * still render as itself.
 *
 * This module is pure -- client components may import it.
 */
export function groupLabel(name: string | null | undefined): string {
  if (!name) return "";
  const letter = /^Group ([A-Z])$/.exec(name)?.[1];
  return letter ? `Group ${letter.charCodeAt(0) - 64}` : name;
}
