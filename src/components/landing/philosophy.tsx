"use client";

import { motion } from "motion/react";

export function Philosophy() {
  return (
    <section className="relative z-10 mx-auto w-full max-w-4xl px-6 py-20 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15%" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur-sm sm:p-12"
      >
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-vv-cyan">
          There are no right answers
        </p>
        <p className="mt-4 text-balance font-heading text-2xl font-medium leading-snug text-foreground/90 sm:text-3xl">
          We&apos;re not running a personality test. We&apos;re interested in how you
          approach problems, decisions, and possibilities — and what you&apos;ve
          actually built.
        </p>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-foreground/50">
          You&apos;re not filling out a form. You&apos;re entering the Lab —
          seven situations, your building history, and an AI that looks for
          signal, not a score.
        </p>
      </motion.div>
    </section>
  );
}
