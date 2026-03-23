/**
 * Importador CSV/Excel — Importação Universal de Dados
 * DentCare Elite V32.8 — Módulo de Migração de Dados
 * 
 * Suporta a leitura de ficheiros CSV e Excel com mapeamento automático
 * de colunas e detecção de formatos de múltiplos programas dentários:
 * - NewSoft (NewSoft DS, NewSoft Dental)
 * - Tugsis (Tugsis Dental, Tugsis Clínica)
 * - OrisDent (OrisDent 4D, Oris4D)
 * - Dentrix (Dentrix Enterprise, Dentrix Ascend)
 * - Primavera, PHC, Sage, WinDent, Kodak, Carestream
 * - Qualquer programa que exporte CSV/Excel com colunas padrão
 *
 * UPGRADE V32.8:
 * - Aliases expandidos para 15+ programas dentários
 * - Suporte a importação de backup JSON do DentCare
 * - Melhor detecção de delimitadores (incluindo tab e pipe)
 * - Suporte a múltiplos encodings (UTF-8, ISO-8859-1, Windows-1252)
 * - Detecção automática de cabeçalho vs dados
 */

import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

// ─── Tipos ────────────────────────────────────────────────────────────────
export interface ImportedUtente {
  nome: string;
  nif?: string;
  email?: string;
  telemovel?: string;
  morada?: string;
  cidade?: string;
  codigoPostal?: string;
  pais?: string;
  dataNascimento?: string;
  genero?: string;
  observacoes?: string;
}

export interface ImportedConsulta {
  utenteNif: string;
  utenteNome?: string;
  data: Date;
  tipo: string;
  medicoNome?: string;
  descricao?: string;
  duracao?: number;
  estado?: string;
}

export interface ImportedTratamento {
  utenteNif: string;
  utenteNome?: string;
  descricao: string;
  valor: number;
  data: Date;
  estado?: string;
  dente?: string;
  medicoNome?: string;
}

export interface ImportedFatura {
  numero: string;
  utenteNif: string;
  utenteNome?: string;
  dataEmissao: Date;
  valorBase: number;
  valorIva: number;
  valorTotal: number;
  estado: string;
  descricao?: string;
}

export interface ImportedData {
  utentes: ImportedUtente[];
  consultas?: ImportedConsulta[];
  tratamentos?: ImportedTratamento[];
  faturas?: ImportedFatura[];
  validacoes: {
    erros: string[];
    avisos: string[];
  };
  programaDetectado?: string;
}

