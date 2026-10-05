import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { colors } from "@punchcard/shared/tokens";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { publicEnv } from "@/lib/env";
import "./globals.css";

/** One family, two widths: condensed for headlines, normal for reading. */
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.appUrl),
  title: {
    default: "Punchcard: the job clock for tradespeople",
    template: "%s | Punchcard",
  },
  description:
    "Tap once to start the clock on a job, keep it on your Lock Screen, get nudged when you forget, and send a timesheet your client accepts. Free for up to three clients.",
  applicationName: "Punchcard",
  openGraph: {
    type: "website",
    siteName: "Punchcard",
    title: "Punchcard: tap once, bill every hour",
    description: "A job clock for plumbers, electricians, cleaners and landscapers. Lock Screen timer, widgets, timesheets.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: colors.light.surface },
    { media: "(prefers-color-scheme: dark)", color: colors.dark.surface },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} antialiased`} suppressHydrationWarning>
      <body className="min-h-dvh">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
