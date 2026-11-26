import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { uploadImage, validateImageFile } from "@/features/upload-media";
import { ApiError, isAbortError } from "@/shared/api";
import { Button, Input, MediaPoster } from "@/shared/ui";
import { LIMITS, moveEntry, type DraftItem } from "../model/templateDraft";
import { FieldError } from "./FieldError";

const ITEMS_MAX = LIMITS.items;
const ACCEPT = "image/jpeg,image/png,image/webp";
/** Ключ загрузки картинки для нового своего элемента. */
const NEW_ITEM = "__new__";

type ItemsEditorProps = {
  items: DraftItem[];
  errorFor: (key: string) => string | undefined;
  onUpdate: (update: (items: DraftItem[]) => DraftItem[]) => void;
  onOpenPicker: () => void;
  onRefresh: (item: DraftItem) => void;
  refreshingId: string | null;
};

function uploadErrorText(error: unknown): string {
  return error instanceof ApiError ? error.message : "Не удалось загрузить картинку.";
}

export function ItemsEditor({
  items,
  errorFor,
  onUpdate,
  onOpenPicker,
  onRefresh,
  refreshingId,
}: ItemsEditorProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<string>(NEW_ITEM);
  const controllers = useRef(new Set<AbortController>());
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [uploadError, setUploadError] = useState<string | null>(null);
  const full = items.length >= ITEMS_MAX;

  useEffect(() => {
    const active = controllers.current;
    return () => active.forEach((controller) => controller.abort());
  }, []);

  const patch = (key: string, next: Partial<DraftItem>) =>
    onUpdate((list) =>
      list.map((item) => (item.key === key ? { ...item, ...next } : item)),
    );
  const move = (key: string, delta: -1 | 1) =>
    onUpdate((list) =>
      moveEntry(
        list,
        list.findIndex((item) => item.key === key),
        delta,
      ),
    );
  const remove = (key: string) =>
    onUpdate((list) => list.filter((item) => item.key !== key));

  function chooseFile(target: string) {
    uploadTarget.current = target;
    setUploadError(null);
    fileInput.current?.click();
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    const target = uploadTarget.current;
    if (!file || pending.has(target)) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      setUploadError(invalid);
      return;
    }
    const controller = new AbortController();
    controllers.current.add(controller);
    setPending((set) => new Set(set).add(target));
    try {
      const image = await uploadImage(file, controller.signal);
      if (target === NEW_ITEM) {
        onUpdate((list) =>
          list.length >= ITEMS_MAX
            ? list
            : [
                ...list,
                {
                  key: crypto.randomUUID(),
                  title: "",
                  imageId: image.id,
                  imageUrl: image.url,
                },
              ],
        );
      } else {
        patch(target, { imageId: image.id, imageUrl: image.url });
      }
    } catch (error) {
      if (!isAbortError(error)) setUploadError(uploadErrorText(error));
    } finally {
      controllers.current.delete(controller);
      if (!controller.signal.aborted) {
        setPending((set) => {
          const next = new Set(set);
          next.delete(target);
          return next;
        });
      }
    }
  }

  return (
    <section className="template-editor__section" aria-labelledby="template-editor-items">
      <h2 id="template-editor-items" className="template-editor__heading">
        Элементы{" "}
        <span className="muted">
          {items.length}/{ITEMS_MAX}
        </span>
      </h2>
      <FieldError text={errorFor("items")} />
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(event) => void handleFile(event)}
      />
      {uploadError ? (
        <p className="template-editor__error" role="alert">
          {uploadError}
        </p>
      ) : null}
      <ol className="template-editor__list">
        {items.map((item, index) => {
          const number = index + 1;
          const titleError = errorFor(`items.title:${index}`);
          const rowError =
            errorFor(`items.image:${index}`) ??
            errorFor(`items.imageId:${index}`) ??
            errorFor(`items.mediaObjectId:${index}`) ??
            errorFor(`items.id:${index}`) ??
            errorFor(`items:${index}`);
          const uploading = pending.has(item.key);
          const canRefresh = Boolean(item.id && item.mediaObjectId);
          return (
            <li
              key={item.key}
              className={`template-editor__row${rowError ? " template-editor__row--invalid" : ""}`}
            >
              <div className="template-editor__row-main">
                <MediaPoster
                  className="template-editor__thumb"
                  title={item.title}
                  posterUrl={item.imageUrl}
                />
                <div className="template-editor__item-fields">
                  <Input
                    className={titleError ? "is-invalid" : undefined}
                    aria-label={`Название элемента ${number}`}
                    aria-invalid={titleError ? true : undefined}
                    maxLength={LIMITS.itemTitle}
                    placeholder="Название"
                    value={item.title}
                    onChange={(event) => patch(item.key, { title: event.target.value })}
                  />
                  {item.mediaObjectId ? <span className="muted">Из каталога</span> : null}
                </div>
              </div>
              <div className="template-editor__row-actions">
                <Button
                  variant="ghost"
                  aria-label={`Поднять элемент ${number}`}
                  disabled={index === 0}
                  onClick={() => move(item.key, -1)}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Опустить элемент ${number}`}
                  disabled={index === items.length - 1}
                  onClick={() => move(item.key, 1)}
                >
                  ↓
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Сменить картинку элемента ${number}`}
                  aria-busy={uploading || undefined}
                  disabled={uploading}
                  onClick={() => chooseFile(item.key)}
                >
                  {uploading ? "Загрузка…" : "Картинка"}
                </Button>
                {canRefresh ? (
                  <Button
                    variant="ghost"
                    aria-label={`Обновить элемент ${number} из каталога`}
                    disabled={refreshingId !== null}
                    onClick={() => onRefresh(item)}
                  >
                    {refreshingId === item.id ? "Обновляем…" : "Обновить из каталога"}
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  aria-label={`Удалить элемент ${number}`}
                  onClick={() => remove(item.key)}
                >
                  Удалить
                </Button>
              </div>
              <FieldError text={titleError ?? rowError} />
            </li>
          );
        })}
      </ol>
      <div className="template-editor__add">
        <Button variant="secondary" disabled={full} onClick={onOpenPicker}>
          Из каталога
        </Button>
        <Button
          variant="secondary"
          disabled={full || pending.has(NEW_ITEM)}
          aria-busy={pending.has(NEW_ITEM) || undefined}
          onClick={() => chooseFile(NEW_ITEM)}
        >
          {pending.has(NEW_ITEM) ? "Загрузка…" : "Своя картинка"}
        </Button>
      </div>
    </section>
  );
}
