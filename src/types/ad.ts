export type SponsoredAd = {
  id: number;
  product_name: string;
  company_name: string;
  tagline: string | null;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  cta_label: string; // server always resolves this (defaults to "Learn More"), never null on the wire
};

export type AdPlacement = 'community' | 'recipe';
