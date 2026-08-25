import { Products } from "@/components/dashboard/professional/products";
import { getProductsForBrowse } from "@/lib/services/catalog";
import { getSavedIds } from "@/lib/services/saved";
import { sampleBrowseCards } from "@/lib/sample-catalog";
import { enrichWithExhibitorIds, getCanRequestQuote } from "./exhibitor-lookup";

export default async function ProductsPage() {
  const [items, saved] = await Promise.all([
    getProductsForBrowse().catch(() => []),
    getSavedIds("product").catch(() => []),
  ]);
  // Fall back to the construction sample catalog so the shop always has content.
  const list = items.length > 0 ? items : sampleBrowseCards();
  const [enriched, canRequestQuote] = await Promise.all([enrichWithExhibitorIds(list), getCanRequestQuote()]);
  return <Products items={enriched} initialSaved={saved} canRequestQuote={canRequestQuote} />;
}
