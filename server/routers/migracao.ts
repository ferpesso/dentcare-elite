/**
 * Router de Migração de Dados — Endpoints tRPC
 * DentCare Elite V32.8 — Módulo de Migração de Dados
 *
 * Endpoints para importação de dados de sistemas legados
 * (NewSoft, Tugsis, OrisDent, Oris4D, Dentrix, etc.),
 * validação, de-duplicação e persistência na base de dados.
 *
 * UPGRADE V32.8:
 * - Suporte real a Excel (binário via base64)
 * - Importação completa: utentes + consultas + tratamentos + faturas
 * - Suporte a importação de backup JSON do DentCare
 * - Melhor gestão de constraints (telemovel obrigatório, NIF/email unique)
 * - Importação de faturas SAFT com mapeamento para utentes existentes
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { isMaster, isAdmin } from "../rbac";
import { getDb } from "../db";
import { utentes, consultas, tratamentos, faturas, medicos, auditLog } from "../../drizzle/schema";
import { SaftParser, ValidadorSaft } from "../services/saftParser";
import { CsvImporter, ValidadorImportacao } from "../services/csvImporter";
import { DeduplicationEngine } from "../services/deduplicationEngine";
import { logAuditAction } from "../auditService";
import { eq, and, or, sql } from "drizzle-orm";

// ─── Tipos ────────────────────────────────────────────────────────────────
interface SessaoMigracao {
  id: string;
  timestamp: Date;
  tipo: 'saft' | 'csv' | 'excel' | 'json';
  dados: any;
  validacao: any;
  deduplicacao: any;
  programaDetectado?: string;
}

const sessoesMigracao = new Map<string, SessaoMigracao>();

// Limpar sessões expiradas (mais de 1 hora)
setInterval(() => {
  const agora = Date.now();
  for (const [id, sessao] of sessoesMigracao) {
    if (agora - sessao.timestamp.getTime() > 3600000) {
      sessoesMigracao.delete(id);
    }
  }
}, 300000); // A cada 5 minutos

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Verificar se o utilizador tem permissão de admin
 */
function verificarPermissao(user: any) {
  if (!isMaster(user) && !isAdmin(user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas administradores podem importar dados.",
    });
  }
}

/**
 * Gerar telemóvel placeholder quando não disponível
 * (campo obrigatório na tabela utentes)
 */
function gerarTelemovelPlaceholder(nome: string, indice: number): string {
  return `000000${String(indice).padStart(3, '0')}`;
}

