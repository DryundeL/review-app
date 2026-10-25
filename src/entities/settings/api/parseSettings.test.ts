import assert from "node:assert/strict";
import test from "node:test";
import {
  parseInboxNotificationsText,
  parseNotificationSettingsText,
  parseSettingsText,
  parseUnreadCountText,
} from "./parseSettings.ts";

test("parseSettingsText accepts valid payload", () => {
  const settings = parseSettingsText(
    JSON.stringify({ language: "ru", allowNotifications: true, isProfilePrivate: false }),
  );
  assert.deepEqual(settings, {
    language: "ru",
    allowNotifications: true,
    isProfilePrivate: false,
  });
});

test("parseSettingsText rejects broken json", () => {
  assert.throws(
    () => parseSettingsText("{"),
    (error: Error) => error.name === "ApiError",
  );
});

test("parseNotificationSettingsText accepts items", () => {
  const prefs = parseNotificationSettingsText(
    JSON.stringify({
      items: [
        {
          name: "like",
          title: "Лайки",
          text: "Уведомления о лайках",
          enabled: true,
        },
      ],
    }),
  );
  assert.equal(prefs.items.length, 1);
  assert.equal(prefs.items[0]?.name, "like");
  assert.equal(prefs.items[0]?.enabled, true);
});

test("parseNotificationSettingsText rejects missing fields", () => {
  assert.throws(
    () => parseNotificationSettingsText(JSON.stringify({ items: [{ name: "like" }] })),
    (error: Error) => error.name === "ApiError",
  );
});

test("parseInboxNotificationsText accepts list", () => {
  const list = parseInboxNotificationsText(
    JSON.stringify({
      items: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          type: "like",
          title: "Лайк",
          body: "Новый лайк на ваш обзор: @ann · «Neon»",
          actorId: "22222222-2222-4222-8222-222222222222",
          reviewId: "33333333-3333-4333-8333-333333333333",
          isRead: false,
          createdAt: "2026-10-18T12:00:00Z",
        },
      ],
    }),
  );
  assert.equal(list.items.length, 1);
  assert.equal(list.items[0]?.type, "like");
  assert.equal(list.items[0]?.isRead, false);
});

test("parseUnreadCountText accepts count", () => {
  assert.deepEqual(parseUnreadCountText(JSON.stringify({ count: 3 })), { count: 3 });
});

test("settings preserves privacy and rejects unsafe boolean coercion", () => {
  const settings = { language: "ru", allowNotifications: false, isProfilePrivate: true };
  assert.deepEqual(parseSettingsText(JSON.stringify(settings)), settings);
  for (const isProfilePrivate of ["false", 1, null, undefined]) {
    assert.throws(() =>
      parseSettingsText(JSON.stringify({ ...settings, isProfilePrivate })),
    );
  }
});

test("follow request notifications have actorId and no review", () => {
  const result = parseInboxNotificationsText(
    JSON.stringify({
      items: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          type: "follow_request",
          title: "Запрос на подписку",
          body: "Новый запрос",
          actorId: "22222222-2222-4222-8222-222222222222",
          isRead: false,
          createdAt: "2026-10-25T14:00:00Z",
        },
      ],
    }),
  );
  assert.equal(result.items[0]?.reviewId, null);
  assert.equal(result.items[0]?.type, "follow_request");
});
