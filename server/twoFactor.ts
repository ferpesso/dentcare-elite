/**
 * 2FA (Two-Factor Authentication) usando TOTP
 * Implementa autenticacao de dois fatores com Google Authenticator/Authy
 */

import { randomBytes } from "crypto";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

/**
 * Gera um novo segredo TOTP para um utilizador
 * @returns Objeto com segredo e QR code URL
 */
export async function generateTwoFactorSecret(email: string, nomeClinica?: string) {
  const appName = nomeClinica || "DentCare Elite";
  const secret = speakeasy.generateSecret({
    name: `${appName} (${email})`,
    issuer: appName,
    length: 32,
  });

  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || "");

  return {
    secret: secret.base32,
    qrCodeUrl,
    otpauth_url: secret.otpauth_url,
  };
}

/**
 * Verifica se um codigo TOTP e valido
 * @param secret - Segredo TOTP do utilizador (base32)
 * @param token - Codigo de 6 digitos fornecido pelo utilizador
 * @returns true se o codigo e valido
 */
export function verifyTwoFactorToken(secret: string, token: string): boolean {
  try {
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: "base32",
      token: token,
      window: 2, // Permite 2 periodos de desvio (±30 segundos)
    });

    return verified === true;
  } catch (error) {
    return false;
  }
}

/**
 * Gera um codigo de backup para recuperacao de 2FA
 * @returns Array de 10 codigos de backup
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = randomBytes(4).toString("hex").toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

/**
 * Valida um codigo de backup
 * @param backupCode - Codigo de backup fornecido
 * @param storedCodes - Codigos de backup armazenados
 * @returns true se o codigo e valido
 */
export function validateBackupCode(
  backupCode: string,
  storedCodes: string[]
): boolean {
  return storedCodes.includes(backupCode);
}
