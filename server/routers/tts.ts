/**
 * tts.ts — Router de Text-to-Speech com OpenAI
 * DentCare Elite V35.7 — Voice Briefing Premium
 *
 * Substitui o speechSynthesis do browser por OpenAI TTS (tts-1 / tts-1-hd)
 * Vozes disponíveis: alloy, echo, fable, onyx, nova, shimmer
 * Devolve audio/mpeg em streaming para reprodução imediata no browser
 */
import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import OpenAI from "openai";
import type { Express, Request, Response } from "express";

// ─── Vozes disponíveis ────────────────────────────────────────────────────────
export const TTS_VOICES = [
  { id: "alloy",   label: "Alloy (Neutro)",    descricao: "Voz neutra e equilibrada" },
  { id: "echo",    label: "Echo (Masculino)",   descricao: "Voz masculina clara" },
  { id: "fable",   label: "Fable (Expressivo)", descricao: "Voz expressiva e calorosa" },
  { id: "onyx",    label: "Onyx (Profundo)",    descricao: "Voz masculina profunda" },
  { id: "nova",    label: "Nova (Feminino)",     descricao: "Voz feminina suave" },
  { id: "shimmer", label: "Shimmer (Suave)",     descricao: "Voz suave e agradável" },
] as const;

export type TTSVoice = typeof TTS_VOICES[number]["id"];

// ─── Inicializar cliente OpenAI para TTS ──────────────────────────────────────
function getTTSClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  // Usar base URL do proxy Manus se disponível
  const baseURL = process.env.OPENAI_BASE_URL || process.env.OPENAI_API_BASE;
  return new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
}

// ─── Router tRPC (para listar vozes e verificar disponibilidade) ──────────────
export const ttsRouter = router({
  /**
   * Verificar se TTS OpenAI está disponível
   */
  verificarDisponibilidade: protectedProcedure
    .query(async () => {
      const disponivel = !!process.env.OPENAI_API_KEY;
      return {
        disponivel,
        vozes: TTS_VOICES,
        modelos: [
          { id: "tts-1",    label: "Standard (rápido)",    descricao: "Boa qualidade, baixa latência" },
          { id: "tts-1-hd", label: "HD (alta qualidade)",  descricao: "Máxima qualidade, ligeiramente mais lento" },
        ],
      };
    }),
});

// ─── Rota Express REST para streaming de áudio ────────────────────────────────
// POST /api/tts/synthesize
// Body: { texto: string, voz?: TTSVoice, modelo?: string, velocidade?: number }
// Response: audio/mpeg stream
export function registerTTSRoutes(app: Express): void {
  app.post("/api/tts/synthesize", async (req: Request, res: Response) => {
    // Verificar autenticação
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }

    const { texto, voz = "nova", modelo = "tts-1", velocidade = 1.0 } = req.body;

    if (!texto || typeof texto !== "string" || texto.trim().length === 0) {
      res.status(400).json({ error: "Texto é obrigatório" });
      return;
    }

    if (texto.length > 4096) {
      res.status(400).json({ error: "Texto demasiado longo (máximo 4096 caracteres)" });
      return;
    }

    const client = getTTSClient();
    if (!client) {
      res.status(503).json({ error: "OpenAI TTS não configurado. Defina OPENAI_API_KEY." });
      return;
    }

    try {
      const vozValida = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"].includes(voz) ? voz : "nova";
      const modeloValido = ["tts-1", "tts-1-hd"].includes(modelo) ? modelo : "tts-1";
      const velocidadeValida = Math.min(4.0, Math.max(0.25, Number(velocidade) || 1.0));

      const response = await client.audio.speech.create({
        model: modeloValido,
        voice: vozValida as any,
        input: texto.trim(),
        response_format: "mp3",
        speed: velocidadeValida,
      });

      // Converter para buffer e enviar
      const buffer = Buffer.from(await response.arrayBuffer());

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", buffer.length);
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("X-TTS-Voice", vozValida);
      res.setHeader("X-TTS-Model", modeloValido);
      res.send(buffer);
    } catch (error: any) {
      console.error("[TTS] Erro ao sintetizar voz:", error?.message || error);
      const status = error?.status || 500;
      const message = error?.message || "Erro ao sintetizar voz com OpenAI TTS";
      res.status(status).json({ error: message });
    }
  });

  // GET /api/tts/vozes — listar vozes disponíveis
  app.get("/api/tts/vozes", (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }
    res.json({
      disponivel: !!process.env.OPENAI_API_KEY,
      vozes: TTS_VOICES,
    });
  });
}
