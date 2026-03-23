/**
 * Motor de De-duplicação — Detecção e Resolução de Duplicatas
 * DentCare Elite V31 — Módulo de Migração de Dados
 *
 * Detecta utentes duplicados usando matching exato e fuzzy,
 * e permite merge inteligente com preservação de histórico.
 */

import { levenshteinDistance } from './stringUtils';

// ─── Tipos ────────────────────────────────────────────────────────────────
export interface UtenteParaDeduplicar {
  id: string;
  nome: string;
  nif?: string;
  email?: string;
  telemovel?: string;
}

export interface GrupoDuplicatas {
  grupo: number;
  utentes: UtenteParaDeduplicar[];
  acaoSugerida: 'merge' | 'manter_separados' | 'manual';
  confianca: number; // 0-100
  motivo: string;
}

export interface DeduplicationResult {
  utentesUnicos: number;
  duplicatasDetectadas: GrupoDuplicatas[];
  relatorio: string;
}

// ─── Motor de De-duplicação ───────────────────────────────────────────────
export class DeduplicationEngine {
  private static readonly LIMIAR_CONFIANCA_EXATA = 100;
  private static readonly LIMIAR_CONFIANCA_FUZZY = 85;
  private static readonly LIMIAR_DISTANCIA_NOME = 2; // Levenshtein

  /**
   * Detectar duplicatas em lista de utentes
   */
  static detectarDuplicatas(utentes: UtenteParaDeduplicar[]): DeduplicationResult {
    const grupos: GrupoDuplicatas[] = [];
    const processados = new Set<string>();
    let numeroGrupo = 0;

    // Agrupar por NIF (matching exato)
    const porNif = new Map<string, UtenteParaDeduplicar[]>();
    for (const utente of utentes) {
      if (utente.nif) {
        const nif = utente.nif.trim();
        if (!porNif.has(nif)) {
          porNif.set(nif, []);
        }
        porNif.get(nif)!.push(utente);
      }
    }

    // Processar grupos por NIF
    for (const [nif, grupo] of porNif) {
      if (grupo.length > 1) {
        grupo.forEach(u => processados.add(u.id));
        grupos.push({
          grupo: numeroGrupo++,
          utentes: grupo,
          acaoSugerida: 'merge',
          confianca: this.LIMIAR_CONFIANCA_EXATA,
          motivo: `NIF idêntico: ${nif}`,
        });
      }
    }

    // Agrupar por Email (matching exato)
    const porEmail = new Map<string, UtenteParaDeduplicar[]>();
    for (const utente of utentes) {
      if (utente.email && !processados.has(utente.id)) {
        const email = utente.email.toLowerCase().trim();
        if (!porEmail.has(email)) {
          porEmail.set(email, []);
        }
        porEmail.get(email)!.push(utente);
      }
    }

    for (const [email, grupo] of porEmail) {
      if (grupo.length > 1) {
        grupo.forEach(u => processados.add(u.id));
        grupos.push({
          grupo: numeroGrupo++,
          utentes: grupo,
          acaoSugerida: 'merge',
          confianca: 95,
          motivo: `Email idêntico: ${email}`,
        });
      }
    }

    // Agrupar por Telemóvel (matching exato)
    const porTelemovel = new Map<string, UtenteParaDeduplicar[]>();
    for (const utente of utentes) {
      if (utente.telemovel && !processados.has(utente.id)) {
        const tel = utente.telemovel.replace(/\s/g, '').trim();
        if (!porTelemovel.has(tel)) {
          porTelemovel.set(tel, []);
        }
        porTelemovel.get(tel)!.push(utente);
      }
    }

    for (const [tel, grupo] of porTelemovel) {
      if (grupo.length > 1) {
        grupo.forEach(u => processados.add(u.id));
        grupos.push({
          grupo: numeroGrupo++,
          utentes: grupo,
          acaoSugerida: 'merge',
          confianca: 90,
          motivo: `Telemóvel idêntico: ${tel}`,
        });
      }
    }

    // Matching fuzzy por nome (para nomes muito similares)
    const utentesNaoProcessados = utentes.filter(u => !processados.has(u.id));
    for (let i = 0; i < utentesNaoProcessados.length; i++) {
      for (let j = i + 1; j < utentesNaoProcessados.length; j++) {
        const u1 = utentesNaoProcessados[i];
        const u2 = utentesNaoProcessados[j];

        const distancia = levenshteinDistance(u1.nome.toLowerCase(), u2.nome.toLowerCase());
        const similaridade = 100 - (distancia / Math.max(u1.nome.length, u2.nome.length)) * 100;

        if (similaridade >= this.LIMIAR_CONFIANCA_FUZZY) {
          // Verificar se têm email ou telemóvel em comum
          const emailComum = u1.email && u2.email && u1.email.toLowerCase() === u2.email.toLowerCase();
          const telComum = u1.telemovel && u2.telemovel && u1.telemovel.replace(/\s/g, '') === u2.telemovel.replace(/\s/g, '');

          if (emailComum || telComum) {
            processados.add(u1.id);
            processados.add(u2.id);
            grupos.push({
              grupo: numeroGrupo++,
              utentes: [u1, u2],
              acaoSugerida: 'merge',
              confianca: Math.round(similaridade),
              motivo: `Nomes similares (${Math.round(similaridade)}% confiança) e ${emailComum ? 'email' : 'telemóvel'} em comum`,
            });
          }
        }
      }
    }

    // Gerar relatório
    const relatorio = this.gerarRelatorio(grupos, utentes.length);

    return {
      utentesUnicos: utentes.length - grupos.reduce((sum, g) => sum + g.utentes.length - 1, 0),
      duplicatasDetectadas: grupos,
      relatorio,
    };
  }