// ─── Router de Migração ───────────────────────────────────────────────────
export const migracaoRouter = router({
  /**
   * Importar ficheiro SAFT-PT
   */
  importarSaft: protectedProcedure
    .input(
      z.object({
        conteudo: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      verificarPermissao(ctx.user);

      try {
        // Parse SAFT-PT
        const dados = await SaftParser.parse(input.conteudo);
        const validacao = ValidadorSaft.validar(dados);

        // Criar sessão de migração (mesmo com avisos, permitir continuar)
        const sessaoId = `saft_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const sessao: SessaoMigracao = {
          id: sessaoId,
          timestamp: new Date(),
          tipo: "saft",
          dados: {
            utentes: dados.utentes,
            faturas: dados.faturas,
            consultas: [],
            tratamentos: dados.faturas.map(f => ({
              utenteNif: f.utenteNif,
              descricao: f.descricao || f.linhas.map(l => l.descricao).filter(Boolean).join(', ') || `Fatura ${f.numero}`,
              valor: f.valorTotal,
              data: f.dataEmissao,
              estado: f.estado,
            })),
          },
          validacao,
          deduplicacao: null,
        };

        sessoesMigracao.set(sessaoId, sessao);

        // Log de auditoria
        await logAuditAction(ctx.user, {
          acao: "MIGRACAO_SAFT_IMPORTADO",
          tabela: "migracao",
          registoId: 0,
          descricao: `Importação de ficheiro SAFT-PT: ${dados.utentes.length} utentes, ${dados.faturas.length} faturas`,
          valorNovo: {
            sessaoId,
            utentes: dados.utentes.length,
            faturas: dados.faturas.length,
          },
        });

        return {
          sessaoId,
          utentes: dados.utentes.length,
          faturas: dados.faturas.length,
          tratamentos: sessao.dados.tratamentos.length,
          consultas: 0,
          avisos: [...validacao.avisos, ...validacao.erros],
          programaDetectado: 'SAFT-PT',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erro ao importar SAFT-PT:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao processar ficheiro SAFT-PT: ${(error as Error).message}`,
        });
      }
    }),

  /**
   * Importar ficheiro CSV
   */
  importarCsv: protectedProcedure
    .input(
      z.object({
        conteudo: z.string(),
        tipo: z.enum(["csv", "excel", "json"]),
        mapeamento: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      verificarPermissao(ctx.user);

      try {
        let dados;

        if (input.tipo === 'json') {
          // Importar backup JSON do DentCare
          dados = CsvImporter.importarBackupDentCare(input.conteudo);
        } else if (input.tipo === 'excel') {
          // Para Excel via base64
          const dados_brutos = CsvImporter.parseExcelBase64(input.conteudo);
          const mapeamento: Record<string, number> = input.mapeamento
            ? Object.entries(input.mapeamento).reduce((acc, [key, value]) => {
                const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
                if (typeof numValue === 'number' && !isNaN(numValue)) {
                  acc[key] = numValue;
                }
                return acc;
              }, {} as Record<string, number>)
            : CsvImporter.mapearColunas(dados_brutos[0] || []);
          dados = CsvImporter.importar(dados_brutos, mapeamento);
        } else {
          // CSV normal
          const dados_brutos = CsvImporter.parseCsv(input.conteudo);
          const mapeamento: Record<string, number> = input.mapeamento
            ? Object.entries(input.mapeamento).reduce((acc, [key, value]) => {
                const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
                if (typeof numValue === 'number' && !isNaN(numValue)) {
                  acc[key] = numValue;
                }
                return acc;
              }, {} as Record<string, number>)
            : CsvImporter.mapearColunas(dados_brutos[0] || []);
          dados = CsvImporter.importar(dados_brutos, mapeamento);
        }

        const validacao = ValidadorImportacao.validar(dados);

        // Criar sessão de migração
        const sessaoId = `${input.tipo}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const sessao: SessaoMigracao = {
          id: sessaoId,
          timestamp: new Date(),
          tipo: input.tipo as any,
          dados,
          validacao,
          deduplicacao: null,
          programaDetectado: dados.programaDetectado,
        };

        sessoesMigracao.set(sessaoId, sessao);

        // Log de auditoria
        await logAuditAction(ctx.user, {
          acao: "MIGRACAO_CSV_IMPORTADO",
          tabela: "migracao",
          registoId: 0,
          descricao: `Importação de ficheiro ${input.tipo.toUpperCase()}${dados.programaDetectado ? ` (${dados.programaDetectado})` : ''}: ${dados.utentes.length} utentes`,
          valorNovo: {
            sessaoId,
            tipo: input.tipo,
            programaDetectado: dados.programaDetectado,
            utentes: dados.utentes.length,
            consultas: dados.consultas?.length || 0,
            tratamentos: dados.tratamentos?.length || 0,
          },
        });

        return {
          sessaoId,
          utentes: dados.utentes.length,
          consultas: dados.consultas?.length || 0,
          tratamentos: dados.tratamentos?.length || 0,
          faturas: dados.faturas?.length || 0,
          mapeamento: input.mapeamento || {},
          avisos: [...validacao.avisos, ...validacao.erros],
          programaDetectado: dados.programaDetectado,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erro ao importar CSV/Excel:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao processar ficheiro: ${(error as Error).message}`,
        });
      }
    }),

  /**
   * Preview de dados antes de importação
   */
  previewDados: protectedProcedure
    .input(z.object({ sessaoId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sessao = sessoesMigracao.get(input.sessaoId);
      if (!sessao) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sessão de migração não encontrada ou expirada.",
        });
      }

      return {
        tipo: sessao.tipo,
        utentes: sessao.dados.utentes.slice(0, 10),
        consultas: sessao.dados.consultas?.slice(0, 10),
        tratamentos: sessao.dados.tratamentos?.slice(0, 10),
        faturas: sessao.dados.faturas?.slice(0, 10),
        total: {
          utentes: sessao.dados.utentes.length,
          consultas: sessao.dados.consultas?.length || 0,
          tratamentos: sessao.dados.tratamentos?.length || 0,
          faturas: sessao.dados.faturas?.length || 0,
        },
        validacao: sessao.validacao,
        programaDetectado: sessao.programaDetectado,
      };
    }),

  /**
   * Executar de-duplicação
   */
  deduplicar: protectedProcedure
    .input(z.object({ sessaoId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sessao = sessoesMigracao.get(input.sessaoId);
      if (!sessao) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sessão de migração não encontrada ou expirada.",
        });
      }

      try {
        const resultado = DeduplicationEngine.detectarDuplicatas(
          sessao.dados.utentes.map((u: any, i: number) => ({
            id: u.id || u.nif || u.nome || String(i),
            nome: u.nome,
            nif: u.nif,
            email: u.email,
            telemovel: u.telemovel,
          }))
        );

        sessao.deduplicacao = resultado;

        return {
          utentesUnicos: resultado.utentesUnicos,
          duplicatasDetectadas: resultado.duplicatasDetectadas.length,
          grupos: resultado.duplicatasDetectadas,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao executar de-duplicação: ${(error as Error).message}`,
        });
      }
    }),

  /**
   * Executar migração completa
   */
  executarMigracao: protectedProcedure
    .input(
      z.object({
        sessaoId: z.string(),
        opcoes: z.object({
          deduplicar: z.boolean().default(true),
          preservarDatas: z.boolean().default(true),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      verificarPermissao(ctx.user);

      const sessao = sessoesMigracao.get(input.sessaoId);
      if (!sessao) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sessão de migração não encontrada ou expirada.",
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "Base de dados indisponível.",
        });
      }

      try {
        let utentesParaImportar = [...sessao.dados.utentes];

        // Aplicar de-duplicação se solicitado
        if (input.opcoes.deduplicar && sessao.deduplicacao) {
          const utentesProcessados = new Set<string>();
          const utentesFinais: any[] = [];

          for (const grupo of sessao.deduplicacao.duplicatasDetectadas) {
            if (grupo.acaoSugerida === "merge") {
              const merged = DeduplicationEngine.merge(grupo.utentes);
              utentesFinais.push(merged);
              grupo.utentes.forEach((u: any) => utentesProcessados.add(u.id));
            }
          }

          for (const utente of utentesParaImportar) {
            const uId = utente.id || utente.nif || utente.nome;
            if (!utentesProcessados.has(uId)) {
              utentesFinais.push(utente);
            }
          }

          utentesParaImportar = utentesFinais;
        }

        // ═══════════════════════════════════════════════════════════════
        // FASE 1: Importar Utentes
        // ═══════════════════════════════════════════════════════════════
        let utentesImportados = 0;
        let utentesIgnorados = 0;
        const mapaUtentes = new Map<string, number>(); // nif/nome -> utenteId

        for (let i = 0; i < utentesParaImportar.length; i++) {
          const utente = utentesParaImportar[i];
          try {
            // Verificar se já existe por NIF ou email
            let utenteExistente: any = null;

            if (utente.nif && utente.nif.trim().length > 0) {
              const existentes = await db
                .select({ id: utentes.id })
                .from(utentes)
                .where(eq(utentes.nif, utente.nif.trim()))
                .limit(1);
              if (existentes.length > 0) utenteExistente = existentes[0];
            }

            if (!utenteExistente && utente.email && utente.email.trim().length > 0) {
              const existentes = await db
                .select({ id: utentes.id })
                .from(utentes)
                .where(eq(utentes.email, utente.email.trim().toLowerCase()))
                .limit(1);
              if (existentes.length > 0) utenteExistente = existentes[0];
            }

            if (utenteExistente) {
              // Utente já existe — mapear e não duplicar
              const chave = utente.nif || utente.id || utente.nome;
              mapaUtentes.set(chave, utenteExistente.id);
              if (utente.nome) mapaUtentes.set(utente.nome, utenteExistente.id);
              utentesIgnorados++;
              continue;
            }

            // Garantir telemóvel (campo obrigatório)
            const telemovel = utente.telemovel && utente.telemovel.trim().length > 0
              ? utente.telemovel.trim()
              : gerarTelemovelPlaceholder(utente.nome, i);

            // Inserir utente
            const resultado = await db.insert(utentes).values({
              nome: utente.nome,
              nif: utente.nif && utente.nif.trim().length > 0 ? utente.nif.trim() : null,
              email: utente.email && utente.email.trim().length > 0 ? utente.email.trim().toLowerCase() : null,
              telemovel: telemovel,
              morada: utente.morada || null,
              cidade: utente.cidade || null,
              codigoPostal: utente.codigoPostal || null,
              pais: utente.pais || "Portugal",
              dataNascimento: utente.dataNascimento ? new Date(utente.dataNascimento) : null,
              genero: ['masculino', 'feminino', 'outro'].includes(utente.genero) ? utente.genero : null,
              observacoes: utente.observacoes
                ? `[Importado] ${utente.observacoes}`
                : `[Importado de ${sessao.programaDetectado || sessao.tipo.toUpperCase()}]`,
              ativo: true,
              createdAt: input.opcoes.preservarDatas && utente.dataRegistro
                ? new Date(utente.dataRegistro)
                : new Date(),
              updatedAt: new Date(),
            });

            // Obter o ID inserido
            const insertId = (resultado as any)[0]?.insertId || (resultado as any).insertId;
            if (insertId) {
              const chave = utente.nif || utente.id || utente.nome;
              mapaUtentes.set(chave, insertId);
              if (utente.nome) mapaUtentes.set(utente.nome, insertId);
            }

            utentesImportados++;
          } catch (e) {
            console.warn(`Erro ao importar utente ${utente.nome}:`, (e as Error).message);
            utentesIgnorados++;
          }
        }

        // ═══════════════════════════════════════════════════════════════
        // FASE 2: Obter médico padrão para associar consultas/tratamentos
        // ═══════════════════════════════════════════════════════════════
        let medicoDefault: any = null;
        const mapaMedicos = new Map<string, number>(); // nome -> medicoId

        try {
          const medicosExistentes = await db
            .select({ id: medicos.id, nome: medicos.nome })
            .from(medicos)
            .where(eq(medicos.ativo, true))
            .limit(10);

          if (medicosExistentes.length > 0) {
            medicoDefault = medicosExistentes[0];
            for (const m of medicosExistentes) {
              mapaMedicos.set(m.nome.toLowerCase(), m.id);
            }
          }
        } catch (e) {
          console.warn("Erro ao obter médicos:", (e as Error).message);
        }

        // ═══════════════════════════════════════════════════════════════
        // FASE 3: Importar Consultas (se houver dados e médico disponível)
        // ═══════════════════════════════════════════════════════════════
        let consultasImportadas = 0;
        const consultasDados = sessao.dados.consultas || [];

        if (consultasDados.length > 0 && medicoDefault) {
          for (const consulta of consultasDados) {
            try {
              // Encontrar utente
              const utenteId = mapaUtentes.get(consulta.utenteNif)
                || mapaUtentes.get(consulta.utenteNome || '')
                || null;

              if (!utenteId) continue;

              // Encontrar médico
              let medicoId = medicoDefault.id;
              if (consulta.medicoNome) {
                const medicoEncontrado = mapaMedicos.get(consulta.medicoNome.toLowerCase());
                if (medicoEncontrado) medicoId = medicoEncontrado;
              }

              const dataInicio = new Date(consulta.data);
              const duracao = consulta.duracao || 30;
              const dataFim = new Date(dataInicio.getTime() + duracao * 60000);

              await db.insert(consultas).values({
                utenteId: utenteId,
                medicoId: medicoId,
                dataHoraInicio: dataInicio,
                dataHoraFim: dataFim,
                utenteNome: consulta.utenteNome || null,
                medicoNome: consulta.medicoNome || medicoDefault.nome,
                tipoConsulta: consulta.tipo || 'Consulta Importada',
                estado: 'realizada',
                observacoes: consulta.descricao
                  ? `[Importado] ${consulta.descricao}`
                  : `[Importado de ${sessao.programaDetectado || sessao.tipo.toUpperCase()}]`,
                createdAt: input.opcoes.preservarDatas ? dataInicio : new Date(),
                updatedAt: new Date(),
              });

              consultasImportadas++;
            } catch (e) {
              console.warn(`Erro ao importar consulta:`, (e as Error).message);
            }
          }
        }

        // ═══════════════════════════════════════════════════════════════
        // FASE 4: Importar Tratamentos (se houver dados e médico disponível)
        // ═══════════════════════════════════════════════════════════════
        let tratamentosImportados = 0;
        const tratamentosDados = sessao.dados.tratamentos || [];

        if (tratamentosDados.length > 0 && medicoDefault) {
          for (const tratamento of tratamentosDados) {
            try {
              // Encontrar utente
              const utenteId = mapaUtentes.get(tratamento.utenteNif)
                || mapaUtentes.get(tratamento.utenteNome || '')
                || null;

              if (!utenteId) continue;

              // Encontrar médico
              let medicoId = medicoDefault.id;
              if (tratamento.medicoNome) {
                const medicoEncontrado = mapaMedicos.get(tratamento.medicoNome.toLowerCase());
                if (medicoEncontrado) medicoId = medicoEncontrado;
              }

              const valorBruto = tratamento.valor || 0;

              await db.insert(tratamentos).values({
                utenteId: utenteId,
                medicoId: medicoId,
                descricao: tratamento.descricao || 'Tratamento Importado',
                dente: tratamento.dente || null,
                dataInicio: input.opcoes.preservarDatas && tratamento.data
                  ? new Date(tratamento.data)
                  : new Date(),
                valorBruto: String(valorBruto),
                custosDiretos: "0.00",
                baseCalculo: String(valorBruto),
                valorComissao: "0.00",
                lucroClinica: String(valorBruto),
                estado: tratamento.estado === 'concluido' ? 'concluido'
                  : tratamento.estado === 'cancelado' ? 'cancelado'
                  : 'concluido',
                observacoes: `[Importado de ${sessao.programaDetectado || sessao.tipo.toUpperCase()}]`,
                createdAt: input.opcoes.preservarDatas && tratamento.data
                  ? new Date(tratamento.data)
                  : new Date(),
                updatedAt: new Date(),
              });

              tratamentosImportados++;
            } catch (e) {
              console.warn(`Erro ao importar tratamento:`, (e as Error).message);
            }
          }
        }

        // ═══════════════════════════════════════════════════════════════
        // FASE 5: Importar Faturas SAFT (se houver dados)
        // ═══════════════════════════════════════════════════════════════
        let faturasImportadas = 0;
        const faturasDados = sessao.dados.faturas || [];

        if (faturasDados.length > 0) {
          for (const fatura of faturasDados) {
            try {
              // Encontrar utente
              const utenteId = mapaUtentes.get(fatura.utenteNif)
                || mapaUtentes.get(fatura.utenteNome || '')
                || null;

              if (!utenteId) continue;

              // Verificar se a fatura já existe
              const faturaExistente = await db
                .select({ id: faturas.id })
                .from(faturas)
                .where(eq(faturas.numeroFatura, fatura.numero))
                .limit(1);

              if (faturaExistente.length > 0) continue;

              const valorTotal = fatura.valorTotal || 0;
              const valorIva = fatura.valorIva || 0;
              const valorBase = valorTotal - valorIva;

              await db.insert(faturas).values({
                utenteId: utenteId,
                numeroFatura: fatura.numero,
                tipoDocumento: 'fatura',
                dataEmissao: new Date(fatura.dataEmissao),
                utenteNome: fatura.utenteNome || null,
                utenteNif: fatura.utenteNif || null,
                valorBase: String(Math.max(valorBase, 0)),
                valorIva: String(valorIva),
                valorTotal: String(valorTotal),
                taxaIva: valorBase > 0 ? String(Math.round((valorIva / valorBase) * 100)) : "0.00",
                estado: fatura.estado === 'paga' ? 'paga'
                  : fatura.estado === 'anulada' ? 'anulada'
                  : 'pendente',
                observacoes: fatura.descricao
                  ? `[Importado SAFT] ${fatura.descricao}`
                  : `[Importado de SAFT-PT]`,
                createdAt: new Date(fatura.dataEmissao),
                updatedAt: new Date(),
              });

              faturasImportadas++;
            } catch (e) {
              console.warn(`Erro ao importar fatura ${fatura.numero}:`, (e as Error).message);
            }
          }
        }

        // ═══════════════════════════════════════════════════════════════
        // RESULTADO FINAL
        // ═══════════════════════════════════════════════════════════════

        // Log de auditoria
        await logAuditAction(ctx.user, {
          acao: "MIGRACAO_EXECUTADA",
          tabela: "migracao",
          registoId: 0,
          descricao: `Migração executada: ${utentesImportados} utentes, ${consultasImportadas} consultas, ${tratamentosImportados} tratamentos, ${faturasImportadas} faturas`,
          valorNovo: {
            sessaoId: input.sessaoId,
            tipo: sessao.tipo,
            programaDetectado: sessao.programaDetectado,
            utentesImportados,
            utentesIgnorados,
            consultasImportadas,
            tratamentosImportados,
            faturasImportadas,
            deduplicacao: input.opcoes.deduplicar,
          },
        });

        // Limpar sessão
        sessoesMigracao.delete(input.sessaoId);

        return {
          sucesso: true,
          utentesImportados,
          utentesIgnorados,
          consultasImportadas,
          tratamentosImportados,
          faturasImportadas,
          programaDetectado: sessao.programaDetectado,
          mensagem: `Migração concluída: ${utentesImportados} utentes, ${consultasImportadas} consultas, ${tratamentosImportados} tratamentos, ${faturasImportadas} faturas importados com sucesso.`,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erro ao executar migração:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao executar migração: ${(error as Error).message}`,
        });
      }
    }),

  /**
   * Obter histórico de migrações
   */
  obterHistorico: protectedProcedure.query(async ({ ctx }) => {
    verificarPermissao(ctx.user);

    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "Base de dados indisponível.",
      });
    }

    try {
      const historico = await db
        .select()
        .from(auditLog)
        .where(
          eq(auditLog.acao, "MIGRACAO_EXECUTADA")
        );

      return historico;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao obter histórico de migrações.",
      });
    }
  }),
});
