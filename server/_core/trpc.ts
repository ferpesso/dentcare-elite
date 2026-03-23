import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { sanitizeObject } from "./security";
import { ZodError } from "zod";

/**
 * Mapeamento de nomes de campos para labels amigáveis em PT
 */
const CAMPO_LABELS: Record<string, string> = {
  nome: "Nome", telemovel: "Telemóvel", email: "Email", nif: "NIF",
  dataNascimento: "Data de nascimento", genero: "Género", morada: "Morada",
  cidade: "Cidade", codigoPostal: "Código postal", pais: "País",
  observacoes: "Observações", ativo: "Estado", medicoId: "Médico",
  utenteId: "Utente", tipoConsulta: "Tipo de consulta", tipoConsultaId: "Tipo de consulta",
  dataHoraInicio: "Data/hora de início", dataHoraFim: "Data/hora de fim",
  duracao: "Duração", duracaoPadrao: "Duração padrão", consultaId: "Consulta",
  estado: "Estado", hora: "Hora", descricao: "Descrição", valorBruto: "Valor bruto",
  valorBase: "Valor base", valorPago: "Valor pago", custosDiretos: "Custos diretos",
  faturaId: "Fatura", totalParcelas: "Total de parcelas", intervaloDias: "Intervalo de dias",
  meses: "Meses", limite: "Limite", mes: "Mês", ano: "Ano",
  cedulaProfissional: "Cédula profissional", especialidade: "Especialidade",
  percentualComissao: "Comissão (%)", tipoRemuneracao: "Tipo de remuneração",
  valorDiaria: "Valor diária", username: "Nome de utilizador", password: "Palavra-passe",
  role: "Cargo", quantidade: "Quantidade", quantidadeMinima: "Quantidade mínima",
  unidade: "Unidade", categoria: "Categoria", delta: "Quantidade", motivo: "Motivo",
  telefone: "Telefone", mensagem: "Mensagem", tipo: "Tipo",
  utenteName: "Nome do utente", utenteTelefone: "Telefone do utente",
  assunto: "Assunto", conteudo: "Conteúdo", destinatarios: "Destinatários",
  chave: "Chave", valor: "Valor", id: "ID", cor: "Cor", ordem: "Ordem",
  token: "Código", deviceId: "Dispositivo", search: "Pesquisa",
};

/**
 * Traduz um erro Zod individual para uma mensagem amigável em PT
 */
function traduzirErroZod(issue: any): string {
  const campo = issue.path?.length > 0
    ? issue.path.map((p: string | number) => CAMPO_LABELS[String(p)] || String(p)).join(" > ")
    : null;

  let mensagem: string;

  // FIX v35.5: Compatibilidade com Zod v4
  // Zod v4 usa `origin` em vez de `type`, `invalid_format` em vez de `invalid_string`,
  // `invalid_value` em vez de `invalid_enum_value`
  const origin = issue.origin || issue.type; // suporte a v3 e v4

  switch (issue.code) {
    case "too_small":
      if (origin === "string") {
        mensagem = issue.minimum === 1 ? "Este campo é obrigatório" : `Deve ter pelo menos ${issue.minimum} caracteres`;
      } else if (origin === "number") {
        if (issue.inclusive && issue.minimum === 0) mensagem = "O valor não pode ser negativo";
        else if (issue.minimum === 0) mensagem = "O valor deve ser maior que zero";
        else if (issue.minimum === 1) mensagem = "O valor deve ser pelo menos 1";
        else mensagem = `O valor mínimo é ${issue.minimum}`;
      } else if (origin === "array") {
        mensagem = `Deve ter pelo menos ${issue.minimum} item(s)`;
      } else {
        mensagem = issue.message || "Valor demasiado pequeno";
      }
      break;
    case "too_big":
      if (origin === "string") mensagem = `Deve ter no máximo ${issue.maximum} caracteres`;
      else if (origin === "number") mensagem = `O valor máximo é ${issue.maximum}`;
      else mensagem = issue.message || "Valor demasiado grande";
      break;
    case "invalid_type":
      if (issue.expected === "number") mensagem = "Deve ser um número válido";
      else if (issue.expected === "string") mensagem = "Deve ser um texto válido";
      else mensagem = issue.message || "Tipo de dados inválido";
      break;
    // Zod v3: invalid_string | Zod v4: invalid_format
    case "invalid_string":
    case "invalid_format":
      if (issue.validation === "email" || issue.format === "email") mensagem = "Email inválido";
      else if (issue.validation === "url" || issue.format === "url") mensagem = "URL inválido";
      else mensagem = issue.message || "Formato inválido";
      break;
    // Zod v3: invalid_enum_value | Zod v4: invalid_value
    case "invalid_enum_value":
    case "invalid_value":
      mensagem = "Selecione uma opção válida";
      break;
    case "invalid_date":
      mensagem = "Data inválida";
      break;
    default:
      mensagem = issue.message || "Valor inválido";
  }

  return campo ? `${campo}: ${mensagem}` : mensagem;
}

/**
 * Converte um ZodError completo numa mensagem amigável
 */
function formatarZodError(zodError: ZodError): string {
  const mensagens = zodError.issues.map(traduzirErroZod);
  return mensagens.join(". ");
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      message: error.cause instanceof ZodError
        ? formatarZodError(error.cause)
        : shape.message,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError
          ? error.cause.flatten()
          : null,
      },
    };
  },
});

export const router = t.router;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

const xssShield = t.middleware(async ({ ctx, next, input, path, type }) => {
  const sanitizedInput = (type !== 'subscription') ? sanitizeObject(input) : input;

  return next({ ctx, input: sanitizedInput });
});

export const publicProcedure = t.procedure.use(xssShield);
export const protectedProcedure = publicProcedure.use(requireUser);

export const adminProcedure = protectedProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || (ctx.user.role !== 'admin' && ctx.user.role !== 'master')) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
