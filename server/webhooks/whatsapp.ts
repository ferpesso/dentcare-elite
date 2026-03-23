/**
 * Webhook WhatsApp — Chatbot de Triagem e Marcação de Consultas
 * DentCare Elite V32.1
 *
 * UPGRADE: Chatbot inteligente com:
 * - Processamento de botões interativos (Interactive Reply Buttons)
 * - Processamento de seleções de lista (Interactive List Messages)
 * - Marcação de consultas via WhatsApp
 * - Follow-up automático pós-consulta
 * - Triagem de urgências
 * - Encaminhamento para receção humana
 * - Respostas a FAQs (horários, serviços, localização)
 * - Detecção de saudações e envio de menu principal
 */
import { Request, Response } from "express";
import { logAuditAction } from "../auditService";
import * as crypto from "crypto";
import { utentes, consultas, users, medicos, agendas, comunicacoesLog } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, asc, sql } from "drizzle-orm";
import {
  parseWhatsAppResponse,
  enviarMenuPrincipal,
  enviarMensagemWhatsApp,
  enviarHorariosDisponiveis,
  enviarConfirmacaoMarcacao,
  type ParsedResponse,
} from "../whatsappService";
import { format, addDays, startOfDay, endOfDay, addMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Configuração do Chatbot ─────────────────────────────────────────────────

/** Informações da clínica (configuráveis via env ou BD) */
const CLINICA_INFO = {
  nome: process.env.CLINICA_NOME || "A nossa clínica",
  horario: process.env.CLINICA_HORARIO || "Segunda a Sexta: 09:00–19:00 | Sábado: 09:00–13:00",
  morada: process.env.CLINICA_MORADA || "Consulte o nosso website para mais informações.",
  telefone: process.env.CLINICA_TELEFONE || "",
  website: process.env.CLINICA_WEBSITE || "",
  urgencia: process.env.CLINICA_URGENCIA || "Em caso de urgência fora de horário, dirija-se ao hospital mais próximo ou ligue 112.",
};

// ─── Validação de Segurança ──────────────────────────────────────────────────

/**
 * Validar assinatura Twilio (segurança)
 */
export function validateTwilioSignature(
  req: Request,
  authToken: string
): boolean {
  const twilioSignature = req.headers["x-twilio-signature"] as string;
  if (!twilioSignature) {
    console.error("[Webhook] Twilio signature missing");
    return false;
  }

  const url = `${process.env.WEBHOOK_URL || "http://localhost:3000"}/api/webhooks/whatsapp`;
  const params = new URLSearchParams(req.body).toString();

  const hash = crypto
    .createHmac("sha1", authToken)
    .update(url + params)
    .digest("base64");

  return hash === twilioSignature;
}

// ─── Handler Principal ───────────────────────────────────────────────────────

/**
 * Handler do webhook WhatsApp — Chatbot Inteligente
 *
 * Processa três tipos de mensagens recebidas:
 * 1. Respostas a botões interativos (ButtonPayload)
 * 2. Seleções de lista interativa (ListPayload)
 * 3. Mensagens de texto livre
 */
export async function handleWhatsAppWebhook(
  req: Request,
  res: Response,
  db: any,
  authToken: string
) {
  try {
    // Validação de segurança
    if (!validateTwilioSignature(req, authToken)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { From, Body, ButtonPayload, ListId } = req.body;
    if (!From) {
      return res.status(400).json({ error: "Missing required field: From" });
    }

    const telefoneLimpo = From.replace("whatsapp:", "").replace("+", "");
    console.log(`[Webhook] Mensagem recebida de ${telefoneLimpo}: "${Body || ButtonPayload || ListId}"`);

    // Identificar o utente
    const utenteResult = await db
      .select()
      .from(utentes)
      .where(eq(utentes.telemovel, telefoneLimpo))
      .limit(1);

    const utente = utenteResult[0];

    // Parse da resposta (suporta botões, listas e texto)
    const parsed = parseWhatsAppResponse(
      Body || "",
      ButtonPayload || undefined,
      ListId || undefined
    );

    console.log(`[Webhook] Parsed: tipo=${parsed.tipo}, confianca=${parsed.confianca}, menuAction=${parsed.menuAction || "N/A"}`);

    // Processar a resposta com base no tipo
    await processarResposta(db, telefoneLimpo, utente, parsed, Body);

    // Audit log
    if (utente) {
      const systemUser = await getSystemUser(db);
      if (systemUser) {
        await logAuditAction(systemUser, {
          acao: "webhook",
          tabela: "whatsapp_mensagens",
          registoId: utente.id,
          descricao: `WhatsApp de ${utente.nome}: tipo=${parsed.tipo}, msg="${(Body || ButtonPayload || ListId || "").substring(0, 100)}"`,
          valorNovo: { tipo: parsed.tipo, confianca: parsed.confianca, buttonId: parsed.buttonId, listRowId: parsed.listRowId },
        });
      }
    }

    res.status(200).json({ success: true, message: "Webhook processado" });
  } catch (error) {
    console.error("[Webhook] Erro no webhook WhatsApp:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Processamento de Respostas ──────────────────────────────────────────────

async function processarResposta(
  db: any,
  telefone: string,
  utente: any | null,
  parsed: ParsedResponse,
  textoOriginal?: string
) {
  switch (parsed.tipo) {
    case "confirmacao":
      await processarConfirmacao(db, telefone, utente, parsed);
      break;

    case "cancelamento":
      await processarCancelamento(db, telefone, utente, parsed);
      break;

    case "remarcar":
      await processarRemarcar(db, telefone, utente, parsed);
      break;

    case "agendar":
      await processarAgendar(db, telefone, utente, parsed);
      break;

    case "feedback_positivo":
    case "feedback_neutro":
    case "feedback_negativo":
      await processarFeedback(db, telefone, utente, parsed);
      break;

    case "urgencia":
      await processarUrgencia(telefone, utente);
      break;

    case "falar_humano":
      await processarFalarHumano(telefone, utente);
      break;

    case "menu":
      await processarMenu(db, telefone, utente, parsed);
      break;

    default:
      // Mensagem não reconhecida — enviar menu principal
      if (utente) {
        await enviarMenuPrincipal(telefone, utente.nome);
      } else {
        await enviarMensagemWhatsApp({
          to: telefone,
          body: `Olá! 👋\n\nObrigado por nos contactar.\n\nParece que ainda não tem registo na nossa clínica. Para agendar uma consulta, por favor ligue-nos ou visite o nosso website.\n\n📞 ${CLINICA_INFO.telefone || "Contacte-nos"}\n🌐 ${CLINICA_INFO.website || ""}`,
          type: "custom",
        });
      }
      break;
  }
}

// ─── Handlers Específicos ────────────────────────────────────────────────────

/**
 * Confirmar consulta (via botão ou texto)
 */
async function processarConfirmacao(db: any, telefone: string, utente: any, parsed: ParsedResponse) {
  if (!utente) return;

  const consulta = await obterProximaConsulta(db, utente.id);
  if (!consulta) {
    await enviarMensagemWhatsApp({
      to: telefone,
      body: "Não encontrámos nenhuma consulta agendada para confirmar. 🤔\n\nSe pretende agendar uma nova consulta, responda *AGENDAR*.",
      type: "custom",
    });
    return;
  }

  await db
    .update(consultas)
    .set({ estado: "confirmada", updatedAt: new Date() })
    .where(eq(consultas.id, consulta.id));

  const dataFmt = format(new Date(consulta.dataHoraInicio), "dd/MM/yyyy");
  const horaFmt = format(new Date(consulta.dataHoraInicio), "HH:mm");

  await enviarMensagemWhatsApp({
    to: telefone,
    body: `Perfeito, ${utente.nome}! ✅\n\nA sua consulta de *${dataFmt}* às *${horaFmt}* está *confirmada*.\n\nAté lá! 😊🦷`,
    type: "confirmation",
    consultaId: consulta.id,
  });

  await logEstadoConsulta(db, consulta.id, "confirmada", `Confirmação via WhatsApp por ${utente.nome}`);

  // V34: Registar comunicação de entrada (resposta do utente) e saída (resposta da clínica)
  await logComunicacao(db, utente.id, consulta.id, "confirmacao", "entrada", `Utente confirmou consulta de ${dataFmt} às ${horaFmt}`, "respondida");
  await logComunicacao(db, utente.id, consulta.id, "confirmacao", "saida", `Confirmação automática enviada — consulta ${dataFmt} às ${horaFmt}`, "enviada");
}

/**
 * Cancelar consulta (via botão ou texto)
 */
async function processarCancelamento(db: any, telefone: string, utente: any, parsed: ParsedResponse) {
  if (!utente) return;

  const consulta = await obterProximaConsulta(db, utente.id);
  if (!consulta) {
    await enviarMensagemWhatsApp({
      to: telefone,
      body: "Não encontrámos nenhuma consulta agendada para cancelar. 🤔",
      type: "custom",
    });
    return;
  }

  await db
    .update(consultas)
    .set({ estado: "cancelada", updatedAt: new Date() })
    .where(eq(consultas.id, consulta.id));

  const dataFmt = format(new Date(consulta.dataHoraInicio), "dd/MM/yyyy");
  const horaFmt = format(new Date(consulta.dataHoraInicio), "HH:mm");

  await enviarMensagemWhatsApp({
    to: telefone,
    body: `A sua consulta de *${dataFmt}* às *${horaFmt}* foi *cancelada*. 😔\n\nSe mudar de ideias, pode agendar uma nova consulta a qualquer momento respondendo *AGENDAR*.\n\nCuide-se! ❤️`,
    type: "custom",
    consultaId: consulta.id,
  });

  await logEstadoConsulta(db, consulta.id, "cancelada", `Cancelamento via WhatsApp por ${utente.nome}`);

  // V34: Registar comunicação de entrada (resposta do utente) e saída (resposta da clínica)
  await logComunicacao(db, utente.id, consulta.id, "cancelamento", "entrada", `Utente cancelou consulta de ${dataFmt} às ${horaFmt}`, "respondida");
  await logComunicacao(db, utente.id, consulta.id, "cancelamento", "saida", `Resposta de cancelamento enviada — consulta ${dataFmt} às ${horaFmt}`, "enviada");
}

/**
 * Remarcar consulta — envia horários disponíveis
 */
async function processarRemarcar(db: any, telefone: string, utente: any, parsed: ParsedResponse) {
  if (!utente) return;

  const consulta = await obterProximaConsulta(db, utente.id);
  if (!consulta) {
    await enviarMensagemWhatsApp({
      to: telefone,
      body: "Não encontrámos nenhuma consulta para remarcar. 🤔\n\nSe pretende agendar uma nova consulta, responda *AGENDAR*.",
      type: "custom",
    });
    return;
  }

  // Buscar horários disponíveis para os próximos 5 dias úteis
  const slots = await obterHorariosDisponiveis(db, consulta.medicoId, 5);

  if (slots.length === 0) {
    await enviarMensagemWhatsApp({
      to: telefone,
      body: `Lamentamos, ${utente.nome}. 😔\n\nNão encontrámos horários disponíveis nos próximos dias.\n\nPor favor, contacte a receção para remarcar:\n📞 ${CLINICA_INFO.telefone || "Ligue-nos"}`,
      type: "custom",
    });
    return;
  }

  await enviarHorariosDisponiveis(
    telefone,
    utente.nome,
    slots,
    consulta.tipoConsulta || undefined
  );
}

/**
 * Agendar nova consulta — envia horários disponíveis ou confirma slot selecionado
 */
async function processarAgendar(db: any, telefone: string, utente: any, parsed: ParsedResponse) {
  if (!utente) {
    await enviarMensagemWhatsApp({
      to: telefone,
      body: `Olá! 👋\n\nPara agendar uma consulta, precisa de estar registado na nossa clínica.\n\nPor favor, contacte-nos:\n📞 ${CLINICA_INFO.telefone || "Ligue-nos"}\n🌐 ${CLINICA_INFO.website || ""}`,
      type: "custom",
    });
    return;
  }

  // Se veio de uma seleção de slot (lista interativa)
  if (parsed.listRowId?.startsWith("slot_")) {
    const slotId = parsed.listRowId.replace("slot_", "");
    await confirmarSlotSelecionado(db, telefone, utente, slotId);
    return;
  }

  // Caso contrário, mostrar horários disponíveis
  // Buscar primeiro médico disponível (ou o médico habitual do utente)
  const medicosAtivos = await db
    .select({ id: medicos.id, nome: medicos.nome })
    .from(medicos)
    .where(eq(medicos.ativo, true))
    .limit(3);

  if (medicosAtivos.length === 0) {
    await enviarMensagemWhatsApp({
      to: telefone,
      body: `Lamentamos, ${utente.nome}. 😔\n\nNão há médicos disponíveis de momento.\n\nPor favor, contacte a receção:\n📞 ${CLINICA_INFO.telefone || "Ligue-nos"}`,
      type: "custom",
    });
    return;
  }

  // Buscar slots de todos os médicos ativos
  let todosSlots: Array<{ id: string; data: string; hora: string; medico: string }> = [];
  for (const med of medicosAtivos) {
    const slots = await obterHorariosDisponiveis(db, med.id, 5);
    todosSlots = todosSlots.concat(slots);
  }

  if (todosSlots.length === 0) {
    await enviarMensagemWhatsApp({
      to: telefone,
      body: `Lamentamos, ${utente.nome}. 😔\n\nNão encontrámos horários disponíveis nos próximos dias.\n\nPor favor, contacte a receção:\n📞 ${CLINICA_INFO.telefone || "Ligue-nos"}`,
      type: "custom",
    });
    return;
  }

  // Limitar a 10 slots (limite da lista interativa)
  todosSlots = todosSlots.slice(0, 10);

  await enviarHorariosDisponiveis(telefone, utente.nome, todosSlots);
}

/**
 * Confirmar slot selecionado e criar consulta
 */
async function confirmarSlotSelecionado(db: any, telefone: string, utente: any, slotId: string) {
  // O slotId tem formato: "medicoId_YYYY-MM-DD_HH:mm"
  const parts = slotId.split("_");
  if (parts.length < 3) {
    await enviarMensagemWhatsApp({
      to: telefone,
      body: "Ocorreu um erro ao processar a sua seleção. 😔\n\nPor favor, tente novamente ou contacte a receção.",
      type: "custom",
    });
    return;
  }

  const medicoId = parseInt(parts[0]);
  const dataStr = parts[1];
  const horaStr = parts[2];

  // Buscar dados do médico
  const medicoResult = await db
    .select({ id: medicos.id, nome: medicos.nome })
    .from(medicos)
    .where(eq(medicos.id, medicoId))
    .limit(1);

  const medico = medicoResult[0];
  if (!medico) {
    await enviarMensagemWhatsApp({
      to: telefone,
      body: "Médico não encontrado. Por favor, tente novamente.",
      type: "custom",
    });
    return;
  }

  // Criar a consulta
  const dataHoraInicio = new Date(`${dataStr}T${horaStr}:00`);
  const dataHoraFim = addMinutes(dataHoraInicio, 30); // Duração padrão 30 min

  try {
    const [result] = await db.insert(consultas).values({
      utenteId: utente.id,
      medicoId: medico.id,
      dataHoraInicio,
      dataHoraFim,
      tipoConsulta: "Consulta Geral",
      estado: "agendada",
      observacoes: "Marcação via WhatsApp",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const dataFmt = format(dataHoraInicio, "dd/MM/yyyy");
    const horaFmt = format(dataHoraInicio, "HH:mm");

    await enviarConfirmacaoMarcacao(
      result.insertId,
      utente.nome,
      dataFmt,
      horaFmt,
      medico.nome,
      telefone,
      "Consulta Geral"
    );

    await logEstadoConsulta(db, result.insertId, "agendada", `Marcação via WhatsApp por ${utente.nome}`);
  } catch (error) {
    console.error("[Webhook] Erro ao criar consulta:", error);
    await enviarMensagemWhatsApp({
      to: telefone,
      body: "Ocorreu um erro ao agendar a sua consulta. 😔\n\nPor favor, contacte a receção para confirmar.",
      type: "custom",
    });
  }
}

/**
 * Processar feedback (positivo, neutro, negativo)
 */
async function processarFeedback(db: any, telefone: string, utente: any, parsed: ParsedResponse) {
  if (!utente) return;

  let resposta = "";

  switch (parsed.tipo) {
    case "feedback_positivo":
      resposta = `Que bom saber, ${utente.nome}! 😊\n\nFicamos muito felizes que a sua experiência tenha sido positiva!\n\n⭐ Se puder, deixe-nos uma avaliação no Google — ajuda-nos imenso!\n\n${CLINICA_INFO.website ? `🌐 ${CLINICA_INFO.website}` : ""}\n\nObrigado! ❤️`;
      break;

    case "feedback_neutro":
      resposta = `Obrigado pelo feedback, ${utente.nome}. 🤔\n\nSe tiver alguma dúvida sobre o seu tratamento, não hesite em contactar-nos.\n\n📞 ${CLINICA_INFO.telefone || "Ligue-nos"}\n\nEstamos aqui para ajudar!`;
      break;

    case "feedback_negativo":
      resposta = `Lamentamos saber disso, ${utente.nome}. 😔\n\nA sua saúde e conforto são a nossa prioridade. Vamos contactá-lo(a) brevemente para resolver a situação.\n\n🚨 Se for urgente, por favor ligue:\n📞 ${CLINICA_INFO.telefone || "Ligue-nos"}`;
      break;
  }

  await enviarMensagemWhatsApp({
    to: telefone,
    body: resposta,
    type: "custom",
    metadata: { feedbackTipo: parsed.tipo, rating: parsed.rating },
  });
}

/**
 * Processar urgência — enviar informações de emergência
 */
async function processarUrgencia(telefone: string, utente: any) {
  const nome = utente?.nome || "";
  await enviarMensagemWhatsApp({
    to: telefone,
    body: `🚨 *URGÊNCIA DENTÁRIA*${nome ? ` — ${nome}` : ""}\n\n${CLINICA_INFO.urgencia}\n\n📞 Telefone da clínica: ${CLINICA_INFO.telefone || "Contacte-nos"}\n🕐 Horário: ${CLINICA_INFO.horario}\n\n⚠️ A nossa equipa foi notificada e irá contactá-lo(a) assim que possível.\n\nSe for uma emergência grave, ligue *112*.`,
    type: "custom",
    metadata: { urgencia: true, utenteId: utente?.id },
  });
}

/**
 * Transferir para receção humana
 */
async function processarFalarHumano(telefone: string, utente: any) {
  const nome = utente?.nome || "";
  await enviarMensagemWhatsApp({
    to: telefone,
    body: `Claro${nome ? `, ${nome}` : ""}! 👤\n\nVou transferir a sua conversa para a nossa equipa de receção.\n\nAlguém irá responder-lhe brevemente.\n\n📞 Se preferir, pode ligar diretamente:\n${CLINICA_INFO.telefone || "Contacte-nos"}\n\n🕐 Horário de atendimento:\n${CLINICA_INFO.horario}`,
    type: "custom",
    metadata: { transferirHumano: true, utenteId: utente?.id },
  });
}

/**
 * Processar seleções do menu principal
 */
async function processarMenu(db: any, telefone: string, utente: any, parsed: ParsedResponse) {
  const action = parsed.menuAction;

  switch (action) {
    case "horarios":
      await enviarMensagemWhatsApp({
        to: telefone,
        body: `🕐 *Horário de Funcionamento*\n\n${CLINICA_INFO.horario}\n\n📍 ${CLINICA_INFO.morada}${CLINICA_INFO.website ? `\n🌐 ${CLINICA_INFO.website}` : ""}`,
        type: "custom",
      });
      break;

    case "servicos":
      await enviarMensagemWhatsApp({
        to: telefone,
        body: "🏥 *Os Nossos Serviços*\n\n🦷 Dentisteria (Restaurações)\n🪥 Higiene Oral\n✨ Branqueamento Dentário\n🔧 Endodontia (Desvitalização)\n🦴 Implantologia\n😁 Ortodontia (Aparelhos)\n🏗️ Prótese Dentária\n👶 Odontopediatria\n🔬 Cirurgia Oral\n💎 Estética Dentária\n\nPara agendar, responda *AGENDAR* ou selecione a opção no menu.",
        type: "custom",
      });
      break;

    case "precos":
      await enviarMensagemWhatsApp({
        to: telefone,
        body: `💰 *Informação sobre Preços*\n\nOs nossos preços variam conforme o tratamento necessário.\n\nPara um orçamento personalizado, agende uma consulta de avaliação (gratuita ou a preço reduzido).\n\n📅 Responda *AGENDAR* para marcar.\n📞 Ou ligue: ${CLINICA_INFO.telefone || "Contacte-nos"}`,
        type: "custom",
      });
      break;

    case "localizacao":
      await enviarMensagemWhatsApp({
        to: telefone,
        body: `📍 *Como Chegar*\n\n${CLINICA_INFO.morada}\n\n🕐 ${CLINICA_INFO.horario}${CLINICA_INFO.website ? `\n🌐 ${CLINICA_INFO.website}` : ""}`,
        type: "custom",
      });
      break;

    case "minhas_consultas":
      if (utente) {
        await enviarMinhasConsultas(db, telefone, utente);
      } else {
        await enviarMensagemWhatsApp({
          to: telefone,
          body: "Para ver as suas consultas, precisa de estar registado na nossa clínica. 🤔\n\nContacte-nos para mais informações.",
          type: "custom",
        });
      }
      break;

    default:
      // Saudação ou menu genérico — enviar menu principal
      if (utente) {
        await enviarMenuPrincipal(telefone, utente.nome);
      } else {
        await enviarMenuPrincipal(telefone);
      }
      break;
  }
}

/**
 * Enviar lista de consultas agendadas do utente
 */
async function enviarMinhasConsultas(db: any, telefone: string, utente: any) {
  const consultasUtente = await db
    .select({
      id: consultas.id,
      dataHoraInicio: consultas.dataHoraInicio,
      estado: consultas.estado,
      tipoConsulta: consultas.tipoConsulta,
      medicoNome: medicos.nome,
    })
    .from(consultas)
    .leftJoin(medicos, eq(consultas.medicoId, medicos.id))
    .where(
      and(
        eq(consultas.utenteId, utente.id),
        gte(consultas.dataHoraInicio, new Date())
      )
    )
    .orderBy(asc(consultas.dataHoraInicio))
    .limit(5);

  if (consultasUtente.length === 0) {
    await enviarMensagemWhatsApp({
      to: telefone,
      body: `${utente.nome}, não tem consultas agendadas de momento. 📋\n\nPara agendar uma nova consulta, responda *AGENDAR*.`,
      type: "custom",
    });
    return;
  }

  let texto = `📋 *As suas próximas consultas, ${utente.nome}:*\n\n`;
  for (const c of consultasUtente) {
    const data = format(new Date(c.dataHoraInicio), "dd/MM/yyyy");
    const hora = format(new Date(c.dataHoraInicio), "HH:mm");
    const estadoEmoji: Record<string, string> = {
      agendada: "🟡",
      confirmada: "🟢",
      realizada: "✅",
      cancelada: "🔴",
      "no-show": "⚫",
    };
    texto += `${estadoEmoji[c.estado] || "⚪"} *${data}* às *${hora}*\n`;
    texto += `   👨‍⚕️ Dr(a). ${c.medicoNome || "N/D"}\n`;
    texto += `   📋 ${c.tipoConsulta || "Consulta Geral"} — ${c.estado.toUpperCase()}\n\n`;
  }
  texto += "Para remarcar ou cancelar, responda *REMARCAR* ou *CANCELAR*.";

  await enviarMensagemWhatsApp({
    to: telefone,
    body: texto,
    type: "custom",
  });
}

// ─── Funções Auxiliares ──────────────────────────────────────────────────────

/**
 * Obter a próxima consulta agendada de um utente
 */
async function obterProximaConsulta(db: any, utenteId: number) {
  const result = await db
    .select()
    .from(consultas)
    .where(
      and(
        eq(consultas.utenteId, utenteId),
        eq(consultas.estado, "agendada"),
        gte(consultas.dataHoraInicio, new Date())
      )
    )
    .orderBy(asc(consultas.dataHoraInicio))
    .limit(1);

  return result[0] || null;
}

/**
 * Obter horários disponíveis para um médico nos próximos N dias úteis
 * Gera slots com base nas agendas configuradas, excluindo consultas já marcadas.
 */
async function obterHorariosDisponiveis(
  db: any,
  medicoId: number,
  diasUteis: number
): Promise<Array<{ id: string; data: string; hora: string; medico: string }>> {
  // Buscar dados do médico
  const medicoResult = await db
    .select({ id: medicos.id, nome: medicos.nome })
    .from(medicos)
    .where(eq(medicos.id, medicoId))
    .limit(1);

  const medico = medicoResult[0];
  if (!medico) return [];

  // Buscar agendas do médico
  const agendasMedico = await db
    .select()
    .from(agendas)
    .where(and(eq(agendas.medicoId, medicoId), eq(agendas.ativo, true)));

  if (agendasMedico.length === 0) return [];

  const diasSemana: Record<string, number> = {
    domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6,
  };

  const slots: Array<{ id: string; data: string; hora: string; medico: string }> = [];
  let diasVerificados = 0;
  let diaAtual = new Date();

  while (diasVerificados < diasUteis && slots.length < 10) {
    diaAtual = addDays(diaAtual, 1);
    const diaSemanaNum = diaAtual.getDay();

    // Verificar se o médico trabalha neste dia
    const agendaDoDia = agendasMedico.find(
      (a: any) => diasSemana[a.diaSemana] === diaSemanaNum
    );

    if (!agendaDoDia) continue;
    diasVerificados++;

    // Gerar slots com base no intervalo da agenda
    const [horaIni, minIni] = agendaDoDia.horaInicio.split(":").map(Number);
    const [horaFim, minFim] = agendaDoDia.horaFim.split(":").map(Number);
    const intervalo = agendaDoDia.intervaloConsulta || 30;

    let slotTime = new Date(diaAtual);
    slotTime.setHours(horaIni, minIni, 0, 0);

    const fimDia = new Date(diaAtual);
    fimDia.setHours(horaFim, minFim, 0, 0);

    // Buscar consultas já marcadas neste dia
    const consultasDoDia = await db
      .select({ dataHoraInicio: consultas.dataHoraInicio, dataHoraFim: consultas.dataHoraFim })
      .from(consultas)
      .where(
        and(
          eq(consultas.medicoId, medicoId),
          gte(consultas.dataHoraInicio, startOfDay(diaAtual)),
          lte(consultas.dataHoraInicio, endOfDay(diaAtual)),
          // Excluir canceladas
        )
      );

    while (slotTime < fimDia && slots.length < 10) {
      const slotEnd = addMinutes(slotTime, intervalo);

      // Verificar se o slot está livre
      const ocupado = consultasDoDia.some((c: any) => {
        const cInicio = new Date(c.dataHoraInicio).getTime();
        const cFim = new Date(c.dataHoraFim).getTime();
        return slotTime.getTime() < cFim && slotEnd.getTime() > cInicio;
      });

      if (!ocupado) {
        const dataFmt = format(diaAtual, "dd/MM (EEE)", { locale: ptBR });
        const horaFmt = format(slotTime, "HH:mm");
        const dataId = format(diaAtual, "yyyy-MM-dd");

        slots.push({
          id: `${medicoId}_${dataId}_${horaFmt}`,
          data: dataFmt,
          hora: horaFmt,
          medico: medico.nome,
        });
      }

      slotTime = slotEnd;
    }
  }

  return slots;
}

/**
 * Obter utilizador sistema para audit
 */
async function getSystemUser(db: any) {
  const result = await db.select().from(users).where(eq(users.role, "master")).limit(1);
  return result[0] || null;
}

/**
 * Log de alteração de estado de consulta
 */
async function logEstadoConsulta(db: any, consultaId: number, novoEstado: string, descricao: string) {
  const systemUser = await getSystemUser(db);
  if (systemUser) {
    await logAuditAction(systemUser, {
      acao: "update",
      tabela: "consultas",
      registoId: consultaId,
      descricao,
      valorNovo: { estado: novoEstado },
    });
  }
}

/**
 * V34: Registar comunicação no log de comunicações
 * Regista tanto mensagens enviadas pela clínica como respostas dos utentes
 */
async function logComunicacao(
  db: any,
  utenteId: number,
  consultaId: number | null,
  tipo: string,
  direcao: "saida" | "entrada",
  mensagem: string,
  estado: string = "enviada"
) {
  try {
    await db.insert(comunicacoesLog).values({
      utenteId,
      consultaId,
      canal: "whatsapp",
      tipo,
      direcao,
      mensagem,
      estado,
      metadata: JSON.stringify({ source: "webhook_whatsapp", timestamp: new Date().toISOString() }),
    });
  } catch (error) {
    // Se a tabela não existe, criar silenciosamente
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS comunicacoes_log (
          id SERIAL PRIMARY KEY,
          utente_id BIGINT UNSIGNED NOT NULL,
          consulta_id BIGINT UNSIGNED,
          canal VARCHAR(50) NOT NULL,
          tipo VARCHAR(100) NOT NULL,
          direcao VARCHAR(20) NOT NULL DEFAULT 'saida',
          mensagem TEXT,
          estado VARCHAR(50) NOT NULL DEFAULT 'enviada',
          resposta_utente TEXT,
          enviado_por BIGINT UNSIGNED,
          metadata TEXT,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.insert(comunicacoesLog).values({
        utenteId,
        consultaId,
        canal: "whatsapp",
        tipo,
        direcao,
        mensagem,
        estado,
        metadata: JSON.stringify({ source: "webhook_whatsapp", timestamp: new Date().toISOString() }),
      });
    } catch {
      console.error("[Webhook] Falha ao registar comunicação no log (tabela pode não existir)");
    }
  }
}
