export type Product = "image_pack" | "download" | "video_plan" | "combo_plan";

export const PRODUCTS: Record<Product, { name: string; price: number; desc: string; perks: string[] }> = {
  image_pack: { name: "Image Pack", price: 9, desc: "One-time", perks: ["10 more cockroach images", "10 downloads without watermark", "All styles: Cute, Ghost, Horror…"] },
  download: { name: "Clean Download", price: 9, desc: "Per image", perks: ["Download 1 image without watermark", "Full quality"] },
  video_plan: { name: "Video Plan", price: 199, desc: "30 days", perks: ["8-second cockroach videos", "5 videos per day"] },
  combo_plan: { name: "Combo Plan", price: 299, desc: "30 days", perks: ["10 images per day", "Unlimited clean downloads", "8 videos per day", "Best value 🔥"] },
};

export const DENIAL_TEXT: Record<string, { text: string; product: Product }> = {
  image_pack: { text: "Your free image is used up. Get 10 more + 10 clean downloads for just ₹9!", product: "image_pack" },
  video_plan: { text: "Videos need the Video Plan (₹199) or Combo Plan (₹299).", product: "video_plan" },
  daily_limit: { text: "Aaj ki limit khatam! Come back tomorrow or upgrade.", product: "combo_plan" },
  download: { text: "Clean (no watermark) download costs ₹9.", product: "download" },
};
