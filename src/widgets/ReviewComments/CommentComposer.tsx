import { useEffect, useId, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { createComment, type RemoteComment } from "@/entities/review";
import { ApiError } from "@/shared/api";
import { Button } from "@/shared/ui";

type Props = {
  reviewId: string;
  parentId: string | null;
  replyTo?: string;
  canSubmit?: boolean;
  onCreated: (comment: RemoteComment) => void;
  onCancel?: () => void;
};

export function CommentComposer({
  reviewId,
  parentId,
  replyTo,
  canSubmit = true,
  onCreated,
  onCancel,
}: Props) {
  const [text, setText] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    const webApp = window.Telegram?.WebApp;
    const form = formRef.current;
    if (!form) return;
    let spacer: HTMLDivElement | null = null;
    let blurTimer: ReturnType<typeof setTimeout> | undefined;
    const clearSpacer = () => {
      spacer?.remove();
      spacer = null;
    };
    const revealComposer = () => {
      if (!form.contains(document.activeElement)) {
        clearSpacer();
        return;
      }
      const top = viewport?.offsetTop ?? 0;
      const telegramHeight = webApp?.viewportHeight;
      const height = Math.min(
        viewport?.height ?? window.innerHeight,
        telegramHeight && telegramHeight > 0 ? telegramHeight : window.innerHeight,
      );
      // WebViews may overlay the keyboard without shrinking the layout viewport.
      const coveredHeight = Math.max(0, window.innerHeight - height);
      if (coveredHeight > 0) {
        if (!spacer) {
          spacer = document.createElement("div");
          spacer.className = "comment-composer-keyboard-space";
          spacer.setAttribute("aria-hidden", "true");
          document.body.append(spacer);
        }
        spacer.style.height = `${coveredHeight}px`;
      } else {
        clearSpacer();
      }
      const bounds = form.getBoundingClientRect();
      const headerBottom = document.querySelector(".app-shell__header")?.getBoundingClientRect().bottom ?? 0;
      const visibleTop = Math.max(top, headerBottom);
      const overflow = bounds.bottom - (top + height) + 12;
      if (overflow > 0) {
        window.scrollBy({
          top: Math.min(overflow, Math.max(0, bounds.top - visibleTop - 12)),
          behavior: "instant",
        });
      }
    };
    const onBlur = () => {
      clearTimeout(blurTimer);
      blurTimer = setTimeout(() => {
        if (!form.contains(document.activeElement)) clearSpacer();
      }, 0);
    };
    form.addEventListener("focusin", revealComposer);
    form.addEventListener("focusout", onBlur);
    window.addEventListener("resize", revealComposer);
    viewport?.addEventListener("resize", revealComposer);
    viewport?.addEventListener("scroll", revealComposer);
    webApp?.onEvent?.("viewportChanged", revealComposer);
    return () => {
      clearTimeout(blurTimer);
      clearSpacer();
      form.removeEventListener("focusin", revealComposer);
      form.removeEventListener("focusout", onBlur);
      window.removeEventListener("resize", revealComposer);
      viewport?.removeEventListener("resize", revealComposer);
      viewport?.removeEventListener("scroll", revealComposer);
      webApp?.offEvent?.("viewportChanged", revealComposer);
    };
  }, []);
  const countId = useId();
  const errorId = useId();
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bold: false,
        italic: false,
        strike: false,
        code: false,
        codeBlock: false,
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: parentId ? "Напишите ответ…" : "Что вы думаете об обзоре?",
      }),
    ],
    editorProps: {
      attributes: {
        class: "comment-composer__canvas",
        role: "textbox",
        "aria-label": parentId ? "Текст ответа" : "Текст комментария",
        "aria-multiline": "true",
        "aria-describedby": `${countId} ${errorId}`,
      },
    },
    onUpdate: ({ editor: current }) => setText(current.getText({ blockSeparator: "\n" })),
  });
  const mutation = useMutation({
    mutationFn: () => createComment(reviewId, text, parentId),
    onSuccess: (comment) => {
      editor?.commands.clearContent();
      setText("");
      onCreated(comment);
    },
  });
  useEffect(() => {
    editor?.setEditable(!mutation.isPending);
  }, [editor, mutation.isPending]);
  const count = Array.from(text.trim()).length;
  const error =
    mutation.error instanceof ApiError && mutation.error.status === 404
      ? "Обсуждение недоступно. Возможно, обзор больше не опубликован."
      : mutation.error instanceof ApiError && mutation.error.status === 401
        ? "Войдите в аккаунт, чтобы отправить комментарий. Текст сохранён в редакторе."
        : mutation.isError
          ? "Не удалось отправить комментарий. Текст сохранён — попробуйте ещё раз."
          : null;

  return (
    <form
      ref={formRef}
      className="comment-composer"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit && editor && count > 0 && count <= 2000 && !mutation.isPending)
          mutation.mutate();
      }}
    >
      {parentId ? (
        <div className="comment-composer__reply">
          Ответ {replyTo ? `@${replyTo}` : "автору"}
          <button type="button" onClick={onCancel} disabled={mutation.isPending}>
            Отмена
          </button>
        </div>
      ) : null}
      <EditorContent editor={editor} />
      <div className="comment-composer__footer">
        <span
          id={countId}
          className={
            count > 2000
              ? "comment-composer__count comment-composer__count--invalid"
              : "comment-composer__count"
          }
        >
          {count} / 2000
        </span>
        <Button
          type="submit"
          disabled={
            !canSubmit || !editor || count === 0 || count > 2000 || mutation.isPending
          }
          aria-busy={mutation.isPending}
        >
          {mutation.isPending ? "Отправка…" : "Отправить"}
        </Button>
      </div>
      <div id={errorId}>
        {error ? (
          <p className="comment-composer__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
