"use client";

import { useState } from "react";
import Image from "next/image";

export default function ProjectScreenshot({
  projectId,
  updatedAt,
  published = false,
  projectName,
}: {
  projectId: string;
  updatedAt: string;
  published?: boolean;
  projectName: string;
}) {
  const [failed, setFailed] = useState(false);
  const params = new URLSearchParams({ updated: updatedAt });
  if (published) params.set("public", "1");
  const src = `/api/projects/${projectId}/screenshot?${params.toString()}`;

  return failed ? (
    <div className="flex h-full w-full items-center justify-center bg-muted font-display text-5xl text-brand/60" aria-label={`${projectName} screenshot unavailable`}>
      L
    </div>
  ) : (
    <Image
      src={src}
      alt={`${projectName} website screenshot`}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
      unoptimized
      onError={() => setFailed(true)}
      className="object-cover object-top"
    />
  );
}