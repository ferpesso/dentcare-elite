/**
 * exportRoutes.ts — Rotas HTTP de Exportação de Dados
 * DentCare Elite V32
 *
 * Endpoints:
 * GET /api/export/utentes.csv
 * GET /api/export/utentes.xlsx
 * GET /api/export/consultas.csv
 * GET /api/export/consultas.xlsx
 * GET /api/export/pagamentos.csv
 * GET /api/export/pagamentos.xlsx
 * GET /api/export/faturacao.csv
 * GET /api/export/faturacao.xlsx
 *
 * Todos os endpoints requerem autenticação (sessão válida).
 * Permissões verificadas por role (RBAC).
 */

import type { Express, Request, Response } from "express";
import { getDb } from "../db";
import { utentes, consultas, pagamentos, faturas } from "../../drizzle/schema";
import { desc } from "drizzle-orm";
import { hasPermission } from "../rbac";
import {
  enviarCSV,
  enviarXLSX,
  COLUNAS_UTENTES,
  COLUNAS_CONSULTAS,
  COLUNAS_PAGAMENTOS,
  COLUNAS_FATURACAO,
  type ExportRow,
} from "./exportService";

// ─── Guard de autenticação ────────────────────────────────────────────────────
function requireAuth(req: Request, res: Response): boolean {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: "Não autenticado" });
    return false;
  }
  return true;
}

function requirePermission(req: Request, res: Response, permission: string): boolean {
  const user = (req as any).user;
  if (!hasPermission(user, permission)) {
    res.status(403).json({ error: "Sem permissão para exportar estes dados" });
    return false;
  }
  return true;
}

