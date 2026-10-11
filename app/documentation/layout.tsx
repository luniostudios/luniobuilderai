import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LUNIO Builder - Documentation",
  robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
};

export default function DocumentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
