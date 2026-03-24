/**
 * Importador de Backup Imaginasoft (NewSoft DS) — DentCare Elite
 *
 * Processa backups completos do sistema Imaginasoft/NewSoft DS em formato ZIP.
 * Extrai informações de utentes, documentos e imagens de Raio-X.
 *
 * Estrutura do backup Imaginasoft:
 *   NSSERVER/
 *     ├── Foto/           → Fotos de perfil dos utentes (foto{ID}.jpg) — IGNORADAS
 *     ├── Captura/{ID}/   → Documentos e RX por utente
 *     │   └── Docs/       → Orçamentos (.rtf), imagens (.jpeg/.png), RX
 *     ├── usrcfg.DBF      → Configuração do posto (sistema RX, caminhos)
 *     ├── PACIENTE.DBF    → Dados reais dos utentes (nome, NIF, morada, etc.)
 *     ├── DOENTES.DBF     → Alternativa à tabela de pacientes
 *     └── Servicos/       → Serviços cloud com ConnectionString.config
 *
 * NOTA: Fotos de perfil (pasta Foto/) são SEMPRE ignoradas.
 *       Apenas imagens na pasta Captura/ são importadas como Raio-X / documentos clínicos.
 *
 * CORREÇÕES V36:
 *   - Imagens guardadas em disco (pasta local) em vez de Base64 na BD
 *   - Leitura de ficheiros .DBF para extrair dados reais dos utentes
 *   - Data do exame extraída do timestamp do ficheiro no ZIP
 *   - Deduplicação por idOriginal (número de processo) nas observações
 *   - Validação de tamanho de imagem antes da importação
 *   - Processamento em lote para reduzir consumo de memória
 */

import AdmZip from "adm-zip";
import * as path from "path";
import * as fs from "fs";

// ─── Tipos Públicos ──────────────────────────────────────────────────────────

export interface ImaginasoftUtente {
  /** ID original no Imaginasoft (número do processo) */
  idOriginal: string;
  nome: string;
  nif?: string;
  telemovel?: string;
  telefone?: string;
  email?: string;
  morada?: string;
  codigoPostal?: string;
  cidade?: string;
  dataNascimento?: string;
  genero?: string;
  observacoes?: string;
}

export interface ImaginasoftImagem {
  /** ID do utente a que pertence */
  utenteIdOriginal: string;
  /** Nome do ficheiro */
  nome: string;
  /** Extensão (lowercase) */
  extensao: string;
  /** MIME type */
  mimeType: string;
  /** Tamanho em bytes */
  tamanhoBytes: number;
  /** Tipo clínico detectado */
  tipoClinico: TipoImagem;
  /** Data do ficheiro original (timestamp do ZIP) */
  dataFicheiro?: Date;
  /** Caminho relativo dentro do ZIP (para extração posterior) */
  caminhoNoZip: string;
  /** Caminho no disco após extração (preenchido durante importação) */
  caminhoLocal?: string;
}

export type TipoImagem =
  | "radiografia_periapical"
  | "radiografia_panoramica"
  | "radiografia_bitewing"
  | "radiografia_cefalometrica"
  | "fotografia_intraoral"
  | "fotografia_extraoral"
  | "tomografia_cbct"
  | "outro";

export interface ImaginasoftAnalise {
  /** Configuração do sistema de RX detectada no backup */
  sistemaRxDetectado: string;
  /** Caminho do programa de RX detectado */
  caminhoRxDetectado: string;
  /** Total de utentes encontrados */
  totalUtentes: number;
  /** Total de imagens de RX/clínicas encontradas */
  totalImagensRx: number;
  /** Total de documentos (.rtf, .pdf, etc.) encontrados */
  totalDocumentos: number;
  /** Total de fotos de perfil encontradas (NÃO importadas) */
  totalFotosPerfil: number;
  /** Tamanho total estimado das imagens em bytes */
  tamanhoTotalImagens: number;
  /** Lista de utentes extraídos */
  utentes: ImaginasoftUtente[];
  /** Lista de imagens por utente */
  imagens: ImaginasoftImagem[];
  /** Avisos durante o processamento */
  avisos: string[];
  /** Erros durante o processamento */
  erros: string[];
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const EXTENSOES_IMAGEM = new Set([
  ".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".gif", ".webp",
  ".dcm", ".dicom",
]);

const EXTENSOES_DOCUMENTO = new Set([
  ".rtf", ".doc", ".docx", ".pdf", ".txt", ".xls", ".xlsx",
]);

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".bmp": "image/bmp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".dcm": "application/dicom",
  ".dicom": "application/dicom",
};

