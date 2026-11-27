import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createResult } from "@/entities/list";
import { useAuthSession } from "@/features/auth";
import { ApiError } from "@/shared/api";
import { Button } from "@/shared/ui";
import { createResultMessage } from "../model/errorMessage";
import "./OwnerActions.css";

type CreateResultButtonProps = {
  templateId: string;
  label: string;
};

export function CreateResultButton({ templateId, label }: CreateResultButtonProps) {
  const { profile } = useAuthSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => createResult(templateId),
    onSuccess: async (result) => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["lists"] });
      navigate(`/list-results/${result.id}/edit`);
    },
    onError: (err) =>
      setError(
        err instanceof ApiError ? createResultMessage(err) : "Не удалось создать топ",
      ),
  });

  return (
    <div className="owner-actions">
      {profile ? (
        <Button type="button" disabled={create.isPending} onClick={() => create.mutate()}>
          {label}
        </Button>
      ) : (
        <Button asChild>
          <Link to="/profile">Войти и составить свой топ</Link>
        </Button>
      )}
      {error ? (
        <p className="owner-actions__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
