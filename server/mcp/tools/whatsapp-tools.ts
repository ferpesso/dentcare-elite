/**
 * MCP Tools — Comunicação WhatsApp
 * DentCare V33
 *
 * Conectores que permitem à IA enviar mensagens, campanhas
 * e botões interativos via WhatsApp (Twilio).
 *
 * Reutiliza: whatsappService.ts, marketing.ts (router)
 */

import type { MCPToolDefinition, MCPToolResult, MCPContext } from "../mcpServer";
import {
  enviarMensagemWhatsApp,
  enviarLembrete,
  enviarConfirmacaoMarcacao,
  enviarCampanhaReativacao,
  enviarFollowupPosConsulta,
  enviarPedidoAvaliacao,
} from "../../whatsappService";
import { getDb } from "../../db";
import { utentes, consultas, medicos } from "../../../drizzle/schema";
import { eq, and, lte, gte, desc, sql } from "drizzle-orm";

// ─── Tools de WhatsApp ───────────────────────────────────────────────────────

const enviarWhatsApp: MCPToolDefinition = {
  name: "enviar_whatsapp",
  description: "Envia uma mensagem de WhatsApp a um paciente específico. Pode ser usado para follow-up pós-consulta, lembretes personalizados ou comunicação geral.",
  parameters: {
    type: "object",
    properties: {
      utenteId: {
        type: "string",
        description: "ID do utente na base de dados.",
      },
      mensagem: {
        type: "string",
        description: "Texto da mensagem a enviar. Deve ser profissional e em português europeu.",
      },
      tipo: {
        type: "string",
        description: "Tipo de mensagem para categorização.",
        enum: ["geral", "lembrete", "followup", "campanha", "informacao"],
        default: "geral",
      },
    },
    required: ["utenteId", "mensagem"],
  },
  category: "whatsapp",
  requiresAuth: true,
  handler: async (args, _context): Promise<MCPToolResult> => {
    const db = await getDb();
    if (!db) return { success: false, error: "Base de dados indisponível" };

    const utenteId = parseInt(args.utenteId as string);
    const [utente] = await db.select().from(utentes).where(eq(utentes.id, utenteId)).limit(1);

    if (!utente) {
      return { success: false, error: `Utente com ID ${utenteId} não encontrado.` };
    }

    if (!utente.telemovel) {
      return { success: false, error: `Utente ${utente.nome} não tem telemóvel registado.` };
    }

    try {
      await enviarMensagemWhatsApp({
        to: utente.telemovel,
        body: args.mensagem as string,
        type: "text",
      });

      return {
        success: true,
        message: `Mensagem enviada com sucesso para ${utente.nome} (${utente.telemovel}).`,
        data: { utente: utente.nome, telemovel: utente.telemovel },
      };
    } catch (error: any) {
      return { success: false, error: `Erro ao enviar WhatsApp: ${error.message}` };
    }
  },
};

