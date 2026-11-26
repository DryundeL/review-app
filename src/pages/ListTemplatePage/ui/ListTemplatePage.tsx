import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { isOwnerView, useTemplateQuery } from "@/entities/list";
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
import "./ListTemplatePage.css";

export function ListTemplatePage() {
  const { templateId } = useParams();
  const { profile } = useAuthSession();
  const query = useTemplateQuery(templateId, profile?.id ?? null);
  const template = query.data;

  const pageMeta = useMemo((): PageMeta => {
    const path = `/list-templates/${templateId ?? ""}`;
    if (!template) return { path, title: "Шаблон", noindex: true };
    return {
      path,
      title: template.title,
      description: truncateMeta(template.description || template.title),
      image: template.coverUrl,
      noindex: isOwnerView(template) && (template.status !== "published" || template.visibility === "unlisted"),
    };
  }, [templateId, template]);
  usePageMeta(pageMeta);

  if (query.isLoading) {
    return (
      <section className="list-page screen" aria-busy="true">
        <p className="muted">Загрузка…</p>
      </section>
    );
  }
  if (query.isError || !template) {
    return (
      <section className="list-page screen">
        <h1>{query.error instanceof ApiError && query.error.status === 404 ? "Не найдено" : "Ошибка загрузки"}</h1>
        <Link to="/lists">К топам и шаблонам</Link>
      </section>
    );
  }

  const owner = isOwnerView(template);
  const typeLabel = isMediaType(template.typeCode) ? MEDIA_TYPE_LABELS[template.typeCode] : null;

  return (
    <article className="list-page screen">
      {owner ? (
        <div className="list-page__banners">
          {template.moderation === "hidden" ? (
            <p className="list-page__banner list-page__banner--danger">Скрыто модератором</p>
          ) : null}
          {template.status === "draft" ? <p className="list-page__banner">Черновик</p> : null}
          {template.visibility === "unlisted" ? (
            <p className="list-page__banner">Доступно по ссылке</p>
          ) : null}
        </div>
      ) : null}
      <header className="list-page__head">
        <p className="list-page__badges">
          <span className="list-page__badge">{FORMAT_LABELS[template.format]}</span>
          {typeLabel ? <span className="list-page__badge">{typeLabel}</span> : null}
        </p>
        <h1 className="list-page__title">{template.title}</h1>
        <div className="list-page__author-row">
          <Link className="list-page__author" to={`/profiles/${template.author.id}`}>
            <UserAvatar
              className="list-page__avatar"
              label={template.author.username}
              photoUrl={template.author.photoUrl}
            />
            <span>{template.author.username}</span>
          </Link>
          {!owner ? <ReportListControl kind="templates" id={template.id} /> : null}
        </div>
        {template.description ? (
          <p className="list-page__description">{template.description}</p>
        ) : null}
      </header>

      {owner ? <OwnerActions kind="templates" object={template} /> : null}

      <ListBoard format={template.format} tiers={template.tiers} items={template.items} />

      {template.canCreateResult ? (
        <CreateResultButton templateId={template.id} label="Составить свой топ" />
      ) : null}
    </article>
  );
}