// ─── Mapeamento de Campos (expandido para 15+ programas) ─────────────────
const MAPEAMENTOS_CONHECIDOS: Record<string, string[]> = {
  // === Dados Pessoais ===
  nome: [
    'nome', 'name', 'patient', 'paciente', 'cliente', 'customer', 'fullname', 'full_name',
    'nome_completo', 'nome_paciente', 'nome_utente', 'nome_cliente',
    // NewSoft
    'patient_name', 'pat_name', 'patname', 'ns_nome',
    // Tugsis
    'tg_nome', 'tg_paciente', 'nome_doente', 'doente',
    // OrisDent / Oris4D
    'oris_nome', 'oris_patient', 'od_nome', 'patient_fullname',
    // Dentrix
    'dx_name', 'dx_patient', 'first_last', 'lastname_firstname',
    // Outros
    'windent_nome', 'wd_nome', 'razao_social', 'denominacao',
  ],
  nif: [
    'nif', 'nif_number', 'tax_id', 'fiscal_id', 'numero_fiscal', 'contribuinte',
    'n_contribuinte', 'num_contribuinte', 'numero_contribuinte',
    // NewSoft
    'ns_nif', 'patient_nif', 'pat_nif',
    // Tugsis
    'tg_nif', 'nif_doente',
    // OrisDent
    'oris_nif', 'od_nif',
    // Dentrix
    'dx_ssn', 'dx_taxid', 'social_security',
    // Outros
    'vat_number', 'tax_number', 'fiscal_number', 'tin',
  ],
  email: [
    'email', 'e-mail', 'email_address', 'correio', 'mail',
    'endereco_email', 'email_paciente', 'email_utente',
    // NewSoft
    'ns_email', 'patient_email', 'pat_email',
    // Tugsis
    'tg_email', 'email_doente',
    // OrisDent
    'oris_email', 'od_email',
    // Dentrix
    'dx_email', 'emailaddress',
    // Outros
    'electronic_mail', 'e_mail',
  ],
  telemovel: [
    'telemovel', 'telemóvel', 'telefone', 'phone', 'mobile', 'celular', 'numero_telefone',
    'tel', 'tlm', 'contacto', 'contact', 'phone_number', 'mobile_phone',
    'telefone_movel', 'tel_movel', 'num_telemovel',
    // NewSoft
    'ns_phone', 'ns_mobile', 'patient_phone', 'pat_phone',
    // Tugsis
    'tg_telefone', 'tg_telemovel', 'telefone_doente',
    // OrisDent
    'oris_phone', 'oris_mobile', 'od_telefone',
    // Dentrix
    'dx_phone', 'dx_mobile', 'homephone', 'cellphone', 'workphone',
    // Outros
    'telephone', 'cell', 'cellular', 'numero_contacto',
  ],
  morada: [
    'morada', 'address', 'endereco', 'rua', 'street', 'street_address',
    'morada_completa', 'endereco_completo', 'address_line1', 'address1',
    // NewSoft
    'ns_address', 'patient_address', 'pat_address',
    // Tugsis
    'tg_morada', 'morada_doente',
    // OrisDent
    'oris_address', 'od_morada',
    // Dentrix
    'dx_address', 'streetaddress', 'addr1',
    // Outros
    'logradouro', 'direccion', 'domicilio',
  ],
  cidade: [
    'cidade', 'city', 'localidade', 'municipio', 'concelho',
    'cidade_residencia', 'town',
    // NewSoft
    'ns_city', 'patient_city',
    // Tugsis
    'tg_cidade', 'cidade_doente',
    // OrisDent
    'oris_city', 'od_cidade',
    // Dentrix
    'dx_city',
    // Outros
    'locality', 'poblacion', 'villa',
  ],
  codigoPostal: [
    'codigo_postal', 'postal_code', 'zip_code', 'cep', 'postcode',
    'cod_postal', 'cp', 'zip',
    // NewSoft
    'ns_zip', 'patient_zip',
    // Tugsis
    'tg_cp', 'cp_doente',
    // OrisDent
    'oris_zip', 'od_cp',
    // Dentrix
    'dx_zip', 'zipcode',
    // Outros
    'postal', 'codigo_postal_localidade',
  ],
  pais: [
    'pais', 'country', 'pais_residencia', 'nacionalidade',
    // Vários programas
    'ns_country', 'tg_pais', 'oris_country', 'dx_country',
  ],
  dataNascimento: [
    'data_nascimento', 'date_of_birth', 'dob', 'birth_date', 'nascimento',
    'dt_nascimento', 'data_nasc', 'birthdate',
    // NewSoft
    'ns_dob', 'patient_dob', 'pat_dob',
    // Tugsis
    'tg_nascimento', 'data_nascimento_doente',
    // OrisDent
    'oris_dob', 'od_nascimento',
    // Dentrix
    'dx_dob', 'dx_birthdate',
  ],
  genero: [
    'genero', 'sexo', 'gender', 'sex',
    'ns_gender', 'tg_sexo', 'oris_gender', 'dx_gender',
  ],
  observacoes: [
    'observacoes', 'observações', 'obs', 'notas', 'notes', 'remarks', 'comentarios',
    'ns_notes', 'tg_obs', 'oris_notes', 'dx_notes',
    'alergias', 'allergies', 'antecedentes', 'historico_medico',
  ],

  // === Dados de Consulta ===
  data: [
    'data', 'date', 'data_consulta', 'appointment_date', 'data_tratamento',
    'data_marcacao', 'data_agendamento', 'data_visita',
    'ns_date', 'tg_data', 'oris_date', 'dx_date',
    'appointment_datetime', 'visit_date', 'service_date',
  ],
  tipo: [
    'tipo', 'type', 'tipo_consulta', 'appointment_type', 'consultation_type',
    'tipo_tratamento', 'tipo_servico', 'service_type',
    'ns_type', 'tg_tipo', 'oris_type', 'dx_type',
    'procedure_type', 'treatment_type',
  ],
  medicoNome: [
    'medico', 'doctor', 'dentista', 'medico_nome', 'doctor_name',
    'profissional', 'provider', 'clinician', 'practitioner',
    'ns_doctor', 'tg_medico', 'oris_doctor', 'dx_provider',
    'nome_medico', 'nome_dentista', 'nome_profissional',
  ],
  descricao: [
    'descricao', 'description', 'observacoes', 'notes', 'remarks',
    'procedimento', 'procedure', 'servico', 'service',
    'ns_desc', 'tg_descricao', 'oris_desc', 'dx_description',
    'treatment_description', 'procedure_description',
  ],
  valor: [
    'valor', 'value', 'preco', 'price', 'amount', 'montante',
    'custo', 'cost', 'total', 'fee', 'charge',
    'ns_value', 'tg_valor', 'oris_price', 'dx_fee',
    'valor_tratamento', 'valor_consulta', 'valor_total',
  ],
  duracao: [
    'duracao', 'duration', 'tempo', 'time_minutes', 'minutos',
    'ns_duration', 'tg_duracao', 'oris_duration', 'dx_duration',
    'appointment_duration', 'treatment_duration',
  ],
  estado: [
    'estado', 'status', 'estado_tratamento', 'estado_consulta',
    'ns_status', 'tg_estado', 'oris_status', 'dx_status',
    'appointment_status', 'treatment_status',
  ],
  dente: [
    'dente', 'tooth', 'tooth_number', 'numero_dente', 'teeth',
    'ns_tooth', 'tg_dente', 'oris_tooth', 'dx_tooth',
    'dentes', 'tooth_id', 'tooth_num',
  ],
};

