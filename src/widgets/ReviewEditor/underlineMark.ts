import { Mark } from "@tiptap/core";

export const UnderlineMark = Mark.create({
  name: "underline",
  parseHTML: () => [{ tag: "u" }],
  renderHTML: () => ["u", 0],
});
