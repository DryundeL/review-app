import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { listComments, mergeComments, type RemoteComment } from "@/entities/review";
import { useAuthSession } from "@/features/auth";
import { ApiError } from "@/shared/api";
import { Button, UserAvatar } from "@/shared/ui";
import { CommentComposer } from "./CommentComposer";
import "./ReviewComments.css";

type ReplyTarget = { id: string; username: string };

export function ReviewComments({ reviewId }: { reviewId: string }) {
  const [params, setParams] = useSearchParams();
  const rawTarget = params.get("commentId");
  const rawParent = params.get("parentCommentId");
  const targetId = z.string().uuid().safeParse(rawTarget).success ? rawTarget : null;
  const parentId =
    targetId && z.string().uuid().safeParse(rawParent).success ? rawParent : null;
  const { profile } = useAuthSession();
  const [reply, setReply] = useState<ReplyTarget | null>(null);
  const [created, setCreated] = useState<RemoteComment[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const onCreated = (comment: RemoteComment) => {
    setCreated((previous) => [...previous, comment]);
    setReply(null);
  };
  const branchProps = {
    reviewId,
    targetId,
    profileId: profile?.id ?? null,
    reply,
    setReply,
    created,
    onCreated,
    onUnavailable: () => setUnavailable(true),
  };

  return (
    <section className="review-comments" aria-labelledby="comments-title" id="comments">
      <header className="review-comments__header">
        <h2 id="comments-title">Обсуждение</h2>
        <span>Делитесь впечатлениями</span>
      </header>
      {unavailable ? (
        <p role="alert">Обсуждение недоступно.</p>
      ) : (
        <>
          {!profile ? (
            <p className="review-comments__signin">
              <Link to="/profile">Войдите</Link>, чтобы присоединиться к обсуждению.
            </p>
          ) : null}
          <CommentComposer
            reviewId={reviewId}
            parentId={null}
            canSubmit={Boolean(profile)}
            onCreated={onCreated}
          />
          {parentId ? (
            <div className="review-comments__context">
              <span>Ответы из уведомления</span>
              <button
                type="button"
                onClick={() =>
                  setParams(
                    (previous) => {
                      const next = new URLSearchParams(previous);
                      next.delete("commentId");
                      next.delete("parentCommentId");
                      return next;
                    },
                    { replace: true },
                  )
                }
              >
                Все комментарии
              </button>
            </div>
          ) : null}
          <CommentBranch
            key={parentId ?? "roots"}
            {...branchProps}
            parentId={parentId}
            depth={0}
          />
        </>
      )}
    </section>
  );
}

type BranchProps = {
  reviewId: string;
  parentId: string | null;
  targetId: string | null;
  profileId: string | null;
  reply: ReplyTarget | null;
  setReply: (value: ReplyTarget | null) => void;
  created: RemoteComment[];
  onCreated: (comment: RemoteComment) => void;
  onUnavailable: () => void;
  depth: number;
};

function CommentBranch(props: BranchProps) {
  const { reviewId, parentId, targetId, profileId, created, depth } = props;
  const query = useInfiniteQuery({
    queryKey: ["review-comments", reviewId, parentId, profileId],
    queryFn: ({ pageParam, signal }) =>
      listComments(reviewId, parentId, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    retry: false,
  });
  const items = mergeComments([
    ...(query.data?.pages.map((page) => page.items) ?? []),
    created.filter((item) => item.parentId === parentId),
  ]);
  const found = items.some((item) => item.id === targetId);
  const searching = Boolean(targetId && depth === 0 && !found);
  const { fetchNextPage, hasNextPage, isFetching, isError } = query;
  useEffect(() => {
    if (searching && hasNextPage && !isFetching && !isError) void fetchNextPage();
  }, [searching, hasNextPage, isFetching, isError, fetchNextPage]);
  const notFound = query.error instanceof ApiError && query.error.status === 404;
  const { onUnavailable } = props;
  useEffect(() => {
    if (notFound) onUnavailable();
  }, [notFound, onUnavailable]);

  return (
    <div className="review-comments__branch" aria-busy={query.isFetching}>
      {query.isPending ? (
        <p className="muted" role="status">
          Загрузка комментариев…
        </p>
      ) : null}
      {query.isError && !notFound ? (
        <div role="alert">
          <p>Не удалось загрузить комментарии.</p>
          <Button
            variant="ghost"
            onClick={() =>
              void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())
            }
          >
            Повторить
          </Button>
        </div>
      ) : null}
      {query.isSuccess && items.length === 0 ? (
        <p className="muted">
          {parentId
            ? "Ответов пока нет."
            : "Здесь пока тихо. Оставьте первый комментарий."}
        </p>
      ) : null}
      {items.map((comment) => (
        <CommentItem key={comment.id} {...props} comment={comment} />
      ))}
      {hasNextPage ? (
        <Button
          variant="ghost"
          disabled={isFetching}
          onClick={() => void fetchNextPage()}
        >
          {isFetching ? "Загрузка…" : parentId ? "Ещё ответы" : "Ещё комментарии"}
        </Button>
      ) : null}
      {searching && query.isSuccess && !hasNextPage && !isFetching ? (
        <p role="status" className="muted">
          Комментарий из уведомления не найден.
        </p>
      ) : null}
    </div>
  );
}

function CommentItem(props: BranchProps & { comment: RemoteComment }) {
  const { comment, profileId, reply, setReply, targetId, created, depth } = props;
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const highlighted = comment.id === targetId;
  useEffect(() => {
    if (highlighted) {
      ref.current?.scrollIntoView({ block: "center", behavior: "instant" });
      ref.current?.focus({ preventScroll: true });
    }
  }, [highlighted]);
  const hasReplies =
    comment.hasReplies || created.some((item) => item.parentId === comment.id);
  const replying = reply?.id === comment.id;
  return (
    <article
      ref={ref}
      tabIndex={highlighted ? -1 : undefined}
      id={`comment-${comment.id}`}
      className={`review-comment${highlighted ? " review-comment--highlighted" : ""}`}
    >
      <header className="review-comment__header">
        <Link to={`/profiles/${comment.author.id}`} className="review-comment__author">
          <UserAvatar
            label={comment.author.username || "Автор"}
            photoUrl={comment.author.photoUrl}
            className="review-comment__avatar"
          />
          <span>{comment.author.username ? `@${comment.author.username}` : "Автор"}</span>
        </Link>
        <time dateTime={comment.createdAt}>
          {new Date(comment.createdAt).toLocaleString("ru-RU", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      </header>
      <p className="review-comment__body">{comment.body}</p>
      <div className="review-comment__actions">
        {profileId ? (
          <button
            type="button"
            onClick={() =>
              setReply(
                replying ? null : { id: comment.id, username: comment.author.username },
              )
            }
          >
            Ответить
          </button>
        ) : null}
        {hasReplies ? (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Скрыть ответы ↑" : "Показать ответы ↓"}
          </button>
        ) : null}
      </div>
      {replying ? (
        <CommentComposer
          reviewId={props.reviewId}
          parentId={comment.id}
          canSubmit={Boolean(profileId)}
          replyTo={reply.username}
          onCancel={() => setReply(null)}
          onCreated={(newComment) => {
            setExpanded(true);
            props.onCreated(newComment);
          }}
        />
      ) : null}
      {expanded ? (
        <div
          className={
            depth < 2
              ? "review-comment__replies"
              : "review-comment__replies review-comment__replies--flat"
          }
        >
          <CommentBranch
            {...props}
            parentId={comment.id}
            targetId={null}
            depth={depth + 1}
          />
        </div>
      ) : null}
    </article>
  );
}