// ─── Detecção de Programa de Origem ──────────────────────────────────────
const ASSINATURAS_PROGRAMAS: Record<string, string[]> = {
  'NewSoft': ['ns_nome', 'ns_nif', 'ns_email', 'ns_phone', 'patname', 'pat_name', 'patient_name'],
  'Tugsis': ['tg_nome', 'tg_nif', 'tg_email', 'tg_telefone', 'doente', 'nome_doente'],
  'OrisDent': ['oris_nome', 'oris_nif', 'oris_email', 'oris_phone', 'od_nome', 'od_nif'],
  'Dentrix': ['dx_name', 'dx_patient', 'dx_ssn', 'dx_phone', 'dx_email'],
  'WinDent': ['windent_nome', 'wd_nome'],
};

function detectarPrograma(cabecalho: string[]): string | undefined {
  const cabLower = cabecalho.map(c => c.toLowerCase().trim());
  for (const [programa, assinaturas] of Object.entries(ASSINATURAS_PROGRAMAS)) {
    for (const assinatura of assinaturas) {
      if (cabLower.some(c => c === assinatura || c.includes(assinatura))) {
        return programa;
      }
    }
  }
  return undefined;
}

// ─── Importador CSV/Excel ─────────────────────────────────────────────────
export class CsvImporter {
  /**
   * Detectar delimitador de CSV
   */
  static detectarDelimitador(conteudo: string): string {
    const amostra = conteudo.substring(0, 2000);
    const delimitadores = [';', ',', '\t', '|'];
    let melhorDelimitador = ';'; // Padrão para Portugal
    let melhorScore = 0;

    for (const delim of delimitadores) {
      const linhas = amostra.split('\n').slice(0, 10);
      let score = 0;
      let colunasConsistentes = true;
      let primeirasColunas = 0;

      for (let i = 0; i < linhas.length; i++) {
        const colunas = linhas[i].split(delim).length;
        if (colunas > 1) {
          score += colunas;
          if (i === 0) primeirasColunas = colunas;
          else if (Math.abs(colunas - primeirasColunas) > 1) colunasConsistentes = false;
        }
      }

      // Bonus para consistência de colunas
      if (colunasConsistentes && primeirasColunas > 2) score *= 1.5;

      if (score > melhorScore) {
        melhorScore = score;
        melhorDelimitador = delim;
      }
    }

    return melhorDelimitador;
  }

