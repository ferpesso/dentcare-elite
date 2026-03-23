/**
 * Utilitários de String — Funções auxiliares para processamento de texto
 * DentCare Elite V31 — Módulo de Migração de Dados
 */

/**
 * Calcular distância de Levenshtein entre duas strings
 * Útil para detecção de nomes similares
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const matriz = Array(s2.length + 1)
    .fill(null)
    .map(() => Array(s1.length + 1).fill(0));

  for (let i = 0; i <= s1.length; i++) matriz[0][i] = i;
  for (let j = 0; j <= s2.length; j++) matriz[j][0] = j;

  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const custo = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matriz[j][i] = Math.min(
        matriz[j][i - 1] + 1,
        matriz[j - 1][i] + 1,
        matriz[j - 1][i - 1] + custo
      );
    }
  }

  return matriz[s2.length][s1.length];
}

/**
 * Normalizar string para comparação
 * Remove acentos, espaços extras e converte para minúsculas
 */
export function normalizarString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // Remover acentos
    .replace(/\s+/g, " ") // Normalizar espaços
    .trim();
}

/**
 * Validar NIF português
 * Formato: 9 dígitos
 */
export function validarNif(nif: string): boolean {
  const nifLimpo = nif.replace(/\s/g, "").trim();
  if (!/^\d{9}$/.test(nifLimpo)) return false;

  // Validação de checksum (opcional, mas recomendado)
  const digitos = nifLimpo.split("").map(Number);
  const soma = digitos.slice(0, 8).reduce((acc, d, i) => acc + d * (9 - i), 0);
  const resto = soma % 11;
  const digito = resto < 2 ? 0 : 11 - resto;

  return digitos[8] === digito;
}

/**
 * Validar email
 */
export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Validar telemóvel português
 * Formatos: 9XXXXXXXX, +351 9XXXXXXXX, 00351 9XXXXXXXX
 */
export function validarTelemovel(telemovel: string): boolean {
  const telLimpo = telemovel.replace(/\s/g, "").trim();
  const regex = /^(\+351|00351|9)\d{8,9}$/;
  return regex.test(telLimpo);
}

/**
 * Normalizar telemóvel para formato padrão (9XXXXXXXX)
 */
export function normalizarTelemovel(telemovel: string): string {
  let tel = telemovel.replace(/\s/g, "").trim();
  if (tel.startsWith("+351")) tel = "9" + tel.slice(4);
  if (tel.startsWith("00351")) tel = "9" + tel.slice(5);
  if (tel.startsWith("351")) tel = "9" + tel.slice(3);
  return tel;
}

/**
 * Extrair números de uma string
 */
export function extrairNumeros(str: string): string {
  return str.replace(/\D/g, "");
}

/**
 * Capitalizar primeira letra de cada palavra
 */
export function capitalizarPalavras(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
    .join(" ");
}

/**
 * Truncar string com elipsis
 */
export function truncar(str: string, comprimento: number): string {
  if (str.length <= comprimento) return str;
  return str.substring(0, comprimento - 3) + "...";
}
