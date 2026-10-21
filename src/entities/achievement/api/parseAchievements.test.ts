import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseProfileAchievementsText } from "./parseAchievements.ts";

describe("parseAchievements", () => {
  it("parses list and drops bad codes", () => {
    const data = parseProfileAchievementsText(
      JSON.stringify({
        achievements: [
          {
            code: "first_review",
            title: "First review",
            description: "Publish your first review",
            progress: 100,
            current: 1,
            target: 1,
            unlockedAt: "2026-10-20T12:00:00Z",
          },
          {
            code: "../evil",
            title: "Bad",
            description: "x",
            progress: 0,
            current: 0,
            target: 1,
          },
          {
            code: "reviewer_5",
            title: "Getting started",
            description: "Publish 5 reviews",
            progress: 40,
            current: 2,
            target: 5,
          },
        ],
      }),
    );

    assert.equal(data.achievements.length, 2);
    assert.equal(data.achievements[0]?.code, "first_review");
    assert.equal(data.achievements[0]?.unlockedAt, "2026-10-20T12:00:00Z");
    assert.equal(data.achievements[1]?.code, "reviewer_5");
    assert.equal(data.achievements[1]?.unlockedAt, undefined);
  });

  it("clamps progress", () => {
    const data = parseProfileAchievementsText(
      JSON.stringify({
        achievements: [
          {
            code: "earner_100",
            title: "Earner",
            description: "Earn 100 points",
            progress: 150,
            current: 200,
            target: 100,
          },
        ],
      }),
    );
    assert.equal(data.achievements[0]?.progress, 100);
  });
  it("keeps a fractional positive target at least one", () => {
    const data = parseProfileAchievementsText(
      JSON.stringify({
        achievements: [
          {
            code: "first_review",
            title: "First",
            progress: -10,
            current: -1,
            target: 0.5,
          },
        ],
      }),
    );
    assert.equal(data.achievements[0]?.target, 1);
    assert.equal(data.achievements[0]?.current, 0);
    assert.equal(data.achievements[0]?.progress, 0);
  });

  it("rejects malformed responses and invalid achievement metadata", () => {
    const item = {
      code: "first_review",
      title: "First",
      progress: 0,
      current: 0,
      target: 1,
    };
    for (const text of [
      "{",
      "null",
      "{}",
      JSON.stringify({ achievements: [{ ...item, title: "   " }] }),
      JSON.stringify({ achievements: [{ ...item, unlockedAt: "invalid" }] }),
    ]) {
      assert.throws(() => parseProfileAchievementsText(text));
    }
  });
});
