/**
 * Router de Imagiologia — DentCare Elite V31.1
 *
 * Persiste imagens clínicas na BD (MySQL via Drizzle).
 * Estratégia de armazenamento:
 *   - Se S3_BUCKET_NAME estiver configurado: faz upload para S3 e guarda a URL.
 *   - Caso contrário: guarda o Base64 directamente no campo s3_url (fallback local).
 *     Nota: para produção com volume elevado, configurar S3 é fortemente recomendado.
 */
import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { hasPermission } from "../rbac";
import { getDb } from "../db";
import { imagiologia, utentes } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

const TIPOS_VALIDOS = [
  "radiografia_periapical",
  "radiografia_panoramica",
  "radiografia_bitewing",
  "radiografia_cefalometrica",
  "fotografia_intraoral",
  "fotografia_extraoral",
  "tomografia_cbct",
  "outro",
] as const;

export const imagiologiaRouter = router({

  /**
   * Listar imagens de um utente
   */
  listar: protectedProcedure
    .input(z.object({ utenteId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "utentes.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const imagens = await db
        .select()
        .from(imagiologia)
        .where(eq(imagiologia.utenteId, input.utenteId))
        .orderBy(desc(imagiologia.createdAt));

      return { success: true, imagens };
    }),

  /**
   * Fazer upload de uma imagem (Base64 → BD ou S3)
   */
  upload: protectedProcedure
    .input(z.object({
      utenteId: z.number(),
      tipo: z.enum(TIPOS_VALIDOS),
      nomeOriginal: z.string().max(255),
      mimeType: z.string().max(100).default("image/jpeg"),
      imagemBase64: z.string(), // Base64 sem prefixo data:...
      tamanhoBytes: z.number().optional(),
      descricao: z.string().max(1000).optional(),
      dentesRelacionados: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "utentes.write")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      // Verificar se o utente existe
      const [utente] = await db.select({ id: utentes.id }).from(utentes).where(eq(utentes.id, input.utenteId)).limit(1);
      if (!utente) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Utente não encontrado" });
      }

      let s3Url: string;
      let s3Key: string;

      // Tentar upload para S3 se configurado
      if (process.env.S3_BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID) {
        try {
          // Importação dinâmica para não quebrar se @aws-sdk não estiver instalado
          const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
          const s3 = new S3Client({ region: process.env.AWS_REGION || "eu-west-1" });
          const key = `imagiologia/${input.utenteId}/${Date.now()}_${input.nomeOriginal}`;
          const buffer = Buffer.from(input.imagemBase64, "base64");
          await s3.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: input.mimeType,
          }));
          s3Key = key;
          s3Url = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
        } catch (err: any) {
          console.error("[Imagiologia] Falha no upload S3, usando fallback Base64:", err.message);
          // Fallback: guardar Base64 na BD
          s3Key = `local:${Date.now()}_${input.nomeOriginal}`;
          s3Url = `data:${input.mimeType};base64,${input.imagemBase64}`;
        }
      } else {
        // Sem S3 configurado: guardar Base64 directamente
        s3Key = `local:${Date.now()}_${input.nomeOriginal}`;
        s3Url = `data:${input.mimeType};base64,${input.imagemBase64}`;
      }

      const [inserted] = await db.insert(imagiologia).values({
        utenteId: input.utenteId,
        tipo: input.tipo,
        s3Url,
        s3Key,
        nomeOriginal: input.nomeOriginal,
        mimeType: input.mimeType,
        tamanhoBytes: input.tamanhoBytes,
        descricao: input.descricao,
        dentesRelacionados: input.dentesRelacionados,
        dataExame: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Buscar o registo inserido
      const [novaImagem] = await db
        .select()
        .from(imagiologia)
        .where(eq(imagiologia.utenteId, input.utenteId))
        .orderBy(desc(imagiologia.createdAt))
        .limit(1);

      return { success: true, imagem: novaImagem };
    }),

  /**
   * Guardar análise de IA numa imagem existente
   */
  guardarAnalise: protectedProcedure
    .input(z.object({
      imagemId: z.number(),
      analise: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "utentes.write")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      await db.update(imagiologia)
        .set({ analiseIA: input.analise, updatedAt: new Date() })
        .where(eq(imagiologia.id, input.imagemId));

      return { success: true };
    }),

  /**
   * Eliminar uma imagem
   */
  eliminar: protectedProcedure
    .input(z.object({ imagemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "utentes.write")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [img] = await db.select().from(imagiologia).where(eq(imagiologia.id, input.imagemId)).limit(1);
      if (!img) throw new TRPCError({ code: "NOT_FOUND" });

      // Tentar eliminar do S3 se não for Base64 local
      if (!img.s3Key.startsWith("local:") && process.env.S3_BUCKET_NAME) {
        try {
          const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
          const s3 = new S3Client({ region: process.env.AWS_REGION || "eu-west-1" });
          await s3.send(new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: img.s3Key,
          }));
        } catch (err: any) {
          console.error("[Imagiologia] Falha ao eliminar do S3:", err.message);
        }
      }

      await db.delete(imagiologia).where(eq(imagiologia.id, input.imagemId));
      return { success: true };
    }),
});
