import { describe, it, expect } from "vitest";
import { parseMentionSegments, extractMentionedNames } from "./mentions";

describe("parseMentionSegments", () => {
  it("returns a single text segment when there are no mentions", () => {
    expect(parseMentionSegments("just a normal message", ["Admin", "Sakthi"])).toEqual([
      { type: "text", value: "just a normal message" },
    ]);
  });

  it("returns a single text segment when the member list is empty", () => {
    expect(parseMentionSegments("hi @Sakthi", [])).toEqual([
      { type: "text", value: "hi @Sakthi" },
    ]);
  });

  it("extracts a single mention in the middle of a sentence", () => {
    expect(parseMentionSegments("hey @Sakthi can you look at this", ["Admin", "Sakthi"])).toEqual([
      { type: "text", value: "hey " },
      { type: "mention", value: "@Sakthi" },
      { type: "text", value: " can you look at this" },
    ]);
  });

  it("extracts multiple mentions", () => {
    expect(parseMentionSegments("@Admin and @Sakthi please review", ["Admin", "Sakthi"])).toEqual([
      { type: "mention", value: "@Admin" },
      { type: "text", value: " and " },
      { type: "mention", value: "@Sakthi" },
      { type: "text", value: " please review" },
    ]);
  });

  it("prefers the longer name when one name is a prefix of another", () => {
    expect(parseMentionSegments("cc @Ann Marie thanks", ["Ann", "Ann Marie"])).toEqual([
      { type: "text", value: "cc " },
      { type: "mention", value: "@Ann Marie" },
      { type: "text", value: " thanks" },
    ]);
  });

  it("does not treat an unknown name as a mention", () => {
    expect(parseMentionSegments("email me @gmail.com", ["Admin"])).toEqual([
      { type: "text", value: "email me @gmail.com" },
    ]);
  });

  it("escapes regex-special characters safely in member names", () => {
    expect(parseMentionSegments("hi @C++ Dev", ["C++ Dev"])).toEqual([
      { type: "text", value: "hi " },
      { type: "mention", value: "@C++ Dev" },
    ]);
  });
});

describe("extractMentionedNames", () => {
  it("returns an empty array when there are no mentions", () => {
    expect(extractMentionedNames("just a normal message", ["Admin", "Sakthi"])).toEqual([]);
  });

  it("returns the plain names (no @) for each distinct mention", () => {
    expect(extractMentionedNames("@Admin and @Sakthi please review", ["Admin", "Sakthi"])).toEqual([
      "Admin",
      "Sakthi",
    ]);
  });

  it("de-duplicates repeated mentions of the same name", () => {
    expect(extractMentionedNames("@Sakthi hey @Sakthi are you there", ["Sakthi"])).toEqual([
      "Sakthi",
    ]);
  });
});
