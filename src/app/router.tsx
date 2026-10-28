import { AuthGate } from "@/features/auth";
import { Link, Route, Routes } from "react-router-dom";
import { AchievementsPage } from "@/pages/AchievementsPage";
import { CreateReviewPage } from "@/pages/CreateReviewPage";
import { FeedPage } from "@/pages/FeedPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { MediaObjectPage } from "@/pages/MediaObjectPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ReviewPage } from "@/pages/ReviewPage";
import { SearchPage } from "@/pages/SearchPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ShopPage } from "@/pages/ShopPage";
import { AppShell } from "@/widgets/AppShell";

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