/** Tamanho máximo por imagem individual: 50 MB */
const MAX_IMAGEM_BYTES = 50 * 1024 * 1024;

/** Pasta base para armazenamento local de imagens importadas */
const PASTA_IMAGENS_LOCAL = path.resolve(
  process.env.IMAGIOLOGIA_LOCAL_PATH || "./uploads/imagiologia"
);

// Mapeamento de códigos numéricos do usrcfg.DBF para nomes de sistemas de RX
const SISTEMAS_RX: Record<number, string> = {
  0: "Nenhum",
  1: "Julie",
  2: "Trophy",
  4: "VixWin",
  8: "VisioDei",
  16: "Sidexis",
  32: "DbsWin",
  64: "CliniView",
  128: "DigoXVis",
  256: "Schick",
  512: "Sopro",
  1024: "MyRay",
  2048: "MediaDent",
  4096: "EasyDent",
};

// ─── Funções Auxiliares ───────────────────────────────────────────────────────

/**
 * Detectar o tipo clínico de uma imagem com base no nome do ficheiro.
 * Imagens com nome puramente numérico (ex: 1172.jpeg) são tratadas como
 * radiografias panorâmicas, pois é o padrão do MyRay/Neowise.
 */
function detectarTipoImagem(nome: string): TipoImagem {
  const nomeLower = nome.toLowerCase();

  // Ficheiros DICOM são sempre radiografias
  if (nomeLower.endsWith(".dcm") || nomeLower.endsWith(".dicom")) {
    return "radiografia_periapical";
  }

  // Nome numérico puro = RX exportado pelo sistema (padrão MyRay/Neowise)
  if (/^\d+\.(jpg|jpeg|png|bmp|tif|tiff)$/i.test(nome)) {
    return "radiografia_panoramica";
  }

  // Palavras-chave no nome do ficheiro
  if (/pano/i.test(nomeLower)) return "radiografia_panoramica";
  if (/peri/i.test(nomeLower)) return "radiografia_periapical";
  if (/bite|bitewing/i.test(nomeLower)) return "radiografia_bitewing";
  if (/cefal/i.test(nomeLower)) return "radiografia_cefalometrica";
  if (/cbct|tac|tomog/i.test(nomeLower)) return "tomografia_cbct";
  if (/rx|raio|xray|radio/i.test(nomeLower)) return "radiografia_periapical";
  if (/extra/i.test(nomeLower)) return "fotografia_extraoral";
  if (/intra/i.test(nomeLower)) return "fotografia_intraoral";

  // Fotos WhatsApp = fotografias clínicas enviadas pelo utente
  if (/whatsapp/i.test(nomeLower)) return "fotografia_intraoral";

  return "outro";
}

/**
 * Criar utente placeholder quando não há dados no DBF.
 * O ID da pasta é o número do processo no Imaginasoft.
 */
function criarUtentePlaceholder(idOriginal: string): ImaginasoftUtente {
  return {
    idOriginal,
    nome: `Utente Imaginasoft #${idOriginal}`,
    observacoes: `[Importado do Imaginasoft — Processo nº ${idOriginal}. Actualizar dados manualmente.]`,
  };
}

/**
 * Tentar ler dados de utentes a partir de ficheiros .DBF do Imaginasoft.
 * Os ficheiros DBF usam codificação Latin-1 e formato dBASE III/IV.
 *
 * Estrutura típica do DBF de pacientes:
 *   - NPROCESSO (número do processo = ID)
 *   - NOME (nome completo)
 *   - NIF / CONTRIBUINTE
 *   - MORADA
 *   - CODPOSTAL / CODIGO_POSTAL
 *   - LOCALIDADE / CIDADE
 *   - TELEMOVEL / TELEM
 *   - TELEFONE / TELEF
 *   - EMAIL
 *   - DTNASCIMENTO / DATA_NASC
 *   - SEXO
 */
