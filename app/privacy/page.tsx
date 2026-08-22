import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalDocument,
  LegalSection,
} from "@/components/legal-document";
import { SiteHeader } from "@/components/site-header";

const CONTACT_EMAIL = "torniketsagareishvili64@gmail.com";

export const metadata: Metadata = {
  title: "Privacy Policy | Apply Ink",
  description:
    "How Apply Ink collects, uses, stores, and shares account, resume, and job application data.",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <LegalDocument
        title="Privacy Policy"
        description="This policy explains what Apply Ink does with your information when you create a profile, upload a resume, use Google sign-in, or start a job application."
        updated="August 22, 2026"
      >
        <LegalSection title="1. Who this policy covers">
          <p>
            This policy applies to the Apply Ink website and job-application
            features. Apply Ink helps you find global remote jobs, tailor your
            resume, complete known form fields, and track applications.
          </p>
        </LegalSection>

        <LegalSection title="2. Information we collect">
          <ul className="list-disc space-y-2 pl-5 marker:text-terracotta">
            <li>
              <strong>Account information:</strong> your email address, first
              and last name, password hash, and account timestamps.
            </li>
            <li>
              <strong>Google sign-in information:</strong> your Google account
              identifier, verified email address, first name, and last name.
              Apply Ink requests only the <code>openid</code>, <code>email</code>,
              and <code>profile</code> scopes. It does not request access to
              Gmail, Google Drive, or your Google contacts.
            </li>
            <li>
              <strong>Candidate information:</strong> your phone number,
              location, LinkedIn, GitHub, portfolio, resume file and extracted
              resume text, skills, introduction, and job-application answers.
            </li>
            <li>
              <strong>Optional information:</strong> work authorization,
              sponsorship, experience answers, and voluntary demographic,
              veteran, or disability answers. You may leave optional answers
              blank.
            </li>
            <li>
              <strong>Application activity:</strong> jobs you act on,
              application status, generated resumes, submission method, and
              feature-usage limits.
            </li>
          </ul>
          <p>
            Apply Ink uses essential cookies to keep you signed in, protect the
            Google sign-in flow, and prevent unauthorized requests. Hosting and
            security providers may also process technical information such as
            IP address, browser type, and request logs.
          </p>
        </LegalSection>

        <LegalSection title="3. How we use information">
          <ul className="list-disc space-y-2 pl-5 marker:text-terracotta">
            <li>Create, secure, and maintain your account.</li>
            <li>Read your resume and prefill facts that you can review.</li>
            <li>Match jobs to your skills and choices.</li>
            <li>Create truthful, job-specific resumes and introductions.</li>
            <li>
              Fill or submit application information when you start an
              application or enable an approved automation setting.
            </li>
            <li>Record results, enforce usage limits, and diagnose failures.</li>
          </ul>
          <p>
            Apply Ink does not sell your personal information or use your
            Google account information for advertising.
          </p>
        </LegalSection>

        <LegalSection title="4. How Google user data is handled">
          <p>
            When you choose Google sign-in, Apply Ink uses your Google account
            identifier, verified email, and name to create or link your Apply
            Ink account, sign you in, prefill your basic candidate profile, and
            prepare applications you authorize.
          </p>
          <p>
            These Google details are stored with your Apply Ink account. They
            are shared only with service providers needed to operate Apply Ink
            and with employers or applicant-tracking systems when you direct or
            authorize Apply Ink to prepare or send an application. They are not
            sold, rented, or used to build advertising profiles.
          </p>
        </LegalSection>

        <LegalSection title="5. AI processing and other service providers">
          <p>
            Apply Ink relies on providers that process information only to
            deliver their part of the service. These currently include Vercel
            for hosting, Neon for PostgreSQL storage, Google for authentication
            and optional scanned-resume recognition through Cloud Vision, and
            OpenAI for optional resume extraction and tailoring features.
          </p>
          <p>
            When an AI feature is used, relevant resume text, eligible skills,
            and job information may be sent to OpenAI to produce structured
            profile answers or a tailored resume. Apply Ink requests that these
            generated responses are not stored as OpenAI Responses API objects.
          </p>
          <p>
            When you start or authorize an application, relevant candidate data
            may be sent to the employer, its job site, or its applicant-tracking
            provider, such as Greenhouse or Workable. Those third parties handle
            the information under their own privacy policies.
          </p>
        </LegalSection>

        <LegalSection title="6. Your choices and control">
          <ul className="list-disc space-y-2 pl-5 marker:text-terracotta">
            <li>You can review and edit profile answers before using them.</li>
            <li>You can replace or remove your stored resume.</li>
            <li>You can keep automatic final submission turned off.</li>
            <li>You can leave optional and sensitive questions unanswered.</li>
            <li>
              You can request access, correction, or deletion by emailing{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-semibold text-sienna underline decoration-sienna/30 underline-offset-4"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="7. Retention and security">
          <p>
            Account, profile, resume, generated-resume, and application data is
            kept while your account is active or while it is needed to provide
            the service. Apply Ink will delete or anonymize information after a
            valid deletion request unless it must be kept for security, fraud
            prevention, dispute resolution, or legal compliance.
          </p>
          <p>
            Apply Ink uses access controls, encrypted HTTPS connections,
            password hashing, and secure HTTP-only session cookies. No internet
            service can guarantee absolute security.
          </p>
        </LegalSection>

        <LegalSection title="8. International processing">
          <p>
            Apply Ink and its providers may process information in countries
            other than the country where you live. Privacy protections may
            differ between those countries.
          </p>
        </LegalSection>

        <LegalSection title="9. Changes and contact">
          <p>
            This policy may change as Apply Ink develops. Material updates will
            be posted on this page with a new last-updated date.
          </p>
          <p>
            Questions or privacy requests can be sent to{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold text-sienna underline decoration-sienna/30 underline-offset-4"
            >
              {CONTACT_EMAIL}
            </a>
            . You can also review the <Link href="/terms">Terms of Service</Link>.
          </p>
        </LegalSection>
      </LegalDocument>
    </>
  );
}
