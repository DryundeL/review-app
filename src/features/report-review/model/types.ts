export type ReportReason = {
  code: string;
  label: string;
};

export type ReportReasonsList = {
  items: ReportReason[];
};

export type ReviewReport = {
  id: string;
  reviewId: string;
  reasonCode: string;
  createdAt: string;
};
