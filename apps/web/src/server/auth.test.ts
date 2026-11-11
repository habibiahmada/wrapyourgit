import { describe, expect, mock, test } from "bun:test";
import * as schema from "./db/schema";

// auth.ts is server-only and talks to the database and the request's cookies; both are faked so
// the test sees, in order, what deleteAccount asks of them.
mock.module("server-only", () => ({}));
const calls: string[] = [];
const tableName = (table: unknown) =>
  table === schema.users
    ? "users"
    : table === schema.hiddenAccounts
      ? "hidden_accounts"
      : table === schema.publicRecaps
        ? "public_recaps"
        : "other";
const fakeDb = {
  select: () => ({
    from: (table: unknown) => ({
      where: async () => (table === schema.users ? [{ githubId: 7 }] : []),
    }),
  }),
  insert: (table: unknown) => ({
    values: (value: { githubId: number }) => ({
      onConflictDoNothing: async () => {
        calls.push(`insert ${tableName(table)} ${value.githubId}`);
      },
    }),
  }),
  delete: (table: unknown) => ({
    where: async () => {
      calls.push(`delete ${tableName(table)}`);
    },
  }),
};
mock.module("./db", () => ({ ...schema, db: fakeDb }));
mock.module("next/headers", () => ({
  cookies: async () => ({ delete: () => calls.push("delete cookie") }),
}));
const { deleteAccount } = await import("./auth");

describe("deleteAccount", () => {
  test("hides and forgets the public recap by GitHub id, then deletes the user", async () => {
    // No stored token, so revoking fails; the data is deleted anyway.
    expect(await deleteAccount("user-1")).toEqual({ revoked: false });
    expect(calls).toEqual([
      "insert hidden_accounts 7",
      "delete public_recaps",
      "delete users",
      "delete cookie",
    ]);
  });
});
