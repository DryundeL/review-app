import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ImgHTMLAttributes,
  type SyntheticEvent,
} from "react";
import { cn } from "@/shared/lib/cn";
import type { ImagePhase } from "./useImagePhase";
import "./AppImage.css";

type AppImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  objectFit?: "cover" | "contain";
};

export function AppImage({
  className,
  alt = "",
  src,
  objectFit = "cover",
  onLoad,
  onError,
  ...props
}: AppImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [phase, setPhase] = useState<ImagePhase>("loading");

  useLayoutEffect(() => {
    const element = imgRef.current;
    if (!src || !element) {
      setPhase(src ? "loading" : "error");
      return;
    }
    if (element.complete && element.naturalWidth > 0) setPhase("ready");
    else if (element.complete) setPhase("error");
    else setPhase("loading");
  }, [src]);

  function handleLoad(event: SyntheticEvent<HTMLImageElement>) {
    setPhase("ready");
    onLoad?.(event);
  }

  function handleError(event: SyntheticEvent<HTMLImageElement>) {
    setPhase("error");
    onError?.(event);
  }

  const style = { "--app-image-fit": objectFit } as CSSProperties;

  return (
    <span className={cn("app-image", className)} data-state={phase} style={style}>
      <span className="app-image__loader" aria-hidden />
      <img
        {...props}
        ref={imgRef}
        className="app-image__img"
        alt={alt}
        src={src}
        onLoad={handleLoad}
        onError={handleError}
      />
    </span>
  );
}
