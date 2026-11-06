import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useId } from "react";
import {
  MAX_BLOCK_BODY,
  sanitizeReviewBody,
  reviewBodyText,
  unicodeLength,
} from "@/shared/lib/reviewBody";
import { Button } from "@/shared/ui";
import { bodyToEditorDoc, editorDocToBody } from "./serialize";
import { SpoilerMark } from "./spoilerMark";
import "./ReviewEditor.css";

const MAX_BODY = MAX_BLOCK_BODY;

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
  placeholder = "Начните писать...",
  disabled = false,
  maxLength = MAX_BODY,
}: ReviewEditorProps) {
  const countId = useId();
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
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
      transformPastedHTML: sanitizeReviewBody,
      attributes: {
        class: "review-editor__canvas",
        "aria-label": "Текст обзора",
        "aria-multiline": "true",
        "aria-describedby": countId,
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

  const length = unicodeLength(reviewBodyText(value));
  const overLimit = length > maxLength;

  return (
    <div className="review-editor">
      <div className="review-editor__toolbar" role="group" aria-label="Форматирование">
        {(
          [
            ["bold", "Жирный", () => editor?.chain().focus().toggleBold().run()],
            ["italic", "Курсив", () => editor?.chain().focus().toggleItalic().run()],
            ["strike", "Зачёркнутый", () => editor?.chain().focus().toggleStrike().run()],
            [
              "bulletList",
              "Список",
              () => editor?.chain().focus().toggleBulletList().run(),
            ],
            [
              "orderedList",
              "Нумерация",
              () => editor?.chain().focus().toggleOrderedList().run(),
            ],
          ] as const
        ).map(([name, label, action]) => (
          <Button
            key={name}
            type="button"
            variant="secondary"
            className="review-editor__tool"
            disabled={!editor || disabled}
            aria-pressed={editor?.isActive(name) ?? false}
            aria-label={label}
            title={label}
            onPointerDown={(event) => event.preventDefault()}
            onClick={action}
          >
            <ToolIcon name={name} />
          </Button>
        ))}
        <Button
          type="button"
          variant="secondary"
          className="review-editor__tool"
          disabled={!editor || disabled}
          aria-pressed={editor?.isActive("spoiler") ?? false}
          aria-label="Спойлер"
          title="Спойлер"
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => editor?.chain().focus().toggleSpoiler().run()}
        >
          <ToolIcon name="spoiler" />
        </Button>
      </div>
      <EditorContent editor={editor} />
      <span
        id={countId}
        className={
          overLimit
            ? "review-editor__count review-editor__count--bad"
            : "review-editor__count"
        }
      >
        {length}/{maxLength}
      </span>
    </div>
  );
}

function ToolIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    bold: <path d="M6 4h7a4 4 0 0 1 0 8H6m0 0h8a4 4 0 0 1 0 8H6V4" />,
    italic: <path d="M10 4h10M4 20h10M14 4 10 20" />,
    strike: (
      <>
        <path d="M18 6c-2-3-11-3-11 2 0 2 2 3 5 4m-6 6c2 3 11 3 11-2 0-1-1-2-2-2M3 12h18" />
      </>
    ),
    bulletList: (
      <>
        <path d="M9 6h12M9 12h12M9 18h12" />
        <path d="M3 6h1M3 12h1M3 18h1" />
      </>
    ),
    orderedList: (
      <>
        <path d="M10 6h11M10 12h11M10 18h11M3 3h1v6M2 13c0-3 5-3 4 0l-4 6h4" />
      </>
    ),
    spoiler: (
      <>
        <path d="m3 3 18 18M10 5c5-1 9 3 12 7a19 19 0 0 1-4 4M6 6a22 22 0 0 0-5 6c4 6 10 9 16 6M10 10a3 3 0 0 0 4 4" />
      </>
    ),
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
