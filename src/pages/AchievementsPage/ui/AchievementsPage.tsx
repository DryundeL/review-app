import { useAuthSession } from "@/features/auth";
import { AchievementsBoardPage } from "@/widgets/AchievementsStrip";
import "./AchievementsPage.css";

export function AchievementsPage() {
  const { profile } = useAuthSession();

  if (!profile) return null;

  return (
    <section className="screen achievements-page">
      <h1 className="achievements-page__title">Достижения</h1>
      <AchievementsBoardPage profileId={profile.id} />
    </section>
  );
}
