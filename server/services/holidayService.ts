/**
 * Holiday Service — Serviço de Feriados Internacionais
 * DentCare Elite V35 — Google Calendar Integration
 *
 * Funcionalidades:
 * - Busca feriados via API Nager.Date (100+ países, gratuita, sem rate limit)
 * - Cache em memória com TTL de 24h (feriados não mudam frequentemente)
 * - Mapeamento automático nome do país → código ISO 3166-1 alpha-2
 * - Suporte a feriados personalizados da clínica
 * - Categorização por tipo (Public, Bank, School, Observance, etc.)
 * - Próximos feriados para alertas às recepcionistas
 */

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface HolidayEntry {
  date: string;           // "2026-01-01"
  localName: string;      // Nome no idioma local
  name: string;           // Nome em inglês
  countryCode: string;    // "PT"
  global: boolean;        // Se é nacional (true) ou regional (false)
  counties: string[] | null; // Estados/regiões (se regional)
  types: HolidayType[];   // Tipos do feriado
  launchYear: number | null;
}

export type HolidayType = "Public" | "Bank" | "School" | "Authorities" | "Optional" | "Observance";

export interface HolidayFormatted {
  date: string;
  nome: string;           // Nome local (idioma do país)
  nomeEN: string;         // Nome em inglês (fallback)
  tipo: HolidayType;      // Tipo principal
  tipos: HolidayType[];   // Todos os tipos
  global: boolean;
  countryCode: string;
  categoria: "feriado_nacional" | "feriado_bancario" | "feriado_escolar" | "opcional" | "comemorativo" | "personalizado";
  cor: string;            // Cor CSS para o badge
  icone: string;          // Nome do ícone Lucide
}

export interface AvailableCountry {
  countryCode: string;
  name: string;
}

// ─── Mapeamento País → Código ISO ───────────────────────────────────────────
// Mapeia nomes de países (em vários idiomas) para o código ISO alpha-2
// Usado para converter "Portugal" → "PT", "Brasil" → "BR", etc.

