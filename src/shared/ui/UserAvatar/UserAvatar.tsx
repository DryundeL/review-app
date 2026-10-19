import { shopAssetUrl } from "@/shared/lib/shopCode";
import { cn } from "@/shared/lib/cn";
import "./UserAvatar.css";

type UserAvatarProps = {
  label: string;
  photoUrl?: string;
  frameCode?: string;
  className?: string;
};

export function UserAvatar({ label, photoUrl, frameCode, className }: UserAvatarProps) {
  const letter = (label.trim()[0] ?? "?").toUpperCase();
  const frameUrl = frameCode ? shopAssetUrl(frameCode) : undefined;

  const avatar = photoUrl ? (
    <img
      className={cn("user-avatar", !frameUrl && className)}
      src={photoUrl}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
    />
  ) : (
    <span className={cn("user-avatar", "user-avatar--fallback", !frameUrl && className)} aria-hidden>
      {letter}
    </span>
  );

  if (!frameUrl) return avatar;

  return (
    <span className={cn("user-avatar-frame", className)}>
      {avatar}
      <img className="user-avatar-frame__ring" src={frameUrl} alt="" aria-hidden decoding="async" />
    </span>
  );
}
