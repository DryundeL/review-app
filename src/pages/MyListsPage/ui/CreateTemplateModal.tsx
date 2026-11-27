import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  MIXED_TYPE_CODE,
  MIXED_TYPE_LABEL,
  createTemplate,
  type Format,
} from "@/entities/list";
import { fetchReviewTypes } from "@/entities/settings";
import { ApiError } from "@/shared/api";
import { Button, Input, Modal } from "@/shared/ui";
import { FORMAT_LABELS } from "@/widgets/ListCard";

const FORMATS: Format[] = ["tiers", "ranked", "collection"];
const TITLE_MAX = 150;

function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 422 && error.code === "QUOTA_EXCEEDED") {
      return "Достигнут лимит: 50 шаблонов";
    }
    return error.message;
  }
  return "Не удалось создать шаблон.";
}

export function CreateTemplateModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [typeCode, setTypeCode] = useState("");
  const [format, setFormat] = useState<Format>("tiers");
  const [title, setTitle] = useState("");

  const typesQuery = useQuery({
    queryKey: ["review-types"],
    queryFn: ({ signal }) => fetchReviewTypes(signal),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });
  const types = typesQuery.data ?? [];
  const selectedType = typeCode || types[0]?.code || "";

  const mutation = useMutation({
    mutationFn: () =>
      createTemplate({
        typeCode: selectedType,
        format,
        title: title.trim() || undefined,
      }),
    onSuccess: async (template) => {
      await queryClient.invalidateQueries({ queryKey: ["lists"] });
      onOpenChange(false);
      navigate(`/list-templates/${template.id}/edit`);
    },
  });

  function handleOpenChange(next: boolean) {
    if (!next) mutation.reset();
    onOpenChange(next);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedType || mutation.isPending) return;
    mutation.mutate();
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange} title="Создать шаблон">
      <form className="my-lists-page__form" onSubmit={handleSubmit}>
        <p className="my-lists-page__intro">
          Шаблон — заготовка: вы выбираете произведения, а вы и другие пользователи
          расставляете их в свои топы. Если хотите просто составить свой топ, найдите
          готовый шаблон в разделе «Топы».
        </p>
        <label className="my-lists-page__field">
          Тип произведения
          <select
            className="my-lists-page__select"
            value={selectedType}
            onChange={(event) => setTypeCode(event.target.value)}
            disabled={types.length === 0}
          >
            {types.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
            <option value={MIXED_TYPE_CODE}>{MIXED_TYPE_LABEL} — любые типы вперемешку</option>
          </select>
        </label>

        <fieldset className="my-lists-page__field my-lists-page__formats">
          <legend>Формат</legend>
          {FORMATS.map((item) => (
            <label key={item} className="my-lists-page__radio">
              <input
                type="radio"
                name="template-format"
                value={item}
                checked={format === item}
                onChange={() => setFormat(item)}
              />
              {FORMAT_LABELS[item]}
            </label>
          ))}
        </fieldset>

        <label className="my-lists-page__field">
          Название (необязательно)
          <Input
            maxLength={TITLE_MAX}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        {typesQuery.isError ? (
          <p className="my-lists-page__error" role="alert">
            Не удалось загрузить типы.
          </p>
        ) : null}
        {mutation.isError ? (
          <p className="my-lists-page__error" role="alert">
            {errorText(mutation.error)}
          </p>
        ) : null}

        <Button type="submit" disabled={mutation.isPending || !selectedType}>
          {mutation.isPending ? "Создаём…" : "Создать"}
        </Button>
      </form>
    </Modal>
  );
}
