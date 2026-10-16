export type ReviewStatus = "draft" | "published";

export type RemoteReviewBlock = {
  id: string;
  position: number;
  title: string;
  body: string;
};

export type RemoteReview = {
  id: string;
  authorId: string;
  mediaObjectId: string;
  title: string;
  rating: number;
  status: ReviewStatus;
  blocks: RemoteReviewBlock[];
  likesCount: number;
  dislikesCount: number;
  viewsCount: number;
};

export type RemoteReviewList = { items: RemoteReview[] };

export type CreateReviewInput = {
  mediaObjectId: string;
  title: string;
  rating: number;
  status?: ReviewStatus;
  blocks?: { title: string; body: string }[];
};

export type UpdateReviewInput = {
  title?: string;
  rating?: number;
  status?: ReviewStatus;
  blocks?: { title: string; body: string }[];
};

export type MediaObjectSummary = {
  id: string;
  title: string;
};
