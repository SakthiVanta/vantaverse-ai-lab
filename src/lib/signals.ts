export const SIGNAL_DIMENSIONS = [
  "exploration",
  "execution",
  "problem_discovery",
  "adaptability",
  "user_orientation",
  "technical_building",
  "creative_thinking",
  "collaboration",
  "learning_orientation",
  "product_orientation",
] as const;

export type SignalDimension = (typeof SIGNAL_DIMENSIONS)[number];

export const SIGNAL_LABELS: Record<SignalDimension, string> = {
  exploration: "Exploration",
  execution: "Execution",
  problem_discovery: "Problem Discovery",
  adaptability: "Adaptability",
  user_orientation: "User Orientation",
  technical_building: "Technical Building",
  creative_thinking: "Creative Thinking",
  collaboration: "Collaboration",
  learning_orientation: "Learning Orientation",
  product_orientation: "Product Orientation",
};

export const ARCHETYPES = [
  "The Explorer",
  "The Experimenter",
  "The Maker",
  "The Problem Hunter",
  "The Architect",
  "The Creator",
  "The Connector",
  "The Strategist",
] as const;