const enviarWhatsAppLote: MCPToolDefinition = {
  name: "enviar_whatsapp_lote",
  description: "Envia mensagens de WhatsApp em lote para um grupo de pacientes filtrado por critérios. Ideal para campanhas de reativação, avisos gerais ou promoções.",
  parameters: {
    type: "object",
    properties: {
      filtro: {
        type: "string",
        description: "Critério de filtro para selecionar utentes.",
        enum: ["sem_consulta_6meses", "sem_consulta_12meses", "todos_ativos", "aniversariantes_mes"],
      },
      mensagem: {
        type: "string",
        description: "Texto da mensagem. Use {nome} como placeholder para o nome do paciente.",
      },
      limiteEnvios: {
        type: "string",
        description: "Número máximo de mensagens a enviar (padrão: 50, máximo: 200).",
        default: "50",
      },
    },
    required: ["filtro", "mensagem"],
  },
  category: "whatsapp",
  requiresAuth: true,
  handler: async (args, _context): Promise<MCPToolResult> => {
    const db = await getDb();
    if (!db) return { success: false, error: "Base de dados indisponível" };

    const limite = Math.min(parseInt(args.limiteEnvios as string) || 50, 200);
    let utentesAlvo: any[] = [];

    switch (args.filtro) {
      case "sem_consulta_6meses": {
        const seiseMesesAtras = new Date();
        seiseMesesAtras.setMonth(seiseMesesAtras.getMonth() - 6);

        const todosAtivos = await db
          .select({ id: utentes.id, nome: utentes.nome, telemovel: utentes.telemovel })
          .from(utentes)
          .where(eq(utentes.ativo, true))
          .limit(limite * 2);

        const consultasRecentes = await db
          .select({ utenteId: consultas.utenteId })
          .from(consultas)
          .where(gte(consultas.dataHoraInicio, seiseMesesAtras));

        const comConsulta = new Set(consultasRecentes.map(c => c.utenteId));
        utentesAlvo = todosAtivos.filter(u => !comConsulta.has(u.id) && u.telemovel);
        break;
      }

      case "sem_consulta_12meses": {
        const dozeAtras = new Date();
        dozeAtras.setMonth(dozeAtras.getMonth() - 12);

        const todosAtivos12 = await db
          .select({ id: utentes.id, nome: utentes.nome, telemovel: utentes.telemovel })
          .from(utentes)
          .where(eq(utentes.ativo, true))
          .limit(limite * 2);

        const consultasRecentes12 = await db
          .select({ utenteId: consultas.utenteId })
          .from(consultas)
          .where(gte(consultas.dataHoraInicio, dozeAtras));

        const comConsulta12 = new Set(consultasRecentes12.map(c => c.utenteId));
        utentesAlvo = todosAtivos12.filter(u => !comConsulta12.has(u.id) && u.telemovel);
        break;
      }

      case "todos_ativos": {
        utentesAlvo = await db
          .select({ id: utentes.id, nome: utentes.nome, telemovel: utentes.telemovel })
          .from(utentes)
          .where(eq(utentes.ativo, true))
          .limit(limite);
        utentesAlvo = utentesAlvo.filter(u => u.telemovel);
        break;
      }

      case "aniversariantes_mes": {
        const mesAtual = new Date().getMonth() + 1;
        const todosComAniversario = await db
          .select({ id: utentes.id, nome: utentes.nome, telemovel: utentes.telemovel, dataNascimento: utentes.dataNascimento })
          .from(utentes)
          .where(eq(utentes.ativo, true));

        utentesAlvo = todosComAniversario.filter(u => {
          if (!u.dataNascimento || !u.telemovel) return false;
          return new Date(u.dataNascimento).getMonth() + 1 === mesAtual;
        });
        break;
      }

      default:
        return { success: false, error: `Filtro "${args.filtro}" não reconhecido.` };
    }

    // Limitar e enviar
    utentesAlvo = utentesAlvo.slice(0, limite);

    let enviados = 0;
    let erros = 0;

    for (const utente of utentesAlvo) {
      try {
        const mensagemPersonalizada = (args.mensagem as string).replace(/{nome}/g, utente.nome.split(" ")[0]);
        await enviarMensagemWhatsApp({
          to: utente.telemovel,
          body: mensagemPersonalizada,
          type: "text",
        });
        enviados++;
        // Pequeno delay para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch {
        erros++;
      }
    }

    return {
      success: true,
      message: `Campanha concluída: ${enviados} mensagens enviadas, ${erros} erros.`,
      data: {
        filtro: args.filtro,
        totalAlvo: utentesAlvo.length,
        enviados,
        erros,
      },
    };
  },
};

