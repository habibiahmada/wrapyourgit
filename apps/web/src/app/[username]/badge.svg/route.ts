import { readmeImage } from "@/server/readme-images";

/** The README badge for a username (ADR-0035). */
export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return readmeImage("badge", username, request);
}
