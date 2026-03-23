/**
 * Drizzle ORM Schema — DentCare
 * Tabelas principais: users, auditLog
 */
import {
  mysqlTable,
  serial,
  varchar,
  text,
  boolean,
  datetime,
  int,
  bigint,
  mysqlEnum,
  decimal,
  type AnyMySqlColumn,
} from "drizzle-orm/mysql-core";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ============================================================
// USERS
// ============================================================
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  loginMethod: varchar("login_method", { length: 100 }),
  role: mysqlEnum("role", ["master", "admin", "medico", "recepcao", "user"])
    .notNull()
    .default("user"),
  passwordHash: varchar("password_hash", { length: 255 }),
  username: varchar("username", { length: 100 }),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: varchar("two_factor_secret", { length: 255 }),
  lastSignedIn: datetime("last_signed_in"),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
  clinicaId: bigint("clinica_id", { mode: "number", unsigned: true }).notNull().default(1),
});

export type User = InferSelectModel<typeof users>;
export type InsertUser = InferInsertModel<typeof users>;

// ============================================================
// AUDIT LOG
// ============================================================
export const auditLog = mysqlTable("audit_log", {
  id: serial("id").primaryKey(),
  usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
  acao: varchar("acao", { length: 50 }).notNull(),
  tabela: varchar("tabela", { length: 100 }).notNull(),
  registoId: bigint("registo_id", { mode: "number", unsigned: true }).notNull(),
  valorAnterior: text("valor_anterior"),
  valorNovo: text("valor_novo"),
  descricao: text("descricao"),
  criadoEm: datetime("criado_em").notNull().$defaultFn(() => new Date()),
});

export type AuditLog = InferSelectModel<typeof auditLog>;
export type InsertAuditLog = InferInsertModel<typeof auditLog>;

