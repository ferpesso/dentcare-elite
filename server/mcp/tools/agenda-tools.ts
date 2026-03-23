/**
 * MCP Tools — Gestão de Agenda e No-Shows
 * DentCare V33
 *
 * Conectores que permitem à IA gerir a agenda, prever faltas
 * e reagendar consultas automaticamente.
 *
 * Reutiliza: consultas.ts (router), predictiveEngine.ts
 */

import type { MCPToolDefinition, MCPToolResult, MCPContext } from "../mcpServer";
import { predictNoShowProbability } from "../../ai/predictiveEngine";
import { getDb } from "../../db";
import { consultas, utentes, medicos, agendas } from "../../../drizzle/schema";
import { eq, and, gte, lte, desc, ne, sql } from "drizzle-orm";

// ─── Tools de Agenda ─────────────────────────────────────────────────────────

const preverFaltasAgenda: MCPToolDefinition = {
  name: "prever_faltas_agenda",
  description: "Analisa o histórico de consultas e prevê a probabilidade de faltas (no-shows) para o dia seguinte. Sugere ações preventivas como enviar lembretes urgentes.",
  parameters: {
    type: "object",
    properties: {
      data: {
        type: "string",
        description: "Data para análise no formato YYYY-MM-DD (padrão: amanhã).",
      },
      limiarRisco: {
        type: "string",
        description: "Limiar de probabilidade para considerar risco alto (0-100, padrão: 50).",
        default: "50",
      },
    },
    required: [],
  },
  category: "agenda",
  requiresAuth: true,
  handler: async (args, _context): Promise<MCPToolResult> => {
    const db = await getDb();
    if (!db) return { success: false, error: "Base de dados indisponível" };

    const dataAlvo = args.data ? new Date(args.data as string) : new Date(Date.now() + 86400000);
    const inicioDia = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate(), 0, 0, 0);
    const fimDia = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate(), 23, 59, 59);
    const limiar = parseInt(args.limiarRisco as string) || 50;

    // Buscar consultas do dia
    const consultasDia = await db
      .select({
        id: consultas.id,
        dataHoraInicio: consultas.dataHoraInicio,
        tipoConsulta: consultas.tipoConsulta,
        estado: consultas.estado,
        utenteId: consultas.utenteId,
        utenteNome: utentes.nome,
        utenteTelemovel: utentes.telemovel,
        medicoNome: medicos.nome,
      })
      .from(consultas)
      .innerJoin(utentes, eq(consultas.utenteId, utentes.id))
      .innerJoin(medicos, eq(consultas.medicoId, medicos.id))
      .where(
        and(
          gte(consultas.dataHoraInicio, inicioDia),
          lte(consultas.dataHoraInicio, fimDia),
          eq(consultas.estado, "agendada")
        )
      )
      .orderBy(consultas.dataHoraInicio);

    // Calcular probabilidade de no-show para cada consulta
    const previsoes = [];
    for (const c of consultasDia) {
      try {
        const previsao = await predictNoShowProbability(c.id);
        const probabilidade = Math.round((previsao?.probabilidade || 0) * 100);
        previsoes.push({
          consultaId: c.id,
          utente: c.utenteNome,
          telemovel: c.utenteTelemovel,
          hora: c.dataHoraInicio instanceof Date
            ? c.dataHoraInicio.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
            : "?",
          medico: c.medicoNome,
          tipo: c.tipoConsulta,
          probabilidadeNoShow: probabilidade,
          risco: probabilidade >= limiar ? "alto" : probabilidade >= 30 ? "medio" : "baixo",
          fatores: previsao?.fatores || [],
        });
      } catch {
        previsoes.push({
          consultaId: c.id,
          utente: c.utenteNome,
          hora: "?",
          medico: c.medicoNome,
          probabilidadeNoShow: 0,
          risco: "desconhecido",
          fatores: [],
        });
      }
    }

    const altoRisco = previsoes.filter(p => p.risco === "alto");
    const dataFormatada = dataAlvo.toLocaleDateString("pt-PT");

    return {
      success: true,
      data: {
        data: dataFormatada,
        totalConsultas: consultasDia.length,
        previsoes: previsoes.sort((a, b) => b.probabilidadeNoShow - a.probabilidadeNoShow),
        resumo: {
          altoRisco: altoRisco.length,
          medioRisco: previsoes.filter(p => p.risco === "medio").length,
          baixoRisco: previsoes.filter(p => p.risco === "baixo").length,
        },
      },
      message: altoRisco.length > 0
        ? `${dataFormatada}: ${altoRisco.length} consulta(s) com alto risco de falta. Recomenda-se enviar lembrete urgente a: ${altoRisco.map(p => p.utente).join(", ")}.`
        : `${dataFormatada}: ${consultasDia.length} consultas sem risco significativo de faltas.`,
    };
  },
};

