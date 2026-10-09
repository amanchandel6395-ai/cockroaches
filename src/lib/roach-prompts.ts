export type RoachStyle = "realistic" | "funny" | "horror";

export const STYLES: { id: RoachStyle; label: string }[] = [
  { id: "realistic", label: "Realistic" },
  { id: "funny", label: "Funny" },
  { id: "horror", label: "Horror" },
];

const BASE =
  "Transform only the person's face into a highly photorealistic, anatomically plausible anthropomorphic cockroach face. Create a detailed glossy brown chitin exoskeleton, large dark compound eyes, natural insect mandibles, and two curved antennae. Blend the cockroach face seamlessly into the person's original head, hairline, neck, and lighting. Preserve the person's body, hairstyle where appropriate, clothes, pose, accessories, background, camera angle, and original composition. The result should look like a realistic cinematic practical creature effect, not a cartoon, illustration, mask, or sticker. Do not add extra people or alter unrelated parts of the image.";

const EXTRA: Record<RoachStyle, string> = {
  realistic: " Cinematic, highly detailed, natural expression.",
  funny: " Make the cockroach face expressive and humorous, with a big goofy grin and playful eyes, while staying photorealistic.",
  horror: " Make it darker, creepy and dramatic: wet glistening chitin, menacing mandibles, moody shadows, horror-film atmosphere, while keeping the scene recognizable.",
};

export function buildPrompt(style: RoachStyle) {
  return BASE + EXTRA[style];
}

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
