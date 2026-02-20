/**
 * Ollama Inference Client
 *
 * Uses Ollama's OpenAI-compatible HTTP API to run local models such as Qwen2 7B.
 * On first use the required model is pulled automatically via `ollama pull`.
 *
 * Environment variables (override config values):
 *   OLLAMA_HOST   – Ollama server URL  (default: http://localhost:11434)
 *   OLLAMA_MODEL  – Model name to use  (default: qwen2:7b)
 */

import type {
  InferenceClient,
  ChatMessage,
  InferenceOptions,
  InferenceResponse,
  InferenceToolCall,
  TokenUsage,
} from "../types.js";

export interface OllamaClientOptions {
  /** Ollama server base URL. Defaults to OLLAMA_HOST env var or http://localhost:11434 */
  host?: string;
  /** Model to use. Defaults to OLLAMA_MODEL env var or qwen2:7b */
  model?: string;
  /** Max tokens per completion. Defaults to 4096 */
  maxTokens?: number;
  /** Low-compute fallback model. Defaults to same model */
  lowComputeModel?: string;
}

export function createOllamaClient(
  options: OllamaClientOptions = {},
): InferenceClient {
  const host =
    process.env.OLLAMA_HOST ||
    options.host ||
    "http://localhost:11434";

  const defaultModel =
    process.env.OLLAMA_MODEL || options.model || "qwen2:7b";

  let currentModel = defaultModel;
  let maxTokens = options.maxTokens ?? 4096;

  // Track which models have already been pulled this session
  const pulledModels = new Set<string>();

  /**
   * Ensure the model is available locally, pulling it if necessary.
   */
  async function ensureModel(model: string): Promise<void> {
    if (pulledModels.has(model)) return;

    // Validate model name to prevent command injection.
    // Ollama model names follow the format: <name>[:<tag>] e.g. qwen2:7b
    if (!/^[a-zA-Z0-9._/-]+(?::[a-zA-Z0-9._-]+)?$/.test(model)) {
      throw new Error(
        `Invalid Ollama model name: "${model}". ` +
          "Model names must only contain alphanumeric characters, dots, dashes, slashes, and an optional colon-separated tag.",
      );
    }

    // Check if the model is already present
    try {
      const resp = await fetch(`${host}/api/tags`);
      if (resp.ok) {
        const data = (await resp.json()) as { models?: { name: string }[] };
        const names = (data.models ?? []).map((m) => m.name);
        const baseModel = model.split(":")[0];
        const present = names.some(
          (n) => n === model || n.startsWith(`${baseModel}:`),
        );
        if (present) {
          pulledModels.add(model);
          return;
        }
      }
    } catch {
      // If the tags endpoint is unavailable we fall through to the pull attempt.
    }

    console.log(`[Ollama] Pulling model "${model}"…`);
    try {
      const pullResp = await fetch(`${host}/api/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: model, stream: false }),
      });
      if (!pullResp.ok) {
        const text = await pullResp.text();
        throw new Error(`Ollama pull request failed (${pullResp.status}): ${text}`);
      }
      pulledModels.add(model);
      console.log(`[Ollama] Model "${model}" ready.`);
    } catch (err: any) {
      throw new Error(
        `Failed to pull Ollama model "${model}": ${err.message}`,
      );
    }
  }

  const chat = async (
    messages: ChatMessage[],
    opts?: InferenceOptions,
  ): Promise<InferenceResponse> => {
    const model = opts?.model || currentModel;

    await ensureModel(model);

    // Use native Ollama /api/chat endpoint for proper num_ctx support
    const body: Record<string, unknown> = {
      model,
      messages: messages.map(formatMessage),
      stream: false,
      options: {
        // Extend context window to handle large system prompts.
        // Default is 4096 which causes prompt truncation.
        num_ctx: 8192,
        num_predict: opts?.maxTokens ?? maxTokens,
      },
    };

    if (opts?.temperature !== undefined) {
      (body.options as Record<string, unknown>).temperature = opts.temperature;
    }

    if (opts?.tools && opts.tools.length > 0) {
      body.tools = opts.tools;
    }

    const resp = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Ollama inference error (${resp.status}): ${text}`);
    }

    const data = (await resp.json()) as any;
    const message = data.message;

    if (!message) {
      throw new Error("No message returned from Ollama");
    }

    const usage: TokenUsage = {
      promptTokens: data.prompt_eval_count ?? 0,
      completionTokens: data.eval_count ?? 0,
      totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
    };

    const toolCalls: InferenceToolCall[] | undefined =
      message.tool_calls?.map((tc: any, idx: number) => ({
        id: tc.id || `call_${idx}`,
        type: "function" as const,
        function: {
          name: tc.function.name,
          arguments:
            typeof tc.function.arguments === "string"
              ? tc.function.arguments
              : JSON.stringify(tc.function.arguments),
        },
      }));

    return {
      id: data.created_at || "",
      model: data.model || model,
      message: {
        role: message.role,
        content: message.content ?? "",
        tool_calls: toolCalls,
      },
      toolCalls,
      usage,
      finishReason: data.done_reason || (data.done ? "stop" : "length"),
    };
  };

  const setLowComputeMode = (enabled: boolean): void => {
    if (enabled) {
      currentModel = options.lowComputeModel || defaultModel;
      maxTokens = 4096;
    } else {
      currentModel = defaultModel;
      maxTokens = options.maxTokens ?? 4096;
    }
  };

  const getDefaultModel = (): string => currentModel;

  return { chat, setLowComputeMode, getDefaultModel };
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatMessage(msg: ChatMessage): Record<string, unknown> {
  const out: Record<string, unknown> = {
    role: msg.role,
    content: msg.content,
  };
  if (msg.name) out.name = msg.name;
  if (msg.tool_calls) out.tool_calls = msg.tool_calls;
  if (msg.tool_call_id) out.tool_call_id = msg.tool_call_id;
  return out;
}
