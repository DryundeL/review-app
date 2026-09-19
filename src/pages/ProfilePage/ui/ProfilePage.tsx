import { useAuthSession } from "@/features/auth";
import { UserHeader } from "@/widgets/UserHeader";

export function ProfilePage() {
  const { platformUser, platformKind } = useAuthSession();

  const user = {
    id: platformUser?.id ?? "local",
    username: platformUser?.username ?? "guest",
    displayName:
      [platformUser?.firstName, platformUser?.lastName].filter(Boolean).join(" ") ||
      "Гость",
    avatarUrl: platformUser?.photoUrl,
    popularityScore: 0,
    followersCount: 0,
    followingCount: 0,
  };

  return (
    <section>
      <UserHeader user={user} />
      <p style={{ color: "var(--color-muted)" }}>
        Платформа: {platformKind}. Геймификация и разбивка по типам — следующий слайс.
      </p>
    </section>
  );
}
