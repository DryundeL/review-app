import { z } from "zod";
import { apiClient } from "../../../shared/api/client.ts";
import { unexpectedResponseError } from "../../../shared/api/errors.ts";
import { storageImageUrl } from "../../../shared/lib/storageImageUrl.ts";

export type UploadedImage = {
  id: string;
  url: string;
  width: number;
  height: number;
};

const uploadedImageSchema = z.object({
  id: z.string().uuid(),
  url: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

function parseUploadedImage(text: string): UploadedImage {
  let payload: unknown;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    throw unexpectedResponseError();
  }
  const parsed = uploadedImageSchema.safeParse(payload);
  if (!parsed.success) throw unexpectedResponseError();
  const url = storageImageUrl(parsed.data.url);
  if (!url) throw unexpectedResponseError();
  return {
    id: parsed.data.id,
    url,
    width: parsed.data.width,
    height: parsed.data.height,
  };
}

export function uploadImage(file: File, signal?: AbortSignal): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient("/v1/media/images", {
    method: "POST",
    formData,
    signal,
    parse: parseUploadedImage,
  });
}
