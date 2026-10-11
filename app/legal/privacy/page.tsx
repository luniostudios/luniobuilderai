"use client";

import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-2xl p-8">
        <h1 className="text-4xl font-bold mb-2 text-gray-900">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Last updated: May 2026
        </p>

        <Section title="1. Introduction">
          LUNIO Builder (“we,” “our,” or “us”) respects your privacy. This
          Privacy Policy explains how we collect, use, and protect your
          information when you use our Service.
        </Section>

        <Section title="2. Information We Collect">
          <p className="mb-2 font-medium">Information You Provide:</p>
          <ul className="list-disc ml-6 space-y-1">
            <li>Name and email address</li>
            <li>Account credentials</li>
            <li>Billing information (processed via Stripe)</li>
            <li>Content you create or upload</li>
          </ul>

          <p className="mt-4 mb-2 font-medium">Automatically Collected:</p>
          <ul className="list-disc ml-6 space-y-1">
            <li>IP address</li>
            <li>Browser and device information</li>
            <li>Usage data (pages visited, interactions)</li>
            <li>Cookies and tracking technologies</li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul className="list-disc ml-6 space-y-1">
            <li>Provide and operate the Service</li>
            <li>Process payments and subscriptions</li>
            <li>Improve performance and features</li>
            <li>Communicate with you (support, updates, billing)</li>
            <li>Prevent fraud and security issues</li>
          </ul>
        </Section>

        <Section title="4. How We Share Information">
          We do not sell your personal data. We may share information with:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Service providers (hosting, analytics, Stripe)</li>
            <li>Legal authorities if required</li>
            <li>In case of merger, acquisition, or sale</li>
          </ul>
        </Section>

        <Section title="5. Cookies and Tracking">
          We use cookies to keep you logged in, analyze usage, and improve the
          experience. You can control cookies through your browser settings.
        </Section>

        <Section title="6. Data Retention">
          We retain your data as long as necessary to provide the Service,
          comply with legal obligations, and resolve disputes. You may request
          deletion of your data.
        </Section>

        <Section title="7. Data Security">
          We implement reasonable safeguards, but no system is 100% secure. We
          cannot guarantee absolute security.
        </Section>

        <Section title="8. Your Rights">
          Depending on your location, you may have the right to:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Access your data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion</li>
            <li>Restrict or object to processing</li>
          </ul>
        </Section>

        <Section title="9. Third-Party Services">
          Our Service may include third-party services (such as Stripe). These
          services have their own privacy policies, and we are not responsible
          for their practices.
        </Section>

        <Section title="10. Children’s Privacy">
          The Service is not intended for children under 13 (or applicable age).
          We do not knowingly collect data from children.
        </Section>

        <Section title="11. International Users">
          Your information may be transferred and processed in countries with
          different data protection laws.
        </Section>

        <Section title="12. Changes to This Policy">
          We may update this Privacy Policy. Continued use of the Service means
          you accept the updated policy.
        </Section>

        <Section title="13. Contact">
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