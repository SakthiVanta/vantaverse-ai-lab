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
          <span className="text-gradient">what happens next.</span>
        </h2>
        <div className="mt-10">
          <Link
            href="/onboarding"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-vv-violet via-vv-magenta to-vv-cyan bg-[length:200%_100%] bg-[position:0%_0%] px-8 py-4 text-sm font-semibold tracking-wide text-white shadow-[0_0_40px_-8px_var(--vv-violet)] transition-[background-position,transform] duration-500 ease-out hover:bg-[position:100%_0%] hover:scale-[1.03] active:scale-[0.98]"
          >
            ENTER THE LAB
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
