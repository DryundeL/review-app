import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { isOwnerView, layoutFromResult, useResultQuery } from "@/entities/list";
import { useAuthSession } from "@/features/auth";
import { CreateResultButton, OwnerActions } from "@/features/manage-list";
import { ReportListControl } from "@/features/report-list";
import { ApiError } from "@/shared/api";
import { usePageMeta } from "@/shared/hooks";
import { truncateMeta, type PageMeta } from "@/shared/lib/pageMeta";
import { MEDIA_TYPE_LABELS, isMediaType } from "@/shared/types";
import { UserAvatar } from "@/shared/ui";
import { FORMAT_LABELS } from "@/widgets/ListCard";
import { ListBoard } from "@/widgets/ListBoard";
import "./ListResultPage.css";

export function ListResultPage() {
  const { resultId } = useParams();
  const { profile } = useAuthSession();
  const query = useResultQuery(resultId, profile?.id ?? null);
  const result = query.data;
  const layout = useMemo(() => (result ? layoutFromResult(result) : null), [result]);

  const pageMeta = useMemo((): PageMeta => {
    const path = `/list-results/${resultId ?? ""}`;
    if (!result) return { path, title: "Топ", noindex: true };
    return {
      path,
      title: result.title,
      description: truncateMeta(result.description || `${result.title} · ${result.template.title}`),
      image: result.coverUrl,
      noindex:
        isOwnerView(result) && (result.status !== "published" || result.visibility === "unlisted"),
    };
  }, [resultId, result]);
  usePageMeta(pageMeta);

  if (query.isLoading) {
    return (
      <section className="result-page screen" aria-busy="true">
        <p className="muted">Загрузка…</p>
      </section>
    );
  }
  if (query.isError || !result || !layout) {
    return (
      <section className="result-page screen">
        <h1>
          {query.error instanceof ApiError && query.error.status === 404
            ? "Не найдено"
            : "Ошибка загрузки"}
        </h1>
        <Link to="/lists?tab=results">К топам и шаблонам</Link>
      </section>
    );
  }

  const owner = isOwnerView(result);
  const typeLabel = isMediaType(result.typeCode) ? MEDIA_TYPE_LABELS[result.typeCode] : null;
  const template = result.template;
  const templateAuthor = template.author?.username;
  const canOpenTemplate = result.canCreateOwn && Boolean(template.id);

  return (
    <article className="result-page screen">
      {owner ? (
        <div className="result-page__banners">
          {result.moderation === "hidden" ? (
            <p className="result-page__banner result-page__banner--danger">Скрыто модератором</p>
          ) : null}
          {result.status === "draft" ? <p className="result-page__banner">Черновик</p> : null}
          {result.visibility === "unlisted" ? (
            <p className="result-page__banner">Доступно по ссылке</p>
          ) : null}
        </div>
      ) : null}
      <header className="result-page__head">
        <p className="result-page__badges">
          <span className="result-page__badge">{FORMAT_LABELS[result.format]}</span>
          {typeLabel ? <span className="result-page__badge">{typeLabel}</span> : null}
        </p>
        <h1 className="result-page__title">{result.title}</h1>
        <div className="result-page__author-row">
          <Link className="result-page__author" to={`/profiles/${result.author.id}`}>
            <UserAvatar
              className="result-page__avatar"
              label={result.author.username}
              photoUrl={result.author.photoUrl}
            />
            <span>{result.author.username}</span>
          </Link>
          {!owner ? <ReportListControl kind="results" id={result.id} /> : null}
        </div>
        {result.description ? (
          <p className="result-page__description">{result.description}</p>
        ) : null}
        <p className="result-page__source">
          Шаблон:{" "}
          {canOpenTemplate ? (
            <Link to={`/list-templates/${template.id}`}>{template.title}</Link>
          ) : (
            template.title
          )}
          {templateAuthor ? ` · ${templateAuthor}` : null}
        </p>
      </header>

      {owner ? <OwnerActions kind="results" object={result} /> : null}

      <ListBoard
        format={result.format}
        tiers={result.tiers}
        items={result.items}
        layout={layout}
      />

      {canOpenTemplate && template.id ? (
        <CreateResultButton templateId={template.id} label="Составить свой" />
      ) : null}
    </article>
  );
}
