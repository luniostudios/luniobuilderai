"use client";

import Link from "next/link";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-2xl p-8">
        <h1 className="text-4xl font-bold mb-2 text-gray-900">
          Terms of Service
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Last updated: May 2026
        </p>

        <Section title="1. Acceptance of Terms">
          By accessing or using LUNIO Builder (“Service”), you agree to be bound
          by these Terms. If you do not agree, you may not use the Service.
        </Section>

        <Section title="2. Description of Service">
          LUNIO Builder provides tools to create, design, and publish websites,
          including hosting, subdomains, templates, a drag-and-drop editor, integrations, 
          and paid features. We may modify or discontinue the Service at any
          time.
        </Section>

        <Section title="3. User Accounts">
          <ul className="list-disc ml-6 space-y-1">
            <li>You must provide accurate account information</li>
            <li>You are responsible for maintaining account security</li>
            <li>You are responsible for all activity under your account</li>
          </ul>
        </Section>

        <Section title="4. User Content">
          You retain ownership of your content. By using the Service, you grant
          us a worldwide, non-exclusive, royalty-free license to host, store,
          and display your content.
          <br />
          <br />
          You agree not to upload content that is illegal, harmful, or infringes
          on intellectual property rights.
        </Section>

        <Section title="5. Subdomains and Hosting">
          We may assign subdomains under{" "}
          <span className="font-mono">luniobuilder.com</span>. We reserve the
          right to suspend or reclaim subdomains at our discretion. We do not
          guarantee uptime or data preservation.
        </Section>

        <Section title="6. Acceptable Use">
          <ul className="list-disc ml-6 space-y-1">
            <li>No illegal or fraudulent use</li>
            <li>No malware or harmful code</li>
            <li>No unauthorized system access</li>
            <li>No interference with other users</li>
          </ul>
        </Section>

        <Section title="7. Intellectual Property">
          All platform features, templates, and software are owned by LUNIO
          Builder or its licensors. You may not copy, modify, reverse engineer,
          or resell the Service without permission.
        </Section>

        <Section title="8. Payments and Subscriptions">
          Paid features are processed via Stripe.
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Subscriptions are billed in advance (monthly or yearly)</li>
            <li>All payments are non-refundable unless required by law</li>
            <li>Subscriptions automatically renew unless canceled</li>
            <li>You can cancel anytime via your account settings</li>
          </ul>

          <p className="mt-3">
            If payment fails, we may suspend your access until resolved. Pricing
            may change with notice.
          </p>
        </Section>

        <Section title="9. Termination">
          We may suspend or terminate your account if you violate these Terms or
          if required to protect the platform or users.
        </Section>

        <Section title="10. Disclaimer of Warranties">
          The Service is provided “as is” without warranties of any kind. We do
          not guarantee uptime, security, or that the Service meets your needs.
        </Section>

        <Section title="11. Limitation of Liability">
          LUNIO Builder is not liable for indirect or consequential damages,
          including loss of data, revenue, or business opportunities.
        </Section>

        <Section title="12. Privacy">
          Your use of the Service is also governed by our Privacy Policy.
        </Section>

        <Section title="13. Changes to Terms">
          We may update these Terms at any time. Continued use of the Service
          constitutes acceptance of the updated Terms.
        </Section>

        <Section title="14. Governing Law">
          These Terms are governed by the laws of [Puerto Rico / United States].
        </Section>

        <Section title="15. Contact">
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