import Link from "next/link";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { RecipeCard } from "@/components/recipe-card";
import { RECIPES } from "@/lib/recipes";

export const metadata = {
  title: "Recipes — Coastal Brewing Co.",
  description:
    "Coffees from around the world, brewed at home. Saudi Cahwa, Turkish Coffee, Ethiopian Buna, Vietnamese Phin, Italian Espresso, and more. Each recipe ties to a Coastal pairing.",
};

export default function RecipesPage() {
  return (
    <>
      <Nav />
      <main className="container py-16">
        {/* Lede */}
        <div className="mb-14 max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
            Brewed around the world
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold md:text-5xl">
            Recipes from where coffee is rooted.
          </h1>
          <div className="mt-6 space-y-4 text-base text-muted-foreground">
            <p>
              Coffee is older than nations. Saudi Cahwa is Arabian
              hospitality before the conversation begins. Turkish coffee is
              UNESCO-listed heritage and a fortune-reading at the bottom of
              the cup. Ethiopian Buna is a one-hour ceremony in three rounds
              — Abol, Tona, Baraka — in the country where coffee was first
              found.
            </p>
            <p>
              These recipes celebrate the brewing traditions our customers
              come from and the ones they want to learn. Every recipe pairs
              to a Coastal Brewing Co. SKU so you can brew it at home with
              beans we&apos;ve already vetted. If you can&apos;t visit
              those places, brew them here.
            </p>
          </div>
        </div>

        {/* Grid of recipes */}
        <section className="mb-16">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-display text-2xl font-semibold md:text-3xl">
              The library.
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {RECIPES.length} recipes · expanding
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {RECIPES.map((r) => (
              <RecipeCard key={r.slug} recipe={r} />
            ))}
          </div>
        </section>

        {/* Share-your-brew section — Phase B placeholder. Honest about
            scope: not a fake form. Owner directive 2026-05-03 says
            users will eventually upload + grant social-repost permission;
            that needs storage backend + per-platform OAuth + moderation
            queue, all owner-input-blocking. Until then, this section
            tells visitors the wall is coming + invites tagging now. */}
        <section className="rounded-2xl border border-accent/30 bg-accent/5 p-7 md:p-10">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
            Share your brew
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight md:text-3xl">
            We want to see how you&apos;re brewing.
          </h2>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">
            A community wall is in the works — soon you&apos;ll be able to
            upload a photo of your Cahwa pot, your Phin drip, your V60, or
            whatever you&apos;ve made from these recipes, with permission for
            us to highlight your brew on our channels. Until that ships,
            tag us when you post:
          </p>
          <ul className="mt-5 space-y-1 text-sm text-foreground">
            <li>
              <span className="font-mono text-xs text-accent">#</span>
              CoastalBrewingCo
            </li>
            <li>
              <span className="font-mono text-xs text-accent">#</span>
              BrewedHonest
            </li>
            <li>
              <span className="font-mono text-xs text-accent">#</span>
              ServedByACHEEVY
            </li>
          </ul>
          <p className="mt-6 text-sm text-muted-foreground">
            When the upload wall opens, your tagged posts will be the first
            we feature.{" "}
            <Link
              href="/contact"
              className="text-accent hover:underline"
            >
              Tell us what to add to the recipe library →
            </Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
