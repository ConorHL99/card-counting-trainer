"use client";

import { motion, AnimatePresence } from "motion/react";
import type { RoundResultEntry } from "@/hooks/usePlayMode";
import type { HandOutcome } from "@/lib/blackjack";

const OUTCOME_BANNER: Record<HandOutcome, { text: string; tone: "win" | "loss" | "push" }> = {
  blackjack: { text: "BLACKJACK!", tone: "win" },
  win: { text: "YOU WIN", tone: "win" },
  push: { text: "PUSH", tone: "push" },
  loss: { text: "DEALER WINS", tone: "loss" },
  bust: { text: "BUST", tone: "loss" },
  surrender: { text: "SURRENDERED", tone: "loss" },
};

const TONE_STYLES: Record<"win" | "loss" | "push", string> = {
  win: "bg-success text-felt-950",
  loss: "bg-danger text-felt-950",
  push: "bg-gold-500 text-felt-950",
};

interface RoundResultBannerProps {
  results: RoundResultEntry[];
}

/**
 * A large, animated, color-coded banner for the round outcome — the
 * per-hand table label ("You: 20 — Win") is still there for detail,
 * but this is what makes the result "straight away obvious" at a
 * glance, per your feedback. Split rounds (multiple hands) fall back
 * to a net-based win/loss/push summary since there's no single
 * outcome to headline.
 *
 * Renders as a plain inline block — the caller (PlayModeView) is
 * responsible for positioning it as an absolute overlay on top of the
 * table rather than letting it push the table down, so it doesn't
 * shift the position of anything below it (Deal/Next Hand etc.) every
 * time a round resolves. See MISTAKES.md.
 */
export function RoundResultBanner({ results }: RoundResultBannerProps) {
  if (results.length === 0) return null;

  const net = results.reduce((sum, r) => sum + (r.payout - r.bet), 0);
  const netLabel = net > 0 ? `+$${net}` : net < 0 ? `-$${Math.abs(net)}` : "±$0";

  let text: string;
  let tone: "win" | "loss" | "push";
  if (results.length === 1) {
    ({ text, tone } = OUTCOME_BANNER[results[0].outcome]);
  } else {
    tone = net > 0 ? "win" : net < 0 ? "loss" : "push";
    text = tone === "win" ? "YOU WIN" : tone === "loss" ? "DEALER WINS" : "PUSH";
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${text}-${netLabel}`}
        initial={{ opacity: 0, scale: 0.75, y: -12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
        className={`flex w-fit flex-col items-center gap-0.5 rounded-card px-6 py-3 shadow-xl ${TONE_STYLES[tone]}`}
      >
        <span className="text-2xl font-extrabold tracking-wide sm:text-3xl">{text}</span>
        <span className="text-sm font-semibold opacity-90">{netLabel}</span>
      </motion.div>
    </AnimatePresence>
  );
}
