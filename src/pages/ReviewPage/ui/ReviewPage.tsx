import { useParams } from "react-router-dom";

export function ReviewPage() {
  const { reviewId } = useParams();

  return (
    <section>
      <h1>Обзор</h1>
      <p>ID: {reviewId}</p>
    </section>
  );
}
