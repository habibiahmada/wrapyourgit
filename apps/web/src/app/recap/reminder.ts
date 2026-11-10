/** The export screen's one reminder when the owner chose to show private names (spec, verbatim). */
export const PRIVATE_NAMES_REMINDER = "These files include your private repository names.";

/**
 * `privateNames` is true only when the owner chose to show names and the recap has one, so a
 * "Show them" answer on a recap without private repositories adds no line.
 */
export function showReminder(privateNames: boolean): boolean {
  return privateNames;
}
