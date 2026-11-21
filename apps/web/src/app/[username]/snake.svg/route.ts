import { readmeImage } from "@/server/readme-images";

/** The README snake for a username (ADR-0035). */
export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return readmeImage("snake", username, request);
}