const PAIS_PARA_CODIGO: Record<string, string> = {
  // Português
  "portugal": "PT", "brasil": "BR", "espanha": "ES", "frança": "FR",
  "alemanha": "DE", "itália": "IT", "italia": "IT", "reino unido": "GB",
  "estados unidos": "US", "canadá": "CA", "canada": "CA",
  "angola": "AO", "moçambique": "MZ", "mocambique": "MZ",
  "cabo verde": "CV", "são tomé e príncipe": "ST",
  "guiné-bissau": "GW", "guine-bissau": "GW", "timor-leste": "TL",
  "argentina": "AR", "chile": "CL", "colômbia": "CO", "colombia": "CO",
  "méxico": "MX", "mexico": "MX", "peru": "PE", "uruguai": "UY",
  "venezuela": "VE", "paraguai": "PY", "bolívia": "BO", "bolivia": "BO",
  "equador": "EC", "panamá": "PA", "panama": "PA",
  "costa rica": "CR", "cuba": "CU", "república dominicana": "DO",
  "guatemala": "GT", "honduras": "HN", "nicarágua": "NI", "nicaragua": "NI",
  "el salvador": "SV", "porto rico": "PR",
  "suíça": "CH", "suica": "CH", "áustria": "AT", "austria": "AT",
  "bélgica": "BE", "belgica": "BE", "holanda": "NL", "países baixos": "NL",
  "luxemburgo": "LU", "irlanda": "IE", "escócia": "GB", "gales": "GB",
  "dinamarca": "DK", "suécia": "SE", "suecia": "SE",
  "noruega": "NO", "finlândia": "FI", "finlandia": "FI",
  "islândia": "IS", "islandia": "IS",
  "polónia": "PL", "polonia": "PL", "república checa": "CZ", "republica checa": "CZ",
  "eslováquia": "SK", "eslovaquia": "SK", "hungria": "HU",
  "roménia": "RO", "romenia": "RO", "bulgária": "BG", "bulgaria": "BG",
  "croácia": "HR", "croacia": "HR", "sérvia": "RS", "serbia": "RS",
  "eslovénia": "SI", "eslovenia": "SI", "bósnia": "BA", "bosnia": "BA",
  "macedónia do norte": "MK", "macedonia": "MK",
  "albânia": "AL", "albania": "AL", "grécia": "GR", "grecia": "GR",
  "turquia": "TR", "chipre": "CY",
  "rússia": "RU", "russia": "RU", "ucrânia": "UA", "ucrania": "UA",
  "estónia": "EE", "estonia": "EE", "letónia": "LV", "letonia": "LV",
  "lituânia": "LT", "lituania": "LT",
  "japão": "JP", "japao": "JP", "china": "CN",
  "coreia do sul": "KR", "índia": "IN", "india": "IN",
  "austrália": "AU", "australia": "AU", "nova zelândia": "NZ", "nova zelandia": "NZ",
  "áfrica do sul": "ZA", "africa do sul": "ZA",
  "nigéria": "NG", "nigeria": "NG", "quénia": "KE", "quenia": "KE",
  "egito": "EG", "marrocos": "MA", "tunísia": "TN", "tunisia": "TN",
  "israel": "IL", "arábia saudita": "SA", "arabia saudita": "SA",
  "emirados árabes unidos": "AE", "emirados arabes unidos": "AE",
  "singapura": "SG", "malásia": "MY", "malasia": "MY",
  "tailândia": "TH", "tailandia": "TH", "vietnã": "VN", "vietna": "VN",
  "filipinas": "PH", "indonésia": "ID", "indonesia": "ID",

  // English (only unique entries not already in Portuguese)
  "brazil": "BR", "spain": "ES", "france": "FR",
  "germany": "DE", "italy": "IT", "united kingdom": "GB", "uk": "GB",
  "united states": "US", "usa": "US",
  "mozambique": "MZ", "cape verde": "CV",
  "dominican republic": "DO",
  "switzerland": "CH",
  "belgium": "BE",
  "netherlands": "NL", "luxembourg": "LU", "ireland": "IE",
  "denmark": "DK", "sweden": "SE", "norway": "NO",
  "finland": "FI", "iceland": "IS",
  "poland": "PL", "czech republic": "CZ", "czechia": "CZ",
  "slovakia": "SK", "hungary": "HU", "romania": "RO",
  "croatia": "HR",
  "north macedonia": "MK",
  "greece": "GR", "turkey": "TR", "cyprus": "CY",
  "ukraine": "UA",
  "latvia": "LV", "lithuania": "LT",
  "south korea": "KR",
  "new zealand": "NZ",
  "south africa": "ZA",
  "kenya": "KE",
  "egypt": "EG", "morocco": "MA",
  "saudi arabia": "SA",
  "united arab emirates": "AE", "uae": "AE",
  "singapore": "SG", "malaysia": "MY", "thailand": "TH",
  "vietnam": "VN", "philippines": "PH",

  // Español (only unique entries not already above)
  "españa": "ES", "alemania": "DE", "francia": "FR",
  "suiza": "CH", "países bajos": "NL", "paises bajos": "NL",
  "turquía": "TR",
  "japón": "JP", "japon": "JP", "corea del sur": "KR",
  "nueva zelanda": "NZ", "sudáfrica": "ZA", "sudafrica": "ZA",
  "egipto": "EG", "marruecos": "MA", "túnez": "TN", "tunez": "TN",
  "arabia saudí": "SA", "arabia saudi": "SA",
  "emiratos árabes unidos": "AE", "emiratos arabes unidos": "AE",
  "singapur": "SG",
};

// ─── Cache em Memória ───────────────────────────────────────────────────────

interface CacheEntry {
  data: HolidayEntry[];
  timestamp: number;
}

const holidayCache = new Map<string, CacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas
let availableCountriesCache: AvailableCountry[] | null = null;
let availableCountriesCacheTime = 0;

// ─── API Nager.Date ─────────────────────────────────────────────────────────

const NAGER_BASE_URL = "https://date.nager.at/api/v3";

/**
 * Resolver o código ISO do país a partir do nome configurado na clínica
 */
export function resolverCodigoPais(paisNome: string): string | null {
  if (!paisNome) return null;

  // Se já é um código ISO de 2 letras, retornar diretamente
  if (/^[A-Z]{2}$/.test(paisNome.trim())) {
    return paisNome.trim();
  }

  // Procurar no mapeamento (case-insensitive)
  const normalizado = paisNome.trim().toLowerCase();
  const codigo = PAIS_PARA_CODIGO[normalizado];
  if (codigo) return codigo;

  // Tentar match parcial
  for (const [nome, cod] of Object.entries(PAIS_PARA_CODIGO)) {
    if (nome.includes(normalizado) || normalizado.includes(nome)) {
      return cod;
    }
  }

  return null;
}

/**
 * Buscar lista de países disponíveis na API
 */