const listarSlotsLivres: MCPToolDefinition = {
  name: "listar_slots_livres",
  description: "Consulta a agenda e lista os horários disponíveis para marcação de consultas. Pode filtrar por médico, especialidade e duração do tratamento.",
  parameters: {
    type: "object",
    properties: {
      medicoId: {
        type: "string",
        description: "ID do médico para filtrar (opcional).",
      },
      data: {
        type: "string",
        description: "Data para verificar disponibilidade no formato YYYY-MM-DD (padrão: hoje).",
      },
      duracaoMinutos: {
        type: "string",
        description: "Duração necessária em minutos (padrão: 30).",
        default: "30",
      },
      diasAFrente: {
        type: "string",
        description: "Número de dias a verificar a partir da data (padrão: 5).",
        default: "5",
      },
    },
    required: [],
  },
  category: "agenda",
  requiresAuth: true,
  handler: async (args, _context): Promise<MCPToolResult> => {
    const db = await getDb();
    if (!db) return { success: false, error: "Base de dados indisponível" };

    const dataInicio = args.data ? new Date(args.data as string) : new Date();
    const diasAFrente = parseInt(args.diasAFrente as string) || 5;
    const duracaoMinutos = parseInt(args.duracaoMinutos as string) || 30;
    const medicoIdFiltro = args.medicoId ? parseInt(args.medicoId as string) : null;

    // Buscar médicos ativos
    let medicosQuery = db.select().from(medicos).where(eq(medicos.ativo, true));
    const medicosAtivos = await medicosQuery;

    // Buscar agendas dos médicos
    const agendasMedicos = await db.select().from(agendas).where(eq(agendas.ativo, true));

    const slotsLivres: Array<{
      data: string;
      hora: string;
      medico: string;
      medicoId: number;
      duracaoDisponivel: number;
    }> = [];

    const diasSemana = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

    for (let dia = 0; dia < diasAFrente; dia++) {
      const dataVerificar = new Date(dataInicio);
      dataVerificar.setDate(dataVerificar.getDate() + dia);

      const diaSemana = diasSemana[dataVerificar.getDay()];
      const dataStr = dataVerificar.toISOString().split("T")[0];

      // Buscar consultas já marcadas neste dia
      const inicioDia = new Date(dataVerificar.getFullYear(), dataVerificar.getMonth(), dataVerificar.getDate(), 0, 0, 0);
      const fimDia = new Date(dataVerificar.getFullYear(), dataVerificar.getMonth(), dataVerificar.getDate(), 23, 59, 59);

      const consultasMarcadas = await db
        .select({
          medicoId: consultas.medicoId,
          dataHoraInicio: consultas.dataHoraInicio,
          dataHoraFim: consultas.dataHoraFim,
        })
        .from(consultas)
        .where(
          and(
            gte(consultas.dataHoraInicio, inicioDia),
            lte(consultas.dataHoraInicio, fimDia),
            ne(consultas.estado, "cancelada")
          )
        );

      for (const medico of medicosAtivos) {
        if (medicoIdFiltro && medico.id !== medicoIdFiltro) continue;

        // Verificar agenda do médico para este dia da semana
        const agendaMedico = agendasMedicos.filter(
          a => a.medicoId === medico.id && a.diaSemana === diaSemana
        );

        for (const agenda of agendaMedico) {
          const [horaInicioH, horaInicioM] = agenda.horaInicio.split(":").map(Number);
          const [horaFimH, horaFimM] = agenda.horaFim.split(":").map(Number);
          const intervalo = agenda.intervaloConsulta || 30;

          // Gerar slots possíveis
          let minutoAtual = horaInicioH * 60 + horaInicioM;
          const minutoFim = horaFimH * 60 + horaFimM;

          while (minutoAtual + duracaoMinutos <= minutoFim) {
            const slotInicio = new Date(dataVerificar);
            slotInicio.setHours(Math.floor(minutoAtual / 60), minutoAtual % 60, 0, 0);

            const slotFim = new Date(slotInicio);
            slotFim.setMinutes(slotFim.getMinutes() + duracaoMinutos);

            // Verificar se não há conflito
            const temConflito = consultasMarcadas.some(c => {
              if (c.medicoId !== medico.id) return false;
              const cInicio = new Date(c.dataHoraInicio);
              const cFim = new Date(c.dataHoraFim);
              return slotInicio < cFim && slotFim > cInicio;
            });

            if (!temConflito) {
              slotsLivres.push({
                data: dataStr,
                hora: `${String(Math.floor(minutoAtual / 60)).padStart(2, "0")}:${String(minutoAtual % 60).padStart(2, "0")}`,
                medico: medico.nome,
                medicoId: medico.id,
                duracaoDisponivel: duracaoMinutos,
              });
            }

            minutoAtual += intervalo;
          }
        }
      }
    }

    return {
      success: true,
      data: {
        slotsLivres: slotsLivres.slice(0, 50), // Limitar a 50 resultados
        totalSlots: slotsLivres.length,
        filtros: {
          medicoId: medicoIdFiltro,
          duracaoMinutos,
          diasVerificados: diasAFrente,
        },
      },
      message: `Encontrados ${slotsLivres.length} horários disponíveis nos próximos ${diasAFrente} dias.`,
    };
  },
};

