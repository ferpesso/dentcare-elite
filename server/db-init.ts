import { migrate } from "drizzle-orm/mysql2/migrator";
import { getDb } from "./db";
import mysql from "mysql2/promise";
import path from "path";
import fs from "fs";
import { tiposConsulta } from "../drizzle/schema";
import { count } from "drizzle-orm";

/**
 * Criar a base de dados se não existir
 * Utiliza ligação direta via mysql2 para evitar problemas de autenticação
 */
async function ensureDatabaseExists() {
  console.log("[Database] A verificar se a base de dados existe...");
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn("[Database] DATABASE_URL nao configurada. Pulando criacao de base de dados.");
    return;
  }

  // FIX V35: Em producao, apenas verificar conexao (nao criar BD automaticamente)
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) {
    console.log("[Database] Modo producao: verificando conexao (BD deve existir previamente).");
  }

  try {
    // Parse da DATABASE_URL: mysql://user:password@host:port/database
    const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!urlMatch) {
      console.warn("[Database] DATABASE_URL inválida. Formato esperado: mysql://user:password@host:port/database");
      return;
    }

    const [, user, password, host, port, database] = urlMatch;

    // Conectar sem especificar a base de dados para poder criá-la
    console.log(`[Database] A conectar a ${host}:${port} como ${user}...`);
    const connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user,
      password,
      authPlugins: {
        mysql_clear_password: () => () => password,
        caching_sha2_password: () => () => password,
      },
    });

    // Criar a base de dados se não existir
    console.log(`[Database] A criar base de dados '${database}' se não existir...`);
    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`[OK] Base de dados '${database}' pronta.`);

    await connection.end();
  } catch (error: any) {
    console.error("[Database] Erro ao criar base de dados:");
    if (error.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error("  -> Erro de ligação: O MySQL não parece estar a correr ou está inacessível.");
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error("  -> Erro de autenticação: Verifique o utilizador e a senha no .env");
    } else {
      console.error("  ->", error.message || error);
    }
    console.warn("[Database] O servidor tentará continuar, mas pode ocorrer erros.");
  }
}

/**
 * FIX BUG #1: Seed automático dos tipos de consulta padrão.
 * Garante que a tabela tipos_consulta nunca fica vazia após a instalação.
 * Idempotente: só insere se a tabela estiver vazia.
 */
