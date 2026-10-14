import { useState } from "react";

// A photo with a small brand mark in the corner. The mark is a visual
// overlay for branding, not copy protection: anyone can crop it or remove
// it in the browser. The whole section hides itself if the image file is
// missing, so nothing broken shows while you source a photo.
export function BrandedPhoto({
  src,
  alt,
  mark,
  className = "h-64 md:h-96",
}: {
  src: string;
  alt: string;
  mark: string;
  className?: string;
}) {
  const [missing, setMissing] = useState(false);
  if (missing) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16">
      <figure className={`relative overflow-hidden rounded-xl border border-white/10 ${className}`}>
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setMissing(true)}
          className="h-full w-full object-cover"
        />
        <figcaption
          aria-hidden
          className="pointer-events-none absolute bottom-3 right-4 select-none font-display text-sm text-white/60 drop-shadow"
        >
          {mark}
        </figcaption>
      </figure>
    </section>
  );
}
