export type ReactionKind = "like" | "dislike";

export type Reaction = {
  reviewId: string;
  userId: string;
  kind: ReactionKind;
};
