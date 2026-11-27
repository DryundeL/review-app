import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  isMixedType,
  isOwnerView,
  layoutFromResult,
  listTypeLabel,
  useResultQuery,
  viewResult,
  voteResult,
  type Result,
} from "@/entities/list";
import { useAuthSession } from "@/features/auth";
import { CreateResultButton, OwnerActions } from "@/features/manage-list";
import { ReportListControl } from "@/features/report-list";
import { ApiError } from "@/shared/api";
import { usePageMeta } from "@/shared/hooks";
import { truncateMeta, type PageMeta } from "@/shared/lib/pageMeta";
import { Button, DislikeIcon, LikeIcon, UserAvatar, VoteCounts } from "@/shared/ui";
import { FORMAT_LABELS } from "@/widgets/ListCard";
import { ListBoard } from "@/widgets/ListBoard";
import { ReviewComments } from "@/widgets/ReviewComments/ReviewComments";
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

  // Реакции принимает только открытый результат. Не-автор получает лишь открытые,
  // автору сервер присылает статус и модерацию.
  const isOpen = Boolean(
    result &&
      (!isOwnerView(result) ||
        (result.status === "published" && result.moderation !== "hidden")),
  );
  const isOwn = Boolean(result && profile && result.author.id === profile.id);

  useEffect(() => {
    if (!profile || !resultId || !isOpen || isOwn) return;
    void viewResult(resultId).catch(() => {
      // просмотр не критичен для чтения
    });
  }, [profile, resultId, isOpen, isOwn]);

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
        <Link to="/lists">К топам</Link>
      </section>
    );
  }

  const owner = isOwnerView(result);
  const typeLabel = listTypeLabel(result.typeCode);
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
        {isOpen ? (
          <p className="result-page__stats">
            <VoteCounts
              likes={result.likesCount}
              dislikes={result.dislikesCount}
              views={result.viewsCount}
            />
          </p>
        ) : null}
        <p className="result-page__source">
          По шаблону{" "}
          «
          {canOpenTemplate ? (
            <Link to={`/list-templates/${template.id}`}>{template.title}</Link>
          ) : (
            template.title
          )}
          »{templateAuthor ? ` · ${templateAuthor}` : null}
        </p>
      </header>

      {owner ? <OwnerActions kind="results" object={result} /> : null}

      <ListBoard
        format={result.format}
        tiers={result.tiers}
        items={result.items}
        layout={layout}
        showItemTypes={isMixedType(result.typeCode)}
      />

      {canOpenTemplate && template.id ? (
        <CreateResultButton templateId={template.id} label="Составить свой топ по этому шаблону" />
      ) : null}

      {isOpen && profile && !isOwn ? <ResultVote result={result} /> : null}
      {isOpen ? (
        <ReviewComments key={result.id} reviewId={result.id} target="list-results" />
      ) : null}
    </article>
  );
}

function ResultVote({ result }: { result: Result }) {
  const queryClient = useQueryClient();
  /** Optimistic override; источник правды — result.viewerIsLike с бэка. */
  const [override, setOverride] = useState<boolean | null>(null);
  const voteMutation = useMutation({
    mutationFn: (isLike: boolean) => voteResult(result.id, isLike),
    onMutate: (isLike) => {
      const previous = override;
      setOverride(isLike);
      return { previous };
    },
    onError: (_error, _isLike, context) => setOverride(context?.previous ?? null),
    onSuccess: async () => {
      setOverride(null);
      await queryClient.invalidateQueries({ queryKey: ["list-result", result.id] });
    },
  });

  const myVote = override ?? result.viewerIsLike ?? null;
  return (
    <div className="result-page__vote" role="group" aria-label="Оценка топа">
      <Button
        type="button"
        className="result-page__vote-btn"
        variant={myVote === true ? "primary" : "secondary"}
        aria-label="Нравится"
        aria-pressed={myVote === true}
        aria-busy={voteMutation.isPending}
        disabled={voteMutation.isPending}
        onClick={() => voteMutation.mutate(true)}
      >
        <LikeIcon size={20} />
        <span>{result.likesCount}</span>
      </Button>
      <Button
        type="button"
        className="result-page__vote-btn result-page__vote-dislike"
        variant="secondary"
        aria-label="Не нравится"
        aria-pressed={myVote === false}
        aria-busy={voteMutation.isPending}
        disabled={voteMutation.isPending}
        onClick={() => voteMutation.mutate(false)}
      >
        <DislikeIcon size={20} />
        <span>{result.dislikesCount}</span>
      </Button>
    </div>
  );
}
