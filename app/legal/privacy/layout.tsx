import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read the LUNIO Builder Privacy Policy — how we collect, use, and protect your information.",
  alternates: { canonical: "/legal/privacy" },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
