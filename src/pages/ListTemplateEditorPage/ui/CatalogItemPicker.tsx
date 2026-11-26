import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchSearch, sanitizeSearchQuery, type SearchMediaHit } from "@/entities/search";
import { ApiError } from "@/shared/api";
import { useDebouncedValue } from "@/shared/hooks";
import { Button, Input, MediaPoster, Modal } from "@/shared/ui";

const QUERY_MAX = 100;
const SEARCH_LIMIT = 20;

type CatalogItemPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typeCode: string;
  addedIds: ReadonlySet<string>;
  full: boolean;
  onAdd: (hit: SearchMediaHit) => void;
};

export function CatalogItemPicker({
  open,
  onOpenChange,
  typeCode,
  addedIds,
  full,
  onAdd,
}: CatalogItemPickerProps) {
  const [text, setText] = useState("");
  const debounced = useDebouncedValue(text, 300);
  const q = sanitizeSearchQuery(debounced);

  const query = useQuery({
    queryKey: ["list-catalog-search", q],
    queryFn: ({ signal }) => fetchSearch({ q: q!, limit: SEARCH_LIMIT }, signal),
    enabled: open && q !== null,
    staleTime: 60 * 1000,
  });
  const hits = (query.data?.mediaObjects ?? []).filter((hit) => hit.type === typeCode);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Добавить из каталога">
      <div className="template-editor__picker">
        <Input
          type="search"
          aria-label="Поиск в каталоге"
          placeholder="Название произведения"
          maxLength={QUERY_MAX}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        {full ? <p className="muted">Достигнут лимит: 50 элементов</p> : null}
        {q === null ? (
          <p className="muted">Введите название.</p>
        ) : query.isPending ? (
          <p className="muted" aria-busy="true">
            Поиск…
          </p>
        ) : query.isError ? (
          <p className="template-editor__error" role="alert">
            {query.error instanceof ApiError
              ? query.error.message
              : "Не удалось выполнить поиск."}
          </p>
        ) : hits.length === 0 ? (
          <p className="muted">Ничего не найдено.</p>
        ) : (
          <ul className="template-editor__hits">
            {hits.map((hit) => {
              const added = addedIds.has(hit.id);
              return (
                <li key={hit.id} className="template-editor__hit">
                  <MediaPoster
                    className="template-editor__thumb"
                    title={hit.title}
                    posterUrl={hit.posterUrl}
                  />
                  <span className="template-editor__hit-title">{hit.title}</span>
                  <Button
                    variant="secondary"
                    disabled={added || full}
                    aria-label={
                      added ? `${hit.title}: уже добавлено` : `Добавить ${hit.title}`
                    }
                    onClick={() => onAdd(hit)}
                  >
                    {added ? "Добавлено" : "Добавить"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