async function seedTiposConsulta() {
  const db = await getDb();
  if (!db) return;
  try {
    const [{ total }] = await db.select({ total: count() }).from(tiposConsulta);
    if (total > 0) {
      console.log(`[Seed] tipos_consulta já tem ${total} registos. Seed ignorado.`);
      return;
    }
    console.log("[Seed] A inserir tipos de consulta padrão...");
    const tiposPadrao = [
      { nome: "Primeira Consulta",    descricao: "Avaliação inicial e plano de tratamento",  duracaoPadrao: 45,  cor: "blue",    icone: "Search",        ordem: 1  },
      { nome: "Consulta de Rotina",   descricao: "Consulta de acompanhamento regular",        duracaoPadrao: 30,  cor: "emerald", icone: "CheckCircle",   ordem: 2  },
      { nome: "Limpeza",              descricao: "Destartarização e polimento",               duracaoPadrao: 30,  cor: "cyan",    icone: "Sparkles",      ordem: 3  },
      { nome: "Extração Simples",     descricao: "Extração dentária simples",                 duracaoPadrao: 30,  cor: "red",     icone: "Minus",         ordem: 4  },
      { nome: "Extração Complexa",    descricao: "Extração cirúrgica ou dente incluso",       duracaoPadrao: 60,  cor: "red",     icone: "AlertTriangle", ordem: 5  },
      { nome: "Endodontia",           descricao: "Tratamento de canal radicular",             duracaoPadrao: 60,  cor: "amber",   icone: "Crosshair",     ordem: 6  },
      { nome: "Implante",             descricao: "Colocação de implante dentário",            duracaoPadrao: 90,  cor: "violet",  icone: "Wrench",        ordem: 7  },
      { nome: "Ortodontia (Ajuste)",  descricao: "Ajuste de aparelho ortodôntico",            duracaoPadrao: 20,  cor: "pink",    icone: "Ruler",         ordem: 8  },
      { nome: "Prótese (Prova)",      descricao: "Prova e ajuste de prótese",                 duracaoPadrao: 30,  cor: "orange",  icone: "Settings",      ordem: 9  },
      { nome: "Restauração",          descricao: "Obturação / restauração dentária",          duracaoPadrao: 30,  cor: "teal",    icone: "PenTool",       ordem: 10 },
      { nome: "Branqueamento",        descricao: "Branqueamento dentário profissional",       duracaoPadrao: 60,  cor: "slate",   icone: "Sun",           ordem: 11 },
      { nome: "Urgência",             descricao: "Atendimento de urgência / dor aguda",       duracaoPadrao: 30,  cor: "red",     icone: "Zap",           ordem: 12 },
      { nome: "Cirurgia Oral",        descricao: "Procedimento cirúrgico oral",               duracaoPadrao: 120, cor: "rose",    icone: "Scissors",      ordem: 13 },
      { nome: "Consulta Pediátrica",  descricao: "Consulta para crianças",                   duracaoPadrao: 30,  cor: "sky",     icone: "Baby",          ordem: 14 },
      { nome: "Periodontia",          descricao: "Tratamento periodontal",                   duracaoPadrao: 45,  cor: "lime",    icone: "Activity",      ordem: 15 },
      { nome: "Radiografia",          descricao: "Exame radiográfico",                       duracaoPadrao: 15,  cor: "gray",    icone: "Camera",        ordem: 16 },
    ];
    for (const tipo of tiposPadrao) {
      await db.insert(tiposConsulta).values({
        nome: tipo.nome,
        descricao: tipo.descricao,
        duracaoPadrao: tipo.duracaoPadrao,
        cor: tipo.cor,
        icone: tipo.icone,
        ordem: tipo.ordem,
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    console.log(`[OK] ${tiposPadrao.length} tipos de consulta inseridos com sucesso.`);
  } catch (error: any) {
    if (error?.code === "ER_NO_SUCH_TABLE" || error?.message?.includes("doesn't exist")) {
      console.warn("[Seed] Tabela tipos_consulta ainda não existe. O seed será executado após as migrations.");
    } else {
      console.error("[Seed] Erro ao inserir tipos de consulta:", error?.message || error);
    }
  }
}

export async function initializeDatabase() {
  console.log("[Database] A iniciar verificação de esquema...");
  
  // Primeiro, garantir que a base de dados existe
  await ensureDatabaseExists();

  const db = await getDb();
  if (!db) {
    console.error("[Database] Erro: Não foi possível ligar a base de dados para migração.");
    return;
  }

  try {
    const migrationsPath = path.resolve(process.cwd(), "drizzle", "migrations");
    
    if (!fs.existsSync(migrationsPath)) {
      console.warn("[Database] Pasta de migrações não encontrada em:", migrationsPath);
      return;
    }

    console.log("[Database] A aplicar migrações de:", migrationsPath);
    
    // Aplicar as migrações do Drizzle
    await migrate(db, { 
      migrationsFolder: migrationsPath 
    });
    
    console.log("[OK] Esquema da base de dados actualizado com sucesso.");
  } catch (error: any) {
    console.error("[Database] Erro durante a migração:");
    if (error.code === 'ECONNREFUSED') {
      console.error("  -> Erro de ligação: O MySQL não parece estar a correr ou a DATABASE_URL está incorreta.");
    } else {
      console.error("  ->", error.message || error);
    }
    // Não interromper o arranque do servidor, apenas avisar
    console.warn("[Database] O servidor irá tentar continuar, mas pode ocorrer erros se as tabelas não existirem.");
  }

  // FIX BUG #1: Seed dos tipos de consulta (após migrations)
  await seedTiposConsulta();
}
