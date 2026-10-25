import assert from "node:assert/strict";
import test from "node:test";
import { parseFollowStateText } from "./parseProfile.ts";

test("follow status validates all three states", () => {
  for (const followStatus of ["none", "pending", "following"]) {
    const value = { followStatus, isFollowing: followStatus === "following" };
    assert.deepEqual(parseFollowStateText(JSON.stringify(value)), value);
  }
});

test("follow status rejects inconsistent or unknown states", () => {
  for (const value of [
    { followStatus: "pending", isFollowing: true },
    { followStatus: "following", isFollowing: false },
    { followStatus: "unknown", isFollowing: false },
    { followStatus: "pending", isFollowing: "false" },
  ])
    assert.throws(() => parseFollowStateText(JSON.stringify(value)));
  assert.throws(() => parseFollowStateText("{"));
});

test("public profile preserves privacy and never exposes another user's Telegram ID", async () => {
  const { parsePublicProfileText } = await import("./parseProfile.ts");
  const payload = {
    id: "11111111-1111-4111-8111-111111111111",
    username: "reviewer",
    firstName: "Имя",
    lastName: "",
    followersCount: 1,
    followingCount: 0,
    isFollowing: true,
    isMe: false,
    isProfilePrivate: true,
    followStatus: "following",
    telegramId: 12345,
  };
  const profile = parsePublicProfileText(JSON.stringify(payload));
  assert.equal(profile.isProfilePrivate, true);
  assert.equal(profile.followStatus, "following");
  assert.equal(profile.telegramId, undefined);
  assert.equal(
    parsePublicProfileText(JSON.stringify({ ...payload, isMe: true })).telegramId,
    "12345",
  );
});
