"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 22, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function Hero() {
  return (
    <motion.section
      variants={container}
      initial="hidden"
      animate="show"
      className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-6 pt-14 pb-24 text-center sm:pt-20 sm:pb-32"
    >
      <motion.div
        variants={item}
        className="hairline mb-8 inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-xs font-medium text-foreground/60"
      >
        <motion.span
          animate={{ rotate: [0, 15, -10, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
        >
          <Sparkles className="h-3.5 w-3.5 text-foreground/50" />
        </motion.span>
        AI Builder Lab · Phase 1
      </motion.div>

      <motion.h1
        variants={item}
        className="font-heading text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
      >
        <motion.span
          whileHover={{ x: 10 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="block text-foreground/40"
        >
          DON&apos;T TELL US
        </motion.span>
        <motion.span
          whileHover={{ x: 10 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="block text-foreground"
        >
          WHAT YOU CAN BUILD.
        </motion.span>
        <motion.span
          whileHover={{ x: 10 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="mt-2 block text-foreground"
        >
          SHOW US HOW YOU THINK.
        </motion.span>
      </motion.h1>

      <motion.p
        variants={item}
        className="mx-auto mt-8 max-w-xl text-balance text-base text-foreground/60 sm:text-lg"
      >
        No forms. No surveys. A set of real situations, your GitHub building
        history, and an AI that reads signal — not scores.
      </motion.p>

      <motion.div variants={item} className="mt-10">
        <Link
          href="/onboarding"
          className="analyze-glow group inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-4 text-sm font-semibold tracking-wide text-background transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
        >
          ENTER THE LAB
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </motion.div>

      <motion.p
        variants={item}
        className="mt-5 text-xs uppercase tracking-[0.25em] text-foreground/40"
      >
        Builder Discovery · ~7 minutes
      </motion.p>
    </motion.section>
  );
}
