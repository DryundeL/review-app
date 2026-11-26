export function FieldError({ text }: { text: string | undefined }) {
  if (!text) return null;
  return (
    <p className="template-editor__error" role="alert">
      {text}
    </p>
  );
}
