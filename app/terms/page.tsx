import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalDocument,
  LegalSection,
} from "@/components/legal-document";
import { SiteHeader } from "@/components/site-header";

const CONTACT_EMAIL = "torniketsagareishvili64@gmail.com";

export const metadata: Metadata = {
  title: "Terms of Service | Apply Ink",
  description:
    "The rules for accounts, AI-assisted resumes, and job applications made with Apply Ink.",
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <LegalDocument
        title="Terms of Service"
        description="These terms explain the rules for using Apply Ink to find jobs, prepare application materials, fill forms, and submit supported applications."
        updated="August 22, 2026"
      >
        <LegalSection title="1. Accepting these terms">
          <p>
            By creating an account or using Apply Ink, you agree to these terms
            and the <Link href="/privacy">Privacy Policy</Link>. If you do not
            agree, do not create an account or start an application.
          </p>
          <p>
            You must be at least 18 years old and legally able to enter this
            agreement where you live.
          </p>
        </LegalSection>

        <LegalSection title="2. What Apply Ink provides">
          <p>
            Apply Ink is an evolving job-search service. It can collect remote
            job listings, match them to your profile, read your resume, suggest
            reusable answers, prepare job-specific resumes, fill supported form
            fields, and record application outcomes.
          </p>
          <p>
            Some employer systems support direct submission. Other forms require
            you to review information, answer a new question, complete a CAPTCHA,
            or click the final submit button yourself.
          </p>
        </LegalSection>

        <LegalSection title="3. Your account and information">
          <ul className="list-disc space-y-2 pl-5 marker:text-terracotta">
            <li>Provide accurate account and candidate information.</li>
            <li>Use only a resume and information you have the right to use.</li>
            <li>Keep your sign-in credentials secure.</li>
            <li>Review important profile answers and application materials.</li>
            <li>Update information that becomes inaccurate or outdated.</li>
          </ul>
          <p>
            You are responsible for the truthfulness of information submitted
            in your name. Apply Ink is designed not to invent qualifications,
            but automated extraction and generation can still make mistakes.
          </p>
        </LegalSection>

        <LegalSection title="4. Authorization for application actions">
          <p>
            When you click an application action, start a batch, or enable an
            automatic submission setting, you authorize Apply Ink to use the
            profile information and application materials you approved for the
            selected jobs. This may include sending your name, contact details,
            links, resume, introduction, and relevant answers to employers and
            their applicant-tracking providers.
          </p>
          <p>
            Apply Ink pauses when required information is missing, a question is
            unsupported, a sensitive choice requires you, a CAPTCHA appears, or
            a third-party system does not allow direct submission. Apply Ink does
            not promise that every form can be completed automatically.
          </p>
        </LegalSection>

        <LegalSection title="5. AI-generated material">
          <p>
            AI features are used to organize facts, identify supported skills,
            and adapt application materials to a role. AI output is not a
            guarantee of accuracy, job suitability, or employer acceptance.
            Review any material that could affect your application.
          </p>
          <p>
            Do not use Apply Ink to fabricate experience, credentials, identity,
            work authorization, demographic answers, or any other material fact.
          </p>
        </LegalSection>

        <LegalSection title="6. Third-party jobs and services">
          <p>
            Job listings, employer pages, and applicant-tracking systems are
            operated by third parties. Apply Ink does not control their content,
            availability, hiring decisions, privacy practices, or terms. A job
            listing may be changed, closed, duplicated, or inaccurate.
          </p>
          <p>
            Apply Ink does not guarantee interviews, offers, employment, salary,
            response times, or any specific application result.
          </p>
        </LegalSection>

        <LegalSection title="7. Acceptable use">
          <p>You may not use Apply Ink to:</p>
          <ul className="list-disc space-y-2 pl-5 marker:text-terracotta">
            <li>impersonate another person or submit information for them;</li>
            <li>send knowingly false, misleading, or unlawful applications;</li>
            <li>bypass CAPTCHAs, access controls, or employer restrictions;</li>
            <li>attack, disrupt, reverse engineer, or overload the service; or</li>
            <li>violate applicable law or third-party rights.</li>
          </ul>
        </LegalSection>

        <LegalSection title="8. Availability and account action">
          <p>
            Features may change, pause, or stop while Apply Ink is developed.
            Access may be limited or suspended when needed to protect users,
            employers, providers, or the service, or when these terms are
            violated.
          </p>
        </LegalSection>

        <LegalSection title="9. Disclaimers and responsibility">
          <p>
            Apply Ink is provided on an “as is” and “as available” basis to the
            extent permitted by law. Apply Ink disclaims warranties that the
            service will always be uninterrupted, error-free, or suitable for a
            particular role or employer.
          </p>
          <p>
            To the extent permitted by law, Apply Ink is not liable for indirect,
            incidental, special, consequential, or lost-opportunity damages
            arising from use of the service or a third-party hiring process.
            Rights that cannot legally be excluded remain unaffected.
          </p>
        </LegalSection>

        <LegalSection title="10. Changes and contact">
          <p>
            These terms may be updated as the service changes. Material updates
            will be posted here with a new last-updated date. Continued use after
            an update means you accept the revised terms.
          </p>
          <p>
            Questions about these terms can be sent to{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold text-sienna underline decoration-sienna/30 underline-offset-4"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </LegalSection>
      </LegalDocument>
    </>
  );
}
