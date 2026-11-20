import { lazy, Suspense, type ComponentType } from "react";
import { AuthGate } from "@/features/auth";
import { Link, Route, Routes } from "react-router-dom";
import { FeedPage } from "@/pages/FeedPage";
import { MediaObjectPage } from "@/pages/MediaObjectPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ReviewPage } from "@/pages/ReviewPage";
import { SearchPage } from "@/pages/SearchPage";
import { AppShell } from "@/widgets/AppShell";

// Страницы из isClientOnlyPath: SSR их не рендерит, поэтому они грузятся
// отдельными чанками и не попадают в стартовый бандл публичных страниц.
// Публичные страницы остаются статическими: иначе гидратация ждала бы чанк.
const CreateReviewPage = lazyPage(() =>
  import("@/pages/CreateReviewPage").then((m) => m.CreateReviewPage),
);
const NotificationsPage = lazyPage(() =>
  import("@/pages/NotificationsPage").then((m) => m.NotificationsPage),
);
const AchievementsPage = lazyPage(() =>
  import("@/pages/AchievementsPage").then((m) => m.AchievementsPage),
);
const ShopPage = lazyPage(() => import("@/pages/ShopPage").then((m) => m.ShopPage));
const SettingsPage = lazyPage(() =>
  import("@/pages/SettingsPage").then((m) => m.SettingsPage),
);

function lazyPage(load: () => Promise<ComponentType>) {
  const Page = lazy(() => load().then((component) => ({ default: component })));
  return function LazyPage() {
    return (
      <Suspense
        fallback={
          <section className="screen" aria-busy="true">
            <p className="muted">Загрузка…</p>
          </section>
        }
      >
        <Page />
      </Suspense>
    );
  };
}

export function AppRoutes() {
  return (
    <AuthGate>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<FeedPage />} />
          <Route path="media-objects/:mediaId" element={<MediaObjectPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="create" element={<CreateReviewPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profiles/:userId" element={<ProfilePage />} />
          <Route path="achievements" element={<AchievementsPage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="reviews/:reviewId/edit" element={<CreateReviewPage />} />
          <Route path="reviews/:reviewId" element={<ReviewPage />} />
          <Route
            path="*"
            element={
              <section className="screen">
                <h1>Страница не найдена</h1>
                <Link to="/">На главную</Link>
              </section>
            }
          />
        </Route>
      </Routes>
    </AuthGate>
  );
}