function lerUtentesDoDbf(conteudo: Buffer): ImaginasoftUtente[] {
  const utentes: ImaginasoftUtente[] = [];

  try {
    // Validar header DBF mínimo
    if (conteudo.length < 32) return [];

    // Ler header do DBF
    const numRegistos = conteudo.readUInt32LE(4);
    const headerSize = conteudo.readUInt16LE(8);
    const recordSize = conteudo.readUInt16LE(10);

    if (numRegistos === 0 || headerSize < 32 || recordSize < 1) return [];
    if (headerSize >= conteudo.length) return [];

    // Ler definições dos campos (cada campo = 32 bytes, começa no offset 32)
    const campos: Array<{ nome: string; tipo: string; tamanho: number; offset: number }> = [];
    let offset = 32;
    let campoOffset = 1; // O primeiro byte de cada registo é o flag de eliminação

    while (offset < headerSize - 1) {
      if (conteudo[offset] === 0x0D) break; // Terminador do header

      const nomeCampo = conteudo.subarray(offset, offset + 11).toString("latin1").replace(/\0/g, "").trim().toUpperCase();
      const tipoCampo = String.fromCharCode(conteudo[offset + 11]);
      const tamanhoCampo = conteudo[offset + 16];

      if (nomeCampo.length > 0 && tamanhoCampo > 0) {
        campos.push({
          nome: nomeCampo,
          tipo: tipoCampo,
          tamanho: tamanhoCampo,
          offset: campoOffset,
        });
        campoOffset += tamanhoCampo;
      }

      offset += 32;
    }

    if (campos.length === 0) return [];

    // Mapear nomes de campos conhecidos
    const mapa: Record<string, string> = {};
    for (const campo of campos) {
      const n = campo.nome;
      if (["NPROCESSO", "N_PROCESSO", "PROCESSO", "NUMPROCESSO", "NUM_PROCESSO", "ID", "CODIGO"].includes(n)) {
        mapa.idOriginal = n;
      } else if (["NOME", "NOME_COMPLETO", "NOMECOMPLETO", "NOME_PACIENTE"].includes(n)) {
        mapa.nome = n;
      } else if (["NIF", "CONTRIBUINTE", "NUM_CONTRIBUINTE", "NUMCONTRIBUINTE"].includes(n)) {
        mapa.nif = n;
      } else if (["MORADA", "ENDERECO", "DIRECCAO"].includes(n)) {
        mapa.morada = n;
      } else if (["CODPOSTAL", "CODIGO_POSTAL", "COD_POSTAL", "CP"].includes(n)) {
        mapa.codigoPostal = n;
      } else if (["LOCALIDADE", "CIDADE", "CONCELHO"].includes(n)) {
        mapa.cidade = n;
      } else if (["TELEMOVEL", "TELEM", "CELULAR", "MOVEL"].includes(n)) {
        mapa.telemovel = n;
      } else if (["TELEFONE", "TELEF", "TEL", "FONE"].includes(n)) {
        mapa.telefone = n;
      } else if (["EMAIL", "E_MAIL", "MAIL", "CORREIO"].includes(n)) {
        mapa.email = n;
      } else if (["DTNASCIMENTO", "DATA_NASC", "DATANASC", "DT_NASCIMENTO", "NASCIMENTO"].includes(n)) {
        mapa.dataNascimento = n;
      } else if (["SEXO", "GENERO", "GENDER"].includes(n)) {
        mapa.genero = n;
      }
    }

    // Ler registos
    const dataStart = headerSize;
    for (let i = 0; i < numRegistos; i++) {
      const recOffset = dataStart + (i * recordSize);
      if (recOffset + recordSize > conteudo.length) break;

      // Verificar flag de eliminação (primeiro byte = 0x2A = eliminado)
      if (conteudo[recOffset] === 0x2A) continue;

      const lerCampo = (nomeMapeado: string): string => {
        const nomeCampo = mapa[nomeMapeado];
        if (!nomeCampo) return "";
        const campo = campos.find(c => c.nome === nomeCampo);
        if (!campo) return "";
        const start = recOffset + campo.offset;
        const end = start + campo.tamanho;
        if (end > conteudo.length) return "";
        return conteudo.subarray(start, end).toString("latin1").trim();
      };

      const idOriginal = lerCampo("idOriginal");
      const nome = lerCampo("nome");

      // Ignorar registos sem ID ou nome
      if (!idOriginal && !nome) continue;

      // Processar género
      let genero: string | undefined;
      const sexoRaw = lerCampo("genero").toUpperCase();
      if (["M", "MASCULINO", "MASC", "H", "HOMEM"].includes(sexoRaw)) genero = "masculino";
      else if (["F", "FEMININO", "FEM", "MULHER"].includes(sexoRaw)) genero = "feminino";

      // Processar data de nascimento (formato DBF: YYYYMMDD ou DD/MM/YYYY)
      let dataNascimento: string | undefined;
      const dataRaw = lerCampo("dataNascimento");
      if (dataRaw) {
        if (/^\d{8}$/.test(dataRaw)) {
          // Formato YYYYMMDD
          dataNascimento = `${dataRaw.slice(0, 4)}-${dataRaw.slice(4, 6)}-${dataRaw.slice(6, 8)}`;
        } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataRaw)) {
          // Formato DD/MM/YYYY
          const [d, m, y] = dataRaw.split("/");
          dataNascimento = `${y}-${m}-${d}`;
        } else if (/^\d{4}-\d{2}-\d{2}/.test(dataRaw)) {
          dataNascimento = dataRaw.slice(0, 10);
        }
      }

      utentes.push({
        idOriginal: idOriginal || String(i + 1),
        nome: nome || `Utente #${idOriginal || i + 1}`,
        nif: lerCampo("nif") || undefined,
        telemovel: lerCampo("telemovel") || undefined,
        telefone: lerCampo("telefone") || undefined,
        email: lerCampo("email") || undefined,
        morada: lerCampo("morada") || undefined,
        codigoPostal: lerCampo("codigoPostal") || undefined,
        cidade: lerCampo("cidade") || undefined,
        dataNascimento,
        genero,
        observacoes: `[Importado do Imaginasoft — Processo nº ${idOriginal || i + 1}]`,
      });
    }
  } catch (e) {
    // Se falhar a leitura do DBF, retornar vazio (fallback para placeholders)
    console.warn("[ImaginasoftImporter] Erro ao ler DBF de utentes:", (e as Error).message);
  }

  return utentes;
}

