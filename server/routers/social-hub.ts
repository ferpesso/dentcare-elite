/**
 * Social Hub Pro — Gestor Profissional de Conteúdo Digital
 * DentCare Elite V35 — Integração Real com Meta (Facebook/Instagram) e LinkedIn
 *
 * Funcionalidades:
 * - Conexão OAuth com redes sociais
 * - Visualizador de feed integrado
 * - Publicação de conteúdo
 * - Métricas reais (likes, comentários, alcance)
 * - Calendário de conteúdo
 * - Agendamento de posts
 *
 * NOTA: Persistência migrada de memória para BD (tabelas: contas_social_media, postagens_social)
 */

import { protectedProcedure, router } from "../_core/trpc";
import { encryptApiKey, decryptApiKey, isEncrypted } from "../services/iaService";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { hasPermission } from "../rbac";
import { logAuditAction } from "../auditService";
import { getDb } from "../db";
import { contasSocialMedia, postagensSocial } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { publicarNaRedeSocial } from "../services/socialPublisher";

export const socialHubRouter = router({
  /**
   * Obter URL de autenticação OAuth para conectar conta
   */
  obterUrlAutenticacao: protectedProcedure
    .input(z.object({ redeSocial: z.enum(["instagram", "facebook", "linkedin", "tiktok", "google_business"]) }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "redes_sociais.manage")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const redirectBase = process.env.REDIRECT_URI || "http://localhost:3000";
      const metaAppId = process.env.META_APP_ID || "";
      const linkedinClientId = process.env.LINKEDIN_CLIENT_ID || "";
      const tiktokClientId = process.env.TIKTOK_CLIENT_ID || "";

      const googleClientId = process.env.GOOGLE_CLIENT_ID || "";

      const urls: Record<string, string> = {
        // V33: Meta APIs atualizadas para v21.0, Instagram com scopes modernos
        instagram: `https://api.instagram.com/oauth/authorize?client_id=${metaAppId}&redirect_uri=${encodeURIComponent(redirectBase + "/callback/instagram")}&scope=instagram_basic,instagram_content_publish,instagram_manage_comments,instagram_manage_insights&response_type=code`,
        facebook: `https://www.facebook.com/v21.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${encodeURIComponent(redirectBase + "/callback/facebook")}&scope=pages_manage_posts,pages_read_engagement,pages_manage_metadata`,
        // V33: LinkedIn com scopes da nova Posts API
        linkedin: `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${linkedinClientId}&redirect_uri=${encodeURIComponent(redirectBase + "/callback/linkedin")}&scope=openid%20profile%20w_member_social`,
        tiktok: `https://open.tiktok.com/platform/oauth/authorize?client_id=${tiktokClientId}&redirect_uri=${encodeURIComponent(redirectBase + "/callback/tiktok")}&scope=user.info.basic,video.list`,
        // V33: Google Business Profile (novo)
        google_business: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(redirectBase + "/callback/google_business")}&scope=https://www.googleapis.com/auth/business.manage&response_type=code&access_type=offline`,
      };

      return {
        success: true,
        url: urls[input.redeSocial],
        redeSocial: input.redeSocial,
      };
    }),

  /**
   * Conectar conta de rede social (callback OAuth) — persiste na BD
   */
  conectarConta: protectedProcedure
    .input(
      z.object({
        redeSocial: z.enum(["instagram", "facebook", "linkedin", "tiktok", "google_business"]),
        accessToken: z.string(),
        accountId: z.string(),
        accountName: z.string(),
        accountEmail: z.string().optional(),
        profilePicture: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "redes_sociais.manage")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      // Verificar se conta já está conectada (por idPlataforma único)
      const [jaConectada] = await db
        .select({ id: contasSocialMedia.id })
        .from(contasSocialMedia)
        .where(eq(contasSocialMedia.idPlataforma, input.accountId))
        .limit(1);

      if (jaConectada) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Esta conta já está conectada",
        });
      }

      // Encriptar token antes de guardar na BD
      const tokenEncriptado = encryptApiKey(input.accessToken);

      const [result] = await db.insert(contasSocialMedia).values({
        plataforma: input.redeSocial,
        nomeConta: input.accountName,
        idPlataforma: input.accountId,
        tokenAcesso: tokenEncriptado,
        ativa: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await logAuditAction(ctx.user, {
        acao: "create",
        tabela: "contas_social_media",
        registoId: result.insertId,
        descricao: `Conta ${input.redeSocial} conectada: ${input.accountName}`,
      });

      return { success: true, contaId: result.insertId };
    }),

  /**
   * Listar contas conectadas — lê da BD
   */
  listarContas: protectedProcedure.query(async ({ ctx }) => {
    if (!hasPermission(ctx.user, "redes_sociais.read")) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    const contas = await db
      .select()
      .from(contasSocialMedia)
      .where(eq(contasSocialMedia.ativa, true))
      .orderBy(desc(contasSocialMedia.createdAt));

    return { success: true, contas };
  }),

  /**
   * Desconectar conta — actualiza BD
   */
  desconectarConta: protectedProcedure
    .input(z.object({ contaId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "redes_sociais.manage")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [conta] = await db
        .select()
        .from(contasSocialMedia)
        .where(eq(contasSocialMedia.id, input.contaId))
        .limit(1);

      if (!conta) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conta não encontrada" });
      }

      await db
        .update(contasSocialMedia)
        .set({ ativa: false, updatedAt: new Date() })
        .where(eq(contasSocialMedia.id, input.contaId));

      await logAuditAction(ctx.user, {
        acao: "delete",
        tabela: "contas_social_media",
        registoId: input.contaId,
        descricao: `Conta ${conta.plataforma} desconectada: ${conta.nomeConta}`,
      });

      return { success: true, message: "Conta desconectada" };
    }),

  /**
   * Obter feed de uma conta (posts da BD)
   */
  obterFeed: protectedProcedure
    .input(z.object({ contaId: z.number(), limite: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "redes_sociais.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [conta] = await db
        .select()
        .from(contasSocialMedia)
        .where(eq(contasSocialMedia.id, input.contaId))
        .limit(1);

      if (!conta) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conta não encontrada" });
      }

      const posts = await db
        .select()
        .from(postagensSocial)
        .where(eq(postagensSocial.contaId, input.contaId))
        .orderBy(desc(postagensSocial.createdAt))
        .limit(input.limite);

      return {
        success: true,
        conta,
        posts: posts.map(p => ({
          ...p,
          imagens: (() => { try { return p.imagens ? JSON.parse(p.imagens) : []; } catch { return []; } })(),
          engajamento: (() => { try { return p.engajamento ? JSON.parse(p.engajamento) : { likes: 0, comentarios: 0, compartilhamentos: 0, alcance: 0 }; } catch { return { likes: 0, comentarios: 0, compartilhamentos: 0, alcance: 0 }; } })(),
        })),
        total: posts.length,
      };
    }),

  /**
   * Publicar post — publica na API real da rede social E persiste na BD
   * Se a publicação externa falhar, regista com estado "falha" e devolve aviso.
   */
  publicarPost: protectedProcedure
    .input(
      z.object({
        contaId: z.number(),
        conteudo: z.string().min(1),
        imagens: z.array(z.string()).optional(),
        hashtags: z.string().optional(),
        agendado: z.boolean().default(false),
        dataAgendamento: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "redes_sociais.publish")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [conta] = await db
        .select()
        .from(contasSocialMedia)
        .where(eq(contasSocialMedia.id, input.contaId))
        .limit(1);

      if (!conta) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conta não encontrada" });
      }

      const conteudoFinal = input.hashtags
        ? `${input.conteudo}\n\n${input.hashtags}`
        : input.conteudo;

      // Estados válidos no schema: "rascunho" | "agendada" | "publicada" | "cancelada"
      let estado: "rascunho" | "agendada" | "publicada" | "cancelada" = input.agendado ? "agendada" : "publicada";
      const dataPublicacao = input.agendado ? undefined : new Date();
      const dataAgendamento = input.agendado ? input.dataAgendamento : undefined;
      let idExterno: string | undefined;
      let avisoPublicacao: string | undefined;

      // ── Publicar na API real (apenas se não for agendado) ────────────────────────
      if (!input.agendado) {
        // Descriptografar token antes de usar na API externa
        const tokenParaUso = isEncrypted(conta.tokenAcesso ?? "")
          ? decryptApiKey(conta.tokenAcesso!)
          : (conta.tokenAcesso ?? "");

        const resultadoAPI = await publicarNaRedeSocial({
          plataforma: conta.plataforma,
          tokenAcesso: tokenParaUso,
          idPlataforma: conta.idPlataforma,
          conteudo: conteudoFinal,
          imagens: input.imagens,
        });

        if (!resultadoAPI.sucesso) {
          // Falha na API externa: guardar como "cancelada" (estado válido no schema)
          estado = "cancelada";
          avisoPublicacao = resultadoAPI.erro || resultadoAPI.aviso;
        } else {
          idExterno = resultadoAPI.idExterno;
          if (resultadoAPI.aviso) avisoPublicacao = resultadoAPI.aviso;
        }
      }

      const [result] = await db.insert(postagensSocial).values({
        contaId: input.contaId,
        conteudo: conteudoFinal,
        imagens: input.imagens ? JSON.stringify(input.imagens) : null,
        estado,
        dataAgendamento: dataAgendamento ?? null,
        dataPublicacao: dataPublicacao ?? null,
        engajamento: JSON.stringify({ likes: 0, comentarios: 0, compartilhamentos: 0, alcance: 0 }),
        criadoPor: ctx.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await logAuditAction(ctx.user, {
        acao: "create",
        tabela: "postagens_social",
        registoId: result.insertId,
        descricao: `Post ${estado} em ${conta.plataforma}${idExterno ? ` (ID externo: ${idExterno})` : ""}`,
      });

      return {
        success: true,
        postId: result.insertId,
        idExterno,
        aviso: avisoPublicacao,
        publicadoExternamente: !input.agendado && estado === "publicada",
      };
    }),

  /**
   * Obter métricas de um post — lê da BD
   */
  obterMetricasPost: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "redes_sociais.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [post] = await db
        .select()
        .from(postagensSocial)
        .where(eq(postagensSocial.id, input.postId))
        .limit(1);

      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post não encontrado" });
      }

      let eng = { likes: 0, comentarios: 0, compartilhamentos: 0, alcance: 0 };
      try { eng = post.engajamento ? JSON.parse(post.engajamento) : eng; } catch { /* manter defaults */ }

      return {
        success: true,
        metricas: {
          likes: eng.likes || 0,
          comentarios: eng.comentarios || 0,
          compartilhamentos: eng.compartilhamentos || 0,
          alcance: eng.alcance || 0,
          engajamento: (eng.likes || 0) + (eng.comentarios || 0) + (eng.compartilhamentos || 0),
          taxaEngajamento: eng.alcance > 0
            ? (((eng.likes || 0) + (eng.comentarios || 0) + (eng.compartilhamentos || 0)) / eng.alcance * 100).toFixed(2)
            : "0.00",
        },
      };
    }),

  /**
   * Agendar post — persiste na BD
   */
  agendarPost: protectedProcedure
    .input(
      z.object({
        contaId: z.number(),
        conteudo: z.string().min(1),
        imagens: z.array(z.string()).optional(),
        dataAgendamento: z.date(),
        horaAgendamento: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "redes_sociais.publish")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [conta] = await db
        .select()
        .from(contasSocialMedia)
        .where(eq(contasSocialMedia.id, input.contaId))
        .limit(1);

      if (!conta) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conta não encontrada" });
      }

      // Combinar data e hora de agendamento
      const [horas, minutos] = input.horaAgendamento.split(":").map(Number);
      const dataHoraAgendamento = new Date(input.dataAgendamento);
      dataHoraAgendamento.setHours(horas, minutos, 0, 0);

      const [result] = await db.insert(postagensSocial).values({
        contaId: input.contaId,
        conteudo: input.conteudo,
        imagens: input.imagens ? JSON.stringify(input.imagens) : null,
        estado: "agendada",
        dataAgendamento: dataHoraAgendamento,
        engajamento: JSON.stringify({ likes: 0, comentarios: 0, compartilhamentos: 0, alcance: 0 }),
        criadoPor: ctx.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await logAuditAction(ctx.user, {
        acao: "create",
        tabela: "postagens_social",
        registoId: result.insertId,
        descricao: `Post agendado para ${input.dataAgendamento.toLocaleDateString("pt-PT")} às ${input.horaAgendamento} em ${conta.plataforma}`,
      });

      return { success: true, agendamentoId: result.insertId };
    }),

  /**
   * Listar agendamentos — lê da BD
   */
  listarAgendamentos: protectedProcedure
    .input(z.object({ contaId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "redes_sociais.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const conditions = [eq(postagensSocial.estado, "agendada")];
      if (input.contaId) {
        conditions.push(eq(postagensSocial.contaId, input.contaId));
      }

      const agendamentos = await db
        .select()
        .from(postagensSocial)
        .where(and(...conditions))
        .orderBy(postagensSocial.dataAgendamento);

      return {
        success: true,
        agendamentos: agendamentos.map(a => ({
          ...a,
          imagens: (() => { try { return a.imagens ? JSON.parse(a.imagens) : []; } catch { return []; } })(),
        })),
      };
    }),

  /**
   * Obter estatísticas gerais — calculadas da BD
   */
  obterEstatisticas: protectedProcedure.query(async ({ ctx }) => {
    if (!hasPermission(ctx.user, "redes_sociais.read")) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    const [totalContas] = await db
      .select({ count: sql<number>`count(*)` })
      .from(contasSocialMedia)
      .where(eq(contasSocialMedia.ativa, true));

    const [totalPosts] = await db
      .select({ count: sql<number>`count(*)` })
      .from(postagensSocial)
      .where(eq(postagensSocial.estado, "publicada"));

    const [postsAgendados] = await db
      .select({ count: sql<number>`count(*)` })
      .from(postagensSocial)
      .where(eq(postagensSocial.estado, "agendada"));

    // Calcular métricas agregadas a partir do campo JSON engajamento
    const todasPostagens = await db
      .select({ engajamento: postagensSocial.engajamento })
      .from(postagensSocial)
      .where(eq(postagensSocial.estado, "publicada"));

    let totalLikes = 0;
    let totalComentarios = 0;
    let totalAlcance = 0;

    for (const p of todasPostagens) {
      if (p.engajamento) {
        try {
          const eng = JSON.parse(p.engajamento);
          totalLikes += eng.likes || 0;
          totalComentarios += eng.comentarios || 0;
          totalAlcance += eng.alcance || 0;
        } catch {}
      }
    }

    const numPosts = Number(totalPosts?.count) || 0;

    return {
      success: true,
      estatisticas: {
        totalContas: Number(totalContas?.count) || 0,
        totalPosts: numPosts,
        postsAgendados: Number(postsAgendados?.count) || 0,
        totalLikes,
        totalComentarios,
        totalAlcance,
        engajamentoMedio: numPosts > 0 ? (totalLikes + totalComentarios) / numPosts : 0,
      },
    };
  }),

  /**
   * Deletar post — remove da BD
   */
  deletarPost: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "redes_sociais.publish")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [post] = await db
        .select()
        .from(postagensSocial)
        .where(eq(postagensSocial.id, input.postId))
        .limit(1);

      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post não encontrado" });
      }

      await db.delete(postagensSocial).where(eq(postagensSocial.id, input.postId));

      await logAuditAction(ctx.user, {
        acao: "delete",
        tabela: "postagens_social",
        registoId: input.postId,
        descricao: `Post eliminado da plataforma`,
      });

      return { success: true, message: "Post eliminado" };
    }),
});
