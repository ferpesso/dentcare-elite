/**
 * whatsappService.ts — Serviço de Mensagens WhatsApp via Twilio
 * DentCare Elite V35 — Mensagens Interativas (Botões, Listas, Flows)
 *
 * UPGRADE: Adicionado suporte a:
 * - Botões de Resposta Rápida (Interactive Reply Buttons)
 * - Menus de Lista (Interactive List Messages)
 * - Mensagens de Template com variáveis
 * - Chatbot de triagem automática
 * - Marcação de consultas via WhatsApp
 * - Follow-up pós-tratamento automático
 * - Pedido de avaliação/feedback
 *
 * FIX: Migrado de bull+bullmq (conflito) para bullmq exclusivamente.
 * FIX: Graceful degradation quando Redis não está disponível (envia diretamente).
 */
import twilio from "twilio";
import { Queue, Worker } from "bullmq";

// ─── Twilio Client ────────────────────────────────────────────────────────────
// Lazy initialization: só cria o cliente se as credenciais forem válidas
let _twilioClient: ReturnType<typeof twilio> | null = null;
function getTwilioClient(): ReturnType<typeof twilio> {
  if (!_twilioClient) {
    const sid = process.env.TWILIO_ACCOUNT_SID || "";
    const token = process.env.TWILIO_AUTH_TOKEN || "";
    if (!sid.startsWith("AC") || !token || token === "placeholder") {
      throw new Error("Twilio não configurado. Configure TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN.");
    }
    _twilioClient = twilio(sid, token);
  }
  return _twilioClient;
}
const twilioClient = new Proxy({} as ReturnType<typeof twilio>, {
  get: (_target, prop) => {
    return (getTwilioClient() as any)[prop];
  }
});

// ─── Configuração Redis / BullMQ ──────────────────────────────────────────────
// FIX V35: Unificado para usar REDIS_URL (consistente com index.ts e auth.ts)
function parseRedisUrl(url?: string): { host: string; port: number } {
  if (!url) return { host: "localhost", port: 6379 };
  try {
    const parsed = new URL(url);
    return { host: parsed.hostname || "localhost", port: parseInt(parsed.port) || 6379 };
  } catch {
    return { host: "localhost", port: 6379 };
  }
}
const redisConnection = parseRedisUrl(process.env.REDIS_URL);

let whatsappQueue: Queue | null = null;