// ─── Registo de rotas ─────────────────────────────────────────────────────────
export function registerExportRoutes(app: Express): void {

  // ── Utentes ────────────────────────────────────────────────────────────────
  async function exportUtentes(req: Request, res: Response, formato: "csv" | "xlsx") {
    if (!requireAuth(req, res)) return;
    if (!requirePermission(req, res, "utentes.read")) return;
    try {
      const db = await getDb();
      if (!db) { res.status(503).json({ error: "Base de dados indisponível" }); return; }
      const lista = await db.select().from(utentes).orderBy(desc(utentes.createdAt)).limit(10000);
      const linhas: ExportRow[] = lista.map((u) => ({
        id: u.id,
        nome: u.nome,
        email: u.email ?? "",
        telemovel: u.telemovel ?? "",
        nif: u.nif ?? "",
        dataNascimento: u.dataNascimento ? new Date(u.dataNascimento) : "",
        genero: u.genero ?? "",
        morada: u.morada ?? "",
        localidade: u.localidade ?? "",
        createdAt: u.createdAt ? new Date(u.createdAt) : "",
      }));
      const nome = `dentcare_utentes_${new Date().toISOString().split("T")[0]}`;
      if (formato === "csv") enviarCSV(res, nome, COLUNAS_UTENTES, linhas);
      else await enviarXLSX(res, nome, COLUNAS_UTENTES, linhas, "Utentes");
    } catch (err) {
      console.error("[exportRoutes] Erro ao exportar utentes:", err);
      res.status(500).json({ error: "Erro ao exportar dados" });
    }
  }

  app.get("/api/export/utentes.csv",  (req, res) => exportUtentes(req, res, "csv"));
  app.get("/api/export/utentes.xlsx", (req, res) => exportUtentes(req, res, "xlsx"));

  // ── Consultas ──────────────────────────────────────────────────────────────
  async function exportConsultas(req: Request, res: Response, formato: "csv" | "xlsx") {
    if (!requireAuth(req, res)) return;
    if (!requirePermission(req, res, "consultas.read")) return;
    try {
      const db = await getDb();
      if (!db) { res.status(503).json({ error: "Base de dados indisponível" }); return; }
      const lista = await db.select().from(consultas).orderBy(desc(consultas.dataHoraInicio)).limit(10000);
      const linhas: ExportRow[] = lista.map((c) => ({
        id: c.id,
        utenteNome: c.utenteNome ?? `Utente #${c.utenteId}`,
        medicoNome: c.medicoNome ?? `Médico #${c.medicoId}`,
        dataHoraInicio: c.dataHoraInicio ? new Date(c.dataHoraInicio) : "",
        estado: c.estado ?? "",
        tipo: c.tipoConsulta ?? "",
        notas: c.observacoes ?? "",
      }));
      const nome = `dentcare_consultas_${new Date().toISOString().split("T")[0]}`;
      if (formato === "csv") enviarCSV(res, nome, COLUNAS_CONSULTAS, linhas);
      else await enviarXLSX(res, nome, COLUNAS_CONSULTAS, linhas, "Consultas");
    } catch (err) {
      console.error("[exportRoutes] Erro ao exportar consultas:", err);
      res.status(500).json({ error: "Erro ao exportar dados" });
    }
  }

  app.get("/api/export/consultas.csv",  (req, res) => exportConsultas(req, res, "csv"));
  app.get("/api/export/consultas.xlsx", (req, res) => exportConsultas(req, res, "xlsx"));

  // ── Pagamentos ─────────────────────────────────────────────────────────────
  async function exportPagamentos(req: Request, res: Response, formato: "csv" | "xlsx") {
    if (!requireAuth(req, res)) return;
    if (!requirePermission(req, res, "pagamentos.read")) return;
    try {
      const db = await getDb();
      if (!db) { res.status(503).json({ error: "Base de dados indisponível" }); return; }
      const lista = await db.select().from(pagamentos).orderBy(desc(pagamentos.createdAt)).limit(10000);
      const linhas: ExportRow[] = lista.map((p) => ({
        id: p.id,
        utenteNome: p.utenteNome ?? `Utente #${p.utenteId}`,
        valor: p.valor,
        metodo: p.metodo ?? "",
        estado: p.estado ?? "",
        data: p.data ? new Date(p.data) : "",
        referencia: p.referencia ?? "",
        notas: p.notas ?? "",
      }));
      const nome = `dentcare_pagamentos_${new Date().toISOString().split("T")[0]}`;
      if (formato === "csv") enviarCSV(res, nome, COLUNAS_PAGAMENTOS, linhas);
      else await enviarXLSX(res, nome, COLUNAS_PAGAMENTOS, linhas, "Pagamentos");
    } catch (err) {
      console.error("[exportRoutes] Erro ao exportar pagamentos:", err);
      res.status(500).json({ error: "Erro ao exportar dados" });
    }
  }

  app.get("/api/export/pagamentos.csv",  (req, res) => exportPagamentos(req, res, "csv"));
  app.get("/api/export/pagamentos.xlsx", (req, res) => exportPagamentos(req, res, "xlsx"));

  // ── Faturação ──────────────────────────────────────────────────────────────
  async function exportFaturacao(req: Request, res: Response, formato: "csv" | "xlsx") {
    if (!requireAuth(req, res)) return;
    if (!requirePermission(req, res, "faturas.read")) return;
    try {
      const db = await getDb();
      if (!db) { res.status(503).json({ error: "Base de dados indisponível" }); return; }
      const lista = await db.select().from(faturas).orderBy(desc(faturas.createdAt)).limit(10000);
      const linhas: ExportRow[] = lista.map((f) => ({
        numero: f.numeroFatura ?? `FAT-${f.id}`,
        utenteNome: f.utenteNome ?? `Utente #${f.utenteId}`,
        utenteNif: f.utenteNif ?? "",
        dataEmissao: f.dataEmissao ? new Date(f.dataEmissao) : "",
        subtotal: f.subtotal ?? f.valorBase,
        iva: f.iva ?? f.valorIva ?? 0,
        total: f.total ?? f.valorTotal,
        estado: f.estado ?? "",
      }));
      const nome = `dentcare_faturacao_${new Date().toISOString().split("T")[0]}`;
      if (formato === "csv") enviarCSV(res, nome, COLUNAS_FATURACAO, linhas);
      else await enviarXLSX(res, nome, COLUNAS_FATURACAO, linhas, "Faturação");
    } catch (err) {
      console.error("[exportRoutes] Erro ao exportar faturação:", err);
      res.status(500).json({ error: "Erro ao exportar dados" });
    }
  }

  app.get("/api/export/faturacao.csv",  (req, res) => exportFaturacao(req, res, "csv"));
  app.get("/api/export/faturacao.xlsx", (req, res) => exportFaturacao(req, res, "xlsx"));

  console.log("[OK] Rotas de exportação CSV/XLSX registadas (/api/export/*)");
}
