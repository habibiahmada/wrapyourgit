import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Mona_Sans } from "next/font/google";
import { CloudflareAnalytics } from "@/components/site/cloudflare-analytics";
import { OPEN_GRAPH, SITE, siteUrl } from "@/site";
import "./globals.css";

// Same face as the video (DESIGN.md), so the page and the exported story read as one product.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

// GitHub's own open-source typeface, so the pages feel at home next to github.com. Bricolage
// stays for the story and exports (DESIGN.md).
const mona = Mona_Sans({ variable: "--font-mona", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: SITE.title, template: "%s · WrapYourGit" },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [...SITE.keywords],
  authors: [{ name: SITE.author.name, url: SITE.author.url }],
  creator: SITE.author.name,
  publisher: SITE.author.name,
  category: "technology",
  openGraph: OPEN_GRAPH,
  twitter: { card: "summary_large_image", title: SITE.title, description: SITE.description },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  // Phone numbers and dates in copy are not links.
  formatDetection: { telephone: false, email: false, address: false, date: false },
  appleWebApp: { capable: true, title: SITE.name, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: SITE.themeColor,
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-scroll-behavior: globals.css scrolls smoothly within a page, and since Next 16 a route
    // change would glide too, from the old page's position, and stop part way through the view
    // transition. With it, Next turns smooth scrolling off for each navigation, so a new page
    // opens at its top.
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${bricolage.variable} ${mona.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <CloudflareAnalytics />
      </body>
    </html>
  );
}