function getQueue(): Queue {
  if (!whatsappQueue) {
    // FIX V35: Verificar se Redis está configurado antes de criar a fila
    if (!process.env.REDIS_URL) {
      throw new Error("Redis não configurado (REDIS_URL ausente). Fila indisponível.");
    }
    whatsappQueue = new Queue("whatsapp-messages", {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    });
  }
  return whatsappQueue;
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Tipos de mensagem suportados */
export type MessageType =
  | "text"
  | "reminder"
  | "confirmation"
  | "reactivation"
  | "custom"
  | "interactive_buttons"
  | "interactive_list"
  | "followup"
  | "feedback"
  | "birthday"
  | "promotion"
  | "booking_slots"
  | "booking_confirm";

/** Botão de resposta rápida (máximo 3 por mensagem) */
export interface QuickReplyButton {
  id: string;       // ID único do botão (ex: "btn_sim", "btn_nao")
  title: string;    // Texto do botão (máx. 20 caracteres)
}

/** Secção de uma lista interativa */
export interface ListSection {
  title: string;    // Título da secção
  rows: ListRow[];  // Itens da secção
}

/** Item de uma lista interativa */
export interface ListRow {
  id: string;           // ID único do item
  title: string;        // Título do item (máx. 24 caracteres)
  description?: string; // Descrição do item (máx. 72 caracteres)
}

/** Mensagem WhatsApp base */
export interface WhatsAppMessage {
  to: string;
  body: string;
  type: MessageType;
  consultaId?: number;
  utenteId?: number;
  metadata?: Record<string, unknown>;
}

/** Mensagem WhatsApp interativa com botões */
export interface WhatsAppInteractiveButtonMessage extends WhatsAppMessage {
  type: "interactive_buttons" | "booking_confirm" | "feedback";
  header?: string;
  footer?: string;
  buttons: QuickReplyButton[];
}

/** Mensagem WhatsApp interativa com lista */
export interface WhatsAppInteractiveListMessage extends WhatsAppMessage {
  type: "interactive_list" | "booking_slots";
  header?: string;
  footer?: string;
  buttonText: string;  // Texto do botão que abre a lista
  sections: ListSection[];
}

/** Qualquer tipo de mensagem WhatsApp */
export type AnyWhatsAppMessage =
  | WhatsAppMessage
  | WhatsAppInteractiveButtonMessage
  | WhatsAppInteractiveListMessage;

/** Resposta processada do WhatsApp */
export interface WhatsAppResponse {
  from: string;
  body: string;
  messageId: string;
  timestamp: Date;
  consultaId?: number;
  /** Para respostas interativas */
  buttonId?: string;
  listRowId?: string;
}

// ─── Helpers de Mensagens Interativas ─────────────────────────────────────────

/**
 * Verifica se a mensagem é interativa (botões ou lista)
 */
function isInteractiveButtons(msg: AnyWhatsAppMessage): msg is WhatsAppInteractiveButtonMessage {
  return msg.type === "interactive_buttons" || msg.type === "booking_confirm" || msg.type === "feedback";
}

function isInteractiveList(msg: AnyWhatsAppMessage): msg is WhatsAppInteractiveListMessage {
  return msg.type === "interactive_list" || msg.type === "booking_slots";
}

/**
 * Constrói o payload de Content SID para mensagens interativas via Twilio
 * Twilio usa ContentSid para templates interativos, ou podemos usar
 * o formato de mensagem de conteúdo (Content API) para botões e listas.
 *
 * Alternativa: Usar Twilio Content Template Builder para criar templates
 * e depois referenciar pelo ContentSid.
 *
 * Para máxima flexibilidade, usamos a Twilio Content API que permite
 * enviar mensagens interativas programaticamente.
 */
function buildInteractiveButtonsPayload(msg: WhatsAppInteractiveButtonMessage) {
  return {
    contentSid: undefined, // Será usado se houver template pré-aprovado
    contentVariables: undefined,
    // Formato de mensagem interativa via Twilio Content API
    body: msg.body,
    persistentAction: msg.buttons.map(btn => `id:${btn.id}|title:${btn.title}`),
  };
}

// ─── Normalização de Telefone ────────────────────────────────────────────────

/**
 * Normaliza um número de telefone português para o formato internacional E.164.
 * Exemplos:
 *   926560577   → +351926560577
 *   351926560577 → +351926560577
 *   +351926560577 → +351926560577
 */
export function normalizarTelefone(telefone: string): string {
  // Remover espaços, hífens, parênteses
  let limpo = telefone.replace(/[\s\-\(\)]/g, "");
  // Se já tem +, manter
  if (limpo.startsWith("+")) return limpo;
  // Se começa com 00, substituir por +
  if (limpo.startsWith("00")) return "+" + limpo.slice(2);
  // Se começa com 351 e tem mais de 9 dígitos, adicionar +
  if (limpo.startsWith("351") && limpo.length > 9) return "+" + limpo;
  // Número português com 9 dígitos — adicionar +351
  if (/^[29][0-9]{8}$/.test(limpo) || /^[39][0-9]{8}$/.test(limpo) || limpo.length === 9) {
    return "+351" + limpo;
  }
  // Fallback: retornar com + se não tiver
  return limpo.startsWith("+") ? limpo : "+" + limpo;
}

// ─── Envio via Twilio ─────────────────────────────────────────────────────────

/**
 * Envia mensagem simples via Twilio (texto puro)
 */
async function enviarTextoViaTwilio(message: WhatsAppMessage): Promise<string> {
  const to = normalizarTelefone(message.to);
  const result = await twilioClient.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM || `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || ""}`,
    to: `whatsapp:${to}`,
    body: message.body,
  });
  return result.sid;
}

/**
 * Envia mensagem interativa com botões via Twilio Content API
 * Utiliza Content Templates pré-criados no Twilio Console ou
 * envia como texto formatado com instruções de botão como fallback.
 */
