"use client";

import { useState, type KeyboardEvent } from "react";

type SkillsInputProps = {
  value: string[];
  onChange: (skills: string[]) => void;
};

export function SkillsInput({ value, onChange }: SkillsInputProps) {
  const [draft, setDraft] = useState("");

  function addSkills(raw: string) {
    const additions = raw
      .split(/[,;\n]/)
      .map((skill) => skill.trim().slice(0, 80))
      .filter(Boolean);
    if (additions.length === 0) return;
    const merged = [...value];
    for (const skill of additions) {
      if (!merged.some((current) => current.toLowerCase() === skill.toLowerCase())) {
        merged.push(skill);
      }
    }
    onChange(merged.slice(0, 50));
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addSkills(draft);
    }
    if (event.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div>
      <input type="hidden" name="skills" value={JSON.stringify(value)} readOnly />
      <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-sand bg-surface px-3 py-2 focus-within:border-terracotta">
        {value.map((skill) => (
          <span
            key={skill.toLowerCase()}
            className="inline-flex items-center gap-1.5 rounded-full bg-sand/55 px-2.5 py-1 text-xs font-semibold text-espresso"
          >
            {skill}
            <button
              type="button"
              aria-label={`Remove ${skill}`}
              onClick={() =>
                onChange(value.filter((current) => current !== skill))
              }
              className="text-espresso/45 hover:text-sienna"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          aria-label="Add a skill"
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addSkills(draft)}
          placeholder={value.length ? "Add another skill" : "TypeScript, Figma, Product strategy..."}
          className="min-w-48 flex-1 border-0 bg-transparent py-1 text-sm text-espresso outline-none placeholder:text-espresso/35"
        />
      </div>
      <p className="mt-1.5 text-xs font-normal leading-5 text-espresso/50">
        Press Enter or comma to add a skill. CV-detected skills appear automatically;
        remove anything you do not want AI to use.
      </p>
    </div>
  );
}
