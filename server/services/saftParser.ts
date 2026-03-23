/**
 * Parser de SAFT-PT — Extração de Dados de Ficheiros SAFT-PT
 * DentCare Elite V32.8 — Módulo de Migração de Dados
 * 
 * Suporta a leitura de ficheiros SAFT-PT (XML) gerados por sistemas legados
 * (NewSoft, Tugsis, OrisDent, Oris4D, Dentrix, Primavera, PHC, Sage, etc.)
 * e extração de utentes, faturas e documentos fiscais com validação.
 *
 * CORRECÇÃO V32.8: Removido explicitArray: false para compatibilidade
 * com xml2js — todos os campos são acedidos como arrays.
 */

import { parseStringPromise } from 'xml2js';

// ─── Tipos ────────────────────────────────────────────────────────────────
export interface SaftUtente {
  id: string;
  nome: string;
  nif: string;
  email?: string;
  telemovel?: string;
  morada?: string;
  cidade?: string;
  codigoPostal?: string;
  pais?: string;
  dataRegistro: Date;
}

export interface SaftFatura {
  numero: string;
  serie: string;
  dataEmissao: Date;
  valorTotal: number;
  valorIva: number;
  estado: 'paga' | 'pendente' | 'anulada';
  utenteNif: string;
  descricao?: string;
  linhas: Array<{
    descricao: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
  }>;
}

export interface SaftData {
  utentes: SaftUtente[];
  faturas: SaftFatura[];
  validacoes: {
    erros: string[];
    avisos: string[];
  };
}

// ─── Helpers para acesso seguro a XML ─────────────────────────────────────
/**
 * Obter texto de um nó XML (pode ser string, array ou objecto com _)
 */
function getText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return getText(node[0]);
  if (typeof node === 'object' && node._) return String(node._);
  if (typeof node === 'object' && node['$']) return '';
  return String(node);
}

/**
 * Obter nó filho de forma segura (suporta arrays e objectos)
 */
function getChild(parent: any, ...keys: string[]): any {
  let current = parent;
  for (const key of keys) {
    if (!current) return undefined;
    const val = current[key];
    if (Array.isArray(val)) {
      current = val[0];
    } else {
      current = val;
    }
  }
  return current;
}

/**
 * Garantir que um valor é um array
 */
