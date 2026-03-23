/**
 * NotificationEngine — Motor de Notificações Inteligente
 * DentCare Elite V32.3 — Lembretes Automáticos (WhatsApp/Email)
 * UPGRADE V32.3: Usa configurações dinâmicas da BD (notif_lembretes_horas, etc.)
 */
import { getDb } from "./db";
import { consultas, utentes, configuracoesClinica } from "../drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { enviarLembrete } from "./whatsappService";
import { format, addHours, startOfDay, endOfDay } from "date-fns";

/**
 * Helper: obter configurações de notificação da BD
 */
async function getNotifConfig(): Promise<Record<string, string>> {
  try {
    const db = await getDb();
    if (!db) return {};
    const rows = await db.select().from(configuracoesClinica);
    const map: Record<string, string> = {};
    for (const r of rows) map[r.chave] = r.valor ?? '';
    return map;
  } catch {
    return {};
  }
}

/**
 * Processa lembretes para consultas dentro da janela configurada
 * Executado periodicamente (ex: via cron)
 */
export async function processarLembretesAutomaticos() {
  console.log("[NotificationEngine] A iniciar processamento de lembretes...");
  
  const db = await getDb();
  if (!db) {
    console.error("[NotificationEngine] Erro: Base de dados indisponível");
    return;
  }

  // Obter configurações
  const cfg = await getNotifConfig();
  const lembretesAtivos = cfg['notif_lembretes'] !== 'false';
  if (!lembretesAtivos) {
    console.log("[NotificationEngine] Lembretes desactivados nas configurações.");
    return;
  }

  const horasAntecedencia = parseInt(cfg['notif_lembretes_horas'] || '24', 10);
  const whatsappAtivo = cfg['notif_whatsapp'] === 'true' || cfg['whatsapp_ativo'] === 'true';
  const emailAtivo = cfg['notif_email'] === 'true';

  // Definir janela de tempo baseada na antecedência configurada
  const agora = new Date();
  const inicio = agora;
  const fim = addHours(agora, horasAntecedencia);

  try {
    // Buscar consultas agendadas na janela que ainda não foram notificadas
    const consultasParaLembrar = await db
      .select({
        id: consultas.id,
        dataHoraInicio: consultas.dataHoraInicio,
        utenteNome: utentes.nome,
        utenteTelemovel: utentes.telemovel,
        utenteEmail: utentes.email,
      })
      .from(consultas)
      .innerJoin(utentes, eq(consultas.utenteId, utentes.id))
      .where(
        and(
          eq(consultas.estado, "agendada"),
          gte(consultas.dataHoraInicio, inicio),
          lte(consultas.dataHoraInicio, fim)
        )
      );

    console.log(`[NotificationEngine] Encontradas ${consultasParaLembrar.length} consultas para notificar (janela: ${horasAntecedencia}h).`);

    let enviados = 0;

    // Enviar notificações
    for (const c of consultasParaLembrar) {
      // WhatsApp
      if (whatsappAtivo && c.utenteTelemovel) {
        const horaFmt = format(new Date(c.dataHoraInicio), "HH:mm");
        const dataFmt = format(new Date(c.dataHoraInicio), "dd/MM/yyyy");
        try {
          await enviarLembrete(c.id, c.utenteNome, horaFmt, c.utenteTelemovel, undefined, undefined, dataFmt);
          console.log(`[NotificationEngine] Lembrete WhatsApp enviado para: ${c.utenteNome} (${c.id})`);
          enviados++;
        } catch (err) {
          console.error(`[NotificationEngine] Erro ao enviar WhatsApp para ${c.utenteNome}:`, err);
        }
      }
      
      // Email (placeholder — implementar com nodemailer ou serviço de email)
      if (emailAtivo && c.utenteEmail) {
        console.log(`[NotificationEngine] [TODO] Email para: ${c.utenteEmail} — consulta ${c.id}`);
      }
    }

    return { success: true, totalProcessado: consultasParaLembrar.length, totalEnviados: enviados };
  } catch (error) {
    console.error("[NotificationEngine] Erro crítico no processamento:", error);
    throw error;
  }
}

/**
 * Setup do agendamento automático (Cron)
 * V32.2: Executa a cada hora e verifica a janela de antecedência configurada
 */
export function setupNotificationCron() {
  const INTERVALO = 60 * 60 * 1000; // 1 hora
  
  setInterval(async () => {
    try {
      await processarLembretesAutomaticos();
    } catch (err) {
      console.error("[NotificationEngine] Erro no cron:", err);
    }
  }, INTERVALO);
  
  console.log("[NotificationEngine] Cron de notificações configurado (Check a cada 1h)");
}
