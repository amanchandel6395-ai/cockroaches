import { createFileRoute } from "@tanstack/react-router";
import { editImage, imageSettings } from "@/lib/image-gateway.server";
import {
  ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_TEXT, SCOPES, STYLES, buildPrompt,
  type RoachStyle, type Scope,
} from "@/lib/roach-prompts";

export const Route = createFileRoute("/api/roachify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("AI service is not configured", { status: 500 });
        const input = await request.formData();
        const image = input.get("image");
        const style = String(input.get("style") ?? "realistic") as RoachStyle;
        const scope = String(input.get("scope") ?? "face") as Scope;
        const custom = String(input.get("custom") ?? "");
        const background = String(input.get("background") ?? "");
        if (!(image instanceof File)) return new Response("Please add a photo", { status: 400 });
        if (!ALLOWED_IMAGE_TYPES.includes(image.type))
          return new Response("Use a JPEG, PNG or WebP photo", { status: 400 });
        if (image.size > MAX_IMAGE_BYTES) return new Response("Photo must be under 10 MB", { status: 400 });
        if (!STYLES.some((s) => s.id === style) || !SCOPES.some((s) => s.id === scope))
          return new Response("Unknown option", { status: 400 });
        if (custom.length > MAX_TEXT || background.length > MAX_TEXT)
          return new Response("Instructions are too long", { status: 400 });
        if (scope === "background" && !background.trim() && !custom.trim())
          return new Response("Pick or describe a background", { status: 400 });

        const form = new FormData();
        form.append("image", image, image.name || "photo.png");
        form.append("prompt", buildPrompt({ style, scope, custom, background }));
        const stream = input.get("stream");
        if (stream) form.set("stream", String(stream));

        const upstream = await editImage({ ...imageSettings, apiKey }, form);
        return new Response(upstream.body, {
          status: upstream.status,
          headers: {
            "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