/**
 * Tentar detectar o sistema de RX a partir do conteúdo binário do usrcfg.DBF.
 * Lê o ficheiro como texto latin-1 e procura padrões de caminhos conhecidos.
 */
function detectarSistemaRxDoDbf(conteudo: Buffer): { nome: string; caminho: string } {
  const texto = conteudo.toString("latin1");

  // MyRay / Neowise / Cefla
  const myrayMatch = texto.match(/[A-Za-z]:\\[^\\]*[Cc]efla[^\\]*\\[^\\]*\\[^\\]*\\bridge\\/i)
    || texto.match(/[A-Za-z]:\\[^\\]*[Nn]eowise[^\\]*\\[^\\]*\\bridge\\/i);
  if (myrayMatch) return { nome: "MyRay", caminho: myrayMatch[0] };

  // Julie
  const julieMatch = texto.match(/[A-Za-z]:\\[Jj]uliew?\\/);
  if (julieMatch) return { nome: "Julie", caminho: julieMatch[0] };

  // Trophy
  const trophyMatch = texto.match(/[A-Za-z]:\\[^\\]*[Tt]rophy[^\\]*\\/);
  if (trophyMatch) return { nome: "Trophy", caminho: trophyMatch[0] };

  // VixWin
  const vixwinMatch = texto.match(/[A-Za-z]:\\[Vv]ixwin\\/);
  if (vixwinMatch) return { nome: "VixWin", caminho: vixwinMatch[0] };

  // Sidexis
  const sidexisMatch = texto.match(/[A-Za-z]:\\[Ss]idexis\\/);
  if (sidexisMatch) return { nome: "Sidexis", caminho: sidexisMatch[0] };

  // DbsWin
  const dbswinMatch = texto.match(/[A-Za-z]:\\[Dd]bswin\\/);
  if (dbswinMatch) return { nome: "DbsWin", caminho: dbswinMatch[0] };

  // Sopro
  const soprMatch = texto.match(/[A-Za-z]:\\[^\\]*[Ss]opro[^\\]*\\/);
  if (soprMatch) return { nome: "Sopro", caminho: soprMatch[0] };

  // MediaDent
  const mediaMatch = texto.match(/[A-Za-z]:\\[^\\]*[Mm]ediadent[^\\]*\\/i);
  if (mediaMatch) return { nome: "MediaDent", caminho: mediaMatch[0] };

  return { nome: "Desconhecido", caminho: "" };
}

/**
 * Garantir que a pasta de armazenamento local existe.
 */
