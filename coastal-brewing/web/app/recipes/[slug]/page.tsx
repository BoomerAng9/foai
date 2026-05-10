import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Users, Coffee } from "lucide-react";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { RECIPES, findRecipeBySlug } from "@/lib/recipes";

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Easy",
  moderate: "Moderate",
  ritual: "Ritual",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return RECIPES.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const recipe = findRecipeBySlug(slug);
  if (!recipe) return { title: "Recipe — Coastal Brewing Co." };
  return {
    title: `${recipe.name} — Coastal Brewing Co.`,
    description: recipe.about,
  };
}

export default async function RecipeDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const recipe = findRecipeBySlug(slug);
  if (!recipe) notFound();

  return (
    <>
      <Nav />
      <main className="container py-16">
        <Link
          href="/recipes"
          className="mb-8 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> All recipes
        </Link>

        <div className="grid gap-12 md:grid-cols-12">
          {/* Left column — header + about + steps */}
          <article className="md:col-span-8">
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
              {recipe.origin_short}
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">
              {recipe.name}
            </h1>
            {recipe.also_known_as ? (
              <p className="mt-2 text-base italic text-muted-foreground">
                Also known as: {recipe.also_known_as}
              </p>
            ) : null}

            <p className="mt-8 text-lg leading-relaxed text-foreground">
              {recipe.about}
            </p>

            <h2 className="mt-12 font-display text-2xl font-semibold">
              How to brew it.
            </h2>
            <ol className="mt-6 space-y-5">
              {recipe.steps.map((step, i) => (
                <li
                  key={i}
                  className="flex gap-4 rounded-xl border border-border/60 bg-card/30 p-5"
                >
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-base leading-relaxed text-foreground/90">
                    {step}
                  </p>
                </li>
              ))}
            </ol>

            {recipe.notes && recipe.notes.length > 0 ? (
              <>
                <h2 className="mt-12 font-display text-2xl font-semibold">
                  What makes it right.
                </h2>
                <ul className="mt-6 space-y-3">
                  {recipe.notes.map((note, i) => (
                    <li
                      key={i}
                      className="flex gap-3 text-base leading-relaxed text-muted-foreground"
                    >
                      <span className="mt-2 h-1 w-3 shrink-0 bg-accent" />
                      {note}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </article>

          {/* Right column — sidecar */}
          <aside className="md:col-span-4">
            <div className="sticky top-6 space-y-6">
              <div className="rounded-2xl border border-border bg-card/40 p-6">
                <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
                  At a glance
                </p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-3">
                    <dt className="text-muted-foreground">Difficulty</dt>
                    <dd className="font-medium text-foreground">
                      {DIFFICULTY_LABEL[recipe.difficulty]}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-3">
                    <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3 w-3" /> Brew time
                    </dt>
                    <dd className="font-medium text-foreground">
                      {recipe.brew_time_min} min
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-3">
                    <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3 w-3" /> Total time
                    </dt>
                    <dd className="font-medium text-foreground">
                      {recipe.total_time_min} min
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-3">
                    <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-3 w-3" /> Serves
                    </dt>
                    <dd className="font-medium text-foreground">
                      {recipe.serves}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 pt-1">
                    <dt className="text-muted-foreground">Vessel</dt>
                    <dd className="text-sm text-foreground/90">
                      {recipe.vessel}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 pt-3 border-t border-border/40">
                    <dt className="text-muted-foreground">Beans</dt>
                    <dd className="text-sm text-foreground/90">
                      {recipe.beans}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6">
                <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
                  Pair this recipe with
                </p>
                <p className="mt-3 inline-flex items-start gap-2 font-display text-base font-semibold text-foreground">
                  <Coffee className="mt-0.5 h-4 w-4 text-accent" />
                  {recipe.pairing_label}
                </p>
                <Link
                  href={`/products/${recipe.pairing_sku}`}
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-background px-4 py-2 text-xs text-foreground transition-colors hover:bg-accent/10"
                >
                  Shop the pairing →
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
