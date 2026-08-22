"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./marketing-landing.module.css";

const faqs = [
  {
    question: "What happens after I click Start applying?",
    answer:
      "One click starts applications for matching jobs. Apply Ink uses the details in your profile to answer application questions. The more answers you save, the fewer times it needs to pause. It does not invent numbers. If a fact is missing, it pauses.",
  },
  {
    question: "Can I work from anywhere?",
    answer:
      "Apply Ink only lists jobs marked as open worldwide. It does not include roles limited to one country, such as jobs marked \u201cRemote, Spain only.\u201d",
  },
  {
    question: "When do I need to step in?",
    answer:
      "If an employer asks a new question or shows a CAPTCHA, Apply Ink pauses and puts the application in Messages. Open it there, complete the missing step, and submit the form. Apply Ink handles the questions it already knows.",
  },
  {
    question: "How do you protect my information?",
    answer:
      "Apply Ink stores your account, profile, resume, and application data so it can run the service. Passwords are hashed, connections use HTTPS, and sessions use secure HTTP-only cookies. Requests to OpenAI ask it not to store generated responses. You can remove your resume or ask us to delete your data.",
    privacyLink: true,
  },
] as const;

export function MarketingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="border-y border-sand/80">
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index;
        const answerId = `faq-answer-${index}`;
        const buttonId = `faq-button-${index}`;

        return (
          <div
            key={faq.question}
            className={`${styles.faqItem} border-b border-sand/70 last:border-b-0`}
            data-open={isOpen}
          >
            <button
              id={buttonId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={answerId}
              className="flex w-full cursor-pointer items-center gap-4 py-6 text-left"
              onClick={() => setOpenIndex(isOpen ? null : index)}
            >
              <span className="w-7 shrink-0 font-mono text-xs font-bold text-terracotta">
                0{index + 1}
              </span>
              <span className="flex-1 text-base font-bold text-espresso sm:text-lg">
                {faq.question}
              </span>
              <span
                aria-hidden="true"
                className={`${styles.faqToggle} flex size-8 shrink-0 items-center justify-center rounded-full border border-sand text-xl font-light text-sienna`}
              >
                +
              </span>
            </button>
            <div
              id={answerId}
              role="region"
              aria-labelledby={buttonId}
              aria-hidden={!isOpen}
              className={styles.faqAnswer}
            >
              <div className={styles.faqAnswerInner}>
                <div className="pr-2 pb-6 pl-11 sm:pr-12">
                  <p className="text-sm leading-7 text-espresso/62">
                    {faq.answer}
                  </p>
                  {"privacyLink" in faq && faq.privacyLink && (
                    <Link
                      href="/privacy"
                      tabIndex={isOpen ? undefined : -1}
                      className="mt-3 inline-flex text-sm font-bold text-sienna underline decoration-sienna/30 underline-offset-4 transition-colors hover:text-espresso"
                    >
                      Read our Privacy Policy
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