  /**
   * Fazer merge de utentes
   */
  static merge(utentes: UtenteParaDeduplicar[]): UtenteParaDeduplicar {
    if (utentes.length === 0) throw new Error('Lista de utentes vazia');
    if (utentes.length === 1) return utentes[0];

    // Usar o utente com mais informações como base
    let base = utentes[0];
    let maiorScore = this.calcularScore(base);

    for (const utente of utentes.slice(1)) {
      const score = this.calcularScore(utente);
      if (score > maiorScore) {
        base = utente;
        maiorScore = score;
      }
    }

    // Preencher campos vazios com dados dos outros utentes
    const merged: UtenteParaDeduplicar = { ...base };

    for (const utente of utentes) {
      if (!merged.nif && utente.nif) merged.nif = utente.nif;
      if (!merged.email && utente.email) merged.email = utente.email;
      if (!merged.telemovel && utente.telemovel) merged.telemovel = utente.telemovel;
    }

    return merged;
  }

  /**
   * Calcular score de completude de um utente
   */
  private static calcularScore(utente: UtenteParaDeduplicar): number {
    let score = 0;
    if (utente.nome) score += 20;
    if (utente.nif) score += 30;
    if (utente.email) score += 25;
    if (utente.telemovel) score += 25;
    return score;
  }

  /**
   * Gerar relatório de de-duplicação
   */
  private static gerarRelatorio(grupos: GrupoDuplicatas[], totalUtentes: number): string {
    const duplicatasEncontradas = grupos.length;
    const utentesAfetados = grupos.reduce((sum, g) => sum + g.utentes.length - 1, 0);
    const utentesUnicos = totalUtentes - (utentesAfetados - duplicatasEncontradas);

    let relatorio = `# Relatório de De-duplicação\n\n`;
    relatorio += `**Total de Utentes:** ${totalUtentes}\n`;
    relatorio += `**Duplicatas Detectadas:** ${duplicatasEncontradas}\n`;
    relatorio += `**Utentes Afetados:** ${utentesAfetados}\n`;
    relatorio += `**Utentes Únicos Após Merge:** ${utentesUnicos}\n\n`;

    if (grupos.length > 0) {
      relatorio += `## Grupos de Duplicatas\n\n`;
      for (const grupo of grupos) {
        relatorio += `### Grupo ${grupo.grupo + 1} (Confiança: ${grupo.confianca}%)\n`;
        relatorio += `**Motivo:** ${grupo.motivo}\n`;
        relatorio += `**Ação Sugerida:** ${grupo.acaoSugerida}\n\n`;
        relatorio += `| ID | Nome | NIF | Email | Telemóvel |\n`;
        relatorio += `|----|------|-----|-------|-----------|\n`;
        for (const utente of grupo.utentes) {
          relatorio += `| ${utente.id} | ${utente.nome} | ${utente.nif || '-'} | ${utente.email || '-'} | ${utente.telemovel || '-'} |\n`;
        }
        relatorio += `\n`;
      }
    } else {
      relatorio += `Nenhuma duplicata detectada.\n`;
    }

    return relatorio;
  }
}
