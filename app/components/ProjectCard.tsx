import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";
import type { Database } from "@/lib/database.types";
import { Card } from "@/components/ui/card";

type Project = Database["public"]["Tables"]["projects"]["Row"];

export default function ProjectCard({
  project,
  onDelete,
}: {
  project: Project;
  onDelete: (project: Project) => void;
}) {
  const updated = formatDistanceToNow(new Date(project.updated_date), { addSuffix: true });

  return (
    <Card className="group relative border-border/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-[0_24px_50px_-34px_rgba(18,18,45,0.45)]">
      <Link href={`/builder/${project.id}`} className="flex min-h-52 flex-col">
        <div className="flex h-32 items-center justify-center bg-linear-to-br from-brand/15 via-brand/5 to-transparent">
          <span className="font-display text-5xl text-brand/60">
            {project.name.trim().charAt(0).toUpperCase() || "S"}
          </span>
        </div>
        <div className="space-y-1 p-5 pr-14">
          <h2 className="truncate font-heading text-base font-semibold">{project.name}</h2>
          <p className="truncate text-sm text-muted-foreground">
            {project.html ? `Edited ${updated}` : "No design yet"}
          </p>
        </div>
      </Link>
      <button
        type="button"
        aria-label={`Delete ${project.name}`}
        onClick={() => onDelete(project)}
        className="absolute right-3 bottom-4 rounded-full p-2 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </Card>
  );
}