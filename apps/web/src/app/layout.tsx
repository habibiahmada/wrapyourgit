import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Mona_Sans } from "next/font/google";
import "./globals.css";

// Same face as the video (DESIGN.md), so the page and the exported story read as one product.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

const DESCRIPTION =
  "Sign in with GitHub and watch your 2026 play back as an animated story: contributions, streaks, languages, your developer archetype and a letter from Cell. Read-only, and yours to delete.";

// GitHub's own open-source typeface, so the pages feel at home next to github.com. Bricolage
// stays for the story and exports (DESIGN.md).
const mona = Mona_Sans({ variable: "--font-mona", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: {
    default: "WrapYourGit 2026: every green square has a story",
    template: "%s · WrapYourGit",
  },
  description: DESCRIPTION,
  applicationName: "WrapYourGit",
  keywords: [
    "GitHub wrapped",
    "GitHub year in review",
    "GitHub recap 2026",
    "contribution graph",
    "developer stats",
    "coding year recap",
  ],
  openGraph: {
    type: "website",
    siteName: "WrapYourGit",
    title: "WrapYourGit 2026: every green square has a story",
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0d1117",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} ${mona.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
