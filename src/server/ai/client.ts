import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { DomainError } from "@/server/errors";

/** Default model for the assistant. Override with AI_MODEL (e.g. a cheaper tier for high volume). */
export const DEFAULT_AI_MODEL = "claude-opus-5-5";

export type AiRequest<S extends z.ZodType> = {
  system: string;
  user: string;
  schema: S;
  maxTokens?: number;
};

export type AiResult<S extends z.ZodType> = {
  data: z.infer<S>;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

/** Narrow interface so tests can inject a fake and the rest of the app never touches the SDK. */
export interface AiProvider {
  generate<S extends z.ZodType>(req: AiRequest<S>): Promise<AiResult<S>>;
}

class AnthropicProvider implements AiProvider {
  private readonly client: Anthropic;
  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 2 });
  }

  async generate<S extends z.ZodType>(req: AiRequest<S>): Promise<AiResult<S>> {
    let response;
    try {
      response = await this.client.beta.messages.create({
        model: this.model,
        max_tokens: req.maxTokens ?? 4000,
        system: req.system,
        messages: [{ role: "user", content: req.user }],
        // Short, structured tasks: low effort keeps latency and cost down.
        output_config: { effort: "low", format: zodOutputFormat(req.schema) },
        // A safety classifier decline is re-run server-side on the recommended fallback model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) throw new DomainError("La IA está saturada en este momento. Intenta de nuevo en un minuto.");
      if (e instanceof Anthropic.AuthenticationError) {
        console.error("[ai] invalid ANTHROPIC_API_KEY");
        throw new DomainError("La IA no está configurada correctamente. Avisa a soporte.");
      }
      if (e instanceof Anthropic.APIError) {
        console.error("[ai] API error", e.status, e.message);
        throw new DomainError("No pudimos consultar a la IA. Intenta de nuevo.");
      }
      throw e;
    }
    if (response.stop_reason === "refusal") {
      throw new DomainError("La IA no pudo procesar esta solicitud.");
    }
    if (response.stop_reason === "max_tokens") {
      throw new DomainError("La respuesta de la IA quedó incompleta. Intenta de nuevo.");
    }
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") throw new DomainError("La IA no devolvió una respuesta.");
    let json: unknown;
    try {
      json = JSON.parse(text.text);
    } catch {
      throw new DomainError("La respuesta de la IA no tuvo el formato esperado. Intenta de nuevo.");
    }
    const parsed = req.schema.safeParse(json);
    if (!parsed.success) throw new DomainError("La respuesta de la IA no tuvo el formato esperado. Intenta de nuevo.");
    return {
      data: parsed.data,
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}

let override: AiProvider | null = null;
let cached: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (override) return override;
  if (cached) return cached;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new DomainError("La IA aún no está activada en este servidor (falta ANTHROPIC_API_KEY).");
  }
  cached = new AnthropicProvider(key, process.env.AI_MODEL || DEFAULT_AI_MODEL);
  return cached;
}

/** Test hook. */
export function setAiProviderForTests(p: AiProvider | null) {
  override = p;
}
