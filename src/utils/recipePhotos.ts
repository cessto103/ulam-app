/** A recipe's real photos, robust to a backend edge case where `image_urls`
 * can be an empty array (not just null/missing) while `image_url` still
 * holds a valid single photo -- e.g. right after a moderation removal takes
 * the last entry out of image_urls. A plain `image_urls ?? [...]` fallback
 * only triggers on null/undefined, never on an empty array, so it silently
 * hides a perfectly good photo in that case. */
export function getRecipePhotos(recipe: {
  image_url?: string | null;
  image_urls?: string[] | null;
}): string[] {
  if (recipe.image_urls && recipe.image_urls.length > 0) return recipe.image_urls;
  return recipe.image_url ? [recipe.image_url] : [];
}