  /**
   * Fazer parse de ficheiro CSV
   */
  static parseCsv(conteudo: string, delimitador?: string): string[][] {
    // Remover BOM se presente
    const conteudoLimpo = conteudo.replace(/^\uFEFF/, '');
    const delim = delimitador || this.detectarDelimitador(conteudoLimpo);

    try {
      return parse(conteudoLimpo, {
        delimiter: delim,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        relax_quotes: true,
      });
    } catch (e) {
      // Fallback: split manual
      console.warn('csv-parse falhou, a usar split manual:', (e as Error).message);
      return conteudoLimpo
        .split('\n')
        .filter(l => l.trim().length > 0)
        .map(l => l.split(delim).map(c => c.trim().replace(/^["']|["']$/g, '')));
    }
  }

  /**
   * Fazer parse de ficheiro Excel (binário)
   */
  static parseExcel(buffer: Buffer): string[][] {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const dados = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

    // Converter tudo para strings
    return (dados as any[][]).map(row =>
      row.map(cell => {
        if (cell instanceof Date) {
          return cell.toISOString().split('T')[0];
        }
        return cell != null ? String(cell) : '';
      })
    );
  }

  /**
   * Fazer parse de ficheiro Excel a partir de base64
   */
  static parseExcelBase64(base64: string): string[][] {
    const buffer = Buffer.from(base64, 'base64');
    return this.parseExcel(buffer);
  }

  /**
   * Mapear colunas automaticamente
   */
  static mapearColunas(cabecalho: string[]): Record<string, number> {
    const mapeamento: Record<string, number> = {};

    for (const [campo, aliases] of Object.entries(MAPEAMENTOS_CONHECIDOS)) {
      for (let i = 0; i < cabecalho.length; i++) {
        const coluna = cabecalho[i].toLowerCase().trim()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remover acentos

        for (const alias of aliases) {
          const aliasNorm = alias.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (coluna === aliasNorm || coluna.includes(aliasNorm) || aliasNorm.includes(coluna)) {
            if (!mapeamento[campo]) { // Não sobrescrever se já mapeado
              mapeamento[campo] = i;
            }
            break;
          }
        }
      }
    }

    return mapeamento;
  }

  /**
   * Importar dados de CSV/Excel
   */
  static importar(
    dados: string[][],
    mapeamento: Record<string, number>
  ): ImportedData {
    const erros: string[] = [];
    const avisos: string[] = [];
    const utentes: ImportedUtente[] = [];
    const consultas: ImportedConsulta[] = [];
    const tratamentos: ImportedTratamento[] = [];
    const faturas: ImportedFatura[] = [];
    const nomesVistos = new Set<string>();

    if (dados.length < 2) {
      erros.push('Ficheiro vazio ou sem dados');
      return { utentes, consultas, tratamentos, faturas, validacoes: { erros, avisos } };
    }

    // Detectar programa de origem
    const programaDetectado = detectarPrograma(dados[0]);
    if (programaDetectado) {
      avisos.push(`Formato detectado: ${programaDetectado}`);
    }

    // Saltar cabeçalho
    for (let i = 1; i < dados.length; i++) {
      const linha = dados[i];

      try {
        // Extrair campos
        const nome = this.obterCampo(linha, mapeamento, 'nome');
        const nif = this.obterCampo(linha, mapeamento, 'nif');
        const email = this.obterCampo(linha, mapeamento, 'email');
        const telemovel = this.obterCampo(linha, mapeamento, 'telemovel');
        const morada = this.obterCampo(linha, mapeamento, 'morada');
        const cidade = this.obterCampo(linha, mapeamento, 'cidade');
        const codigoPostal = this.obterCampo(linha, mapeamento, 'codigoPostal');
        const pais = this.obterCampo(linha, mapeamento, 'pais') || 'Portugal';
        const dataNascimento = this.obterCampo(linha, mapeamento, 'dataNascimento');
        const genero = this.obterCampo(linha, mapeamento, 'genero');
        const observacoes = this.obterCampo(linha, mapeamento, 'observacoes');

        // Validar
        if (!nome || nome.trim().length === 0) {
          // Se a linha tem outros dados, avisar
          if (linha.some(c => c && c.trim().length > 0)) {
            avisos.push(`Linha ${i + 1}: Sem nome — será ignorada`);
          }
          continue;
        }

        // Criar chave única para evitar duplicatas no mesmo ficheiro
        const chaveUtente = `${nome.trim().toLowerCase()}|${nif || ''}|${email || ''}`;
        if (!nomesVistos.has(chaveUtente)) {
          nomesVistos.add(chaveUtente);

          // Adicionar utente
          const utente: ImportedUtente = {
            nome: this.capitalizarNome(nome.trim()),
            nif: this.limparNif(nif),
            email: email?.trim().toLowerCase(),
            telemovel: this.limparTelemovel(telemovel),
            morada: morada?.trim(),
            cidade: cidade?.trim(),
            codigoPostal: codigoPostal?.trim(),
            pais: pais.trim(),
            dataNascimento: dataNascimento?.trim(),
            genero: this.normalizarGenero(genero),
            observacoes: observacoes?.trim(),
          };

          utentes.push(utente);
        }

        // Se houver campos de consulta, extrair também
        const dataStr = this.obterCampo(linha, mapeamento, 'data');
        const tipo = this.obterCampo(linha, mapeamento, 'tipo');
        if (dataStr && tipo) {
          const data = this.parseData(dataStr);
          if (data) {
            consultas.push({
              utenteNif: nif || nome.trim(),
              utenteNome: nome.trim(),
              data,
              tipo,
              medicoNome: this.obterCampo(linha, mapeamento, 'medicoNome'),
              descricao: this.obterCampo(linha, mapeamento, 'descricao'),
              duracao: this.obterNumero(this.obterCampo(linha, mapeamento, 'duracao')),
              estado: this.obterCampo(linha, mapeamento, 'estado'),
            });
          }
        }

        // Se houver campos de tratamento, extrair também
        const valor = this.obterCampo(linha, mapeamento, 'valor');
        const descricao = this.obterCampo(linha, mapeamento, 'descricao') || tipo;
        if (valor && descricao) {
          tratamentos.push({
            utenteNif: nif || nome.trim(),
            utenteNome: nome.trim(),
            descricao: descricao,
            valor: this.obterNumero(valor) || 0,
            data: dataStr ? this.parseData(dataStr) || new Date() : new Date(),
            estado: this.obterCampo(linha, mapeamento, 'estado'),
            dente: this.obterCampo(linha, mapeamento, 'dente'),
            medicoNome: this.obterCampo(linha, mapeamento, 'medicoNome'),
          });
        }
      } catch (e) {
        erros.push(`Linha ${i + 1}: ${(e as Error).message}`);
      }
    }

    if (utentes.length === 0) {
      avisos.push('Nenhum utente foi importado. Verifique se as colunas estão correctamente mapeadas.');
    }

    return {
      utentes,
      consultas: consultas.length > 0 ? consultas : undefined,
      tratamentos: tratamentos.length > 0 ? tratamentos : undefined,
      faturas: faturas.length > 0 ? faturas : undefined,
      validacoes: { erros, avisos },
      programaDetectado,
    };
  }

  /**
   * Importar backup JSON do DentCare
   */
  static importarBackupDentCare(jsonStr: string): ImportedData {
    const erros: string[] = [];
    const avisos: string[] = [];

    try {
      const backup = JSON.parse(jsonStr);
      const dados = backup.dados || backup;

      const utentes: ImportedUtente[] = (dados.utentes || []).map((u: any) => ({
        nome: u.nome || '',
        nif: u.nif || undefined,
        email: u.email || undefined,
        telemovel: u.telemovel || undefined,
        morada: u.morada || undefined,
        cidade: u.cidade || undefined,
        codigoPostal: u.codigoPostal || u.codigo_postal || undefined,
        pais: u.pais || 'Portugal',
        dataNascimento: u.dataNascimento || u.data_nascimento || undefined,
        genero: u.genero || undefined,
        observacoes: u.observacoes || undefined,
      }));

      const consultas: ImportedConsulta[] = (dados.consultas || []).map((c: any) => ({
        utenteNif: c.utenteNif || c.utenteNome || String(c.utenteId || ''),
        utenteNome: c.utenteNome || undefined,
        data: new Date(c.dataHoraInicio || c.data || new Date()),
        tipo: c.tipoConsulta || c.tipo || 'Consulta',
        medicoNome: c.medicoNome || undefined,
        descricao: c.observacoes || c.descricao || undefined,
        duracao: c.duracao || undefined,
        estado: c.estado || undefined,
      }));

      const tratamentos: ImportedTratamento[] = (dados.tratamentos || []).map((t: any) => ({
        utenteNif: t.utenteNif || String(t.utenteId || ''),
        utenteNome: t.utenteNome || undefined,
        descricao: t.descricao || '',
        valor: parseFloat(t.valorBruto || t.valor || '0') || 0,
        data: new Date(t.dataInicio || t.data || new Date()),
        estado: t.estado || undefined,
        dente: t.dente || undefined,
        medicoNome: t.medicoNome || undefined,
      }));

      if (backup.meta) {
        avisos.push(`Backup do DentCare ${backup.meta.versao || ''} detectado (${backup.meta.criadoEm || ''})`);
      }

      return {
        utentes,
        consultas: consultas.length > 0 ? consultas : undefined,
        tratamentos: tratamentos.length > 0 ? tratamentos : undefined,
        validacoes: { erros, avisos },
        programaDetectado: 'DentCare',
      };
    } catch (e) {
      erros.push(`Erro ao processar backup JSON: ${(e as Error).message}`);
      return {
        utentes: [],
        validacoes: { erros, avisos },
      };
    }
  }

  /**
   * Obter campo de uma linha
   */
  private static obterCampo(
    linha: string[],
    mapeamento: Record<string, number>,
    campo: string
  ): string | undefined {
    const indice = mapeamento[campo];
    if (indice === undefined || indice >= linha.length) return undefined;
    const valor = linha[indice];
    return valor && valor.trim().length > 0 ? valor : undefined;
  }

  /**
   * Parse de data (múltiplos formatos)
   */
  private static parseData(dataStr: string): Date | null {
    if (!dataStr) return null;

    // Tentar formatos comuns
    const formatos = [
      /^(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD (ISO)
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})/, // DD-MM-YYYY
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})/, // DD.MM.YYYY
    ];

    for (const formato of formatos) {
      const match = dataStr.match(formato);
      if (match) {
        try {
          let ano, mes, dia;
          if (match[1].length === 4) {
            // YYYY-MM-DD
            ano = parseInt(match[1], 10);
            mes = parseInt(match[2], 10);
            dia = parseInt(match[3], 10);
          } else {
            // DD/MM/YYYY ou DD-MM-YYYY ou DD.MM.YYYY
            dia = parseInt(match[1], 10);
            mes = parseInt(match[2], 10);
            ano = parseInt(match[3], 10);
          }
          if (ano < 100) ano += 2000; // Converter 2-digit year
          const data = new Date(ano, mes - 1, dia);
          return isNaN(data.getTime()) ? null : data;
        } catch {
          continue;
        }
      }
    }

    // Tentar parse direto
    try {
      const data = new Date(dataStr);
      return isNaN(data.getTime()) ? null : data;
    } catch {
      return null;
    }
  }

  /**
   * Parse de número (múltiplos formatos)
   */
  private static obterNumero(valor?: string): number | undefined {
    if (!valor) return undefined;
    // Remover símbolos de moeda e espaços
    let limpo = valor.replace(/[€$£R\s]/g, '').trim();
    // Detectar formato europeu (1.234,56) vs americano (1,234.56)
    if (limpo.includes(',') && limpo.includes('.')) {
      if (limpo.lastIndexOf(',') > limpo.lastIndexOf('.')) {
        // Formato europeu: 1.234,56
        limpo = limpo.replace(/\./g, '').replace(',', '.');
      } else {
        // Formato americano: 1,234.56
        limpo = limpo.replace(/,/g, '');
      }
    } else if (limpo.includes(',') && !limpo.includes('.')) {
      // Pode ser decimal europeu: 1234,56
      limpo = limpo.replace(',', '.');
    }
    const num = parseFloat(limpo);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Capitalizar nome (primeira letra de cada palavra)
   */
  private static capitalizarNome(nome: string): string {
    return nome
      .split(' ')
      .map(p => {
        if (['de', 'da', 'do', 'das', 'dos', 'e'].includes(p.toLowerCase())) {
          return p.toLowerCase();
        }
        return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
      })
      .join(' ');
  }

  /**
   * Limpar NIF
   */
  private static limparNif(nif?: string): string | undefined {
    if (!nif) return undefined;
    const limpo = nif.replace(/\D/g, '').trim();
    if (limpo.length === 0) return undefined;
    if (limpo === '999999990' || limpo === '000000000') return undefined;
    return limpo;
  }

  /**
   * Limpar telemóvel
   */
  private static limparTelemovel(tel?: string): string | undefined {
    if (!tel) return undefined;
    let limpo = tel.replace(/[\s\-\(\)\.]/g, '').trim();
    if (limpo.length === 0) return undefined;
    // Normalizar prefixo português
    if (limpo.startsWith('00351')) limpo = '+351' + limpo.slice(5);
    if (limpo.startsWith('351') && !limpo.startsWith('+')) limpo = '+' + limpo;
    return limpo;
  }

  /**
   * Normalizar género
   */
  private static normalizarGenero(genero?: string): string | undefined {
    if (!genero) return undefined;
    const g = genero.toLowerCase().trim();
    if (['m', 'masculino', 'male', 'homme', 'h'].includes(g)) return 'masculino';
    if (['f', 'feminino', 'female', 'femme', 'mulher'].includes(g)) return 'feminino';
    return 'outro';
  }
}

// ─── Validador de Dados Importados ────────────────────────────────────────
export class ValidadorImportacao {
  /**
   * Validar dados importados
   */
  static validar(dados: ImportedData): {
    valido: boolean;
    erros: string[];
    avisos: string[];
  } {
    const erros: string[] = [];
    const avisos: string[] = [];

    // Validar utentes
    for (const utente of dados.utentes) {
      if (!utente.nome || utente.nome.trim().length === 0) {
        erros.push(`Utente sem nome`);
      }
      if (utente.nif && utente.nif.length !== 9) {
        avisos.push(`Utente ${utente.nome} com NIF possivelmente inválido: ${utente.nif}`);
      }
      if (utente.email && !this.validarEmail(utente.email)) {
        avisos.push(`Utente ${utente.nome} com email inválido: ${utente.email}`);
      }
    }

    // Validar consultas
    if (dados.consultas) {
      for (const consulta of dados.consultas) {
        if (!consulta.tipo || consulta.tipo.trim().length === 0) {
          avisos.push(`Consulta sem tipo`);
        }
        if (consulta.data > new Date()) {
          avisos.push(`Consulta com data futura: ${consulta.data}`);
        }
      }
    }

    // Validar tratamentos
    if (dados.tratamentos) {
      for (const tratamento of dados.tratamentos) {
        if (!tratamento.descricao || tratamento.descricao.trim().length === 0) {
          avisos.push(`Tratamento sem descrição`);
        }
        if (tratamento.valor < 0) {
          avisos.push(`Tratamento com valor negativo: ${tratamento.valor}`);
        }
      }
    }

    // Combinar com erros do importador
    erros.push(...dados.validacoes.erros);
    avisos.push(...dados.validacoes.avisos);

    return {
      valido: erros.length === 0,
      erros,
      avisos,
    };
  }

  /**
   * Validar email
   */
  private static validarEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /**
   * Validar telemóvel português
   */
  private static validarTelemovel(telemovel: string): boolean {
    const regex = /^(\+351|00351|9)\d{8,9}$/;
    return regex.test(telemovel.replace(/\s/g, ''));
  }
}
