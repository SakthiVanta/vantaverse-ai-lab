"use client";

import { motion } from "motion/react";

const STEPS = [
  "JOIN",
  "DISCOVER",
  "UNDERSTAND",
  "CONNECT",
  "CHALLENGE",
  "BUILD",
];

export function TheLoop() {
  return (
    <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-20 sm:py-28">
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center text-xs font-medium uppercase tracking-[0.25em] text-foreground/40"
      >
        The Vantaverse Loop
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mt-3 text-center font-heading text-2xl font-semibold sm:text-3xl"
      >
        This is just the first snapshot.
      </motion.h2>

      <div className="mt-14 flex flex-wrap items-center justify-center gap-3 sm:gap-2">
        {STEPS.map((step, i) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.07 }}
            className="flex items-center gap-2 sm:gap-3"
          >
            <span className="hairline rounded-full bg-card px-4 py-2 text-xs font-semibold tracking-wide text-foreground/70 sm:text-sm">
              {step}
            </span>
            {i < STEPS.length - 1 && (
              <span className="text-foreground/20">→</span>
            )}
          </motion.div>
        ))}
      </div>
      <p className="mx-auto mt-8 max-w-md text-balance text-center text-sm text-foreground/45">
        Your Builder Identity evolves every cycle — onboarding, GitHub,
        assignments, collaboration.
      </p>
    </section>
  );
}