// ============================================================
// UTENTES (Pacientes)
// ============================================================
export const utentes = mysqlTable("utentes", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  nif: varchar("nif", { length: 15 }).unique(),
  dataNascimento: datetime("data_nascimento"),
  genero: mysqlEnum("genero", ["masculino", "feminino", "outro"]), 
  morada: varchar("morada", { length: 255 }),
  localidade: varchar("localidade", { length: 100 }),
  cidade: varchar("cidade", { length: 100 }),
  codigoPostal: varchar("codigo_postal", { length: 20 }),
  pais: varchar("pais", { length: 100 }).default("Portugal"),
  telemovel: varchar("telemovel", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }).unique(),
  observacoes: text("observacoes"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type Utente = InferSelectModel<typeof utentes>;
export type InsertUtente = InferInsertModel<typeof utentes>;

// ============================================================
// MEDICOS (Profissionais de Saúde)
// ============================================================
export const medicos = mysqlTable("medicos", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).references(() => users.id).unique(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cedulaProfissional: varchar("cedula_profissional", { length: 50 }).unique().notNull(),
  especialidade: varchar("especialidade", { length: 100 }),
  telemovel: varchar("telemovel", { length: 20 }),
  email: varchar("email", { length: 255 }).unique(),
  percentualComissao: decimal("percentual_comissao", { precision: 5, scale: 2 }).notNull().default("30.00"),
  tipoRemuneracao: mysqlEnum("tipo_remuneracao", ["percentual", "percentual_diaria"]).notNull().default("percentual"),
  valorDiaria: decimal("valor_diaria", { precision: 10, scale: 2 }).default("0.00"),
  corAgenda: varchar("cor_agenda", { length: 20 }).default("#6366F1"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type Medico = InferSelectModel<typeof medicos>;
export type InsertMedico = InferInsertModel<typeof medicos>;

// ============================================================
// AGENDAS (Horários de Trabalho dos Médicos)
// ============================================================
export const agendas = mysqlTable("agendas", {
  id: serial("id").primaryKey(),
  medicoId: bigint("medico_id", { mode: "number", unsigned: true }).references(() => medicos.id).notNull(),
  tratamentoId: bigint("tratamento_id", { mode: "number", unsigned: true }).references(() => tratamentos.id),
  diaSemana: mysqlEnum("dia_semana", ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"]).notNull(),
  horaInicio: varchar("hora_inicio", { length: 5 }).notNull(),
  horaFim: varchar("hora_fim", { length: 5 }).notNull(),
  intervaloConsulta: int("intervalo_consulta").notNull().default(30),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type Agenda = InferSelectModel<typeof agendas>;
export type InsertAgenda = InferInsertModel<typeof agendas>;

// ============================================================
// CONSULTAS (Marcações)
// ============================================================
export const consultas = mysqlTable("consultas", {
  id: serial("id").primaryKey(),
  utenteId: bigint("utente_id", { mode: "number", unsigned: true }).references(() => utentes.id).notNull(),
  medicoId: bigint("medico_id", { mode: "number", unsigned: true }).references(() => medicos.id).notNull(),
  tratamentoId: bigint("tratamento_id", { mode: "number", unsigned: true }).references((): AnyMySqlColumn => tratamentos.id),
  dataHoraInicio: datetime("data_hora_inicio").notNull(),
  dataHoraFim: datetime("data_hora_fim").notNull(),
  utenteNome: varchar("utente_nome", { length: 255 }),
  medicoNome: varchar("medico_nome", { length: 255 }),
  tipoConsulta: varchar("tipo_consulta", { length: 100 }),
  estado: mysqlEnum("estado", ["agendada", "confirmada", "realizada", "cancelada", "no-show"]).notNull().default("agendada"),
  observacoes: text("observacoes"),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type Consulta = InferSelectModel<typeof consultas>;
export type InsertConsulta = InferInsertModel<typeof consultas>;

// ============================================================
// FATURAS
// ============================================================
export const faturas = mysqlTable("faturas", {
  id: serial("id").primaryKey(),
  utenteId: bigint("utente_id", { mode: "number", unsigned: true }).references(() => utentes.id).notNull(),
  medicoId: bigint("medico_id", { mode: "number", unsigned: true }).references(() => medicos.id),
  tratamentoId: bigint("tratamento_id", { mode: "number", unsigned: true }).references(() => tratamentos.id),
  numeroFatura: varchar("numero_fatura", { length: 50 }).unique().notNull(),
  tipoDocumento: mysqlEnum("tipo_documento", ["fatura", "recibo", "nota_credito"]).notNull().default("fatura"),
  dataEmissao: datetime("data_emissao").notNull().$defaultFn(() => new Date()),
  dataVencimento: datetime("data_vencimento"),
  utenteNome: varchar("utente_nome", { length: 255 }),
  utenteNif: varchar("utente_nif", { length: 15 }),
  valorBase: decimal("valor_base", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }),
  taxaIva: decimal("taxa_iva", { precision: 5, scale: 2 }).notNull().default("23.00"),
  iva: decimal("iva", { precision: 10, scale: 2 }),
  valorIva: decimal("valor_iva", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }),
  valorTotal: decimal("valor_total", { precision: 10, scale: 2 }).notNull(),
  estado: mysqlEnum("estado", ["pendente", "paga", "anulada"]).notNull().default("pendente"),
  metodoPagamento: mysqlEnum("metodo_pagamento", ["multibanco", "numerario", "mbway", "transferencia"]),
  parcelado: boolean("parcelado").notNull().default(false),
  totalParcelas: int("total_parcelas"),
  observacoes: text("observacoes"),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type Fatura = InferSelectModel<typeof faturas>;
export type InsertFatura = InferInsertModel<typeof faturas>;

// ============================================================
// PARCELAS (Parcelamento de Faturas)
// ============================================================
export const parcelas = mysqlTable("parcelas", {
  id: serial("id").primaryKey(),
  faturaId: bigint("fatura_id", { mode: "number", unsigned: true }).references(() => faturas.id).notNull(),
  numeroParcela: int("numero_parcela").notNull(),
  totalParcelas: int("total_parcelas").notNull(),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  dataVencimento: datetime("data_vencimento").notNull(),
  dataPagamento: datetime("data_pagamento"),
  estado: mysqlEnum("estado", ["pendente", "paga", "atrasada", "anulada"]).notNull().default("pendente"),
  metodoPagamento: mysqlEnum("metodo_pagamento", ["multibanco", "numerario", "mbway", "transferencia"]),
  observacoes: text("observacoes"),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type Parcela = InferSelectModel<typeof parcelas>;
export type InsertParcela = InferInsertModel<typeof parcelas>;

// ============================================================
// RECIBOS
// ============================================================
export const recibos = mysqlTable("recibos", {
  id: serial("id").primaryKey(),
  faturaId: bigint("fatura_id", { mode: "number", unsigned: true }).references(() => faturas.id).notNull(),
  numeroRecibo: varchar("numero_recibo", { length: 50 }).unique().notNull(),
  dataEmissao: datetime("data_emissao").notNull().$defaultFn(() => new Date()),
  valorPago: decimal("valor_pago", { precision: 10, scale: 2 }).notNull(),
  metodoPagamento: mysqlEnum("metodo_pagamento", ["multibanco", "numerario", "mbway", "transferencia"]).notNull(),
  observacoes: text("observacoes"),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type Recibo = InferSelectModel<typeof recibos>;
export type InsertRecibo = InferInsertModel<typeof recibos>;

// ============================================================
// PAGAMENTOS
// ============================================================
export const pagamentos = mysqlTable("pagamentos", {
  id: serial("id").primaryKey(),
  utenteId: bigint("utente_id", { mode: "number", unsigned: true }).references(() => utentes.id).notNull(),
  utenteNome: varchar("utente_nome", { length: 255 }),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  metodo: mysqlEnum("metodo", ["multibanco", "numerario", "mbway", "transferencia"]),
  estado: mysqlEnum("estado", ["pendente", "pago", "cancelado"]).notNull().default("pago"),
  data: datetime("data").notNull().$defaultFn(() => new Date()),
  referencia: varchar("referencia", { length: 100 }),
  notas: text("notas"),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type Pagamento = InferSelectModel<typeof pagamentos>;
export type InsertPagamento = InferInsertModel<typeof pagamentos>;

// ============================================================
// STOCKS
// ============================================================
export const stocks = mysqlTable("stocks", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  quantidade: int("quantidade").notNull().default(0),
  quantidadeMinima: int("quantidade_minima").notNull().default(0),
  unidade: varchar("unidade", { length: 50 }),
  precoCusto: decimal("preco_custo", { precision: 10, scale: 2 }).notNull().default("0.00"),
  precoVenda: decimal("preco_venda", { precision: 10, scale: 2 }).notNull().default("0.00"),
  fornecedor: varchar("fornecedor", { length: 255 }),
  categoria: varchar("categoria", { length: 100 }),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type Stock = InferSelectModel<typeof stocks>;
export type InsertStock = InferInsertModel<typeof stocks>;

// ============================================================
// TRATAMENTOS (Planos de Tratamento)
// ============================================================
export const tratamentos = mysqlTable("tratamentos", {
  id: serial("id").primaryKey(),
  consultaId: bigint("consulta_id", { mode: "number", unsigned: true }).references((): AnyMySqlColumn => consultas.id),
  utenteId: bigint("utente_id", { mode: "number", unsigned: true }).references(() => utentes.id).notNull(),
  medicoId: bigint("medico_id", { mode: "number", unsigned: true }).references(() => medicos.id).notNull(),
  tratamentoId: bigint("tratamento_id", { mode: "number", unsigned: true }).references((): AnyMySqlColumn => tratamentos.id),
  dente: varchar("dente", { length: 50 }),
  descricao: text("descricao").notNull(),
  dataInicio: datetime("data_inicio").notNull().$defaultFn(() => new Date()),
  dataFimEstimada: datetime("data_fim_estimada"),
  valorBruto: decimal("valor_bruto", { precision: 10, scale: 2 }).notNull().default("0.00"),
  custosDiretos: decimal("custos_diretos", { precision: 10, scale: 2 }).notNull().default("0.00"),
  baseCalculo: decimal("base_calculo", { precision: 10, scale: 2 }).notNull().default("0.00"),
  valorComissao: decimal("valor_comissao", { precision: 10, scale: 2 }).notNull().default("0.00"),
  lucroClinica: decimal("lucro_clinica", { precision: 10, scale: 2 }).notNull().default("0.00"),
  estado: mysqlEnum("estado", ["pendente", "proposto", "em_progresso", "concluido", "cancelado", "anulado"]).notNull().default("pendente"),
  observacoes: text("observacoes"),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type Tratamento = InferSelectModel<typeof tratamentos>;
export type InsertTratamento = InferInsertModel<typeof tratamentos>;

// ============================================================
// TERMOS DE CONSENTIMENTO (Configuráveis)
// ============================================================
export const termosConsentimento = mysqlTable("termos_consentimento", {
  id: serial("id").primaryKey(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  conteudo: text("conteudo").notNull(),
  obrigatorio: boolean("obrigatorio").notNull().default(true),
  versao: int("versao").notNull().default(1),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});

export type TermoConsentimento = InferSelectModel<typeof termosConsentimento>;
export type InsertTermoConsentimento = InferInsertModel<typeof termosConsentimento>;

// ============================================================
// ANAMNESE (Questionários dos Utentes)
// ============================================================
export const anamneses = mysqlTable("anamneses", {
  id: serial("id").primaryKey(),
  utenteId: bigint("utente_id", { mode: "number", unsigned: true }).references(() => utentes.id).notNull(),
  respostas: text("respostas").notNull(),
  alergiasDetectadas: text("alergias_detectadas"),
  problemasSaude: text("problemas_saude"),
  assinaturaDigital: text("assinatura_digital"),
  termosAceites: text("termos_aceites"),
  dataAssinatura: datetime("data_assinatura").notNull().$defaultFn(() => new Date()),
  medicoResponsavelId: bigint("medico_responsavel_id", { mode: "number", unsigned: true }).references(() => medicos.id),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});

export type Anamnese = InferSelectModel<typeof anamneses>;
export type InsertAnamnese = InferInsertModel<typeof anamneses>;

// ============================================================
// IMAGIOLOGIA (Radiografias e Fotografias Clínicas)
// ============================================================
export const imagiologia = mysqlTable("imagiologia", {
  id: serial("id").primaryKey(),
  utenteId: bigint("utente_id", { mode: "number", unsigned: true }).references(() => utentes.id).notNull(),
  tipo: mysqlEnum("tipo", ["radiografia_periapical", "radiografia_panoramica", "radiografia_bitewing", "radiografia_cefalometrica", "fotografia_intraoral", "fotografia_extraoral", "tomografia_cbct", "outro"]).notNull(),
  s3Url: text("s3_url").notNull(),
  s3Key: varchar("s3_key", { length: 255 }).notNull(),
  nomeOriginal: varchar("nome_original", { length: 255 }),
  mimeType: varchar("mime_type", { length: 100 }),
  tamanhoBytes: int("tamanho_bytes"),
  descricao: text("descricao"),
  dentesRelacionados: varchar("dentes_relacionados", { length: 100 }),
  analiseIA: text("analise_ia"),
  dataExame: datetime("data_exame").notNull().$defaultFn(() => new Date()),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});

export type Imagiologia = InferSelectModel<typeof imagiologia>;
export type InsertImagiologia = InferInsertModel<typeof imagiologia>;

// ============================================================
// LIGAÇÕES (Chamadas Pendentes)
// ============================================================
export const ligacoes = mysqlTable("ligacoes", {
  id: serial("id").primaryKey(),
  utenteId: bigint("utente_id", { mode: "number", unsigned: true }).notNull(),
  tipoLigacao: mysqlEnum("tipo_ligacao", ["confirmacao", "seguimento", "cobranca", "agendamento", "urgencia"]).notNull(),
  motivo: text("motivo").notNull(),
  estado: mysqlEnum("estado", ["pendente", "em_progresso", "concluida", "nao_atendeu", "cancelada"]).notNull().default("pendente"),
  dataAgendada: datetime("data_agendada").notNull().$defaultFn(() => new Date()),
  dataConcluida: datetime("data_concluida"),
  proximaLigacao: datetime("proxima_ligacao"),
  notas: text("notas"),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type Ligacao = InferSelectModel<typeof ligacoes>;
export type InsertLigacao = InferInsertModel<typeof ligacoes>;

// ============================================================
// CAMPANHAS DE MARKETING
// ============================================================
export const campanhasMarketing = mysqlTable("campanhas_marketing", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  tipoTemplate: varchar("tipo_template", { length: 50 }).notNull(), // reminder, confirmation, reactivation, etc
  mensagem: text("mensagem").notNull(),
  estado: mysqlEnum("estado", ["rascunho", "agendada", "em_progresso", "concluida", "cancelada"]).notNull().default("rascunho"),
  dataAgendamento: datetime("data_agendamento"),
  dataConclusao: datetime("data_conclusao"),
  totalUtentes: int("total_utentes").default(0),
  totalEnviadas: int("total_enviadas").default(0),
  totalEntregues: int("total_entregues").default(0),
  totalLidas: int("total_lidas").default(0),
  totalRespostas: int("total_respostas").default(0),
  criadoPor: bigint("criado_por", { mode: "number", unsigned: true }).notNull(),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type CampanhaMarketing = InferSelectModel<typeof campanhasMarketing>;
export type InsertCampanhaMarketing = InferInsertModel<typeof campanhasMarketing>;

// ============================================================
// CONTAS DE REDES SOCIAIS
// ============================================================
export const contasSocialMedia = mysqlTable("contas_social_media", {
  id: serial("id").primaryKey(),
  plataforma: mysqlEnum("plataforma", ["facebook", "instagram", "tiktok", "linkedin", "google_business"]).notNull(),
  nomeConta: varchar("nome_conta", { length: 255 }).notNull(),
  idPlataforma: varchar("id_plataforma", { length: 255 }).unique().notNull(),
  tokenAcesso: text("token_acesso").notNull(),
  tokenRefresh: text("token_refresh"),
  dataExpiracao: datetime("data_expiracao"),
  ativa: boolean("ativa").notNull().default(true),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type ContaSocialMedia = InferSelectModel<typeof contasSocialMedia>;
export type InsertContaSocialMedia = InferInsertModel<typeof contasSocialMedia>;

// ============================================================
// POSTAGENS EM REDES SOCIAIS
// ============================================================
export const postagensSocial = mysqlTable("postagens_social", {
  id: serial("id").primaryKey(),
  contaId: bigint("conta_id", { mode: "number", unsigned: true }).references(() => contasSocialMedia.id).notNull(),
  conteudo: text("conteudo").notNull(),
  imagens: text("imagens"), // Usar text para armazenar JSON stringified para maior compatibilidade
  estado: mysqlEnum("estado", ["rascunho", "agendada", "publicada", "cancelada"]).notNull().default("rascunho"),
  dataAgendamento: datetime("data_agendamento"),
  dataPublicacao: datetime("data_publicacao"),
  idPublicacao: varchar("id_publicacao", { length: 255 }),
  engajamento: text("engajamento"), // Usar text para JSON
  criadoPor: bigint("criado_por", { mode: "number", unsigned: true }).notNull(),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type PostagemSocial = InferSelectModel<typeof postagensSocial>;
export type InsertPostagemSocial = InferInsertModel<typeof postagensSocial>;

// ============================================================
// CONFIGURAÇÕES DA CLÍNICA
// ============================================================
export const configuracoesClinica = mysqlTable("configuracoes_clinica", {
  id: serial("id").primaryKey(),
  chave: varchar("chave", { length: 100 }).unique().notNull(), // horario_abertura, horario_encerramento, etc
  valor: text("valor").notNull(),
  tipo: mysqlEnum("tipo", ["string", "number", "boolean", "json"]).notNull().default("string"),
  descricao: text("descricao"),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type ConfiguracaoClinica = InferSelectModel<typeof configuracoesClinica>;
export type InsertConfiguracaoClinica = InferInsertModel<typeof configuracoesClinica>;

// ============================================================
// SEQUÊNCIAS SAFT-PT
// ============================================================
export const saftSequences = mysqlTable("saft_sequences", {
  id: serial("id").primaryKey(),
  ano: int("ano").notNull().unique(),
  lastFaturaNumber: int("last_fatura_number").notNull().default(0),
  lastReciboNumber: int("last_recibo_number").notNull().default(0),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type SaftSequence = InferSelectModel<typeof saftSequences>;
export type InsertSaftSequence = InferInsertModel<typeof saftSequences>;

// ============================================================
// HISTÓRICO DE BRIEFINGS DE VOZ
// ============================================================
export const historicoBriefing = mysqlTable("historico_briefing", {
  id: serial("id").primaryKey(),
  usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
  secoes: text("secoes").notNull(), // Usar text para JSON
  duracao: int("duracao").notNull(), // em segundos
  conteudoTextual: text("conteudo_textual"),
  urlAudio: text("url_audio"),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
});
export type HistoricoBriefing = InferSelectModel<typeof historicoBriefing>;
export type InsertHistoricoBriefing = InferInsertModel<typeof historicoBriefing>;

// ============================================================
// CATALOGO DE TRATAMENTOS (Dinamico e Editavel)
// ============================================================
export const catalogoTratamentos = mysqlTable("catalogo_tratamentos", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  especialidade: varchar("especialidade", { length: 100 }).notNull(),
  duracao: int("duracao").notNull(),
  precoBase: decimal("preco_base", { precision: 10, scale: 2 }).notNull(),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type CatalogoTratamento = InferSelectModel<typeof catalogoTratamentos>;
export type InsertCatalogoTratamento = InferInsertModel<typeof catalogoTratamentos>;

// ============================================================
// TEMPLATES DE EVOLUCAO CLINICA (Dinamico e Editavel)
// ============================================================
export const templatesEvolucao = mysqlTable("templates_evolucao", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  template: text("template").notNull(),
  categoria: varchar("categoria", { length: 100 }).notNull(),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type TemplateEvolucao = InferSelectModel<typeof templatesEvolucao>;
export type InsertTemplateEvolucao = InferInsertModel<typeof templatesEvolucao>;

// ============================================================
// TEMPLATES DE MENSAGENS WHATSAPP (Dinamico e Editavel)
// ============================================================
export const templatesWhatsApp = mysqlTable("templates_whatsapp", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  template: text("template").notNull(),
  categoria: varchar("categoria", { length: 100 }).notNull(),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type TemplateWhatsApp = InferSelectModel<typeof templatesWhatsApp>;
export type InsertTemplateWhatsApp = InferInsertModel<typeof templatesWhatsApp>;

// ============================================================
// MOTIVOS DE CONSULTA (Dinamico e Editavel)
// ============================================================
export const motivosConsulta = mysqlTable("motivos_consulta", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  duracao: int("duracao").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type MotivoConsulta = InferSelectModel<typeof motivosConsulta>;
export type InsertMotivoConsulta = InferInsertModel<typeof motivosConsulta>;

// ============================================================
// EVOLUÇÕES CLÍNICAS
// ============================================================
export const evolucoes = mysqlTable("evolucoes", {
  id: serial("id").primaryKey(),
  tratamentoId: bigint("tratamento_id", { mode: "number", unsigned: true }).references(() => tratamentos.id).notNull(),
  descricao: text("descricao").notNull(),
  anotacoes: text("anotacoes"),
  data: datetime("data").notNull().$defaultFn(() => new Date()),
  profissional: varchar("profissional", { length: 255 }).notNull(),
  criadoPor: bigint("criado_por", { mode: "number", unsigned: true }).notNull(),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type Evolucao = InferSelectModel<typeof evolucoes>;
export type InsertEvolucao = InferInsertModel<typeof evolucoes>;

// ============================================================
// DISPOSITIVOS MÓVEIS (App Mobile)
// ============================================================
export const dispositivosMoveis = mysqlTable("dispositivos_moveis", {
  id: serial("id").primaryKey(),
  usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).references(() => users.id),
  deviceId: varchar("device_id", { length: 255 }).unique().notNull(),
  tipo: mysqlEnum("tipo", ["ios", "android", "web"]).notNull(),
  pushToken: text("push_token"),
  ultimoAcesso: datetime("ultimo_acesso").notNull().$defaultFn(() => new Date()),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});

export type DispositivoMovel = InferSelectModel<typeof dispositivosMoveis>;
export type InsertDispositivoMovel = InferInsertModel<typeof dispositivosMoveis>;

// ============================================================
// ESPECIALIDADES (FIX: Tabela integrada no schema — antes apenas em SQL avulso)
// ============================================================
export const especialidades = mysqlTable("especialidades", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  descricao: text("descricao"),
  icone: varchar("icone", { length: 50 }),
  cor: varchar("cor", { length: 20 }),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type Especialidade = InferSelectModel<typeof especialidades>;
export type InsertEspecialidade = InferInsertModel<typeof especialidades>;

// ============================================================
// EVOLUÇÕES CLÍNICAS (FIX: Tabela integrada no schema — antes apenas em SQL avulso)
// Nota: diferente de `evolucoes` — esta é ligada a tratamentos com mais detalhe
// ============================================================
export const evolucoesClinicas = mysqlTable("evolucoes_clinicas", {
  id: serial("id").primaryKey(),
  tratamentoId: bigint("tratamento_id", { mode: "number", unsigned: true })
    .references(() => tratamentos.id)
    .notNull(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  anotacoes: text("anotacoes"),
  profissional: varchar("profissional", { length: 100 }),
  procedimento: varchar("procedimento", { length: 100 }),
  data: datetime("data").notNull(),
  criadoPor: bigint("criado_por", { mode: "number", unsigned: true })
    .references(() => users.id)
    .notNull(),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type EvolucaoClinica = InferSelectModel<typeof evolucoesClinicas>;
export type InsertEvolucaoClinica = InferInsertModel<typeof evolucoesClinicas>;

// ============================================================
// PAGAMENTOS DE TRATAMENTO (FIX: Tabela integrada no schema — antes apenas em SQL avulso)
// ============================================================
export const pagamentosTratamento = mysqlTable("pagamentos_tratamento", {
  id: serial("id").primaryKey(),
  tratamentoId: bigint("tratamento_id", { mode: "number", unsigned: true })
    .references(() => tratamentos.id)
    .notNull(),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  dataPagamento: datetime("data_pagamento").notNull(),
  metodo: mysqlEnum("metodo", ["dinheiro", "cartao", "transferencia", "cheque"]).default("cartao"),
  referencia: varchar("referencia", { length: 100 }),
  notas: text("notas"),
  criadoPor: bigint("criado_por", { mode: "number", unsigned: true })
    .references(() => users.id)
    .notNull(),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type PagamentoTratamento = InferSelectModel<typeof pagamentosTratamento>;
export type InsertPagamentoTratamento = InferInsertModel<typeof pagamentosTratamento>;


// ============================================================
// LABORATÓRIOS (Cadastro de Laboratórios Externos)
// ============================================================
export const laboratorios = mysqlTable("laboratorios", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  nif: varchar("nif", { length: 15 }).unique(),
  contacto: varchar("contacto", { length: 100 }),
  email: varchar("email", { length: 255 }),
  telefone: varchar("telefone", { length: 20 }),
  morada: varchar("morada", { length: 255 }),
  cidade: varchar("cidade", { length: 100 }),
  codigoPostal: varchar("codigo_postal", { length: 20 }),
  website: varchar("website", { length: 255 }),
  especialidades: text("especialidades"), // JSON: ["protese_fixa", "protese_removivel", "ortodontia", "implantes"]
  tabelaPrecos: text("tabela_precos"), // JSON: [{ servico, preco, prazo }]
  prazoMedioEntrega: int("prazo_medio_entrega").default(7), // em dias úteis
  avaliacao: decimal("avaliacao", { precision: 3, scale: 1 }).default("5.0"), // 0-5
  observacoes: text("observacoes"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type Laboratorio = InferSelectModel<typeof laboratorios>;
export type InsertLaboratorio = InferInsertModel<typeof laboratorios>;

// ============================================================
// ENVIOS PARA LABORATÓRIO (Rastreamento Completo)
// ============================================================
export const enviosLaboratorio = mysqlTable("envios_laboratorio", {
  id: serial("id").primaryKey(),
  laboratorioId: bigint("laboratorio_id", { mode: "number", unsigned: true }).references(() => laboratorios.id).notNull(),
  utenteId: bigint("utente_id", { mode: "number", unsigned: true }).references(() => utentes.id).notNull(),
  medicoId: bigint("medico_id", { mode: "number", unsigned: true }).references(() => medicos.id),
  tratamentoId: bigint("tratamento_id", { mode: "number", unsigned: true }).references(() => tratamentos.id),
  // Detalhes do trabalho
  tipoTrabalho: varchar("tipo_trabalho", { length: 100 }).notNull(), // Ex: "Coroa Cerâmica", "Prótese Removível"
  descricao: text("descricao").notNull(),
  dente: varchar("dente", { length: 50 }), // Dente(s) relacionado(s)
  cor: varchar("cor", { length: 50 }), // Cor/escala (A1, A2, B1, etc.)
  material: varchar("material", { length: 100 }), // Zircónia, Metal-Cerâmica, etc.
  // Workflow de estados
  estado: mysqlEnum("estado", [
    "criado",           // Pedido criado, ainda não enviado
    "enviado",          // Enviado para o laboratório
    "recebido_lab",     // Laboratório confirmou receção
    "em_producao",      // Em produção no laboratório
    "pronto",           // Pronto para recolha/envio de volta
    "devolvido",        // Devolvido à clínica
    "em_prova",         // Em prova no paciente
    "ajuste",           // Necessita ajuste, reenviado
    "concluido",        // Trabalho finalizado e aceite
    "cancelado"         // Cancelado
  ]).notNull().default("criado"),
  prioridade: mysqlEnum("prioridade", ["normal", "urgente", "muito_urgente"]).notNull().default("normal"),
  // Datas de rastreamento
  dataEnvio: datetime("data_envio"),
  dataRecebidoLab: datetime("data_recebido_lab"),
  dataPrevistaDevolucao: datetime("data_prevista_devolucao"),
  dataDevolucaoReal: datetime("data_devolucao_real"),
  dataConclusao: datetime("data_conclusao"),
  // Financeiro
  valorOrcado: decimal("valor_orcado", { precision: 10, scale: 2 }),
  valorFinal: decimal("valor_final", { precision: 10, scale: 2 }),
  pago: boolean("pago").notNull().default(false),
  // Observações e histórico
  observacoes: text("observacoes"),
  historicoEstados: text("historico_estados"), // JSON: [{ estado, data, observacao, usuario }]
  // Notificação
  notificacaoAtiva: boolean("notificacao_ativa").notNull().default(true), // Mostra no dashboard até ser removida
  notificacaoLida: boolean("notificacao_lida").notNull().default(false),
  // Meta
  criadoPor: bigint("criado_por", { mode: "number", unsigned: true }).references(() => users.id).notNull(),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type EnvioLaboratorio = InferSelectModel<typeof enviosLaboratorio>;
export type InsertEnvioLaboratorio = InferInsertModel<typeof enviosLaboratorio>;

// ============================================================
// MATERIAIS DE ENVIO PARA LABORATÓRIO (Checklist de Materiais)
// ============================================================
export const materiaisEnvioLab = mysqlTable("materiais_envio_lab", {
  id: serial("id").primaryKey(),
  envioId: bigint("envio_id", { mode: "number", unsigned: true }).references(() => enviosLaboratorio.id).notNull(),
  tipoMaterial: mysqlEnum("tipo_material", [
    "moldagem_alginato", "moldagem_silicone", "moldagem_digital",
    "modelo_gesso", "modelo_articulador",
    "registo_mordida", "registo_arco_facial",
    "provisorio", "dente_provisorio", "nucleo_espigao",
    "componente_implante", "scan_intraoral",
    "fotografias", "radiografias", "guia_cirurgica",
    "goteira", "placa_base", "rolos_cera",
    "prova_metal", "prova_ceramica", "prova_acrilico", "prova_zirconia",
    "trabalho_anterior", "outro",
  ]).notNull().default("outro"),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  quantidade: int("quantidade").notNull().default(1),
  estado: mysqlEnum("estado", [
    "preparado", "enviado_lab", "recebido_lab", "em_uso",
    "devolvido_clinica", "recebido_clinica",
    "extraviado", "danificado", "descartado",
  ]).notNull().default("preparado"),
  direcao: mysqlEnum("direcao", ["clinica_para_lab", "lab_para_clinica"]).notNull().default("clinica_para_lab"),
  dataEnvio: datetime("data_envio"),
  dataRececao: datetime("data_rececao"),
  observacoes: text("observacoes"),
  verificadoPor: varchar("verificado_por", { length: 100 }),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type MaterialEnvioLab = InferSelectModel<typeof materiaisEnvioLab>;
export type InsertMaterialEnvioLab = InferInsertModel<typeof materiaisEnvioLab>;

// ============================================================
// GUIAS DE REMESSA PARA LABORATÓRIO
// ============================================================
export const guiasRemessaLab = mysqlTable("guias_remessa_lab", {
  id: serial("id").primaryKey(),
  envioId: bigint("envio_id", { mode: "number", unsigned: true }).references(() => enviosLaboratorio.id).notNull(),
  numeroGuia: varchar("numero_guia", { length: 50 }).unique().notNull(),
  tipo: mysqlEnum("tipo", ["envio", "devolucao", "reenvio"]).notNull().default("envio"),
  dataEmissao: datetime("data_emissao").notNull().$defaultFn(() => new Date()),
  dataExpedicao: datetime("data_expedicao"),
  transportadora: varchar("transportadora", { length: 100 }),
  codigoRastreamento: varchar("codigo_rastreamento", { length: 100 }),
  materiaisIds: text("materiais_ids"), // JSON: [1, 2, 3]
  observacoes: text("observacoes"),
  assinaturaEnvio: varchar("assinatura_envio", { length: 100 }),
  assinaturaRececao: varchar("assinatura_rececao", { length: 100 }),
  dataRececaoConfirmada: datetime("data_rececao_confirmada"),
  emitidoPor: bigint("emitido_por", { mode: "number", unsigned: true }).references(() => users.id),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type GuiaRemessaLab = InferSelectModel<typeof guiasRemessaLab>;
export type InsertGuiaRemessaLab = InferInsertModel<typeof guiasRemessaLab>;

// ============================================================
// TIPOS DE CONSULTA (Padronizados com duração automática)
// ============================================================
export const tiposConsulta = mysqlTable("tipos_consulta", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  descricao: varchar("descricao", { length: 255 }),
  duracaoPadrao: int("duracao_padrao").notNull().default(30), // em minutos
  cor: varchar("cor", { length: 30 }).notNull().default("indigo"), // cor CSS (indigo, emerald, red, etc.)
  icone: varchar("icone", { length: 50 }).default("Stethoscope"), // nome do ícone Lucide
  ordem: int("ordem").notNull().default(0), // para ordenar no dropdown
  ativo: boolean("ativo").notNull().default(true),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type TipoConsulta = InferSelectModel<typeof tiposConsulta>;
export type InsertTipoConsulta = InferInsertModel<typeof tiposConsulta>;

// ============================================================
// COMISSÕES DOS MÉDICOS (Registo de comissões pagas/pendentes)
// ============================================================
export const comissoesMedicos = mysqlTable("comissoes_medicos", {
  id: serial("id").primaryKey(),
  medicoId: bigint("medico_id", { mode: "number", unsigned: true }).references(() => medicos.id).notNull(),
  faturaId: bigint("fatura_id", { mode: "number", unsigned: true }).references(() => faturas.id).notNull(),
  tratamentoId: bigint("tratamento_id", { mode: "number", unsigned: true }).references(() => tratamentos.id),
  reciboId: bigint("recibo_id", { mode: "number", unsigned: true }).references(() => recibos.id),
  utenteId: bigint("utente_id", { mode: "number", unsigned: true }).references(() => utentes.id).notNull(),
  valorFatura: decimal("valor_fatura", { precision: 10, scale: 2 }).notNull(),
  percentualComissao: decimal("percentual_comissao", { precision: 5, scale: 2 }).notNull(),
  valorComissao: decimal("valor_comissao", { precision: 10, scale: 2 }).notNull(),
  estado: mysqlEnum("estado", ["pendente", "paga", "anulada"]).notNull().default("pendente"),
  dataPagamentoUtente: datetime("data_pagamento_utente").notNull(), // quando o utente pagou
  dataPagamentoMedico: datetime("data_pagamento_medico"), // quando a clínica pagou ao médico
  pagamentoComissaoId: bigint("pagamento_comissao_id", { mode: "number", unsigned: true }),
  observacoes: text("observacoes"),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type ComissaoMedico = InferSelectModel<typeof comissoesMedicos>;
export type InsertComissaoMedico = InferInsertModel<typeof comissoesMedicos>;


// ============================================================
// V34 — NOTIFICAÇÕES PERSISTENTES (Centro de Notificações)
// ============================================================
export const notificacoes = mysqlTable("notificacoes", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).references(() => users.id).notNull(),
  tipo: mysqlEnum("tipo", [
    "consulta", "pagamento", "utente", "alerta", "sistema",
    "marketing", "laboratorio", "stock", "ia"
  ]).notNull().default("sistema"),
  prioridade: mysqlEnum("prioridade", ["baixa", "media", "alta", "critica"]).notNull().default("media"),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  mensagem: text("mensagem").notNull(),
  lida: boolean("lida").notNull().default(false),
  acaoUrl: varchar("acao_url", { length: 255 }), // URL para ação rápida
  acaoLabel: varchar("acao_label", { length: 100 }), // Texto do botão de ação
  metadados: text("metadados"), // JSON com dados extra
  expiresAt: datetime("expires_at"), // Notificação expira automaticamente
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
});
export type Notificacao = InferSelectModel<typeof notificacoes>;
export type InsertNotificacao = InferInsertModel<typeof notificacoes>;

// ============================================================
// V34 — CLINIC HEALTH SNAPSHOTS (Score de Saúde Diário)
// ============================================================
export const clinicHealthSnapshots = mysqlTable("clinic_health_snapshots", {
  id: serial("id").primaryKey(),
  data: datetime("data").notNull(),
  scoreGeral: decimal("score_geral", { precision: 5, scale: 2 }).notNull(),
  scoreOcupacao: decimal("score_ocupacao", { precision: 5, scale: 2 }).notNull(),
  scoreNoShow: decimal("score_no_show", { precision: 5, scale: 2 }).notNull(),
  scoreReceita: decimal("score_receita", { precision: 5, scale: 2 }).notNull(),
  scoreRetencao: decimal("score_retencao", { precision: 5, scale: 2 }).notNull(),
  scoreSatisfacao: decimal("score_satisfacao", { precision: 5, scale: 2 }).notNull(),
  classificacao: mysqlEnum("classificacao", ["excelente", "bom", "atencao", "critico"]).notNull(),
  recomendacoes: text("recomendacoes"), // JSON: [{ area, sugestao, impacto }]
  metricas: text("metricas"), // JSON com dados brutos usados no cálculo
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
});
export type ClinicHealthSnapshot = InferSelectModel<typeof clinicHealthSnapshots>;
export type InsertClinicHealthSnapshot = InferInsertModel<typeof clinicHealthSnapshots>;

// ============================================================
// V34 — CONVERSAS IA (Histórico de Conversas do Assistente)
// ============================================================
export const conversasIA = mysqlTable("conversas_ia", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).references(() => users.id).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  mensagens: text("mensagens").notNull(), // JSON: [{ role, content, timestamp, tools? }]
  totalMensagens: int("total_mensagens").notNull().default(0),
  totalToolsUsadas: int("total_tools_usadas").notNull().default(0),
  provider: varchar("provider", { length: 50 }),
  favorita: boolean("favorita").notNull().default(false),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type ConversaIA = InferSelectModel<typeof conversasIA>;
export type InsertConversaIA = InferInsertModel<typeof conversasIA>;

// ============================================================
// LOG DE COMUNICAÇÕES (V34 — Conectores + Comunicação Integrada)
// ============================================================
export const comunicacoesLog = mysqlTable("comunicacoes_log", {
  id: serial("id").primaryKey(),
  utenteId: bigint("utente_id", { mode: "number", unsigned: true }).references(() => utentes.id).notNull(),
  consultaId: bigint("consulta_id", { mode: "number", unsigned: true }).references(() => consultas.id),
  canal: varchar("canal", { length: 50 }).notNull(), // whatsapp, sms, email, telefone
  tipo: varchar("tipo", { length: 100 }).notNull(), // lembrete, confirmacao, cancelamento, follow_up, avaliacao, aniversario, campanha, manual
  direcao: varchar("direcao", { length: 20 }).notNull().default("saida"), // saida, entrada
  mensagem: text("mensagem"),
  estado: varchar("estado", { length: 50 }).notNull().default("enviada"), // enviada, entregue, lida, respondida, erro
  respostaUtente: text("resposta_utente"),
  enviadoPor: bigint("enviado_por", { mode: "number", unsigned: true }).references(() => users.id),
  metadata: text("metadata"), // JSON com dados extras (jobId, templateId, etc.)
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
});
export type ComunicacaoLog = InferSelectModel<typeof comunicacoesLog>;
export type InsertComunicacaoLog = InferInsertModel<typeof comunicacoesLog>;

// ============================================================
// V35 — PAGAMENTOS DE COMISSÕES (Comprovativos agrupados)
// ============================================================
export const pagamentosComissoes = mysqlTable("pagamentos_comissoes", {
  id: serial("id").primaryKey(),
  medicoId: bigint("medico_id", { mode: "number", unsigned: true }).references(() => medicos.id).notNull(),
  valorTotal: decimal("valor_total", { precision: 10, scale: 2 }).notNull(),
  metodoPagamento: mysqlEnum("metodo_pagamento", ["transferencia", "numerario", "cheque", "mbway", "outro"]).notNull().default("transferencia"),
  referencia: varchar("referencia", { length: 255 }),
  dataPagamento: datetime("data_pagamento").notNull(),
  observacoes: text("observacoes"),
  comprovativoUrl: varchar("comprovativo_url", { length: 500 }),
  comprovativoNome: varchar("comprovativo_nome", { length: 255 }),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }).references(() => users.id),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});
export type PagamentoComissao = InferSelectModel<typeof pagamentosComissoes>;
export type InsertPagamentoComissao = InferInsertModel<typeof pagamentosComissoes>;
