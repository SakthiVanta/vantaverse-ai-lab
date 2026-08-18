"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export function FinalCta() {
  return (
    <section className="relative z-10 mx-auto w-full max-w-3xl px-6 py-24 text-center sm:py-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="font-heading text-3xl font-semibold leading-tight sm:text-5xl">
          I want to see
          <br />
          what happens next.
        </h2>
        <div className="mt-10">
          <Link
            href="/onboarding"
            className="group inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-4 text-sm font-semibold tracking-wide text-background transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
          >
            ENTER THE LAB
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
