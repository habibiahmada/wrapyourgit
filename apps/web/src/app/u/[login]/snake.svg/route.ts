import { readmeImage } from "@/server/readme-images";

/** The README snake of an account whose name a site route uses, next to its recap at /u/<name>. */
export async function GET(request: Request, { params }: { params: Promise<{ login: string }> }) {
  const { login } = await params;
  return readmeImage("snake", login, request);
}
