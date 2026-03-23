/**
 * Audit Service - Rastreabilidade Imutável
 * Registra todas as alteracoes criticas no sistema
 * Quem, Quando, O que, Valor Anterior vs Novo
 */

import { getDb } from "./db";
import { auditLog } from "../drizzle/schema";
import type { User } from "../drizzle/schema";

export interface AuditLogEntry {
  usuarioId: number;
  acao: string; // create, update, delete, view
  tabela: string;
  registoId: number;
  valorAnterior?: Record<string, unknown>;
  valorNovo?: Record<string, unknown>;
  descricao?: string;
}

/**
 * Registra uma acao no audit log
 */
export async function logAuditAction(
  user: User,
  entry: Omit<AuditLogEntry, "usuarioId">
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[AuditService] Database not available");
    return;
  }

  try {
    await db.insert(auditLog).values({
      usuarioId: user.id,
      acao: entry.acao,
      tabela: entry.tabela,
      registoId: entry.registoId,
      valorAnterior: entry.valorAnterior ? JSON.stringify(entry.valorAnterior) : null,
      valorNovo: entry.valorNovo ? JSON.stringify(entry.valorNovo) : null,
      descricao: entry.descricao,
    });
  } catch (error) {
    console.error("[AuditService] Failed to log action:", error);
    // Nao lancamos erro para nao interromper a operacao principal
  }
}

/**
 * Registra a criacao de um novo registo
 */
export async function logCreate(
  user: User,
  tabela: string,
  registoId: number,
  valorNovo: Record<string, unknown>,
  descricao?: string
): Promise<void> {
  await logAuditAction(user, {
    acao: "create",
    tabela,
    registoId,
    valorNovo,
    descricao: descricao || `Criado novo registo em ${tabela}`,
  });
}

/**
 * Registra a atualizacao de um registo
 */
export async function logUpdate(
  user: User,
  tabela: string,
  registoId: number,
  valorAnterior: Record<string, unknown>,
  valorNovo: Record<string, unknown>,
  descricao?: string
): Promise<void> {
  await logAuditAction(user, {
    acao: "update",
    tabela,
    registoId,
    valorAnterior,
    valorNovo,
    descricao: descricao || `Atualizado registo em ${tabela}`,
  });
}

/**
 * Registra a delecao (soft-delete) de um registo
 */
export async function logDelete(
  user: User,
  tabela: string,
  registoId: number,
  valorAnterior: Record<string, unknown>,
  descricao?: string
): Promise<void> {
  await logAuditAction(user, {
    acao: "delete",
    tabela,
    registoId,
    valorAnterior,
    descricao: descricao || `Eliminado registo em ${tabela}`,
  });
}

/**
 * Registra o acesso a um registo sensivel (ficha clinica, dados financeiros)
 */
export async function logAccess(
  user: User,
  tabela: string,
  registoId: number,
  descricao?: string
): Promise<void> {
  await logAuditAction(user, {
    acao: "view",
    tabela,
    registoId,
    descricao: descricao || `Acesso a ${tabela}`,
  });
}

/**
 * Registra uma acao financeira critica
 */
export async function logFinancialAction(
  user: User,
  acao: string,
  tabela: string,
  registoId: number,
  valorAnterior: Record<string, unknown>,
  valorNovo: Record<string, unknown>,
  descricao?: string
): Promise<void> {
  await logAuditAction(user, {
    acao,
    tabela,
    registoId,
    valorAnterior,
    valorNovo,
    descricao: descricao || `Acao financeira: ${acao} em ${tabela}`,
  });
}
