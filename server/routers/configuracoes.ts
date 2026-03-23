/**
 * Router de Configurações — Persistência em Base de Dados
 * DentCare Elite V32.3 — Configurações Globais da Clínica (EXPANDIDO)
 *
 * UPGRADE:
 * - Todas as chaves de configuração agora são persistidas na BD
 * - Endpoint de actualização em lote (actualizarLote)
 * - Endpoint obterInfoClinica expandido
 * - Novas chaves: identidade, agenda, metas, aparência, notificações, segurança, faturação
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { hasPermission } from "../rbac";
import { logAuditAction } from "../auditService";
import { configuracoesClinica } from "../../drizzle/schema";

// ─── Chaves padrão e definições EXPANDIDAS ───────────────────────────────────
const CHAVES_CONFIGURACAO: Record<string, { tipo: string; descricao: string; padrao: string; categoria: string }> = {
  // Identidade da Clínica
  "nome_clinica": { tipo: "string", descricao: "Nome da clínica", padrao: "Clínica Dentária", categoria: "clinica" },
  "email_clinica": { tipo: "string", descricao: "Email de contacto", padrao: "", categoria: "clinica" },
  "telefone_clinica": { tipo: "string", descricao: "Telefone de contacto", padrao: "", categoria: "clinica" },
  "morada_clinica": { tipo: "string", descricao: "Morada completa", padrao: "", categoria: "clinica" },
  "cidade_clinica": { tipo: "string", descricao: "Cidade", padrao: "", categoria: "clinica" },
  "codigo_postal_clinica": { tipo: "string", descricao: "Código Postal", padrao: "", categoria: "clinica" },
  "pais_clinica": { tipo: "string", descricao: "País", padrao: "Portugal", categoria: "clinica" },
  "nif_clinica": { tipo: "string", descricao: "NIF da empresa", padrao: "", categoria: "clinica" },
  "website_clinica": { tipo: "string", descricao: "Website da clínica", padrao: "", categoria: "clinica" },
  "logo_clinica": { tipo: "string", descricao: "Logo da clínica (Base64 data URL)", padrao: "", categoria: "clinica" },

  // Horário e Agenda
  "horario_abertura": { tipo: "string", descricao: "Hora de abertura (HH:mm)", padrao: "09:00", categoria: "agenda" },
  "horario_encerramento": { tipo: "string", descricao: "Hora de encerramento (HH:mm)", padrao: "18:00", categoria: "agenda" },
  "dias_funcionamento": { tipo: "json", descricao: "Dias da semana (0-6)", padrao: "[1,2,3,4,5]", categoria: "agenda" },
  "duracao_slot": { tipo: "number", descricao: "Duração padrão do slot (minutos)", padrao: "30", categoria: "agenda" },
  "intervalo_consultas": { tipo: "number", descricao: "Intervalo entre consultas (minutos)", padrao: "0", categoria: "agenda" },
  "slots_por_dia": { tipo: "number", descricao: "Número máximo de consultas por dia", padrao: "15", categoria: "agenda" },
  "antecedencia_minima_marcacao": { tipo: "number", descricao: "Antecedência mínima para marcação (horas)", padrao: "2", categoria: "agenda" },
  "antecedencia_maxima_marcacao": { tipo: "number", descricao: "Antecedência máxima para marcação (dias)", padrao: "90", categoria: "agenda" },

  // Metas e Objectivos
  "meta_receita_diaria": { tipo: "number", descricao: "Meta de receita diária (em euros)", padrao: "500", categoria: "metas" },
  "meta_receita_mensal": { tipo: "number", descricao: "Meta de receita mensal (em euros)", padrao: "10000", categoria: "metas" },
  "meta_consultas_dia": { tipo: "number", descricao: "Meta de consultas por dia", padrao: "15", categoria: "metas" },

  // Aparência e Localização
  "idioma": { tipo: "string", descricao: "Idioma da interface", padrao: "pt-PT", categoria: "aparencia" },
  "moeda": { tipo: "string", descricao: "Moeda principal", padrao: "EUR", categoria: "aparencia" },
  "simbolo_moeda": { tipo: "string", descricao: "Símbolo da moeda", padrao: "€", categoria: "aparencia" },
  "fuso_horario": { tipo: "string", descricao: "Fuso horário", padrao: "Europe/Lisbon", categoria: "aparencia" },
  "formato_data": { tipo: "string", descricao: "Formato de data", padrao: "dd/MM/yyyy", categoria: "aparencia" },
  "formato_hora": { tipo: "string", descricao: "Formato de hora", padrao: "HH:mm", categoria: "aparencia" },

  // Notificações
  "notif_email": { tipo: "boolean", descricao: "Notificações por email", padrao: "true", categoria: "notificacoes" },
  "notif_sms": { tipo: "boolean", descricao: "Notificações por SMS", padrao: "false", categoria: "notificacoes" },
  "notif_whatsapp": { tipo: "boolean", descricao: "Notificações por WhatsApp", padrao: "true", categoria: "notificacoes" },
  "notif_lembretes": { tipo: "boolean", descricao: "Lembretes automáticos", padrao: "true", categoria: "notificacoes" },
  "notif_lembretes_horas": { tipo: "number", descricao: "Horas antes para lembrete", padrao: "24", categoria: "notificacoes" },
  "notif_aniversarios": { tipo: "boolean", descricao: "Alertar aniversários", padrao: "true", categoria: "notificacoes" },
  "notif_pagamentos_atraso": { tipo: "boolean", descricao: "Alertar pagamentos em atraso", padrao: "true", categoria: "notificacoes" },
  "notif_pagamentos_atraso_dias": { tipo: "number", descricao: "Dias para considerar atraso", padrao: "30", categoria: "notificacoes" },
  "notif_stocks_baixo": { tipo: "boolean", descricao: "Alertar stocks baixos", padrao: "true", categoria: "notificacoes" },
  "notif_stocks_minimo": { tipo: "number", descricao: "Quantidade mínima para alerta", padrao: "5", categoria: "notificacoes" },
  "notif_consultas_canceladas": { tipo: "boolean", descricao: "Alertar consultas canceladas", padrao: "true", categoria: "notificacoes" },
  "notif_novos_utentes": { tipo: "boolean", descricao: "Alertar novos utentes", padrao: "false", categoria: "notificacoes" },

  // Segurança
  "seguranca_2fa": { tipo: "boolean", descricao: "Autenticação de dois factores", padrao: "false", categoria: "seguranca" },
  "seguranca_sessao_timeout": { tipo: "number", descricao: "Timeout de sessão (minutos)", padrao: "60", categoria: "seguranca" },
  "seguranca_log_auditoria": { tipo: "boolean", descricao: "Registo de auditoria", padrao: "true", categoria: "seguranca" },
  "seguranca_ip_whitelist": { tipo: "boolean", descricao: "Restrição por IP", padrao: "false", categoria: "seguranca" },
  "seguranca_ips_permitidos": { tipo: "string", descricao: "IPs permitidos (separados por vírgula)", padrao: "", categoria: "seguranca" },
  "seguranca_tentativas_login": { tipo: "number", descricao: "Tentativas de login antes de bloqueio", padrao: "5", categoria: "seguranca" },
  "seguranca_bloqueio_minutos": { tipo: "number", descricao: "Minutos de bloqueio após tentativas", padrao: "15", categoria: "seguranca" },

  // Integrações
  "whatsapp_account_sid": { tipo: "string", descricao: "Twilio Account SID", padrao: "", categoria: "integracoes" },
  "whatsapp_auth_token": { tipo: "string", descricao: "Twilio Auth Token", padrao: "", categoria: "integracoes" },
  "whatsapp_number": { tipo: "string", descricao: "Número WhatsApp Business", padrao: "", categoria: "integracoes" },
  "whatsapp_ativo": { tipo: "boolean", descricao: "WhatsApp está configurado e ativo", padrao: "false", categoria: "integracoes" },
  "mbway_ativo": { tipo: "boolean", descricao: "MBWAY está ativo", padrao: "false", categoria: "integracoes" },
  "mbway_api_key": { tipo: "string", descricao: "Chave de API MBWAY", padrao: "", categoria: "integracoes" },
  "at_ativo": { tipo: "boolean", descricao: "AT está ativa", padrao: "false", categoria: "integracoes" },
  "at_nif": { tipo: "string", descricao: "NIF para comunicação AT", padrao: "", categoria: "integracoes" },
  "at_senha_comunicacao": { tipo: "string", descricao: "Senha de comunicação AT", padrao: "", categoria: "integracoes" },

  // Faturação
  "faturacao_serie": { tipo: "string", descricao: "Série de faturação", padrao: "FT", categoria: "faturacao" },
  "faturacao_proximo_numero": { tipo: "number", descricao: "Próximo número de fatura", padrao: "1", categoria: "faturacao" },
  "faturacao_taxa_iva": { tipo: "number", descricao: "Taxa de IVA padrão (%) — Isento por defeito, alterável pela clínica", padrao: "0", categoria: "faturacao" },
  "faturacao_observacoes_padrao": { tipo: "string", descricao: "Observações padrão nas faturas", padrao: "", categoria: "faturacao" },
  "faturacao_vencimento_dias": { tipo: "number", descricao: "Dias para vencimento", padrao: "30", categoria: "faturacao" },
};

type ConfigTipo = "string" | "number" | "boolean" | "json";

export const configuracoesRouter = router({
  /**
   * Obter todas as configurações da BD real
   */
  obter: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "system.configure")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const rows = await db
        .select()
        .from(configuracoesClinica);

      const config: Record<string, any> = {};
      
      // Preencher com padrões primeiro
      for (const [chave, info] of Object.entries(CHAVES_CONFIGURACAO)) {
        config[chave] = info.padrao;
      }

      // Sobrepor com valores da BD
      for (const row of rows) {
        config[row.chave] = row.valor;
      }
      
      return { success: true, configuracoes: config };
    }),

  /**
   * Actualizar configuração individual na BD real
   */
  actualizar: protectedProcedure
    .input(z.object({
      chave: z.string(),
      valor: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "system.configure")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      // Upsert manual (MySQL)
      const existente = await db
        .select()
        .from(configuracoesClinica)
        .where(eq(configuracoesClinica.chave, input.chave))
        .limit(1);

      if (existente.length > 0) {
        await db
          .update(configuracoesClinica)
          .set({ valor: String(input.valor), updatedAt: new Date() })
          .where(eq(configuracoesClinica.id, existente[0].id));
      } else {
        const tipoInfo = CHAVES_CONFIGURACAO[input.chave]?.tipo || "string";
        await db.insert(configuracoesClinica).values({
          chave: input.chave,
          valor: String(input.valor),
          tipo: tipoInfo as ConfigTipo,
          updatedAt: new Date(),
        });
      }

      await logAuditAction(ctx.user, {
        acao: "update",
        tabela: "configuracoes",
        registoId: 0,
        descricao: `Configuração actualizada: ${input.chave}`,
        valorNovo: { valor: input.valor }
      });

      return { success: true, message: `Configuração ${input.chave} actualizada com sucesso` };
    }),

  /**
   * NOVO: Actualizar múltiplas configurações de uma vez (batch)
   * Mais eficiente que chamar actualizar N vezes
   */
  actualizarLote: protectedProcedure
    .input(z.object({
      configuracoes: z.array(z.object({
        chave: z.string(),
        valor: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "system.configure")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      let atualizadas = 0;
      let criadas = 0;

      for (const { chave, valor } of input.configuracoes) {
        const existente = await db
          .select()
          .from(configuracoesClinica)
          .where(eq(configuracoesClinica.chave, chave))
          .limit(1);

        if (existente.length > 0) {
          // Só atualizar se o valor mudou
          if (existente[0].valor !== valor) {
            await db
              .update(configuracoesClinica)
              .set({ valor: String(valor), updatedAt: new Date() })
              .where(eq(configuracoesClinica.id, existente[0].id));
            atualizadas++;
          }
        } else {
          const tipoInfo = CHAVES_CONFIGURACAO[chave]?.tipo || "string";
          await db.insert(configuracoesClinica).values({
            chave,
            valor: String(valor),
            tipo: tipoInfo as ConfigTipo,
            updatedAt: new Date(),
          });
          criadas++;
        }
      }

      await logAuditAction(ctx.user, {
        acao: "update",
        tabela: "configuracoes",
        registoId: 0,
        descricao: `Configurações em lote: ${atualizadas} actualizadas, ${criadas} criadas (${input.configuracoes.length} total)`,
        valorNovo: { chaves: input.configuracoes.map(c => c.chave) }
      });

      return { 
        success: true, 
        message: `${atualizadas + criadas} configurações guardadas com sucesso`,
        atualizadas,
        criadas,
      };
    }),

  /**
   * Obter informações públicas da clínica da BD (expandido)
   */
  obterInfoClinica: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const rows = await db
        .select()
        .from(configuracoesClinica)
        .where(sql`${configuracoesClinica.chave} IN (
          'nome_clinica', 'email_clinica', 'telefone_clinica', 'morada_clinica',
          'cidade_clinica', 'codigo_postal_clinica', 'pais_clinica', 'nif_clinica', 'website_clinica', 'logo_clinica',
          'horario_abertura', 'horario_encerramento', 'dias_funcionamento',
          'duracao_slot', 'moeda', 'simbolo_moeda', 'idioma', 'fuso_horario',
          'faturacao_taxa_iva', 'faturacao_serie'
        )`);

      const info: Record<string, string> = {
        nome: CHAVES_CONFIGURACAO.nome_clinica.padrao,
        email: "",
        telefone: "",
        morada: "",
        cidade: "",
        codigoPostal: "",
        pais: "Portugal",
        nif: "",
        website: "",
        logo: "",
        horarioAbertura: "09:00",
        horarioEncerramento: "18:00",
        diasFuncionamento: "[1,2,3,4,5]",
        duracaoSlot: "30",
        moeda: "EUR",
        simboloMoeda: "€",
        idioma: "pt-PT",
        fusoHorario: "Europe/Lisbon",
        taxaIva: "0",
        serieFaturacao: "FT",
      };

      for (const row of rows) {
        if (row.chave === "nome_clinica") info.nome = row.valor;
        if (row.chave === "email_clinica") info.email = row.valor;
        if (row.chave === "telefone_clinica") info.telefone = row.valor;
        if (row.chave === "morada_clinica") info.morada = row.valor;
        if (row.chave === "cidade_clinica") info.cidade = row.valor;
        if (row.chave === "codigo_postal_clinica") info.codigoPostal = row.valor;
        if (row.chave === "pais_clinica") info.pais = row.valor;
        if (row.chave === "nif_clinica") info.nif = row.valor;
        if (row.chave === "website_clinica") info.website = row.valor;
        if (row.chave === "logo_clinica") info.logo = row.valor;
        if (row.chave === "horario_abertura") info.horarioAbertura = row.valor;
        if (row.chave === "horario_encerramento") info.horarioEncerramento = row.valor;
        if (row.chave === "dias_funcionamento") info.diasFuncionamento = row.valor;
        if (row.chave === "duracao_slot") info.duracaoSlot = row.valor;
        if (row.chave === "moeda") info.moeda = row.valor;
        if (row.chave === "simbolo_moeda") info.simboloMoeda = row.valor;
        if (row.chave === "idioma") info.idioma = row.valor;
        if (row.chave === "fuso_horario") info.fusoHorario = row.valor;
        if (row.chave === "faturacao_taxa_iva") info.taxaIva = row.valor;
        if (row.chave === "faturacao_serie") info.serieFaturacao = row.valor;
      }

      return { success: true, clinica: info };
    }),
});