function ensureArray(val: any): any[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

// ─── Parser de SAFT-PT ─────────────────────────────────────────────────────
export class SaftParser {
  /**
   * Fazer parse de ficheiro SAFT-PT (XML)
   * Suporta ambos os modos de xml2js (com e sem explicitArray)
   */
  static async parse(conteudoXml: string): Promise<SaftData> {
    const erros: string[] = [];
    const avisos: string[] = [];
    const utentes: SaftUtente[] = [];
    const faturas: SaftFatura[] = [];

    try {
      // Parse XML — usar defaults do xml2js (explicitArray: true)
      // para garantir consistência no acesso aos campos
      const resultado = await parseStringPromise(conteudoXml, {
        explicitArray: true,
        mergeAttrs: false,
        trim: true,
        normalizeTags: false,
      });

      // Encontrar o nó raiz AuditFile (pode ter namespace)
      let saft = resultado.AuditFile;
      if (!saft) {
        // Tentar com namespace
        const rootKey = Object.keys(resultado).find(k => 
          k === 'AuditFile' || k.endsWith(':AuditFile') || k.includes('AuditFile')
        );
        if (rootKey) {
          saft = resultado[rootKey];
        }
      }

      // Se saft é array, pegar o primeiro
      if (Array.isArray(saft)) saft = saft[0];

      if (!saft) {
        throw new Error('Ficheiro SAFT-PT inválido: elemento AuditFile não encontrado');
      }

      // ─── Extrair Utentes (Clientes) ───
      const masterFiles = getChild(saft, 'MasterFiles');
      if (masterFiles) {
        const clientes = ensureArray(masterFiles.Customer);

        for (const cliente of clientes) {
          try {
            const billingAddr = getChild(cliente, 'BillingAddress');
            const shipAddr = getChild(cliente, 'ShipToAddress');
            const addr = billingAddr || shipAddr;

            const utente: SaftUtente = {
              id: getText(cliente.CustomerID) || '',
              nome: getText(cliente.CompanyName) || getText(cliente.Name) || getText(cliente.ContactName) || '',
              nif: getText(cliente.CustomerTaxID) || '',
              email: getText(cliente.Email) || getText(cliente.Contacts?.Email) || undefined,
              telemovel: getText(cliente.Telephone) || getText(cliente.Fax) || getText(cliente.Contacts?.Telephone) || undefined,
              morada: addr ? (getText(addr.AddressDetail) || getText(addr.StreetName) || getText(addr.BuildingNumber)) : undefined,
              cidade: addr ? (getText(addr.City) || getText(addr.Region)) : undefined,
              codigoPostal: addr ? getText(addr.PostalCode) : undefined,
              pais: addr ? (getText(addr.Country) || 'PT') : 'PT',
              dataRegistro: new Date(),
            };

            // Validar campos obrigatórios
            if (!utente.nome.trim()) {
              avisos.push(`Utente ${utente.id} sem nome — será ignorado`);
              continue;
            }
            if (!utente.nif.trim()) {
              avisos.push(`Utente ${utente.nome} sem NIF — será importado sem NIF`);
            }

            // Limpar NIF "consumidor final" genérico
            if (utente.nif === '999999990' || utente.nif === '000000000') {
              utente.nif = '';
              avisos.push(`Utente ${utente.nome} com NIF genérico — NIF removido`);
            }

            utentes.push(utente);
          } catch (e) {
            erros.push(`Erro ao processar cliente ${getText(cliente?.CustomerID)}: ${(e as Error).message}`);
          }
        }
      }

      // ─── Extrair Faturas ───
      const sourceDocuments = getChild(saft, 'SourceDocuments');
      if (sourceDocuments) {
        const salesInvoices = getChild(sourceDocuments, 'SalesInvoices');
        if (salesInvoices) {
          const invoiceList = ensureArray(salesInvoices.Invoice);

          for (const invoice of invoiceList) {
            try {
              const linhasRaw = ensureArray(invoice.Line);

              const linhas = linhasRaw.map((linha: any) => ({
                descricao: getText(linha.Description) || getText(linha.ProductDescription) || '',
                quantidade: parseFloat(getText(linha.Quantity)) || 1,
                valorUnitario: parseFloat(getText(linha.UnitPrice)) || 0,
                valorTotal: parseFloat(getText(linha.CreditAmount) || getText(linha.DebitAmount) || getText(linha.LineExtensionAmount)) || 0,
              }));

              const docTotals = getChild(invoice, 'DocumentTotals');
              const docStatus = getChild(invoice, 'DocumentStatus');

              const fatura: SaftFatura = {
                numero: getText(invoice.InvoiceNo) || '',
                serie: getText(invoice.SeriesNumber) || getText(invoice.InvoiceType) || '',
                dataEmissao: new Date(getText(invoice.InvoiceDate) || new Date().toISOString()),
                valorTotal: parseFloat(getText(docTotals?.GrossTotal)) || 0,
                valorIva: parseFloat(getText(docTotals?.TaxPayable)) || 0,
                estado: this.mapearEstado(getText(docStatus?.InvoiceStatus) || getText(docStatus)),
                utenteNif: getText(invoice.CustomerID) || '',
                descricao: getText(invoice.Description) || linhas.map((l: any) => l.descricao).filter(Boolean).join('; '),
                linhas,
              };

              // Validar
              if (!fatura.numero.trim()) {
                avisos.push(`Fatura sem número — será ignorada`);
                continue;
              }

              faturas.push(fatura);
            } catch (e) {
              erros.push(`Erro ao processar fatura ${getText(invoice?.InvoiceNo)}: ${(e as Error).message}`);
            }
          }
        }

        // Também tentar MovementOfGoods e WorkingDocuments
        const workDocs = getChild(sourceDocuments, 'WorkingDocuments');
        if (workDocs) {
          const workDocList = ensureArray(workDocs.WorkDocument);
          for (const doc of workDocList) {
            try {
              const linhasRaw = ensureArray(doc.Line);
              const linhas = linhasRaw.map((linha: any) => ({
                descricao: getText(linha.Description) || '',
                quantidade: parseFloat(getText(linha.Quantity)) || 1,
                valorUnitario: parseFloat(getText(linha.UnitPrice)) || 0,
                valorTotal: parseFloat(getText(linha.CreditAmount) || getText(linha.DebitAmount)) || 0,
              }));

              const docTotals = getChild(doc, 'DocumentTotals');
              const docStatus = getChild(doc, 'DocumentStatus');

              faturas.push({
                numero: getText(doc.DocumentNumber) || '',
                serie: getText(doc.DocumentType) || 'WD',
                dataEmissao: new Date(getText(doc.WorkDate) || new Date().toISOString()),
                valorTotal: parseFloat(getText(docTotals?.GrossTotal)) || 0,
                valorIva: parseFloat(getText(docTotals?.TaxPayable)) || 0,
                estado: this.mapearEstado(getText(docStatus?.WorkStatus) || getText(docStatus)),
                utenteNif: getText(doc.CustomerID) || '',
                descricao: linhas.map((l: any) => l.descricao).filter(Boolean).join('; '),
                linhas,
              });
            } catch (e) {
              avisos.push(`Aviso ao processar documento de trabalho: ${(e as Error).message}`);
            }
          }
        }
      }

      // ─── Validações Finais ───
      if (utentes.length === 0 && faturas.length === 0) {
        erros.push('Nenhum dado foi extraído do ficheiro SAFT-PT. Verifique se o ficheiro está correcto.');
      }
      if (utentes.length === 0) {
        avisos.push('Nenhum utente foi importado do ficheiro');
      }
      if (faturas.length === 0) {
        avisos.push('Nenhuma fatura foi importada do ficheiro');
      }

      // Validar numeração sequencial de faturas
      const faturasOrdenadas = faturas.sort(
        (a, b) => new Date(a.dataEmissao).getTime() - new Date(b.dataEmissao).getTime()
      );
      for (let i = 1; i < faturasOrdenadas.length; i++) {
        const anterior = faturasOrdenadas[i - 1];
        const atual = faturasOrdenadas[i];
        if (anterior.serie === atual.serie) {
          const numAnterior = parseInt(anterior.numero.replace(/\D/g, ''), 10);
          const numAtual = parseInt(atual.numero.replace(/\D/g, ''), 10);
          if (!isNaN(numAnterior) && !isNaN(numAtual) && numAtual < numAnterior) {
            avisos.push(
              `Numeração não sequencial: Fatura ${anterior.numero} seguida de ${atual.numero}`
            );
          }
        }
      }

      return {
        utentes,
        faturas,
        validacoes: { erros, avisos },
      };
    } catch (e) {
      throw new Error(`Erro ao fazer parse do SAFT-PT: ${(e as Error).message}`);
    }
  }

  /**
   * Mapear estado SAFT para estado DentCare
   */
  private static mapearEstado(
    estadoSaft?: string
  ): 'paga' | 'pendente' | 'anulada' {
    if (!estadoSaft) return 'pendente';
    const estado = estadoSaft.toLowerCase().trim();
    if (estado === 'a' || estado.includes('anulad') || estado.includes('cancel')) return 'anulada';
    if (estado === 'f' || estado.includes('pag') || estado.includes('paid') || estado.includes('settled')) return 'paga';
    if (estado === 'n' || estado.includes('normal') || estado.includes('pendent')) return 'pendente';
    return 'pendente';
  }

  /**
   * Parse de data SAFT (YYYY-MM-DD)
   */
  private static parseData(dataStr?: string): Date | null {
    if (!dataStr) return null;
    try {
      const data = new Date(dataStr);
      return isNaN(data.getTime()) ? null : data;
    } catch {
      return null;
    }
  }
}

// ─── Validador de SAFT ─────────────────────────────────────────────────────
export class ValidadorSaft {
  /**
   * Validar integridade dos dados extraídos
   */
  static validar(dados: SaftData): {
    valido: boolean;
    erros: string[];
    avisos: string[];
  } {
    const erros: string[] = [];
    const avisos: string[] = [];

    // Validar utentes
    for (const utente of dados.utentes) {
      if (!utente.nome || utente.nome.trim().length === 0) {
        erros.push(`Utente ${utente.id} sem nome`);
      }
      if (utente.nif && utente.nif.length !== 9 && utente.nif.length > 0) {
        avisos.push(`Utente ${utente.nome} com NIF possivelmente inválido: ${utente.nif}`);
      }
    }

    // Validar faturas
    const nifsDeclados = new Set(dados.utentes.map(u => u.nif).filter(Boolean));
    const nifToId = new Map(dados.utentes.map(u => [u.nif, u.id]));
    const idsDeclados = new Set(dados.utentes.map(u => u.id).filter(Boolean));

    for (const fatura of dados.faturas) {
      if (!fatura.numero || fatura.numero.trim().length === 0) {
        erros.push(`Fatura sem número`);
      }
      // O utenteNif no SAFT pode ser o CustomerID, não necessariamente o NIF
      if (fatura.utenteNif && !nifsDeclados.has(fatura.utenteNif) && !idsDeclados.has(fatura.utenteNif)) {
        avisos.push(`Fatura ${fatura.numero} referencia utente desconhecido: ${fatura.utenteNif}`);
      }
      if (fatura.valorTotal < 0) {
        // Notas de crédito podem ter valor negativo — avisar apenas
        avisos.push(`Fatura ${fatura.numero} com valor negativo: ${fatura.valorTotal} (possível nota de crédito)`);
      }
      if (fatura.dataEmissao > new Date()) {
        avisos.push(`Fatura ${fatura.numero} com data futura: ${fatura.dataEmissao.toISOString()}`);
      }
    }

    // Combinar com erros do parser
    erros.push(...dados.validacoes.erros);
    avisos.push(...dados.validacoes.avisos);

    return {
      valido: erros.length === 0,
      erros,
      avisos,
    };
  }
}
