import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  language: z.enum(["hinglish", "hindi", "english"]),
  tone: z.enum(["funny", "savage", "meme", "horror", "dramatic"]),
  hashtags: z.boolean(),
  instructions: z.string().max(300),
  context: z.string().max(600),
});

export const generateCaptions = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { error: "Caption AI is not configured", captions: [] as string[] };
    const lang = { hinglish: "Hinglish (Hindi in Latin script mixed with English)", hindi: "Hindi in Devanagari script", english: "English" }[data.language];
    const prompt = `Write 5 fresh, short (max 14 words), ${data.tone} social-media captions in ${lang} for a photo of a person who has been transformed into a cockroach. Vibe examples (do not copy): "Main cockroach hoon, gyano tujhe jana hoga! 🪳", "Evolution ka final boss.", "POV: Ghar ka asli owner main hoon." Each caption must be different in angle. ${data.hashtags ? "End each caption with 2-3 relevant hashtags." : "No hashtags."} Emojis allowed sparingly. Keep it playful and non-hateful.${data.context ? ` Transformation details: ${data.context}.` : ""}${data.instructions ? ` Extra instructions from user: ${data.instructions}` : ""} Seed: ${Math.random().toString(36).slice(2, 8)}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: prompt,
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        text: {
          format: {
            type: "json_schema",
            name: "captions",
            strict: true,
            schema: {
              type: "object",
              properties: { captions: { type: "array", items: { type: "string" } } },
              required: ["captions"],
              additionalProperties: false,
            },
          },
        },
      }),
    });
    if (!res.ok || !res.body) {
      const msg = res.status === 402 ? "AI credits have run out." : res.status === 429 ? "Too many requests — try again in a moment." : "Couldn't write captions right now.";
      return { error: msg, captions: [] as string[] };
    }
    let text = "";
    let buf = "";
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += value;
      const parts = buf.split("\n\n");
      buf = parts.pop() ?? "";
      for (const part of parts) {
        const line = part.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;
        try {
          const ev = JSON.parse(line.slice(5).trim());
          if (ev.type === "response.output_text.delta") text += ev.delta;
          if (ev.type === "response.refusal.delta" || ev.type === "error" || ev.type === "response.failed")
            return { error: "The AI declined to write captions for this.", captions: [] as string[] };
        } catch { /* partial */ }
      }
    }
    try {
      const parsed = JSON.parse(text) as { captions: string[] };
      return { error: null, captions: parsed.captions.slice(0, 5) };
    } catch {
      return { error: "Couldn't read the captions. Please regenerate.", captions: [] as string[] };
    }
  });
