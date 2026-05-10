import { Nav } from "@/components/nav";
import { Hero } from "@/components/hero";
import { Lineup } from "@/components/lineup";
import { Commitment } from "@/components/commitment";
import { TeamRibbon } from "@/components/team-ribbon";
import { Footer } from "@/components/footer";
import { api, type Product } from "@/lib/api";

export const revalidate = 300;

async function getCatalog(): Promise<Product[]> {
  try {
    const r = await api.catalog();
    return r.products;
  } catch {
    return [];
  }
}

export default async function Home() {
  const products = await getCatalog();
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Lineup products={products} />
        <Commitment />
        <TeamRibbon />
      </main>
      <Footer />
    </>
  );
}
