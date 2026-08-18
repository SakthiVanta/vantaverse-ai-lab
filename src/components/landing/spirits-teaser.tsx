"use client";

import { motion } from "motion/react";
import { SPIRITS } from "@/lib/spirits";

export function SpiritsTeaser() {
  return (
    <section className="relative z-10 mx-auto w-full max-w-4xl px-6 py-20 sm:py-28">
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center text-xs font-medium uppercase tracking-[0.25em] text-foreground/40"
      >
        Choose Your Spirit
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mt-3 text-center font-heading text-2xl font-semibold sm:text-3xl"
      >
        Don&apos;t think too much.
      </motion.h2>

      <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
        {SPIRITS.map((spirit, i) => (
          <motion.div
            key={spirit.id}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.5, delay: i * 0.04 }}
            whileHover={{ y: -6, scale: 1.08 }}
            className="hairline flex h-16 w-16 items-center justify-center rounded-2xl bg-card text-2xl sm:h-20 sm:w-20 sm:text-3xl"
          >
            {spirit.emoji}
          </motion.div>
        ))}
      </div>
      <p className="mx-auto mt-8 max-w-sm text-balance text-center text-sm text-foreground/45">
        Its meaning stays with you — for now.
      </p>
    </section>
  );
}
