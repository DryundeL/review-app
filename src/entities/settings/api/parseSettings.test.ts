import assert from "node:assert/strict";
import test from "node:test";
import { parseNotificationSettingsText, parseSettingsText } from "./parseSettings.ts";

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
