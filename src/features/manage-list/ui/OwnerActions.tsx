import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  copyList,
  deleteList,
  isOwnerView,
  publishList,
  setListVisibility,
  unpublishList,
  type ListKind,
  type Result,
  type Template,
  type Visibility,
} from "@/entities/list";
import { ApiError } from "@/shared/api";
import { Button, Modal } from "@/shared/ui";
import { ownerActionMessage, type OwnerAction } from "../model/errorMessage";
import "./OwnerActions.css";

type OwnerActionsProps = {
  kind: ListKind;
  object: Template | Result;
};

const queryKeyFor = (kind: ListKind, id: string) =>
  [kind === "templates" ? "list-template" : "list-result", id] as const;

export function OwnerActions({ kind, object }: OwnerActionsProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [publishOpen, setPublishOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>(object.visibility ?? "public");
  const [error, setError] = useState<string | null>(null);

  const key = queryKeyFor(kind, object.id);

  const onFail = (action: OwnerAction) => (err: unknown) => {
    // Ревизия устарела: перезапрос, чтобы повтор ушёл со свежей.
    if (err instanceof ApiError && err.status === 409 && err.code === "REVISION_CONFLICT") {
      void queryClient.invalidateQueries({ queryKey: key });
    }
    setError(
      err instanceof ApiError ? ownerActionMessage(err, action) : "Не удалось выполнить действие",
    );
  };

  /** После мутации объект из ответа — источник правды (тот же вид, что GET автору). */
  const applyResponse = async (next: Template | Result) => {
    setError(null);
    queryClient.setQueryData(key, next);
    await queryClient.invalidateQueries({ queryKey: ["lists"] });
  };

  const publish = useMutation({
    mutationFn: () => publishList(kind, object.id, object.revision ?? 0, visibility),
    onSuccess: async (next) => {
      setPublishOpen(false);
      await applyResponse(next);
    },
    onError: onFail("publish"),
  });
  const unpublish = useMutation({
    mutationFn: () => unpublishList(kind, object.id),
    onSuccess: applyResponse,
    onError: onFail("other"),
  });
  const toggleVisibility = useMutation({
    mutationFn: () =>
      setListVisibility(
        kind,
        object.id,
        object.visibility === "unlisted" ? "public" : "unlisted",
      ),
    onSuccess: applyResponse,
    onError: onFail("other"),
  });
  const copy = useMutation({
    mutationFn: () => copyList(kind, object.id),
    onSuccess: async (next) => {
      await queryClient.invalidateQueries({ queryKey: ["lists"] });
      navigate(`/list-${kind}/${next.id}/edit`);
    },
    onError: onFail("other"),
  });
  const remove = useMutation({
    mutationFn: () => deleteList(kind, object.id),
    onSuccess: async () => {
      setDeleteOpen(false);
      queryClient.removeQueries({ queryKey: key });
      await queryClient.invalidateQueries({ queryKey: ["lists"] });
      navigate("/my-lists");
    },
    onError: (err) => {
      setDeleteOpen(false);
      onFail("other")(err);
    },
  });

  if (!isOwnerView(object)) return null;

  const busy =
    publish.isPending ||
    unpublish.isPending ||
    toggleVisibility.isPending ||
    copy.isPending ||
    remove.isPending;

  return (
    <div className="owner-actions">
      <div className="owner-actions__row">
        <Button asChild variant="secondary">
          <Link to={`/list-${kind}/${object.id}/edit`}>Редактировать</Link>
        </Button>
        {object.status === "draft" ? (
          <Button
            type="button"
            disabled={busy}
            onClick={() => {
              setError(null);
              setPublishOpen(true);
            }}
          >
            Опубликовать
          </Button>
        ) : null}
        {object.status === "published" ? (
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => unpublish.mutate()}
            >
              Снять с публикации
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => toggleVisibility.mutate()}
            >
              {object.visibility === "unlisted" ? "Показать всем" : "Только по ссылке"}
            </Button>
          </>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => copy.mutate()}
        >
          Копировать
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="owner-actions__danger"
          disabled={busy}
          onClick={() => {
            setError(null);
            setDeleteOpen(true);
          }}
        >
          Удалить
        </Button>
      </div>
      {error ? (
        <p className="owner-actions__error" role="alert">
          {error}
        </p>
      ) : null}

      <Modal open={publishOpen} onOpenChange={setPublishOpen} title="Опубликовать">
        <fieldset className="owner-actions__radios">
          <legend className="owner-actions__legend">Кто увидит</legend>
          <label>
            <input
              type="radio"
              name="list-visibility"
              checked={visibility === "public"}
              onChange={() => setVisibility("public")}
            />
            <span>Всем</span>
          </label>
          <label>
            <input
              type="radio"
              name="list-visibility"
              checked={visibility === "unlisted"}
              onChange={() => setVisibility("unlisted")}
            />
            <span>По ссылке</span>
          </label>
        </fieldset>
        {error ? (
          <p className="owner-actions__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="owner-actions__modal-buttons">
          <Button
            type="button"
            variant="secondary"
            disabled={publish.isPending}
            onClick={() => setPublishOpen(false)}
          >
            Отмена
          </Button>
          <Button type="button" disabled={publish.isPending} onClick={() => publish.mutate()}>
            Опубликовать
          </Button>
        </div>
      </Modal>

      <Modal open={deleteOpen} onOpenChange={setDeleteOpen} title="Удалить">
        <p>Удалить без возможности восстановления?</p>
        <div className="owner-actions__modal-buttons">
          <Button
            type="button"
            variant="secondary"
            disabled={remove.isPending}
            onClick={() => setDeleteOpen(false)}
          >
            Отмена
          </Button>
          <Button
            type="button"
            className="owner-actions__danger-solid"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
          >
            Удалить
          </Button>
        </div>
      </Modal>
    </div>
  );
}