async function enviarInteractivaViaTwilio(message: AnyWhatsAppMessage): Promise<string> {
  const from = process.env.TWILIO_WHATSAPP_FROM || `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || ""}`;
  const toNormalizado = normalizarTelefone(message.to);
  const to = `whatsapp:${toNormalizado}`;

  // Se temos um ContentSid configurado para este tipo de mensagem, usamos
  const contentSid = getContentSidForType(message.type);

  if (contentSid) {
    // Envio via Content Template (recomendado para produção)
    const result = await twilioClient.messages.create({
      from,
      to,
      contentSid,
      contentVariables: JSON.stringify(message.metadata || {}),
    });
    return result.sid;
  }

  // Fallback: Enviar como texto formatado com instruções claras
  let bodyFormatado = message.body;

  if (isInteractiveButtons(message)) {
    bodyFormatado += "\n\n";
    message.buttons.forEach((btn, i) => {
      const emojis = ["1️⃣", "2️⃣", "3️⃣"];
      bodyFormatado += `${emojis[i] || "▪️"} Responda *${btn.title}*\n`;
    });
    if (message.footer) {
      bodyFormatado += `\n_${message.footer}_`;
    }
  }

  if (isInteractiveList(message)) {
    bodyFormatado += "\n\n";
    message.sections.forEach(section => {
      bodyFormatado += `*${section.title}*\n`;
      section.rows.forEach(row => {
        bodyFormatado += `▪️ *${row.title}*${row.description ? ` — ${row.description}` : ""}\n`;
        bodyFormatado += `   _(Responda: ${row.id})_\n`;
      });
      bodyFormatado += "\n";
    });
    if ((message as WhatsAppInteractiveListMessage).footer) {
      bodyFormatado += `_${(message as WhatsAppInteractiveListMessage).footer}_`;
    }
  }

  const result = await twilioClient.messages.create({ from, to, body: bodyFormatado });
  return result.sid;
}

/**
 * Retorna o ContentSid do Twilio para um tipo de mensagem, se configurado.
 * Os ContentSids são criados no Twilio Console > Content Template Builder.
 */
function getContentSidForType(type: MessageType): string | undefined {
  const contentSids: Partial<Record<MessageType, string>> = {
    reminder: process.env.TWILIO_CONTENT_SID_REMINDER,
    confirmation: process.env.TWILIO_CONTENT_SID_CONFIRMATION,
    interactive_buttons: process.env.TWILIO_CONTENT_SID_BUTTONS,
    interactive_list: process.env.TWILIO_CONTENT_SID_LIST,
    booking_slots: process.env.TWILIO_CONTENT_SID_BOOKING,
    feedback: process.env.TWILIO_CONTENT_SID_FEEDBACK,
    followup: process.env.TWILIO_CONTENT_SID_FOLLOWUP,
    birthday: process.env.TWILIO_CONTENT_SID_BIRTHDAY,
  };
  return contentSids[type];
}

// ─── Envio Principal (com fila) ──────────────────────────────────────────────

/**
 * Envia qualquer tipo de mensagem WhatsApp.
 * Tenta usar a fila BullMQ para entrega fiável.
 * Se Redis não estiver disponível, envia diretamente via Twilio.
 */
export async function enviarMensagemWhatsApp(
  message: AnyWhatsAppMessage
): Promise<{ jobId: string; queued: boolean }> {
  try {
    const queue = getQueue();
    const job = await queue.add("send-whatsapp", message);
    console.log(`[WhatsApp] Mensagem enfileirada: job ${job.id} (tipo: ${message.type})`);
    return { jobId: job.id?.toString() ?? "direct", queued: true };
  } catch (queueError) {
    console.warn("[WhatsApp] Fila indisponível, a enviar diretamente:", queueError);
    try {
      const sid = await enviarMensagemDireta(message);
      console.log(`[WhatsApp] Mensagem enviada diretamente: ${sid}`);
      return { jobId: sid, queued: false };
    } catch (twilioError) {
      console.error("[WhatsApp] Falha no envio direto:", twilioError);
      throw new Error("Falha ao enviar mensagem WhatsApp");
    }
  }
}

/**
 * Envia mensagem diretamente (sem fila), escolhendo o método correto
 */
function enviarMensagemDireta(message: AnyWhatsAppMessage): Promise<string> {
  if (isInteractiveButtons(message) || isInteractiveList(message)) {
    return enviarInteractivaViaTwilio(message);
  }
  return enviarTextoViaTwilio(message);
}

// ─── Funções de Envio Especializadas ─────────────────────────────────────────

/**
 * Envia lembrete de consulta 24h antes — COM BOTÕES INTERATIVOS
 * O utente pode confirmar, cancelar ou remarcar com um toque.
 */
