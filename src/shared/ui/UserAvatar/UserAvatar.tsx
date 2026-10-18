import { cn } from "@/shared/lib/cn";
import "./UserAvatar.css";

type UserAvatarProps = {
  label: string;
  photoUrl?: string;
  className?: string;
};

export function UserAvatar({ label, photoUrl, className }: UserAvatarProps) {
  const letter = (label.trim()[0] ?? "?").toUpperCase();

  if (photoUrl) {
    return (
      <img
        className={cn("user-avatar", className)}
        src={photoUrl}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span className={cn("user-avatar user-avatar--fallback", className)} aria-hidden>
      {letter}
    </span>
  );
}
