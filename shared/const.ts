/**
 * Shared constants for DentCare
 * Used by both frontend (client) and backend (server)
 */

/** Nome do cookie de sessão */
export const COOKIE_NAME = "dentcare.sid";

/** 1 ano em milissegundos */
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** Timeout padrão para chamadas Axios (10 segundos) */
export const AXIOS_TIMEOUT_MS = 10_000;

/** Mensagem de erro para utilizadores não autenticados */
export const UNAUTHED_ERR_MSG = "Não autenticado. Por favor, inicie sessão.";

/** Mensagem de erro para utilizadores sem permissão de administrador */
export const NOT_ADMIN_ERR_MSG = "Sem permissão. Acesso restrito a administradores.";
