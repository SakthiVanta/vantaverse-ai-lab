"use client";

import { motion } from "motion/react";

const CHALLENGE_NAMES = [
  "THE UNKNOWN",
  "THE CLOCK",
  "THE FAILURE",
  "THE CONFLICT",
  "THE WILDCARD",
  "THE TRADEOFF",
  "THE PROBLEM",
];

export function ChallengesTeaser() {
  return (
    <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-20 sm:py-28">
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center text-xs font-medium uppercase tracking-[0.25em] text-foreground/40"
      >
        Seven Situations
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mt-3 text-center font-heading text-2xl font-semibold sm:text-3xl"
      >
        Not multiple choice. Not a quiz.
      </motion.h2>

      <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {CHALLENGE_NAMES.map((name, i) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.5, delay: (i % 4) * 0.06 }}
            whileHover={{ y: -3 }}
            className="hairline group relative flex aspect-[4/3] flex-col items-center justify-center overflow-hidden rounded-2xl bg-card p-4 text-center transition-colors duration-300 hover:bg-accent"
          >
            <span className="relative z-10 font-heading text-sm font-semibold tracking-wide text-foreground/70 transition-colors group-hover:text-foreground sm:text-base">
              {name}
            </span>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex aspect-[4/3] flex-col items-center justify-center rounded-2xl border border-dashed border-border p-4 text-center"
        >
          <span className="text-2xl">🎲</span>
          <span className="mt-2 text-xs text-foreground/40">
            + one final thing
          </span>
        </motion.div>
      </div>
    </section>
  );
}
