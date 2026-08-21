"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./marketing-landing.module.css";

const faqs = [
  {
    question: "How does one-click applying work?",
    answer:
      "Add as much information about yourself as you can. The more approved answers you save, the more application questions AI can complete. Apply Ink never invents numbers or missing facts. When your profile is ready, one click starts automatic applications for matching jobs.",
  },
  {
    question: "Are the jobs really remote worldwide?",
    answer:
      "Yes. Apply Ink shows global remote jobs that can be done from anywhere. It does not include country-only remote roles, such as jobs marked \u201cRemote \u2014 Spain only.\u201d",
  },
  {
    question: "What if an application needs me?",
    answer:
      "AI pauses that application and sends it to Messages. Open Messages from the sidebar to see which company needs another answer or a CAPTCHA. Complete that step yourself; AI handles the questions it already knows.",
  },
  {
    question: "How do you protect my information?",
    answer:
      "Apply Ink stores your account, profile, resume, and application data so the service can work. Passwords are hashed, connections use HTTPS, and sessions use secure HTTP-only cookies. AI requests ask OpenAI not to store generated responses. You can remove your resume or request deletion of your data.",
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
                      Read the Privacy Policy
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
