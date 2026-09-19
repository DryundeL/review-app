import "./ReviewEditor.css";

/**
 * Skeleton for Tiptap-based review editor.
 * Wiring (@tiptap/react) lands with create-review feature.
 */
export function ReviewEditor() {
  return (
    <div className="review-editor">
      <p className="review-editor__hint">
        Редактор обзора (Tiptap) — следующий вертикальный слайс.
      </p>
      <div className="review-editor__canvas" contentEditable={false}>
        Текст, тайминги и до 5 изображений/GIF.
      </div>
    </div>
  );
}
