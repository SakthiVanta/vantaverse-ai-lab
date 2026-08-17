export type Spirit = {
  id: string;
  emoji: string;
  name: string;
};

export const SPIRITS: Spirit[] = [
  { id: "fox", emoji: "🦊", name: "Fox" },
  { id: "wolf", emoji: "🐺", name: "Wolf" },
  { id: "owl", emoji: "🦉", name: "Owl" },
  { id: "octopus", emoji: "🐙", name: "Octopus" },
  { id: "dragon", emoji: "🐉", name: "Dragon" },
  { id: "eagle", emoji: "🦅", name: "Eagle" },
  { id: "shark", emoji: "🦈", name: "Shark" },
  { id: "cat", emoji: "🐈", name: "Cat" },
  { id: "butterfly", emoji: "🦋", name: "Butterfly" },
  { id: "panda", emoji: "🐼", name: "Panda" },
];

export function getSpiritById(id: string): Spirit | undefined {
  return SPIRITS.find((s) => s.id === id);
}
