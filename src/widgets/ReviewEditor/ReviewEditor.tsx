import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { plainLength } from "@/shared/lib/spoilerText";
import { Button } from "@/shared/ui";
import { bodyToEditorDoc, editorDocToBody } from "./serialize";
import { SpoilerMark } from "./spoilerMark";
import "./ReviewEditor.css";

const MAX_BODY = 256;

type ReviewEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
};

export function ReviewEditor({
  value,
  onChange,
  placeholder = "Текст блока. Выделите фрагмент и отметьте спойлером.",
  disabled = false,
  maxLength = MAX_BODY,
}: ReviewEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        bold: false,
        italic: false,
        strike: false,
      }),
      SpoilerMark,
      Placeholder.configure({ placeholder }),
    ],
    content: bodyToEditorDoc(value),
    editable: !disabled,
    onUpdate: ({ editor: current }) => {
      onChange(editorDocToBody(current.getJSON()));
    },
    editorProps: {
      attributes: {
        class: "review-editor__canvas",
        "aria-label": "Текст обзора",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editorDocToBody(editor.getJSON());
    if (current === value) return;
    editor.commands.setContent(bodyToEditorDoc(value), false);
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  const length = plainLength(value);
  const overLimit = length > maxLength;

  return (
    <div className="review-editor">
      <div className="review-editor__toolbar" role="toolbar" aria-label="Форматирование">
        <Button
          type="button"
          variant="secondary"
          className="review-editor__tool"
          disabled={!editor || disabled}
          aria-pressed={editor?.isActive("spoiler") ?? false}
          onClick={() => editor?.chain().focus().toggleSpoiler().run()}
        >
          Спойлер
        </Button>
        <span className={overLimit ? "review-editor__count review-editor__count--bad" : "review-editor__count"}>
          {length}/{maxLength}
        </span>
      </div>
      <EditorContent editor={editor} />
      <p className="review-editor__hint">
        Выделенный текст → «Спойлер». В обзоре он спрячется за плашкой. HTML запрещён API.
      </p>
    </div>
  );
}
