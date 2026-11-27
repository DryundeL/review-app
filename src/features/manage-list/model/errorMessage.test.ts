import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createResultMessage,
  fieldReasonMessage,
  ownerActionMessage,
  publishFieldMessage,
} from "./errorMessage.ts";

const base = { status: 422, code: "VALIDATION_ERROR", message: "invalid input" };

test("publishFieldMessage нумерует элементы с единицы", () => {
  assert.equal(publishFieldMessage("items.image", 2), "Не хватает: картинки у элемента 3");
  assert.equal(publishFieldMessage("title"), "Не хватает: названия");
  assert.equal(publishFieldMessage("items"), "Не хватает: элементов");
  assert.equal(publishFieldMessage("unknown"), null);
});

test("ownerActionMessage: модерация и конфликт ревизии", () => {
  assert.equal(
    ownerActionMessage({ status: 403, code: "HIDDEN_BY_MODERATOR", message: "x" }, "other"),
    "Скрыто модератором",
  );
  assert.equal(
    ownerActionMessage({ status: 409, code: "REVISION_CONFLICT", message: "x" }, "publish"),
    "Объект изменился, обновите страницу",
  );
});

test("ownerActionMessage: 422 расшифровывается только при публикации", () => {
  const error = { ...base, details: { field: "items.title", index: 0 } };
  assert.equal(ownerActionMessage(error, "publish"), "Не хватает: названия у элемента 1");
  assert.equal(ownerActionMessage(error, "other"), "invalid input");
  assert.equal(
    ownerActionMessage({ ...base, details: { field: "weird" } }, "publish"),
    "invalid input",
  );
});

test("createResultMessage", () => {
  assert.equal(
    createResultMessage({ status: 409, code: "CONFLICT", message: "x" }),
    "Сначала опубликуйте шаблон",
  );
  assert.equal(
    createResultMessage({ status: 403, code: "HIDDEN_BY_MODERATOR", message: "x" }),
    "Шаблон скрыт модератором",
  );
  assert.equal(
    createResultMessage({ status: 422, code: "QUOTA_EXCEEDED", message: "x" }),
    "Достигнут лимит: 200 топов",
  );
  assert.equal(createResultMessage({ status: 429, code: "RATE_LIMITED", message: "slow" }), "slow");
});

test("fieldReasonMessage", () => {
  assert.equal(fieldReasonMessage("required"), "Обязательное поле");
  assert.equal(fieldReasonMessage("too_long"), "Слишком длинно");
  assert.equal(fieldReasonMessage("too_many"), "Слишком много");
  assert.equal(fieldReasonMessage("duplicate"), "Повторяется");
  assert.equal(fieldReasonMessage("immutable"), "Нельзя изменить после публикации");
  assert.equal(fieldReasonMessage("invalid"), "Неверное значение");
  assert.equal(fieldReasonMessage("type_mismatch"), "Другой тип произведения");
  assert.equal(fieldReasonMessage("weird"), null);
  assert.equal(fieldReasonMessage(undefined), null);
});
