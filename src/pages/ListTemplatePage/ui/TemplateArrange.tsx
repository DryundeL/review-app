import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  isMixedType,
  carryLayout,
  createResult,
  entriesFromLayout,
  layoutFromResult,
  saveResult,
  type Layout,
  type Result,
  type Template,
} from "@/entities/list";
import { LayoutEditor } from "@/features/arrange-list";
import { createResultMessage } from "@/features/manage-list";
import { ApiError } from "@/shared/api";
import { Button } from "@/shared/ui";

type TemplateArrangeProps = {
  template: Template;
};

/** Сохранение не удалось уже после создания черновика: топ есть, расстановки в нём нет. */
class ArrangementNotSaved extends Error {
  readonly resultId: string;

  constructor(resultId: string) {
    super("Топ создан, но расстановку сохранить не удалось");
    this.resultId = resultId;
  }
}

async function saveAsResult(template: Template, layout: Layout): Promise<Result> {
  const result = await createResult(template.id);
  const entries = entriesFromLayout(carryLayout(layout, result), result.tiers);
  if (entries.length === 0 || result.revision === undefined) return result;
  try {
    return await saveResult(result.id, {
      revision: result.revision,
      title: result.title,
      description: result.description,
      entries,
    });
  } catch {
    throw new ArrangementNotSaved(result.id);
  }
}

/**
 * Расстановка прямо на странице шаблона. Пока пользователь не нажал «Сохранить»,
 * ничего не создаётся; сохранение создаёт его топ с этой расстановкой.
 */
export function TemplateArrange({ template }: TemplateArrangeProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [layout, setLayout] = useState<Layout>(() =>
    layoutFromResult({ ...template, entries: [] }),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => saveAsResult(template, layout),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["lists"] });
      navigate(`/list-results/${result.id}/edit`);
    },
    onError: (err) => {
      if (err instanceof ArrangementNotSaved)
        void queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });

  const error = save.error;
  // Черновик уже создан: повтор создал бы ещё один, поэтому ведём в созданный.
  const draftCreated = error instanceof ArrangementNotSaved;
  const placed = [...layout.groups.values()].some((ids) => ids.length > 0);

  return (
    <section className="list-page__arrange" aria-label="Свой топ по шаблону">
      <LayoutEditor
        format={template.format}
        tiers={template.tiers}
        items={template.items}
        layout={layout}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onChange={setLayout}
        disabled={save.isPending}
        showItemTypes={isMixedType(template.typeCode)}
      />
      <div className="list-page__cta">
        <p className="list-page__cta-text">
          {placed
            ? "Расстановка видна только вам, пока вы её не сохраните."
            : "Расставьте элементы и сохраните — получится ваш топ по этому шаблону."}
        </p>
        <Button type="button" disabled={save.isPending || draftCreated} onClick={() => save.mutate()}>
          {save.isPending ? "Сохраняем…" : "Сохранить как свой топ"}
        </Button>
        {error ? (
          <p className="list-page__error" role="alert">
            {error instanceof ArrangementNotSaved ? (
              <>
                {error.message}.{" "}
                <Link to={`/list-results/${error.resultId}/edit`}>Открыть черновик</Link>
              </>
            ) : error instanceof ApiError ? (
              createResultMessage(error)
            ) : (
              "Не удалось сохранить топ"
            )}
          </p>
        ) : null}
      </div>
    </section>
  );
}
