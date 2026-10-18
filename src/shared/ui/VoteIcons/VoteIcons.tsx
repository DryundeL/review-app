type IconProps = {
  size?: number;
  className?: string;
};

export function LikeIcon({ size = 14, className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M2 21h4V9H2v12Zm20-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13.17 1 6.59 7.59C6.22 7.95 6 8.45 6 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2Z"
      />
    </svg>
  );
}

export function DislikeIcon({ size = 14, className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M22 3h-4v12h4V3ZM2 14c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L10.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2H7c-.83 0-1.54.5-1.84 1.22L2.14 11.27c-.09.23-.14.47-.14.73v2Z"
      />
    </svg>
  );
}

type VoteCountsProps = {
  likes: number;
  dislikes: number;
  className?: string;
};

export function VoteCounts({ likes, dislikes, className }: VoteCountsProps) {
  return (
    <span className={className ? `vote-counts ${className}` : "vote-counts"}>
      <span className="vote-counts__item" aria-label={`Нравится: ${likes}`}>
        <LikeIcon />
        <span>{likes}</span>
      </span>
      <span className="vote-counts__item" aria-label={`Не нравится: ${dislikes}`}>
        <DislikeIcon />
        <span>{dislikes}</span>
      </span>
    </span>
  );
}
