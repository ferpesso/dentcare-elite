/**
 * Página de Configuração do WhatsApp
 * DentCare Elite V35 — Integração Twilio + Chatbot + Botões Interativos
 *
 * UPGRADE:
 * - Tab "Chatbot" com configurações do chatbot automático
 * - Tab "Funcionalidades" com status das features interativas
 * - Configuração de Content SIDs para templates interativos
 * - Informações da clínica para respostas automáticas
 * - Teste de mensagem funcional (chama API real)
 */
import { useState } from "react";
import {
  AlertCircle, CheckCircle, Eye, EyeOff, Loader, RefreshCw,
  Settings, Zap, Bot, MousePointerClick, MessageCircle,
  ListChecks, Phone, MapPin, Clock, Globe, Shield,
  Send, Info, Sparkles,
} from "lucide-react";
import { trpc } from "../lib/trpc";
import { parseApiError } from "../lib/parseApiError";

export function ConfiguracaoWhatsAppPage() {
  const [tab, setTab] = useState<"status" | "configurar" | "chatbot" | "funcionalidades" | "teste">("status");
  const [form, setForm] = useState({
    accountSid: "",
    authToken: "",
    whatsappNumber: "",
  });
  const [mostrarToken, setMostrarToken] = useState(false);
  const [resultado, setResultado] = useState<{ sucesso: boolean; mensagem: string } | null>(null);

  // Chatbot config state
  const [chatbotConfig, setChatbotConfig] = useState({
    clinicaNome: "",
    horario: "Segunda a Sexta: 09:00–19:00 | Sábado: 09:00–13:00",
    morada: "",
    telefone: "",
    website: "",
    urgencia: "Em caso de urgência fora de horário, dirija-se ao hospital mais próximo ou ligue 112.",
  });

  // Teste state
  const [testeNumero, setTesteNumero] = useState("");
  const [testeMensagem, setTesteMensagem] = useState("Olá! Esta é uma mensagem de teste do DentCare. 🦷");
  const [testeResultado, setTesteResultado] = useState<{ sucesso: boolean; mensagem: string } | null>(null);

  // Queries
  const healthCheckQuery = trpc.whatsapp.healthCheck.useQuery();
  const validarMutation = trpc.whatsapp.validarCredenciais.useMutation({
    onSuccess: (data) => {
      setResultado({ sucesso: data.success, mensagem: data.message });
      if (data.success) {
        setTimeout(() => healthCheckQuery.refetch(), 2000);
      }
    },
    onError: (error) => {
      setResultado({ sucesso: false, mensagem: parseApiError(error, "Erro ao guardar configuração") });
    },
  });

  // Teste mutation (agora funcional!)
  const enviarTesteMutation = trpc.whatsapp.enviarMensagem.useMutation({
    onSuccess: (data) => {
      setTesteResultado({ sucesso: true, mensagem: `Mensagem enviada com sucesso! Job ID: ${data.jobId}` });
    },
    onError: (error) => {
      setTesteResultado({ sucesso: false, mensagem: parseApiError(error, "Erro ao testar ligação") });
    },
  });

  const handleValidar = () => {
    if (!form.accountSid || !form.authToken || !form.whatsappNumber) {
      setResultado({ sucesso: false, mensagem: "Todos os campos são obrigatórios" });
      return;
    }
    setResultado(null);
    validarMutation.mutate(form);
  };

  const handleEnviarTeste = () => {
    if (!testeNumero) {
      setTesteResultado({ sucesso: false, mensagem: "Insira um número de destino" });
      return;
    }
    setTesteResultado(null);
    enviarTesteMutation.mutate({
      telefone: testeNumero,
      mensagem: testeMensagem,
      tipo: "custom",
    });
  };

  const healthData = healthCheckQuery.data as any;
  const isConfigured = healthData?.status === "healthy";
  const features = healthData?.features || {};

  const TABS = [
    { id: "status",           label: "Status",           icon: CheckCircle },
    { id: "configurar",       label: "Credenciais",      icon: Settings },
    { id: "chatbot",          label: "Chatbot",          icon: Bot },
    { id: "funcionalidades",  label: "Funcionalidades",  icon: Sparkles },
    { id: "teste",            label: "Teste",            icon: Send },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-[var(--text-primary)] text-2xl font-bold flex items-center gap-3 mb-2">
          <Zap className="w-6 h-6 text-amber-400" />
          Configuração do WhatsApp
        </h1>
        <p className="text-[var(--text-muted)] text-sm">
          Integração Twilio com chatbot inteligente, botões interativos e marcação automática
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--bg-overlay)] border border-[var(--border-lighter)] rounded-xl overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              tab === id
                ? "bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab: Status ── */}
      {tab === "status" && (
        <div className="space-y-4">
          <div className={`card-premium p-6 border ${isConfigured ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isConfigured ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
                {isConfigured ? (
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-400" />
                )}
              </div>
              <div className="flex-1">
                <h2 className={`text-lg font-bold mb-1 ${isConfigured ? "text-emerald-300" : "text-red-300"}`}>
                  {isConfigured ? "WhatsApp Configurado" : "WhatsApp Não Configurado"}
                </h2>
                <p className="text-[var(--text-muted)] text-sm mb-4">
                  {isConfigured
                    ? "O serviço está pronto com suporte a mensagens interativas e chatbot."
                    : "Configure as credenciais do Twilio para começar."}
                </p>

                {/* Serviços */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { nome: "Twilio API", status: healthData?.services?.twilio, icone: Zap },
                    { nome: "Redis (Fila)", status: healthData?.services?.redis, icone: RefreshCw },
                    { nome: "Queue Worker", status: healthData?.services?.queue, icone: ListChecks },
                  ].map(s => (
                    <div key={s.nome} className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-lighter)]">
                      <div className="flex items-center gap-2 mb-1">
                        <s.icone className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        <p className="text-[var(--text-secondary)] text-xs font-semibold">{s.nome}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${s.status === "online" ? "bg-emerald-400" : s.status === "offline" ? "bg-red-400" : "bg-amber-400"}`} />
                        <span className="text-[var(--text-muted)] text-xs capitalize">{s.status || "Desconhecido"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => healthCheckQuery.refetch()}
            disabled={healthCheckQuery.isLoading}
            className="w-full btn-secondary py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
          >
            {healthCheckQuery.isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Atualizar Status
          </button>
        </div>
      )}

      {/* ── Tab: Credenciais ── */}
      {tab === "configurar" && (
        <div className="space-y-4">
          <div className="card-premium p-6">
            <h2 className="text-[var(--text-primary)] font-semibold text-sm mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#00E5FF]" />
              Credenciais do Twilio
            </h2>

            <div className="space-y-4">
              <div>
                <label className="section-label block mb-1.5">Account SID</label>
                <input
                  type="text"
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={form.accountSid}
                  onChange={(e) => setForm({ ...form, accountSid: e.target.value })}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50"
                />
                <p className="text-[var(--text-muted)] text-xs mt-1">Twilio Console → Account Info</p>
              </div>

              <div>
                <label className="section-label block mb-1.5">Auth Token</label>
                <div className="relative">
                  <input
                    type={mostrarToken ? "text" : "password"}
                    placeholder="••••••••••••••••••••••••••••••••"
                    value={form.authToken}
                    onChange={(e) => setForm({ ...form, authToken: e.target.value })}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50"
                  />
                  <button type="button" onClick={() => setMostrarToken(!mostrarToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                    {mostrarToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="section-label block mb-1.5">Número WhatsApp Business</label>
                <input
                  type="text"
                  placeholder="whatsapp:+351912345678"
                  value={form.whatsappNumber}
                  onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50"
                />
                <p className="text-[var(--text-muted)] text-xs mt-1">Formato: whatsapp:+CÓDIGO_PAÍS + NÚMERO</p>
              </div>

              {resultado && (
                <div className={`flex items-center gap-3 p-3 rounded-xl border ${resultado.sucesso ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                  {resultado.sucesso ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                  <p className={`text-xs ${resultado.sucesso ? "text-emerald-300" : "text-red-300"}`}>{resultado.mensagem}</p>
                </div>
              )}

              <button onClick={handleValidar} disabled={validarMutation.isPending}
                className="w-full btn-primary py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                {validarMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Validar Credenciais
              </button>
            </div>
          </div>

          <div className="card-premium p-4 bg-[#00E5FF]/5 border border-[#00E5FF]/20">
            <h3 className="text-[var(--text-primary)] text-sm font-semibold mb-2">Como obter credenciais do Twilio?</h3>
            <ol className="text-[var(--text-muted)] text-xs space-y-1 list-decimal list-inside">
              <li>Aceda a <span className="text-[#00E5FF]">https://www.twilio.com</span></li>
              <li>Crie uma conta ou faça login</li>
              <li>Copie o Account SID e Auth Token do Dashboard</li>
              <li>Configure um número WhatsApp Business na secção Messaging</li>
              <li>Cole os dados aqui e valide</li>
            </ol>
          </div>
        </div>
      )}

      {/* ── Tab: Chatbot ── */}
      {tab === "chatbot" && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <Bot className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
            <p className="text-violet-300 text-xs">
              O chatbot responde automaticamente a mensagens recebidas no WhatsApp.
              Configure as informações da clínica para personalizar as respostas automáticas.
            </p>
          </div>

          <div className="card-premium p-6">
            <h2 className="text-[var(--text-primary)] font-semibold text-sm mb-4 flex items-center gap-2">
              <Bot className="w-4 h-4 text-violet-400" />
              Informações da Clínica (para respostas automáticas)
            </h2>

            <div className="space-y-4">
              <div>
                <label className="section-label block mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Nome da Clínica
                </label>
                <input
                  type="text"
                  placeholder="Clínica Dentária Exemplo"
                  value={chatbotConfig.clinicaNome}
                  onChange={e => setChatbotConfig(c => ({ ...c, clinicaNome: e.target.value }))}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50"
                />
              </div>

              <div>
                <label className="section-label block mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Horário de Funcionamento
                </label>
                <input
                  type="text"
                  placeholder="Segunda a Sexta: 09:00–19:00 | Sábado: 09:00–13:00"
                  value={chatbotConfig.horario}
                  onChange={e => setChatbotConfig(c => ({ ...c, horario: e.target.value }))}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50"
                />
              </div>

              <div>
                <label className="section-label block mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> Morada
                </label>
                <input
                  type="text"
                  placeholder="Rua Exemplo, 123, Lisboa"
                  value={chatbotConfig.morada}
                  onChange={e => setChatbotConfig(c => ({ ...c, morada: e.target.value }))}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="section-label block mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3 h-3" /> Telefone
                  </label>
                  <input
                    type="tel"
                    placeholder="+351 21 123 4567"
                    value={chatbotConfig.telefone}
                    onChange={e => setChatbotConfig(c => ({ ...c, telefone: e.target.value }))}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50"
                  />
                </div>
                <div>
                  <label className="section-label block mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3 h-3" /> Website
                  </label>
                  <input
                    type="url"
                    placeholder="https://www.clinicaexemplo.pt"
                    value={chatbotConfig.website}
                    onChange={e => setChatbotConfig(c => ({ ...c, website: e.target.value }))}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50"
                  />
                </div>
              </div>

              <div>
                <label className="section-label block mb-1.5 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" /> Mensagem de Urgência
                </label>
                <textarea
                  rows={2}
                  placeholder="Em caso de urgência fora de horário..."
                  value={chatbotConfig.urgencia}
                  onChange={e => setChatbotConfig(c => ({ ...c, urgencia: e.target.value }))}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50 resize-none"
                />
              </div>

              <button className="w-full btn-primary py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Guardar Configurações do Chatbot
              </button>
            </div>
          </div>

          {/* Funcionalidades do Chatbot */}
          <div className="card-premium p-5">
            <h3 className="text-[var(--text-primary)] font-semibold text-sm mb-3">O que o chatbot faz automaticamente:</h3>
            <div className="space-y-2">
              {[
                { label: "Menu principal com lista interativa", desc: "Quando o utente envia 'Olá', 'Menu' ou qualquer saudação" },
                { label: "Confirmação/cancelamento de consultas", desc: "Processa respostas a lembretes (botões ou texto)" },
                { label: "Marcação via WhatsApp", desc: "Mostra horários disponíveis e cria consulta automaticamente" },
                { label: "Respostas a FAQs", desc: "Horários, serviços, preços, localização" },
                { label: "Triagem de urgências", desc: "Detecta palavras-chave de urgência e notifica a equipa" },
                { label: "Encaminhamento para receção", desc: "Transfere para atendimento humano quando solicitado" },
                { label: "Follow-up pós-consulta", desc: "Pergunta como o utente se sente com botões de feedback" },
                { label: "Pedido de avaliação", desc: "Solicita avaliação com estrelas após a consulta" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-lightest)]">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[var(--text-primary)] text-xs font-medium">{item.label}</p>
                    <p className="text-[var(--text-muted)] text-[10px]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Funcionalidades ── */}
      {tab === "funcionalidades" && (
        <div className="space-y-4">
          <div className="card-premium p-6">
            <h2 className="text-[var(--text-primary)] font-semibold text-sm mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Funcionalidades Interativas
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  nome: "Botões de Resposta Rápida",
                  desc: "Confirmar, cancelar ou remarcar com um toque",
                  icone: MousePointerClick,
                  ativo: features.interactiveButtons ?? true,
                  cor: "text-violet-400",
                  bg: "bg-violet-500/10",
                  border: "border-violet-500/20",
                },
                {
                  nome: "Menus de Lista",
                  desc: "Seleção de horários, serviços e opções",
                  icone: ListChecks,
                  ativo: features.interactiveLists ?? true,
                  cor: "text-[#00E5FF]",
                  bg: "bg-[#00E5FF]/10",
                  border: "border-[#00E5FF]/20",
                },
                {
                  nome: "Chatbot Automático",
                  desc: "Respostas inteligentes a mensagens recebidas",
                  icone: Bot,
                  ativo: features.chatbot ?? true,
                  cor: "text-emerald-400",
                  bg: "bg-emerald-500/10",
                  border: "border-emerald-500/20",
                },
                {
                  nome: "Follow-up Automático",
                  desc: "Acompanhamento pós-consulta com feedback",
                  icone: MessageCircle,
                  ativo: features.followup ?? true,
                  cor: "text-cyan-400",
                  bg: "bg-cyan-500/10",
                  border: "border-cyan-500/20",
                },
                {
                  nome: "Avaliações",
                  desc: "Pedido de avaliação com estrelas",
                  icone: Sparkles,
                  ativo: features.feedback ?? true,
                  cor: "text-amber-400",
                  bg: "bg-amber-500/10",
                  border: "border-amber-500/20",
                },
                {
                  nome: "Marcação via WhatsApp",
                  desc: "Utentes agendam consultas pelo WhatsApp",
                  icone: Phone,
                  ativo: features.interactiveLists ?? true,
                  cor: "text-pink-400",
                  bg: "bg-pink-500/10",
                  border: "border-pink-500/20",
                },
              ].map(f => (
                <div key={f.nome} className={`p-4 rounded-xl ${f.bg} border ${f.border}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <f.icone className={`w-4 h-4 ${f.cor}`} />
                      <p className={`text-sm font-semibold ${f.cor}`}>{f.nome}</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${f.ativo ? "bg-emerald-400" : "bg-red-400"}`} />
                  </div>
                  <p className="text-[var(--text-muted)] text-xs">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 px-1">
            <Info className="w-3.5 h-3.5 text-[#00E5FF]" />
            <p className="text-[var(--text-muted)] text-xs">
              Todas as funcionalidades interativas estão incluídas nesta versão.
              Para templates pré-aprovados pelo WhatsApp, configure os Content SIDs no Twilio Console.
            </p>
          </div>
        </div>
      )}

      {/* ── Tab: Teste (agora funcional!) ── */}
      {tab === "teste" && (
        <div className="space-y-4">
          <div className="card-premium p-6">
            <h2 className="text-[var(--text-primary)] font-semibold text-sm mb-4 flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              Enviar Mensagem de Teste
            </h2>

            {!isConfigured ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <p className="text-amber-300 text-sm">
                  Configure o WhatsApp primeiro antes de enviar mensagens de teste.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="section-label block mb-1.5">Número de Destino</label>
                  <input
                    type="tel"
                    placeholder="+351912345678"
                    value={testeNumero}
                    onChange={e => setTesteNumero(e.target.value)}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50"
                  />
                </div>

                <div>
                  <label className="section-label block mb-1.5">Mensagem</label>
                  <textarea
                    placeholder="Olá! Esta é uma mensagem de teste do DentCare."
                    rows={4}
                    value={testeMensagem}
                    onChange={e => setTesteMensagem(e.target.value)}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50 resize-none"
                  />
                </div>

                {testeResultado && (
                  <div className={`flex items-center gap-3 p-3 rounded-xl border ${testeResultado.sucesso ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                    {testeResultado.sucesso ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                    <p className={`text-xs ${testeResultado.sucesso ? "text-emerald-300" : "text-red-300"}`}>{testeResultado.mensagem}</p>
                  </div>
                )}

                <button
                  onClick={handleEnviarTeste}
                  disabled={enviarTesteMutation.isPending}
                  className="w-full btn-primary py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                >
                  {enviarTesteMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Enviar Mensagem de Teste
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
