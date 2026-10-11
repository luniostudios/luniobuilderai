import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for using LUNIO Builder and related services.",
  alternates: { canonical: "/legal/terms" },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
