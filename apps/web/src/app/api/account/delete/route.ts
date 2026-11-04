import { type NextRequest, NextResponse } from "next/server";
import { appUrl, deleteAccount, getCurrentUser } from "@/server/auth";
import { isSameOrigin } from "@/server/same-origin";

/** "Delete my data": revoke the GitHub grant and delete the user with everything we stored. */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/", appUrl()), 303);

  const form = await request.formData();
  if (form.get("confirm") !== "delete") {
    return NextResponse.redirect(new URL("/dashboard?delete=unconfirmed", appUrl()), 303);
  }
  const { revoked } = await deleteAccount(user.id);
  return NextResponse.redirect(new URL(`/?deleted=${revoked ? "1" : "unrevoked"}`, appUrl()), 303);
}
