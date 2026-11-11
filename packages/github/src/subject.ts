/** Whose activity a query reads: the signed-in viewer, or any public user by login. */
export type Subject = { kind: "viewer" } | { kind: "user"; login: string };

const VIEWER_ROOT = /\bviewer\s*\{/g;
const OPERATION_HEAD = /\bquery\s+\w+/;

/**
 * Re-roots a query that starts at `viewer { ... }` onto `user(login: $login)`. The field keeps the
 * alias `viewer`, so the response shape is identical and no parsing code has to change.
 */
export function withSubject(query: string, subject: Subject): string {
  if (subject.kind === "viewer") return query;

  const head = OPERATION_HEAD.exec(query);
  if (!head) throw new Error("withSubject expects a named query operation");
  const afterName = head.index + head[0].length;
  const rest = query.slice(afterName);
  const open = /^\s*\(/.exec(rest);

  let withVariable: string;
  if (open) {
    const close = rest.indexOf(")");
    const declared = rest.slice(open[0].length, close).trimEnd();
    withVariable = `${query.slice(0, afterName)}${open[0]}${declared}, $login: String!${rest.slice(close)}`;
  } else {
    withVariable = `${query.slice(0, afterName)}($login: String!)${rest}`;
  }
  return withVariable.replace(VIEWER_ROOT, "viewer: user(login: $login) {");
}

export function subjectVariables(subject: Subject): Record<string, string> {
  return subject.kind === "viewer" ? {} : { login: subject.login };
}
