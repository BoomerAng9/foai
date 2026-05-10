import Link from "next/link";
import { ArrowUpRight, Clock, Users } from "lucide-react";
import type { Recipe } from "@/lib/recipes";

const DIFFICULTY_LABEL: Record<Recipe["difficulty"], string> = {
  easy: "Easy",
  moderate: "Moderate",
  ritual: "Ritual",
};

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      href={`/recipes/${recipe.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-border bg-card/40 p-6 transition-all hover:border-foreground/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
          {recipe.origin_short}
        </p>
        <span className="rounded-full border border-border bg-background/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          {DIFFICULTY_LABEL[recipe.difficulty]}
        </span>
      </div>

      <h3 className="mt-3 font-display text-xl font-semibold tracking-tight">
        {recipe.name}
      </h3>

      {recipe.also_known_as ? (
        <p className="mt-1 text-xs italic text-muted-foreground">
          {recipe.also_known_as}
        </p>
      ) : null}

      <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {recipe.about}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          {recipe.total_time_min} min
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3 w-3" />
          {recipe.serves}
        </span>
      </div>

      <div className="mt-auto pt-5">
        <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-foreground group-hover:text-accent">
          Read the recipe <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}