const enviarBotoesInterativos: MCPToolDefinition = {
  name: "enviar_botoes_interativos",
  description: "Envia uma mensagem de WhatsApp com botões de ação rápida (ex: Confirmar/Cancelar consulta). Reduz a carga telefónica da clínica.",
  parameters: {
    type: "object",
    properties: {
      utenteId: {
        type: "string",
        description: "ID do utente na base de dados.",
      },
      mensagem: {
        type: "string",
        description: "Texto principal da mensagem.",
      },
      botoes: {
        type: "string",
        description: "Botões separados por vírgula (máx. 3). Ex: 'Confirmar,Cancelar,Reagendar'",
      },
    },
    required: ["utenteId", "mensagem", "botoes"],
  },
  category: "whatsapp",
  requiresAuth: true,
  handler: async (args, _context): Promise<MCPToolResult> => {
    const db = await getDb();
    if (!db) return { success: false, error: "Base de dados indisponível" };

    const utenteId = parseInt(args.utenteId as string);
    const [utente] = await db.select().from(utentes).where(eq(utentes.id, utenteId)).limit(1);

    if (!utente || !utente.telemovel) {
      return { success: false, error: "Utente não encontrado ou sem telemóvel." };
    }

    const botoesArray = (args.botoes as string).split(",").map(b => b.trim()).slice(0, 3);

    try {
      await enviarMensagemWhatsApp({
        to: utente.telemovel,
        body: args.mensagem as string,
        type: "interactive_buttons",
        buttons: botoesArray.map((texto, i) => ({
          id: `btn_${i}_${texto.toLowerCase().replace(/\s/g, "_")}`,
          title: texto,
        })),
      });

      return {
        success: true,
        message: `Mensagem interativa enviada para ${utente.nome} com botões: ${botoesArray.join(", ")}.`,
        data: { utente: utente.nome, botoes: botoesArray },
      };
    } catch (error: any) {
      return { success: false, error: `Erro ao enviar botões: ${error.message}` };
    }
  },
};

const enviarConfirmacaoConsultas: MCPToolDefinition = {
  name: "enviar_confirmacao_consultas",
  description: "Envia pedidos de confirmação via WhatsApp para todas as consultas do dia seguinte. Inclui botões 'Confirmar' e 'Cancelar' para o paciente responder.",
  parameters: {
    type: "object",
    properties: {
      data: {
        type: "string",
        description: "Data das consultas no formato YYYY-MM-DD (padrão: amanhã).",
      },
    },
    required: [],
  },
  category: "whatsapp",
  requiresAuth: true,
  handler: async (args, _context): Promise<MCPToolResult> => {
    const db = await getDb();
    if (!db) return { success: false, error: "Base de dados indisponível" };

    const dataAlvo = args.data ? new Date(args.data as string) : new Date(Date.now() + 86400000);
    const inicioDia = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate(), 0, 0, 0);
    const fimDia = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate(), 23, 59, 59);

    const consultasDia = await db
      .select({
        id: consultas.id,
        dataHoraInicio: consultas.dataHoraInicio,
        tipoConsulta: consultas.tipoConsulta,
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
      );

    let enviados = 0;
    let semTelemovel = 0;

    for (const c of consultasDia) {
      if (!c.utenteTelemovel) {
        semTelemovel++;
        continue;
      }

      try {
        const hora = c.dataHoraInicio instanceof Date
          ? c.dataHoraInicio.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
          : "hora a confirmar";

        const dataFormatada = c.dataHoraInicio instanceof Date
          ? c.dataHoraInicio.toLocaleDateString("pt-PT")
          : "data a confirmar";

        await enviarConfirmacaoMarcacao(
          c.id || 0,
          c.utenteNome || "Paciente",
          dataFormatada,
          hora,
          c.medicoNome || "Médico",
          c.utenteTelemovel,
          c.tipoConsulta || "Consulta"
        );
        enviados++;
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch {
        // Continuar com os restantes
      }
    }

    const dataFormatada = dataAlvo.toLocaleDateString("pt-PT");
    return {
      success: true,
      message: `Confirmações enviadas para ${dataFormatada}: ${enviados}/${consultasDia.length} consultas. ${semTelemovel > 0 ? `${semTelemovel} sem telemóvel.` : ""}`,
      data: {
        data: dataFormatada,
        totalConsultas: consultasDia.length,
        enviados,
        semTelemovel,
      },
    };
  },
};

// ─── Exportar todas as tools de WhatsApp ─────────────────────────────────────

export const whatsappTools: MCPToolDefinition[] = [
  enviarWhatsApp,
  enviarWhatsAppLote,
  enviarBotoesInterativos,
  enviarConfirmacaoConsultas,
];
