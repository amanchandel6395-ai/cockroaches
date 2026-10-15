export type RoachStyle = "realistic" | "funny" | "horror" | "cute" | "ghost";
export type Scope = "face" | "character" | "clothes" | "background" | "face_bg" | "full";

export const STYLES: { id: RoachStyle; label: string }[] = [
  { id: "realistic", label: "Realistic" },
  { id: "funny", label: "Funny" },
  { id: "horror", label: "Horror" },
  { id: "cute", label: "Cute 🥺" },
  { id: "ghost", label: "Ghost 👻" },
];

export const SCOPES: { id: Scope; label: string }[] = [
  { id: "face", label: "Face only" },
  { id: "character", label: "Entire character" },
  { id: "clothes", label: "Clothes & accessories" },
  { id: "background", label: "Background only" },
  { id: "face_bg", label: "Face + background" },
  { id: "full", label: "Full creative" },
];

export const CHIPS: { label: string; prompt: string }[] = [
  { label: "Realistic Cockroach", prompt: "Make my face a realistic giant cockroach with ultra-detailed chitin." },
  { label: "Funny Meme", prompt: "Make it a hilarious meme-worthy cockroach with an exaggerated goofy expression." },
  { label: "Horror Monster", prompt: "Turn me into a horror cockroach creature with glowing red eyes and dripping mandibles." },
  { label: "Bollywood Villain", prompt: "Turn me into a dramatic Bollywood villain cockroach with a thick moustache and gold chains." },
  { label: "Giant Cockroach", prompt: "Give me a giant cockroach head and a tiny human body." },
  { label: "Sigma Roach 😎", prompt: "Make me a sigma cockroach with dark sunglasses, a gold chain and a cold confident stare." },
  { label: "Anime Roach", prompt: "Give the cockroach face anime-style huge glossy eyes and dramatic anime lighting while staying realistic." },
  { label: "Rizz King", prompt: "Make me a charming rizz-king cockroach winking with a smirk and a stylish hairdo." },
  { label: "NPC Mode", prompt: "Make me a blank-stare NPC cockroach with a confused glitchy video-game vibe." },
  { label: "Gym Bro", prompt: "Give me a muscular gym-bro cockroach look flexing, with a sweatband." },
  { label: "Custom Background", prompt: "Put me on a giant throne in a dark red palace with dramatic cinematic lighting." },
];

export const BACKGROUNDS: { id: string; label: string; prompt: string }[] = [
  { id: "parliament", label: "Parliament hall", prompt: "a grand parliament-inspired assembly hall with rows of seats and a podium" },
  { id: "stage", label: "Red stage", prompt: "a cinematic red stage with spotlights and haze" },
  { id: "horror", label: "Horror house", prompt: "a dark abandoned horror house with flickering light" },
  { id: "city", label: "City at night", prompt: "a neon-lit city street at night" },
  { id: "jungle", label: "Jungle", prompt: "a dense misty tropical jungle" },
  { id: "luxury", label: "Luxury room", prompt: "an opulent luxury penthouse room" },
  { id: "lab", label: "Future lab", prompt: "a futuristic science laboratory with glowing screens" },
  { id: "bollywood", label: "Bollywood scene", prompt: "a colorful dramatic Bollywood movie set" },
  { id: "news", label: "News studio", prompt: "a professional TV news studio" },
  { id: "space", label: "Outer space", prompt: "outer space with stars and a planet behind" },
  { id: "studio", label: "Plain studio", prompt: "a plain seamless grey photo studio backdrop" },
];

const FACE =
  "Transform the person's head into a stunning, Hollywood-VFX-quality anthropomorphic American cockroach head: segmented glossy reddish-brown chitin plates with subtle specular highlights and fine micro-texture, large glossy black compound eyes with visible facets, articulated palps and mandibles where the mouth was, and two long thin segmented antennae sweeping back from the forehead. Keep the person's expression, head angle and hairstyle silhouette so it is clearly still them, and blend seamlessly into the neck, skin tone transition, hairline and the original scene lighting with correct shadows. Sharp focus, rich detail, no blur or artifacts.";

const STYLE_EXTRA: Record<RoachStyle, string> = {
  realistic: " Cinematic, highly detailed, natural expression.",
  funny: " Make it expressive and humorous, with a goofy grin and playful eyes, while staying photorealistic.",
  cute: " Make it an adorable, cute cockroach: big shiny sparkly eyes, soft rounded features, tiny curled antennae, a sweet blush and a happy smile, kawaii but still photoreal.",
  ghost: " Make it a ghostly spectral cockroach: pale glowing translucent chitin, misty wisps, eerie blue-white glow around the head, haunted vibe.",
  horror: " Make it darker, creepy and dramatic: wet glistening chitin, menacing mandibles, moody shadows.",
};

const SCOPE_TEXT: Record<Scope, string> = {
  face: FACE + " Change only the face. Preserve body, clothes, pose, accessories, background, camera angle and composition exactly.",
  character: FACE + " Also turn the whole visible body into a cockroach-human hybrid (chitin skin, insect limbs details) while keeping the pose, clothes and background.",
  clothes: FACE + " Also restyle the clothes and accessories as requested, keeping the pose and background unchanged.",
  background: "Do NOT change the person or character at all — keep the face, body, clothes, pose and lighting on the subject exactly as they are. Replace only the background.",
  face_bg: FACE + " Also replace the background as requested, keeping body, clothes and pose unchanged.",
  full: FACE + " You may reimagine the whole scene creatively, but keep the person's pose and recognizable clothing.",
};

export type PromptInput = { style: RoachStyle; scope: Scope; custom?: string; background?: string };

export function buildPrompt({ style, scope, custom, background }: PromptInput) {
  let p = "Edit the supplied photo; it is the source image. " + SCOPE_TEXT[scope];
  if (scope !== "background") p += STYLE_EXTRA[style];
  if (background?.trim()) p += ` New background: ${background.trim()}. Match the subject's lighting and perspective to it.`;
  if (custom?.trim()) p += ` User's instructions (highest priority): ${custom.trim()}`;
  p += " Photorealistic cinematic practical effect, not a cartoon, mask or sticker. Do not add extra people.";
  return p;
}

export function summarize({ style, scope, custom, background }: PromptInput) {
  const s = SCOPES.find((x) => x.id === scope)?.label ?? scope;
  return [
    scope === "background" ? "Keep the subject unchanged" : `${STYLES.find((x) => x.id === style)?.label} cockroach · ${s}`,
    background ? `Background: ${background}` : null,
    custom?.trim() ? `Your idea: “${custom.trim()}”` : null,
  ].filter(Boolean) as string[];
}

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_TEXT = 500;
