/**
 * notificationService.ts — Serviço de Notificações Persistentes
 * DentCare V35 — Centro de Notificações Inteligente
 *
 * Gere notificações persistentes na BD com:
 * - Criação por tipo e prioridade
 * - Marcação como lida/não lida
 * - Limpeza automática de notificações expiradas
 * - Contagem por tipo e prioridade
 * - Integração com SSE para tempo real
 */

import { getDb } from "../db";
import { notificacoes } from "../../drizzle/schema";
import { eq, and, lte, desc, count, sql } from "drizzle-orm";
import { broadcastSSE } from "../mcp/mcpServer";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type NotificacaoTipo =
  | "consulta" | "pagamento" | "utente" | "alerta" | "sistema"
  | "marketing" | "laboratorio" | "stock" | "ia";

export type NotificacaoPrioridade = "baixa" | "media" | "alta" | "critica";

export interface CriarNotificacaoInput {
  userId: number;
  tipo: NotificacaoTipo;
  prioridade: NotificacaoPrioridade;
  titulo: string;
  mensagem: string;
  acaoUrl?: string;
  acaoLabel?: string;
  metadados?: Record<string, unknown>;
  expiresAt?: Date;
}

// ─── Funções do Serviço ─────────────────────────────────────────────────────

/**
 * Criar uma nova notificação
 */
export async function criarNotificacao(input: CriarNotificacaoInput): Promise<number | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    const [result] = await db.insert(notificacoes).values({
      userId: input.userId,
      tipo: input.tipo,
      prioridade: input.prioridade,
      titulo: input.titulo,
      mensagem: input.mensagem,
      lida: false,
      acaoUrl: input.acaoUrl || null,
      acaoLabel: input.acaoLabel || null,
      metadados: input.metadados ? JSON.stringify(input.metadados) : null,
      expiresAt: input.expiresAt || null,
    });

    // Notificar via SSE em tempo real
    broadcastSSE("nova_notificacao", {
      id: result.insertId,
      tipo: input.tipo,
      prioridade: input.prioridade,
      titulo: input.titulo,
      timestamp: new Date().toISOString(),
    });

    return Number(result.insertId);
  } catch (error) {
    console.error("[NotificationService] Erro ao criar notificação:", error);
    return null;
  }
}

/**
 * Obter notificações de um utilizador
 */
export async function obterNotificacoes(
  userId: number,
  opcoes: { limite?: number; apenasNaoLidas?: boolean; tipo?: NotificacaoTipo } = {}
): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    const conditions = [eq(notificacoes.userId, userId)];
    if (opcoes.apenasNaoLidas) conditions.push(eq(notificacoes.lida, false));
    if (opcoes.tipo) conditions.push(eq(notificacoes.tipo, opcoes.tipo));

    const resultado = await db
      .select()
      .from(notificacoes)
      .where(and(...conditions))
      .orderBy(desc(notificacoes.createdAt))
      .limit(opcoes.limite || 50);

    return resultado;
  } catch (error) {
    console.error("[NotificationService] Erro ao obter notificações:", error);
    return [];
  }
}

/**
 * Marcar notificação como lida
 */
export async function marcarComoLida(notificacaoId: number): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    await db.update(notificacoes)
      .set({ lida: true })
      .where(eq(notificacoes.id, notificacaoId));

    return true;
  } catch (error) {
    console.error("[NotificationService] Erro ao marcar como lida:", error);
    return false;
  }
}

/**
 * Marcar todas as notificações de um utilizador como lidas
 */
export async function marcarTodasComoLidas(userId: number): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    await db.update(notificacoes)
      .set({ lida: true })
      .where(and(eq(notificacoes.userId, userId), eq(notificacoes.lida, false)));

    return true;
  } catch (error) {
    console.error("[NotificationService] Erro ao marcar todas como lidas:", error);
    return false;
  }
}

/**
 * Contar notificações não lidas
 */
export async function contarNaoLidas(userId: number): Promise<{
  total: number;
  porTipo: Record<string, number>;
  porPrioridade: Record<string, number>;
}> {
  try {
    const db = await getDb();
    if (!db) return { total: 0, porTipo: {}, porPrioridade: {} };

    const [totalResult] = await db
      .select({ total: count() })
      .from(notificacoes)
      .where(and(eq(notificacoes.userId, userId), eq(notificacoes.lida, false)));

    const porTipoResult = await db
      .select({ tipo: notificacoes.tipo, total: count() })
      .from(notificacoes)
      .where(and(eq(notificacoes.userId, userId), eq(notificacoes.lida, false)))
      .groupBy(notificacoes.tipo);

    const porPrioridadeResult = await db
      .select({ prioridade: notificacoes.prioridade, total: count() })
      .from(notificacoes)
      .where(and(eq(notificacoes.userId, userId), eq(notificacoes.lida, false)))
      .groupBy(notificacoes.prioridade);

    const porTipo: Record<string, number> = {};
    porTipoResult.forEach(r => { porTipo[r.tipo] = r.total; });

    const porPrioridade: Record<string, number> = {};
    porPrioridadeResult.forEach(r => { porPrioridade[r.prioridade] = r.total; });

    return {
      total: totalResult?.total || 0,
      porTipo,
      porPrioridade,
    };
  } catch (error) {
    console.error("[NotificationService] Erro ao contar não lidas:", error);
    return { total: 0, porTipo: {}, porPrioridade: {} };
  }
}

/**
 * Limpar notificações expiradas
 */
export async function limparExpiradas(): Promise<number> {
  try {
    const db = await getDb();
    if (!db) return 0;

    const agora = new Date();
    const [result] = await db
      .delete(notificacoes)
      .where(and(
        lte(notificacoes.expiresAt, agora),
        sql`${notificacoes.expiresAt} IS NOT NULL`
      ));

    return (result as any).affectedRows || 0;
  } catch (error) {
    console.error("[NotificationService] Erro ao limpar expiradas:", error);
    return 0;
  }
}

/**
 * Eliminar uma notificação
 */
export async function eliminarNotificacao(notificacaoId: number): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    await db.delete(notificacoes).where(eq(notificacoes.id, notificacaoId));
    return true;
  } catch (error) {
    console.error("[NotificationService] Erro ao eliminar notificação:", error);
    return false;
  }
}
