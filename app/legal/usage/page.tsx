"use client";

import Link from "next/link";

export default function UsagePolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-2xl p-8">
        <h1 className="text-4xl font-bold mb-2 text-gray-900">
          Acceptable Use Policy
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Last updated: May 2026
        </p>

        <Section title="1. Overview">
          This Acceptable Use Policy (“Policy”) outlines the rules and guidelines
          for using LUNIO Builder (“Service”). By using the Service, you agree
          to comply with this Policy.
        </Section>

        <Section title="2. Prohibited Activities">
          You may not use LUNIO Builder to:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Engage in illegal or fraudulent activities</li>
            <li>Distribute malware, ransomware, or malicious code</li>
            <li>Phish, scam, or deceive users</li>
            <li>Host or distribute harmful or abusive content</li>
            <li>Exploit or harm minors</li>
            <li>Infringe on intellectual property rights</li>
            <li>Operate spam campaigns or unsolicited communications</li>
          </ul>
        </Section>

        <Section title="3. Platform Abuse">
          You agree not to:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Attempt to gain unauthorized access to systems or data</li>
            <li>Interfere with or disrupt the Service or infrastructure</li>
            <li>Abuse system resources (e.g., excessive bandwidth or storage)</li>
            <li>Bypass or attempt to bypass security measures</li>
          </ul>
        </Section>

        <Section title="4. User Content Standards">
          Content published through LUNIO Builder must not:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Contain illegal, violent, or threatening material</li>
            <li>Promote hate speech or discrimination</li>
            <li>Include sexually explicit or exploitative content</li>
            <li>Violate privacy or personal data rights</li>
          </ul>
        </Section>

        <Section title="5. Enforcement">
          We reserve the right to:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Monitor usage for compliance</li>
            <li>Suspend or remove content</li>
            <li>Terminate accounts violating this Policy</li>
          </ul>
        </Section>

        <Section title="6. Reporting Violations">
          If you encounter violations of this Policy, please contact us at:
          <br />
          <Link href="https://www.luniostudios.com/#contact" target="_blank" className="underline ">
            LUNIO Studios
          </Link>
        </Section>

        <Section title="7. Changes to This Policy">
          For questions, contact:{" "}
          <Link href="https://www.luniostudios.com/#contact" target="_blank" className="underline ">
            LUNIO Studios
          </Link>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">{title}</h2>
      <div className="text-gray-700 leading-relaxed">{children}</div>
    </div>
  );
}