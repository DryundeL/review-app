import { cn } from "@/shared/lib/cn";
import "./MediaPoster.css";

type MediaPosterProps = {
  title: string;
  posterUrl?: string;
  className?: string;
};

export function MediaPoster({ title, posterUrl, className }: MediaPosterProps) {
  const letter = (title.trim()[0] ?? "?").toUpperCase();

  if (posterUrl) {
    return (
      <img
        className={cn("media-poster", className)}
        src={posterUrl}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className={cn("media-poster media-poster--fallback", className)} aria-hidden>
      <span>{letter}</span>
    </div>
  );
}
