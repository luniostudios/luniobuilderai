import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Usage Policy",
  description: "Usage policy for LUNIO Builder — acceptable use and platform guidelines.",
  robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
};

export default function UsageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
