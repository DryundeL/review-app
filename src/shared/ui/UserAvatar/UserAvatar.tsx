import { storageImageUrl } from "@/shared/lib/storageImageUrl";
import { cn } from "@/shared/lib/cn";
import { AppImage } from "../AppImage";
import "./UserAvatar.css";

type UserAvatarProps = {
  label: string;
  photoUrl?: string;
  frameUrl?: string;
  className?: string;
};

export function UserAvatar({
  label,
  photoUrl,
  frameUrl: rawFrameUrl,
  className,
}: UserAvatarProps) {
  const letter = (label.trim()[0] ?? "?").toUpperCase();
  const frameUrl = storageImageUrl(rawFrameUrl);

  const avatar = photoUrl ? (
    <AppImage
      className={cn("user-avatar", !frameUrl && className)}
      src={photoUrl}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
    />
  ) : (
    <span
      className={cn("user-avatar", "user-avatar--fallback", !frameUrl && className)}
      aria-hidden
    >
      {letter}
    </span>
  );

  if (!frameUrl) return avatar;

  return (
    <span className={cn("user-avatar-frame", className)}>
      {avatar}
      <AppImage
        className="user-avatar-frame__ring"
        src={frameUrl}
        alt=""
        aria-hidden
        decoding="async"
        objectFit="contain"
      />
    </span>
  );
}