export function enviarLembrete(
  consultaId: number,
  utenteName: string,
  consultaTime: string,
  utenteTelefone: string,
  medicoNome?: string,
  tipoConsulta?: string,
  consultaData?: string
): Promise<{ jobId: string; queued: boolean }> {
  // Se a data foi fornecida, usar; caso contrário, usar "amanhã" como fallback
  const dataTexto = consultaData ? `*${consultaData}*` : "*amanhã*";
  const msg: WhatsAppInteractiveButtonMessage = {
    to: utenteTelefone,
    body: `Olá ${utenteName}! 👋\n\nLembrete: Tem uma consulta marcada para ${dataTexto} às *${consultaTime}*${medicoNome ? ` com o Dr(a). *${medicoNome}*` : ""}${tipoConsulta ? `\n📋 Tipo: *${tipoConsulta}*` : ""}.\n\nPor favor, confirme a sua presença:`,
    type: "interactive_buttons",
    consultaId,
    footer: "DentCare — A sua clínica digital",
    buttons: [
      { id: `confirm_${consultaId}`, title: "✅ Confirmo" },
      { id: `cancel_${consultaId}`, title: "❌ Não posso" },
      { id: `reschedule_${consultaId}`, title: "🔄 Remarcar" },
    ],
    metadata: { consultaId, utenteName, consultaTime, consultaData, medicoNome },
  };
  return enviarMensagemWhatsApp(msg);
}

/**
 * Envia confirmação de marcação — COM BOTÕES INTERATIVOS
 */
export function enviarConfirmacaoMarcacao(
  consultaId: number,
  utenteName: string,
  data: string,
  hora: string,
  medicoNome: string,
  utenteTelefone: string,
  tipoConsulta?: string
): Promise<{ jobId: string; queued: boolean }> {
  const msg: WhatsAppInteractiveButtonMessage = {
    to: utenteTelefone,
    body: `Olá ${utenteName}! ✅\n\nA sua consulta foi confirmada com sucesso!\n\n📅 Data: *${data}*\n⏰ Hora: *${hora}*\n👨‍⚕️ Médico: *Dr(a). ${medicoNome}*${tipoConsulta ? `\n📋 Tipo: *${tipoConsulta}*` : ""}\n\nAguardamos a sua visita! 🦷`,
    type: "booking_confirm",
    consultaId,
    footer: "Responda se precisar de alterar algo",
    buttons: [
      { id: `ok_${consultaId}`, title: "👍 Obrigado!" },
      { id: `reschedule_${consultaId}`, title: "🔄 Remarcar" },
      { id: `cancel_${consultaId}`, title: "❌ Cancelar" },
    ],
    metadata: { consultaId, utenteName, data, hora, medicoNome },
  };
  return enviarMensagemWhatsApp(msg);
}

/**
 * Envia lista de horários disponíveis para marcação via WhatsApp
 * O utente seleciona o horário diretamente no menu de lista.
 */
export function enviarHorariosDisponiveis(
  utenteTelefone: string,
  utenteName: string,
  slots: Array<{ id: string; data: string; hora: string; medico: string }>,
  tipoConsulta?: string
): Promise<{ jobId: string; queued: boolean }> {
  // Agrupar slots por data
  const slotsPorData = new Map<string, typeof slots>();
  for (const slot of slots) {
    const existing = slotsPorData.get(slot.data) || [];
    existing.push(slot);
    slotsPorData.set(slot.data, existing);
  }

  const sections: ListSection[] = [];
  for (const [data, slotsData] of slotsPorData) {
    sections.push({
      title: `📅 ${data}`,
      rows: slotsData.slice(0, 10).map(s => ({
        id: `slot_${s.id}`,
        title: `${s.hora}`,
        description: `Dr(a). ${s.medico}`,
      })),
    });
  }

  const msg: WhatsAppInteractiveListMessage = {
    to: utenteTelefone,
    body: `Olá ${utenteName}! 📅\n\nAqui estão os horários disponíveis${tipoConsulta ? ` para *${tipoConsulta}*` : ""}.\n\nSelecione o horário que lhe convém:`,
    type: "booking_slots",
    buttonText: "📋 Ver Horários",
    footer: "Selecione um horário para confirmar a marcação",
    sections,
    metadata: { utenteName, tipoConsulta },
  };
  return enviarMensagemWhatsApp(msg);
}

/**
 * Envia campanha de reativação para utentes inativos (> 6 meses) — COM BOTÕES
 */
