import type { SessionProfile, User } from "@/entities/user";
import { useAuthSession } from "@/features/auth";
import { UserHeader } from "@/widgets/UserHeader";
import "./ProfilePage.css";

export function ProfilePage() {
  const { profile } = useAuthSession();
  if (!profile) return null;

  const user: User = {
    id: profile.id,
    username: profile.username.trim(),
    displayName: displayName(profile),
    popularityScore: 0,
    followersCount: 0,
    followingCount: 0,
  };

  return (
    <section className="profile-page">
      <UserHeader user={user} />
      {profile.isPremium ? <p className="profile-page__note">Telegram Premium</p> : null}
    </section>
  );
}

function displayName(profile: SessionProfile): string {
  const fullName = [profile.firstName, profile.lastName]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(" ");
  if (fullName) return fullName;
  const username = profile.username.trim();
  if (username) return username;
  return "Пользователь";
}