export async function obterPaisesDisponiveis(): Promise<AvailableCountry[]> {
  // Cache de 7 dias para países (raramente mudam)
  if (availableCountriesCache && (Date.now() - availableCountriesCacheTime) < 7 * 24 * 60 * 60 * 1000) {
    return availableCountriesCache;
  }

  try {
    const res = await fetch(`${NAGER_BASE_URL}/AvailableCountries`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as AvailableCountry[];
    availableCountriesCache = data;
    availableCountriesCacheTime = Date.now();
    return data;
  } catch (err) {
    console.error("[HolidayService] Erro ao buscar países:", err);
    return availableCountriesCache || [];
  }
}

/**
 * Buscar feriados de um país para um ano específico
 * Usa cache em memória com TTL de 24h
 */
export async function obterFeriadosPorPaisAno(countryCode: string, year: number): Promise<HolidayEntry[]> {
  const cacheKey = `${countryCode}-${year}`;

  // Verificar cache
  const cached = holidayCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  try {
    const res = await fetch(`${NAGER_BASE_URL}/PublicHolidays/${year}/${countryCode.toUpperCase()}`);
    if (!res.ok) {
      if (res.status === 404) {
        console.warn(`[HolidayService] País ${countryCode} não suportado pela API`);
        return [];
      }
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json() as HolidayEntry[];

    // Guardar em cache
    holidayCache.set(cacheKey, { data, timestamp: Date.now() });

    return data;
  } catch (err) {
    console.error(`[HolidayService] Erro ao buscar feriados ${countryCode}/${year}:`, err);
    // Retornar cache expirado se existir (melhor que nada)
    return cached?.data || [];
  }
}

/**
 * Buscar próximos feriados de um país
 */
export async function obterProximosFeriados(countryCode: string): Promise<HolidayEntry[]> {
  try {
    const res = await fetch(`${NAGER_BASE_URL}/NextPublicHolidays/${countryCode.toUpperCase()}`);
    if (!res.ok) return [];
    return await res.json() as HolidayEntry[];
  } catch (err) {
    console.error(`[HolidayService] Erro ao buscar próximos feriados ${countryCode}:`, err);
    return [];
  }
}

/**
 * Verificar se hoje é feriado num país
 */
export async function ehHojeFeriado(countryCode: string): Promise<boolean> {
  try {
    const res = await fetch(`${NAGER_BASE_URL}/IsTodayPublicHoliday/${countryCode.toUpperCase()}`);
    // 200 = é feriado, 204 = não é feriado
    return res.status === 200;
  } catch {
    return false;
  }
}

/**
 * Categorizar o tipo de feriado para exibição visual
 */
export function categorizarFeriado(types: HolidayType[]): HolidayFormatted["categoria"] {
  if (types.includes("Public")) return "feriado_nacional";
  if (types.includes("Bank")) return "feriado_bancario";
  if (types.includes("School")) return "feriado_escolar";
  if (types.includes("Optional")) return "opcional";
  if (types.includes("Observance")) return "comemorativo";
  return "comemorativo";
}

/**
 * Obter cor CSS para cada categoria
 */
export function corCategoria(categoria: HolidayFormatted["categoria"]): string {
  switch (categoria) {
    case "feriado_nacional": return "red";
    case "feriado_bancario": return "amber";
    case "feriado_escolar": return "blue";
    case "opcional": return "violet";
    case "comemorativo": return "emerald";
    case "personalizado": return "cyan";
    default: return "gray";
  }
}

/**
 * Obter ícone para cada categoria
 */
export function iconeCategoria(categoria: HolidayFormatted["categoria"]): string {
  switch (categoria) {
    case "feriado_nacional": return "Flag";
    case "feriado_bancario": return "Building";
    case "feriado_escolar": return "GraduationCap";
    case "opcional": return "Star";
    case "comemorativo": return "Heart";
    case "personalizado": return "CalendarPlus";
    default: return "Calendar";
  }
}

/**
 * Formatar feriados para o frontend
 */
export function formatarFeriados(holidays: HolidayEntry[]): HolidayFormatted[] {
  return holidays.map(h => {
    const categoria = categorizarFeriado(h.types);
    return {
      date: h.date,
      nome: h.localName,
      nomeEN: h.name,
      tipo: h.types[0] || "Public",
      tipos: h.types,
      global: h.global,
      countryCode: h.countryCode,
      categoria,
      cor: corCategoria(categoria),
      icone: iconeCategoria(categoria),
    };
  });
}

/**
 * Buscar feriados formatados para um intervalo de meses
 * (útil para a vista mês que pode mostrar dias do mês anterior/seguinte)
 */
export async function obterFeriadosParaPeriodo(
  countryCode: string,
  anoInicio: number,
  anoFim: number
): Promise<HolidayFormatted[]> {
  const anos = new Set<number>();
  for (let y = anoInicio; y <= anoFim; y++) {
    anos.add(y);
  }

  const resultados: HolidayEntry[] = [];
  for (const ano of anos) {
    const feriados = await obterFeriadosPorPaisAno(countryCode, ano);
    resultados.push(...feriados);
  }

  return formatarFeriados(resultados);
}

/**
 * Limpar cache (útil quando o país muda)
 */
export function limparCacheFeriados(): void {
  holidayCache.clear();
}
