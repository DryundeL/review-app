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
    JSON.stringify({ language: "ru", notificationsMuted: false }),
  );
  assert.deepEqual(settings, { language: "ru", notificationsMuted: false });
});

test("parseSettingsText rejects broken json", () => {
  assert.throws(() => parseSettingsText("{"), (error: Error) => error.name === "ApiError");
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
