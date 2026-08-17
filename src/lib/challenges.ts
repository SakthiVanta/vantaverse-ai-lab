export type ChallengeKey =
  | "the_unknown"
  | "the_clock"
  | "the_failure"
  | "the_conflict"
  | "the_wildcard"
  | "the_tradeoff"
  | "the_problem"
  | "closing";

export type ChallengeCard = { id: string; label: string };

export type Challenge =
  | {
      key: ChallengeKey;
      index: number;
      title: string;
      type: "choice-with-reason";
      situation: string;
      prompt: string;
      cards: ChallengeCard[];
      reasonPrompt: string;
    }
  | {
      key: ChallengeKey;
      index: number;
      title: string;
      type: "rank-and-reflect";
      situation: string;
      prompt: string;
      cards: ChallengeCard[];
      rankCount: number;
      reflectPrompt: string;
    }
  | {
      key: ChallengeKey;
      index: number;
      title: string;
      type: "choice-with-sentence";
      situation: string;
      prompt: string;
      cards: ChallengeCard[];
      sentenceStem: string;
    }
  | {
      key: ChallengeKey;
      index: number;
      title: string;
      type: "sequence";
      situation: string;
      prompt: string;
      cards: ChallengeCard[];
      sequenceLength: number;
    }
  | {
      key: ChallengeKey;
      index: number;
      title: string;
      type: "freeform";
      situation: string;
      prompt: string;
      helperText?: string;
    }
  | {
      key: ChallengeKey;
      index: number;
      title: string;
      type: "tradeoff-with-reason";
      situation: string;
      prompt: string;
      cards: ChallengeCard[];
      reasonPrompt: string;
    }
  | {
      key: ChallengeKey;
      index: number;
      title: string;
      type: "problem-form";
      situation: string;
      prompt: string;
      fields: { id: string; label: string; placeholder?: string }[];
    }
  | {
      key: ChallengeKey;
      index: number;
      title: string;
      type: "sentence-complete";
      situation: string;
      sentenceStem: string;
    };

export const CHALLENGES: Challenge[] = [
  {
    key: "the_unknown",
    index: 1,
    title: "THE UNKNOWN",
    type: "choice-with-reason",
    situation:
      "You have an AI idea. It sounds exciting. But you don't know whether anyone actually needs it. You have one day.",
    prompt: "What do you do first?",
    cards: [
      { id: "build", label: "BUILD" },
      { id: "talk", label: "TALK" },
      { id: "research", label: "RESEARCH" },
      { id: "find_partner", label: "FIND A PARTNER" },
      { id: "rethink", label: "RETHINK THE PROBLEM" },
    ],
    reasonPrompt: "What's the main reason you chose that?",
  },
  {
    key: "the_clock",
    index: 2,
    title: "THE CLOCK",
    type: "rank-and-reflect",
    situation:
      "Your team has 48 hours. You can only accomplish ONE major outcome.",
    prompt: "Drag your top three into 1, 2, 3.",
    cards: [
      { id: "prototype", label: "Working prototype" },
      { id: "real_user", label: "Real user" },
      { id: "technical_breakthrough", label: "Technical breakthrough" },
      { id: "beautiful_experience", label: "Beautiful experience" },
      { id: "business_validation", label: "Business validation" },
      { id: "deep_research", label: "Deep research" },
    ],
    rankCount: 3,
    reflectPrompt: "What did you deliberately leave behind?",
  },
  {
    key: "the_failure",
    index: 3,
    title: "THE FAILURE",
    type: "choice-with-sentence",
    situation:
      "You spent five days building. You finally show it to people. Nobody cares.",
    prompt: "What do you do?",
    cards: [
      { id: "talk_to_users", label: "Talk to users" },
      { id: "improve_product", label: "Improve the product" },
      { id: "change_target_user", label: "Change the target user" },
      { id: "change_idea", label: "Change the idea" },
      { id: "start_new", label: "Start something new" },
      { id: "find_out_why", label: "Find out why" },
    ],
    sentenceStem: "Before I make another decision, I would ______.",
  },
  {
    key: "the_conflict",
    index: 4,
    title: "THE CONFLICT",
    type: "sequence",
    situation:
      "You and another builder strongly disagree. You both think the other person is missing something. The deadline is tomorrow.",
    prompt: "Arrange your approach in order — what would you do first, second, third?",
    cards: [
      { id: "argue_case", label: "Argue your case" },
      { id: "test_both", label: "Test both ideas" },
      { id: "ask_users", label: "Ask users" },
      { id: "ask_team", label: "Ask the team" },
      { id: "redefine_problem", label: "Redefine the problem" },
      { id: "compromise", label: "Compromise" },
      { id: "choose_quickly", label: "Choose quickly" },
      { id: "step_back", label: "Step back" },
    ],
    sequenceLength: 3,
  },
  {
    key: "the_wildcard",
    index: 5,
    title: "THE WILDCARD",
    type: "freeform",
    situation:
      "You wake up tomorrow with access to an AI capability that almost nobody has discovered yet. You have 24 hours.",
    prompt: "What would you try?",
    helperText: "Don't try to sound impressive. Give us your first genuine idea.",
  },
  {
    key: "the_tradeoff",
    index: 6,
    title: "THE TRADEOFF",
    type: "tradeoff-with-reason",
    situation: "Four worlds appear. You can only choose one.",
    prompt: "Which one?",
    cards: [
      { id: "learn", label: "LEARN — Become significantly better at something." },
      { id: "build", label: "BUILD — Turn an idea into something real." },
      { id: "help", label: "HELP — Solve a meaningful problem for someone." },
      { id: "win", label: "WIN — Create something people actually want." },
    ],
    reasonPrompt: "Why did you sacrifice the others?",
  },
  {
    key: "the_problem",
    index: 7,
    title: "THE PROBLEM",
    type: "problem-form",
    situation:
      "Forget AI. Think about your normal life. Something annoying. Something inefficient. Something people repeatedly struggle with.",
    prompt: "What would you fix if you could?",
    fields: [
      { id: "description", label: "What would you fix if you could?" },
      { id: "who", label: "Who experiences this problem?" },
      { id: "why", label: "Why do you think it matters?" },
    ],
  },
  {
    key: "closing",
    index: 8,
    title: "ONE FINAL THING",
    type: "sentence-complete",
    situation: "One final thing.",
    sentenceStem: "If I had the right people around me, I would love to ______.",
  },
];

export function getChallenge(key: ChallengeKey): Challenge | undefined {
  return CHALLENGES.find((c) => c.key === key);
}

export const TOTAL_CHALLENGES = CHALLENGES.filter((c) => c.key !== "closing").length;