const reagendarConsulta: MCPToolDefinition = {
  name: "reagendar_consulta",
  description: "Reagenda uma consulta existente para uma nova data e hora. Verifica conflitos automaticamente antes de confirmar.",
  parameters: {
    type: "object",
    properties: {
      consultaId: {
        type: "string",
        description: "ID da consulta a reagendar.",
      },
      novaDataHora: {
        type: "string",
        description: "Nova data e hora no formato ISO 8601 (ex: 2026-03-20T10:00:00).",
      },
      motivo: {
        type: "string",
        description: "Motivo do reagendamento (opcional).",
      },
      notificarPaciente: {
        type: "string",
        description: "Se deve enviar WhatsApp ao paciente a informar do reagendamento.",
        enum: ["sim", "nao"],
        default: "sim",
      },
    },
    required: ["consultaId", "novaDataHora"],
  },
  category: "agenda",
  requiresAuth: true,
  handler: async (args, _context): Promise<MCPToolResult> => {
    const db = await getDb();
    if (!db) return { success: false, error: "Base de dados indisponível" };

    const consultaId = parseInt(args.consultaId as string);
    const novaDataHora = new Date(args.novaDataHora as string);

    if (isNaN(novaDataHora.getTime())) {
      return { success: false, error: "Data/hora inválida." };
    }

    if (novaDataHora <= new Date()) {
      return { success: false, error: "A nova data deve ser no futuro." };
    }

    // Buscar consulta existente
    const [consulta] = await db
      .select({
        id: consultas.id,
        medicoId: consultas.medicoId,
        utenteId: consultas.utenteId,
        dataHoraInicio: consultas.dataHoraInicio,
        dataHoraFim: consultas.dataHoraFim,
        estado: consultas.estado,
        utenteNome: utentes.nome,
        utenteTelemovel: utentes.telemovel,
        medicoNome: medicos.nome,
      })
      .from(consultas)
      .innerJoin(utentes, eq(consultas.utenteId, utentes.id))
      .innerJoin(medicos, eq(consultas.medicoId, medicos.id))
      .where(eq(consultas.id, consultaId))
      .limit(1);

    if (!consulta) {
      return { success: false, error: `Consulta ${consultaId} não encontrada.` };
    }

    if (consulta.estado === "cancelada" || consulta.estado === "realizada") {
      return { success: false, error: `Não é possível reagendar uma consulta ${consulta.estado}.` };
    }

    // Calcular duração original
    const duracaoMs = new Date(consulta.dataHoraFim).getTime() - new Date(consulta.dataHoraInicio).getTime();
    const novaDataHoraFim = new Date(novaDataHora.getTime() + duracaoMs);

    // Verificar conflitos
    const conflitos = await db
      .select({ id: consultas.id })
      .from(consultas)
      .where(
        and(
          eq(consultas.medicoId, consulta.medicoId),
          ne(consultas.id, consultaId),
          ne(consultas.estado, "cancelada"),
          lte(consultas.dataHoraInicio, novaDataHoraFim),
          gte(consultas.dataHoraFim, novaDataHora)
        )
      );

    if (conflitos.length > 0) {
      return { success: false, error: `Conflito de horário com ${conflitos.length} consulta(s) existente(s). Escolha outro horário.` };
    }

    // Reagendar
    const observacaoReagendamento = args.motivo
      ? `Reagendada: ${args.motivo}`
      : "Reagendada via assistente IA";

    await db
      .update(consultas)
      .set({
        dataHoraInicio: novaDataHora,
        dataHoraFim: novaDataHoraFim,
        observacoes: sql`CONCAT(COALESCE(${consultas.observacoes}, ''), '\n', ${observacaoReagendamento})`,
        updatedAt: new Date(),
      })
      .where(eq(consultas.id, consultaId));

    // Notificar paciente se solicitado
    if (args.notificarPaciente !== "nao" && consulta.utenteTelemovel) {
      try {
        const horaFormatada = novaDataHora.toLocaleString("pt-PT", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        });

        await enviarMensagemWhatsApp({
          to: consulta.utenteTelemovel,
          body: `Olá ${consulta.utenteNome?.split(" ")[0]}! A sua consulta com ${consulta.medicoNome} foi reagendada para ${horaFormatada}. Se precisar de alterar, contacte-nos.`,
          type: "text",
        });
      } catch {
        // Não falhar o reagendamento se a notificação falhar
      }
    }

    return {
      success: true,
      message: `Consulta reagendada com sucesso para ${novaDataHora.toLocaleString("pt-PT")}.`,
      data: {
        consultaId,
        utente: consulta.utenteNome,
        medico: consulta.medicoNome,
        dataAnterior: consulta.dataHoraInicio,
        novaData: novaDataHora.toISOString(),
      },
    };
  },
};

// Import necessário para notificações
import { enviarMensagemWhatsApp } from "../../whatsappService";

// ─── Exportar todas as tools de agenda ───────────────────────────────────────

export const agendaTools: MCPToolDefinition[] = [
  preverFaltasAgenda,
  listarSlotsLivres,
  reagendarConsulta,
];
