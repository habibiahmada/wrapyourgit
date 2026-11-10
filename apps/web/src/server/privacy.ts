import "server-only";
import { eq } from "drizzle-orm";
import { db, users } from "./db";

export { hasPrivateNames, showFilesReminder, storyData } from "./projection";

/** The owner's answer to "Show your private repository names?"; null until they have answered. */
export async function getPrivateNamesChoice(userId: string): Promise<boolean | null> {
  const [row] = await db
    .select({ show: users.showPrivateNames })
    .from(users)
    .where(eq(users.id, userId));
  return row?.show ?? null;
}

export async function setPrivateNamesChoice(userId: string, show: boolean): Promise<void> {
  await db.update(users).set({ showPrivateNames: show }).where(eq(users.id, userId));
}