function garantirPastaLocal(subpasta?: string): string {
  const pasta = subpasta
    ? path.join(PASTA_IMAGENS_LOCAL, subpasta)
    : PASTA_IMAGENS_LOCAL;
  if (!fs.existsSync(pasta)) {
    fs.mkdirSync(pasta, { recursive: true });
  }
  return pasta;
}

/**
 * Gerar nome de ficheiro seguro (sem caracteres especiais).
 */
function nomeFicheiroSeguro(nome: string): string {
  return nome
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/__+/g, "_")
    .slice(0, 200);
}

// ─── Classe Principal ─────────────────────────────────────────────────────────

export class ImaginasoftImporter {

  /**
   * Analisar um backup Imaginasoft em formato ZIP.
   * Esta função apenas analisa e devolve um resumo — NÃO importa dados para a BD.
   *
   * @param zipBuffer Buffer do ficheiro ZIP
   */
  static analisarZip(zipBuffer: Buffer): ImaginasoftAnalise {
    const avisos: string[] = [];
    const erros: string[] = [];
    const utentesPlaceholder: ImaginasoftUtente[] = [];
    const imagens: ImaginasoftImagem[] = [];
    let totalFotosPerfil = 0;
    let totalDocumentos = 0;
    let tamanhoTotalImagens = 0;
    let sistemaRxDetectado = "Desconhecido";
    let caminhoRxDetectado = "";

    let zip: AdmZip;
    try {
      zip = new AdmZip(zipBuffer);
    } catch (e) {
      erros.push(`Não foi possível abrir o ficheiro ZIP: ${(e as Error).message}`);
      return {
        sistemaRxDetectado,
        caminhoRxDetectado,
        totalUtentes: 0,
        totalImagensRx: 0,
        totalDocumentos: 0,
        totalFotosPerfil: 0,
        tamanhoTotalImagens: 0,
        utentes: [],
        imagens: [],
        avisos,
        erros,
      };
    }

    const entries = zip.getEntries();

    // Normalizar caminhos: encontrar o prefixo da pasta NSSERVER
    let nsserverPrefix = "";
    for (const entry of entries) {
      const normalizedName = entry.entryName.replace(/\\/g, "/");
      const match = normalizedName.match(/^(.*\/)?NSSERVER\//i);
      if (match) {
        nsserverPrefix = match[0];
        break;
      }
    }

    if (!nsserverPrefix) {
      erros.push(
        "Pasta NSSERVER não encontrada no ZIP. " +
        "Verifique se o ficheiro é um backup válido do Imaginasoft."
      );
      return {
        sistemaRxDetectado,
        caminhoRxDetectado,
        totalUtentes: 0,
        totalImagensRx: 0,
        totalDocumentos: 0,
        totalFotosPerfil: 0,
        tamanhoTotalImagens: 0,
        utentes: [],
        imagens: [],
        avisos,
        erros,
      };
    }

    // Conjunto de IDs de utentes encontrados nas pastas Captura
    const utentesEncontrados = new Set<string>();

    // Tentar ler dados reais dos utentes a partir de ficheiros DBF
    let utentesDoDbf: ImaginasoftUtente[] = [];
    const dbfNomes = ["PACIENTE.DBF", "DOENTES.DBF", "PACIENTES.DBF", "CLIENTES.DBF", "DOENTE.DBF"];

    for (const entry of entries) {
      const normalizedName = entry.entryName.replace(/\\/g, "/");
      const nomeFicheiro = path.basename(normalizedName).toUpperCase();

      // Procurar ficheiros DBF de utentes dentro de NSSERVER
      if (normalizedName.toLowerCase().includes(nsserverPrefix.toLowerCase()) && dbfNomes.includes(nomeFicheiro)) {
        try {
          const conteudo = entry.getData();
          const utentesLidos = lerUtentesDoDbf(conteudo);
          if (utentesLidos.length > 0) {
            utentesDoDbf = utentesLidos;
            avisos.push(`Dados de ${utentesLidos.length} utentes lidos do ficheiro ${nomeFicheiro}.`);
            break; // Usar o primeiro DBF encontrado com dados
          }
        } catch (e) {
          avisos.push(`Não foi possível ler ${nomeFicheiro}: ${(e as Error).message}`);
        }
      }
    }

    // Criar mapa de utentes do DBF por ID
    const mapaUtentesDbf = new Map<string, ImaginasoftUtente>();
    for (const u of utentesDoDbf) {
      mapaUtentesDbf.set(u.idOriginal, u);
    }

    // Processar cada entrada do ZIP
    for (const entry of entries) {
      if (entry.isDirectory) continue;

      const normalizedName = entry.entryName.replace(/\\/g, "/");
      const nomeFicheiro = path.basename(normalizedName);

      // Ignorar ficheiros de sistema
      if (
        nomeFicheiro === "Thumbs.db" ||
        nomeFicheiro.startsWith(".") ||
        nomeFicheiro === "desktop.ini"
      ) continue;

      // ── 1. Configuração do posto (usrcfg.DBF) ──────────────────────────
      if (normalizedName.toLowerCase().endsWith("/usrcfg.dbf")) {
        try {
          const conteudo = entry.getData();
          const resultado = detectarSistemaRxDoDbf(conteudo);
          sistemaRxDetectado = resultado.nome;
          caminhoRxDetectado = resultado.caminho;
        } catch (e) {
          avisos.push(`Não foi possível ler usrcfg.DBF: ${(e as Error).message}`);
        }
        continue;
      }

      // ── 2. Fotos de perfil (pasta Foto/) — IGNORAR ─────────────────────
      if (/\/foto\//i.test(normalizedName)) {
        const ext = path.extname(nomeFicheiro).toLowerCase();
        if (EXTENSOES_IMAGEM.has(ext)) {
          totalFotosPerfil++;
        }
        continue;
      }

      // ── 3. Pasta Captura/{ID}/ — Imagens e Documentos ─────────────
      const capturaRegex = /\/captura\/(\d+)\//i;
      const capturaMatch = normalizedName.match(capturaRegex);
      if (capturaMatch) {
        const utenteId = capturaMatch[1];
        utentesEncontrados.add(utenteId);

        const ext = path.extname(nomeFicheiro).toLowerCase();

        if (EXTENSOES_IMAGEM.has(ext)) {
          const tamanho = entry.header.size;

          // Validar tamanho máximo
          if (tamanho > MAX_IMAGEM_BYTES) {
            avisos.push(
              `Imagem ${nomeFicheiro} (utente #${utenteId}) ignorada: ` +
              `${(tamanho / 1024 / 1024).toFixed(1)} MB excede o limite de ` +
              `${MAX_IMAGEM_BYTES / 1024 / 1024} MB.`
            );
            continue;
          }

          tamanhoTotalImagens += tamanho;

          imagens.push({
            utenteIdOriginal: utenteId,
            nome: nomeFicheiro,
            extensao: ext,
            mimeType: MIME_TYPES[ext] || "image/jpeg",
            tamanhoBytes: tamanho,
            tipoClinico: detectarTipoImagem(nomeFicheiro),
            dataFicheiro: entry.header.time ? new Date(entry.header.time) : undefined,
            caminhoNoZip: entry.entryName,
          });
        } else if (EXTENSOES_DOCUMENTO.has(ext)) {
          totalDocumentos++;
        }
      }
    }

    // Construir lista final de utentes: preferir dados do DBF, fallback para placeholder
    const utentesFinais: ImaginasoftUtente[] = [];
    for (const id of utentesEncontrados) {
      const utenteDbf = mapaUtentesDbf.get(id);
      if (utenteDbf) {
        utentesFinais.push(utenteDbf);
      } else {
        utentesFinais.push(criarUtentePlaceholder(id));
      }
    }

    // Adicionar utentes do DBF que não têm pasta Captura (sem imagens mas com dados)
    for (const u of utentesDoDbf) {
      if (!utentesEncontrados.has(u.idOriginal)) {
        // Não adicionar se não tem imagens — o utilizador quer importar RX
        // Mas registar como aviso
        avisos.push(
          `Utente "${u.nome}" (Processo #${u.idOriginal}) encontrado no DBF mas sem pasta Captura/ (sem imagens).`
        );
      }
    }

    // Ordenar utentes por ID numérico
    utentesFinais.sort((a, b) => parseInt(a.idOriginal) - parseInt(b.idOriginal));

    if (utentesFinais.length === 0 && imagens.length === 0) {
      avisos.push(
        "Nenhum utente ou imagem encontrado no backup. " +
        "A pasta Captura pode estar vazia ou o backup pode estar incompleto."
      );
    }

    // Aviso sobre tamanho total
    if (tamanhoTotalImagens > 500 * 1024 * 1024) {
      avisos.push(
        `Atenção: ${(tamanhoTotalImagens / 1024 / 1024 / 1024).toFixed(2)} GB de imagens a importar. ` +
        `Recomenda-se configurar armazenamento S3 para volumes elevados.`
      );
    }

    return {
      sistemaRxDetectado,
      caminhoRxDetectado,
      totalUtentes: utentesFinais.length,
      totalImagensRx: imagens.length,
      totalDocumentos,
      totalFotosPerfil,
      tamanhoTotalImagens,
      utentes: utentesFinais,
      imagens,
      avisos,
      erros,
    };
  }

  /**
   * Extrair uma imagem do ZIP e guardar em disco local.
   * Retorna o caminho relativo (URL) para servir via Express static.
   *
   * @param zipBuffer Buffer do ficheiro ZIP
   * @param imagem Metadados da imagem a extrair
   * @returns Caminho relativo da imagem guardada (ex: "/uploads/imagiologia/123/1711234567_rx.jpg")
   */
  static extrairImagemParaDisco(zipBuffer: Buffer, imagem: ImaginasoftImagem): string | null {
    try {
      const zip = new AdmZip(zipBuffer);
      const entry = zip.getEntry(imagem.caminhoNoZip);
      if (!entry) return null;

      const dados = entry.getData();
      if (!dados || dados.length === 0) return null;

      // Criar pasta do utente
      const pastaUtente = garantirPastaLocal(imagem.utenteIdOriginal);

      // Gerar nome único
      const timestamp = Date.now();
      const nomeSeguro = nomeFicheiroSeguro(imagem.nome);
      const nomeFinal = `${timestamp}_${nomeSeguro}`;
      const caminhoCompleto = path.join(pastaUtente, nomeFinal);

      // Escrever ficheiro
      fs.writeFileSync(caminhoCompleto, dados);

      // Retornar caminho relativo para URL
      return `/uploads/imagiologia/${imagem.utenteIdOriginal}/${nomeFinal}`;
    } catch (e) {
      console.warn(`[ImaginasoftImporter] Erro ao extrair imagem ${imagem.nome}:`, (e as Error).message);
      return null;
    }
  }

  /**
   * Extrair uma imagem do ZIP e retornar como data URL (Base64).
   * Usar apenas como fallback quando o armazenamento em disco não está disponível.
   *
   * @param zipBuffer Buffer do ficheiro ZIP
   * @param imagem Metadados da imagem a extrair
   * @returns Data URL (ex: "data:image/jpeg;base64,...")
   */
  static extrairImagemComoBase64(zipBuffer: Buffer, imagem: ImaginasoftImagem): string | null {
    try {
      const zip = new AdmZip(zipBuffer);
      const entry = zip.getEntry(imagem.caminhoNoZip);
      if (!entry) return null;

      const dados = entry.getData();
      if (!dados || dados.length === 0) return null;

      return `data:${imagem.mimeType};base64,${dados.toString("base64")}`;
    } catch (e) {
      console.warn(`[ImaginasoftImporter] Erro ao extrair imagem ${imagem.nome}:`, (e as Error).message);
      return null;
    }
  }

  /**
   * Obter a lista de sistemas de RX suportados para o selector de configuração.
   */
  static obterSistemasRx(): Array<{ codigo: number; nome: string }> {
    return Object.entries(SISTEMAS_RX)
      .filter(([codigo]) => Number(codigo) > 0)
      .map(([codigo, nome]) => ({ codigo: Number(codigo), nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  /**
   * Validar um caminho de programa de RX (formato Windows).
   */
  static validarCaminhoRx(caminho: string): { valido: boolean; mensagem: string } {
    if (!caminho || caminho.trim().length === 0) {
      return { valido: false, mensagem: "O caminho não pode estar vazio." };
    }
    const windowsPath = /^([a-zA-Z]:\\|\\\\[^\\]+\\)/;
    if (!windowsPath.test(caminho.trim())) {
      return {
        valido: false,
        mensagem: "Deve ser um caminho Windows válido (ex: C:\\Program Files\\...).",
      };
    }
    return { valido: true, mensagem: "Caminho válido." };
  }

  /**
   * Obter o caminho base para armazenamento local de imagens.
   */
  static obterPastaLocal(): string {
    return PASTA_IMAGENS_LOCAL;
  }
}
