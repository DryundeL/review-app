import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AchievementsPage } from "@/pages/AchievementsPage";
import { CreateReviewPage } from "@/pages/CreateReviewPage";
import { FeedPage } from "@/pages/FeedPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ReviewPage } from "@/pages/ReviewPage";
import { SearchPage } from "@/pages/SearchPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ShopPage } from "@/pages/ShopPage";
import { AppShell } from "@/widgets/AppShell";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<FeedPage />} />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