export function enviarCampanhaReativacao(
  utenteName: string,
  utenteTelefone: string,
  ultimaConsultaDate: Date,
  specialtyName: string
): Promise<{ jobId: string; queued: boolean }> {
  const monthsInactive = Math.floor(
    (Date.now() - ultimaConsultaDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  const msg: WhatsAppInteractiveButtonMessage = {
    to: utenteTelefone,
    body: `Olá ${utenteName}! 😊\n\nSentimos a sua falta! Há *${monthsInactive} meses* que não nos visita.\n\nA saúde oral é muito importante! Gostaríamos de o(a) receber novamente para uma consulta de *${specialtyName}*.\n\n🦷 Quer agendar uma consulta?`,
    type: "interactive_buttons",
    footer: "A sua saúde oral é a nossa prioridade",
    buttons: [
      { id: "reactivate_yes", title: "✅ Sim, agendar!" },
      { id: "reactivate_later", title: "⏰ Mais tarde" },
      { id: "reactivate_no", title: "❌ Não, obrigado" },
    ],
    metadata: { monthsInactive, specialtyName },
  };
  return enviarMensagemWhatsApp(msg);
}

/**
 * Envia follow-up pós-consulta — COM BOTÕES DE FEEDBACK
 * Enviado automaticamente 2 dias após a consulta.
 */
export function enviarFollowupPosConsulta(
  consultaId: number,
  utenteName: string,
  utenteTelefone: string,
  tipoConsulta: string,
  medicoNome: string
): Promise<{ jobId: string; queued: boolean }> {
  const msg: WhatsAppInteractiveButtonMessage = {
    to: utenteTelefone,
    body: `Olá ${utenteName}! 👋\n\nEsperamos que esteja a recuperar bem após a sua consulta de *${tipoConsulta}* com o Dr(a). *${medicoNome}*.\n\nComo se está a sentir?`,
    type: "interactive_buttons",
    consultaId,
    footer: "A sua opinião é muito importante para nós",
    buttons: [
      { id: `followup_good_${consultaId}`, title: "😊 Estou bem!" },
      { id: `followup_doubt_${consultaId}`, title: "🤔 Tenho dúvidas" },
      { id: `followup_bad_${consultaId}`, title: "😟 Preciso de ajuda" },
    ],
    metadata: { consultaId, tipoConsulta, medicoNome },
  };
  return enviarMensagemWhatsApp(msg);
}

/**
 * Envia pedido de avaliação/feedback — COM BOTÕES DE ESTRELAS
 * Enviado 3-5 dias após a consulta.
 */
export function enviarPedidoAvaliacao(
  consultaId: number,
  utenteName: string,
  utenteTelefone: string,
  clinicaNome?: string
): Promise<{ jobId: string; queued: boolean }> {
  const nome = clinicaNome || "a nossa clínica";
  const msg: WhatsAppInteractiveButtonMessage = {
    to: utenteTelefone,
    body: `Olá ${utenteName}! 🌟\n\nObrigado por ter visitado ${nome}!\n\nGostaríamos de saber como foi a sua experiência. A sua avaliação ajuda-nos a melhorar continuamente.\n\nComo avalia a sua última visita?`,
    type: "feedback",
    consultaId,
    footer: "Obrigado pelo seu tempo!",
    buttons: [
      { id: `rating_great_${consultaId}`, title: "⭐⭐⭐⭐⭐ Excelente" },
      { id: `rating_good_${consultaId}`, title: "⭐⭐⭐⭐ Bom" },
      { id: `rating_ok_${consultaId}`, title: "⭐⭐⭐ Razoável" },
    ],
    metadata: { consultaId, clinicaNome },
  };
  return enviarMensagemWhatsApp(msg);
}

/**
 * Envia mensagem de aniversário — COM BOTÃO DE MARCAÇÃO
 */
export function enviarFelicitacaoAniversario(
  utenteName: string,
  utenteTelefone: string,
  utenteId: number,
  desconto?: string
): Promise<{ jobId: string; queued: boolean }> {
  const descontoTexto = desconto || "10% de desconto";
  const msg: WhatsAppInteractiveButtonMessage = {
    to: utenteTelefone,
    body: `Olá ${utenteName}! 🎂🎉\n\nA equipa da nossa clínica deseja-lhe um *Feliz Aniversário*!\n\nComo presente especial, oferecemos-lhe *${descontoTexto}* na sua próxima consulta.\n\nCuide do seu sorriso — é o melhor presente! 😁❤️`,
    type: "interactive_buttons",
    utenteId,
    footer: "Válido por 30 dias",
    buttons: [
      { id: `birthday_book_${utenteId}`, title: "📅 Agendar consulta" },
      { id: `birthday_thanks_${utenteId}`, title: "🙏 Obrigado!" },
    ],
    metadata: { utenteId, desconto: descontoTexto },
  };
  return enviarMensagemWhatsApp(msg);
}

/**
 * Envia menu principal do chatbot (primeira interação)
 */
export function enviarMenuPrincipal(
  utenteTelefone: string,
  utenteName?: string
): Promise<{ jobId: string; queued: boolean }> {
  const saudacao = utenteName ? `Olá ${utenteName}!` : "Olá!";
  const msg: WhatsAppInteractiveListMessage = {
    to: utenteTelefone,
    body: `${saudacao} 👋\n\nBem-vindo(a) à nossa clínica! Como posso ajudá-lo(a)?`,
    type: "interactive_list",
    buttonText: "📋 Ver Opções",
    footer: "Estamos aqui para ajudar!",
    sections: [
      {
        title: "🦷 Consultas",
        rows: [
          { id: "menu_agendar", title: "📅 Agendar Consulta", description: "Marcar nova consulta" },
          { id: "menu_minhas_consultas", title: "📋 Minhas Consultas", description: "Ver consultas agendadas" },
          { id: "menu_remarcar", title: "🔄 Remarcar Consulta", description: "Alterar data/hora" },
          { id: "menu_cancelar", title: "❌ Cancelar Consulta", description: "Cancelar uma marcação" },
        ],
      },
      {
        title: "ℹ️ Informações",
        rows: [
          { id: "menu_horarios", title: "🕐 Horários", description: "Horário de funcionamento" },
          { id: "menu_servicos", title: "🏥 Serviços", description: "Tratamentos disponíveis" },
          { id: "menu_precos", title: "💰 Preços", description: "Tabela de preços" },
          { id: "menu_localizacao", title: "📍 Localização", description: "Como chegar à clínica" },
        ],
      },
      {
        title: "📞 Contacto",
        rows: [
          { id: "menu_falar_humano", title: "👤 Falar com Alguém", description: "Transferir para receção" },
          { id: "menu_urgencia", title: "🚨 Urgência", description: "Emergência dentária" },
        ],
      },
    ],
    metadata: { utenteName },
  };
  return enviarMensagemWhatsApp(msg);
}

/**
 * Envia lista de serviços/tratamentos disponíveis
 */
export function enviarListaServicos(
  utenteTelefone: string,
  servicos: Array<{ id: string; nome: string; descricao?: string }>
): Promise<{ jobId: string; queued: boolean }> {
  const msg: WhatsAppInteractiveListMessage = {
    to: utenteTelefone,
    body: "Aqui estão os nossos serviços disponíveis! 🦷\n\nSelecione um serviço para saber mais ou agendar:",
    type: "interactive_list",
    buttonText: "🏥 Ver Serviços",
    footer: "Selecione para agendar ou saber mais",
    sections: [
      {
        title: "Tratamentos Disponíveis",
        rows: servicos.slice(0, 10).map(s => ({
          id: `servico_${s.id}`,
          title: s.nome.substring(0, 24),
          description: s.descricao?.substring(0, 72),
        })),
      },
    ],
  };
  return enviarMensagemWhatsApp(msg);
}

// ─── Worker BullMQ ───────────────────────────────────────────────────────────

/**
 * Inicia o worker BullMQ para processar a fila de mensagens WhatsApp.
 * UPGRADE: Suporta mensagens interativas além de texto simples.
 */
export function setupWhatsAppWorker() {
  // FIX V35: Não iniciar o worker se Redis não estiver configurado
  // Isto evita spam infinito de erros ECONNREFUSED nos logs
  if (!process.env.REDIS_URL) {
    console.log("[WhatsApp Worker] Redis não configurado (REDIS_URL ausente). Worker desativado. Mensagens serão enviadas diretamente.");
    return null;
  }

  try {
    const worker = new Worker(
      "whatsapp-messages",
      async (job) => {
        const message = job.data as AnyWhatsAppMessage;
        console.log(`[WhatsApp Worker] A processar job ${job.id} (tipo: ${message.type})...`);
        const sid = await enviarMensagemDireta(message);
        console.log(`[WhatsApp Worker] Mensagem enviada: ${sid}`);
        return { success: true, messageSid: sid, sentAt: new Date(), type: message.type };
      },
      {
        connection: redisConnection,
        concurrency: 5,
      }
    );

    let errorLogged = false;
    worker.on("completed", (job) => {
      console.log(`[WhatsApp Worker] Job ${job.id} concluído`);
    });

    worker.on("failed", (job, err) => {
      console.error(`[WhatsApp Worker] Job ${job?.id} falhou:`, err.message);
    });

    worker.on("error", (err) => {
      if (!errorLogged) {
        console.warn("[WhatsApp Worker] Redis connection error, background worker disabled. Mensagens serão enviadas diretamente.");
        errorLogged = true;
      }
    });

    return worker;
  } catch (error) {
    console.warn("[WhatsApp Worker] Could not start worker (Redis might be down):", (error as any).message);
    return null;
  }
}

// ─── Parser de Respostas ─────────────────────────────────────────────────────

/** Resultado do parsing de uma resposta WhatsApp */
export interface ParsedResponse {
  tipo: "confirmacao" | "cancelamento" | "remarcar" | "agendar" | "feedback_positivo" | "feedback_neutro" | "feedback_negativo" | "menu" | "urgencia" | "falar_humano" | "outro";
  confianca: number;
  buttonId?: string;
  listRowId?: string;
  consultaId?: number;
  rating?: number;
  menuAction?: string;
}

/**
 * Parse avançado de resposta WhatsApp — suporta botões interativos e texto
 */
export function parseWhatsAppResponse(messageBody: string, buttonPayload?: string, listPayload?: string): ParsedResponse {
  // 1. Se veio de um botão interativo
  if (buttonPayload) {
    return parseButtonResponse(buttonPayload);
  }

  // 2. Se veio de uma seleção de lista
  if (listPayload) {
    return parseListResponse(listPayload);
  }

  // 3. Parse de texto livre
  return parseTextResponse(messageBody);
}

function parseButtonResponse(buttonId: string): ParsedResponse {
  // Extrair consultaId do buttonId se existir (ex: "confirm_123")
  const parts = buttonId.split("_");
  const consultaId = parts.length > 1 ? parseInt(parts[parts.length - 1]) : undefined;

  if (buttonId.startsWith("confirm_") || buttonId.startsWith("ok_")) {
    return { tipo: "confirmacao", confianca: 1.0, buttonId, consultaId };
  }
  if (buttonId.startsWith("cancel_")) {
    return { tipo: "cancelamento", confianca: 1.0, buttonId, consultaId };
  }
  if (buttonId.startsWith("reschedule_")) {
    return { tipo: "remarcar", confianca: 1.0, buttonId, consultaId };
  }
  if (buttonId.startsWith("reactivate_yes") || buttonId.startsWith("birthday_book_")) {
    return { tipo: "agendar", confianca: 1.0, buttonId };
  }
  if (buttonId.startsWith("reactivate_later") || buttonId.startsWith("reactivate_no") || buttonId.startsWith("birthday_thanks_")) {
    return { tipo: "outro", confianca: 0.8, buttonId };
  }
  if (buttonId.startsWith("followup_good_")) {
    return { tipo: "feedback_positivo", confianca: 1.0, buttonId, consultaId };
  }
  if (buttonId.startsWith("followup_doubt_")) {
    return { tipo: "feedback_neutro", confianca: 1.0, buttonId, consultaId };
  }
  if (buttonId.startsWith("followup_bad_")) {
    return { tipo: "feedback_negativo", confianca: 1.0, buttonId, consultaId };
  }
  if (buttonId.startsWith("rating_great_")) {
    return { tipo: "feedback_positivo", confianca: 1.0, buttonId, consultaId, rating: 5 };
  }
  if (buttonId.startsWith("rating_good_")) {
    return { tipo: "feedback_positivo", confianca: 1.0, buttonId, consultaId, rating: 4 };
  }
  if (buttonId.startsWith("rating_ok_")) {
    return { tipo: "feedback_neutro", confianca: 1.0, buttonId, consultaId, rating: 3 };
  }

  return { tipo: "outro", confianca: 0.5, buttonId };
}

function parseListResponse(listRowId: string): ParsedResponse {
  if (listRowId.startsWith("slot_")) {
    return { tipo: "agendar", confianca: 1.0, listRowId };
  }
  if (listRowId.startsWith("menu_agendar")) {
    return { tipo: "agendar", confianca: 1.0, listRowId, menuAction: "agendar" };
  }
  if (listRowId.startsWith("menu_minhas_consultas")) {
    return { tipo: "menu", confianca: 1.0, listRowId, menuAction: "minhas_consultas" };
  }
  if (listRowId.startsWith("menu_remarcar")) {
    return { tipo: "remarcar", confianca: 1.0, listRowId, menuAction: "remarcar" };
  }
  if (listRowId.startsWith("menu_cancelar")) {
    return { tipo: "cancelamento", confianca: 1.0, listRowId, menuAction: "cancelar" };
  }
  if (listRowId.startsWith("menu_falar_humano")) {
    return { tipo: "falar_humano", confianca: 1.0, listRowId, menuAction: "falar_humano" };
  }
  if (listRowId.startsWith("menu_urgencia")) {
    return { tipo: "urgencia", confianca: 1.0, listRowId, menuAction: "urgencia" };
  }
  if (listRowId.startsWith("menu_")) {
    return { tipo: "menu", confianca: 1.0, listRowId, menuAction: listRowId.replace("menu_", "") };
  }
  if (listRowId.startsWith("servico_")) {
    return { tipo: "agendar", confianca: 0.9, listRowId, menuAction: "servico" };
  }

  return { tipo: "outro", confianca: 0.5, listRowId };
}

function parseTextResponse(message: string): ParsedResponse {
  const msg = message.toLowerCase().trim();

  // Confirmações
  if (["sim", "s", "confirmo", "confirmado", "ok", "tudo bem", "pode ser", "está bem"].includes(msg)) {
    return { tipo: "confirmacao", confianca: 0.95 };
  }

  // Cancelamentos
  if (["não", "nao", "n", "cancelo", "cancelado", "não posso", "nao posso", "impossível", "impossivel"].includes(msg)) {
    return { tipo: "cancelamento", confianca: 0.95 };
  }

  // Remarcar
  if (msg.includes("remarcar") || msg.includes("outro dia") || msg.includes("outra data") || msg.includes("mudar")) {
    return { tipo: "remarcar", confianca: 0.85 };
  }

  // Agendar
  if (msg.includes("agendar") || msg.includes("marcar") || msg.includes("consulta") || msg.includes("marcação")) {
    return { tipo: "agendar", confianca: 0.80 };
  }

  // Urgência
  if (msg.includes("urgente") || msg.includes("urgência") || msg.includes("emergência") || msg.includes("dor forte") || msg.includes("sangramento") || msg.includes("inchaço")) {
    return { tipo: "urgencia", confianca: 0.90 };
  }

  // Falar com humano
  if (msg.includes("pessoa") || msg.includes("humano") || msg.includes("receção") || msg.includes("recepção") || msg.includes("falar com")) {
    return { tipo: "falar_humano", confianca: 0.85 };
  }

  // Menu / Saudação
  if (["ola", "olá", "oi", "bom dia", "boa tarde", "boa noite", "menu", "início", "inicio", "ajuda", "help"].includes(msg)) {
    return { tipo: "menu", confianca: 0.90 };
  }

  return { tipo: "outro", confianca: 0 };
}

// ─── Validação e Health Check ────────────────────────────────────────────────

/**
 * Valida credenciais Twilio
 */
export async function validarWhatsApp(
  accountSid: string,
  authToken: string,
  whatsappNumber: string
): Promise<{ success: boolean; message: string }> {
  try {
    const testClient = twilio(accountSid, authToken);
    await testClient.api.v2010.accounts(accountSid).fetch();
    if (!whatsappNumber.startsWith("whatsapp:")) {
      return { success: false, message: "Número WhatsApp inválido. Deve começar com 'whatsapp:'" };
    }
    return { success: true, message: "Credenciais e número WhatsApp válidos!" };
  } catch (error: any) {
    return { success: false, message: `Falha na validação: ${error.message}` };
  }
}

/**
 * Health check do serviço WhatsApp
 */
export async function healthCheckWhatsApp(): Promise<{
  twilio: boolean;
  redis: boolean;
  queue: boolean;
  interactiveSupport: boolean;
}> {
  let twilioOk = false;
  let redisOk = false;
  let queueOk = false;
  const interactiveSupport = true; // Sempre suportado nesta versão

  try {
    twilioOk = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  } catch { /* */ }

  try {
    const queue = getQueue();
    await queue.getJobCounts("active");
    redisOk = true;
    queueOk = true;
  } catch { /* Redis não disponível */ }

  return { twilio: twilioOk, redis: redisOk, queue: queueOk, interactiveSupport };
}
