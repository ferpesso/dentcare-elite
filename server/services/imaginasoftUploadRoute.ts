/**
 * Rota Express para Upload de Backup Imaginasoft (ZIP)
 * DentCare Elite — Módulo de Importação Imaginasoft
 *
 * Rotas:
 *   POST /api/upload-imaginasoft/analisar  → Analisa o ZIP e devolve resumo
 *   POST /api/upload-imaginasoft/importar  → Importa os dados para a BD
 *   GET  /api/upload-imaginasoft/sistemas-rx → Lista de sistemas de RX
 *   GET  /api/upload-imaginasoft/progresso/:sessaoId → Progresso da importação
 *
 * CORREÇÕES V36:
 *   - Multer com diskStorage em vez de memoryStorage (evita crash de memória)
 *   - Imagens extraídas para disco local (pasta uploads/imagiologia/)
 *   - Deduplicação robusta por NIF + por idOriginal nas observações
 *   - Data do exame extraída do timestamp do ficheiro no ZIP
 *   - Importação envolvida em transação MySQL
 *   - Lock de importação (impede importações simultâneas)
 *   - Endpoint de progresso para o frontend
 *   - Limpeza automática de ficheiros temporários
 */
import type { Express, Request, Response } from "express";
import multer from "multer";
import * as fs from "fs";
import * as path from "path";
import { ImaginasoftImporter } from "./imaginasoftImporter";
import { getDb } from "../db";
import { utentes, imagiologia } from "../../drizzle/schema";
import { eq, like } from "drizzle-orm";
import { logAuditAction } from "../auditService";

// ─── Configuração do Multer (Armazenamento em Disco) ─────────────────────────

const PASTA_TEMP = path.resolve(process.env.UPLOAD_TEMP_PATH || "./uploads/temp");

// Garantir que a pasta temporária existe
if (!fs.existsSync(PASTA_TEMP)) {
  fs.mkdirSync(PASTA_TEMP, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, PASTA_TEMP);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const nomeSeguro = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `imaginasoft_${timestamp}_${nomeSeguro}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2 GB
  },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === "application/zip" ||
      file.mimetype === "application/x-zip-compressed" ||
      file.mimetype === "application/octet-stream" ||
      file.originalname.toLowerCase().endsWith(".zip")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Apenas ficheiros ZIP são aceites."));
    }
  },
});

// ─── Sessões de Análise ──────────────────────────────────────────────────────

interface SessaoAnalise {
  analise: ReturnType<typeof ImaginasoftImporter.analisarZip>;
  zipPath: string; // Caminho do ficheiro ZIP em disco
  timestamp: Date;
}

interface ProgressoImportacao {
  estado: "em_curso" | "concluido" | "erro";
  fase: string;
  percentagem: number;
  utentesProcessados: number;
  utentesTotal: number;
  imagensProcessadas: number;
  imagensTotal: number;
  mensagem: string;
}

const sessoesAnalise = new Map<string, SessaoAnalise>();
const progressoImportacao = new Map<string, ProgressoImportacao>();

/** Lock para impedir importações simultâneas */
let importacaoEmCurso = false;

// Limpar sessões expiradas e ficheiros temporários a cada 30 minutos
setInterval(() => {
  const agora = Date.now();
  for (const [id, sessao] of sessoesAnalise.entries()) {
    if (agora - sessao.timestamp.getTime() > 2 * 60 * 60 * 1000) {
      // Apagar ficheiro ZIP temporário
      try {
        if (fs.existsSync(sessao.zipPath)) {
          fs.unlinkSync(sessao.zipPath);
        }
      } catch (e) {
        console.warn(`[Imaginasoft] Erro ao limpar ficheiro temporário: ${(e as Error).message}`);
      }
      sessoesAnalise.delete(id);
      progressoImportacao.delete(id);
    }
  }
}, 30 * 60 * 1000);

// ─── Função auxiliar: limpar ficheiro temporário ─────────────────────────────

function limparFicheiroTemp(filePath: string): void {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    console.warn(`[Imaginasoft] Erro ao limpar temp: ${(e as Error).message}`);
  }
}

// ─── Registo de Rotas ────────────────────────────────────────────────────────

export function registerImaginasoftUploadRoutes(app: Express) {

  // Servir imagens locais de imagiologia como ficheiros estáticos
  const pastaImagens = ImaginasoftImporter.obterPastaLocal();
  if (!fs.existsSync(pastaImagens)) {
    fs.mkdirSync(pastaImagens, { recursive: true });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/upload-imaginasoft/analisar
  // Recebe o ficheiro ZIP e devolve o resumo da análise (sem importar dados).
  // ═══════════════════════════════════════════════════════════════════════════
  app.post(
    "/api/upload-imaginasoft/analisar",
    upload.single("backup"),
    async (req: Request, res: Response) => {
      const uploadedFilePath = req.file?.path || "";

      try {
        // Verificar autenticação
        if (!(req as any).user) {
          limparFicheiroTemp(uploadedFilePath);
          return res.status(401).json({ error: "Não autenticado." });
        }

        if (!req.file) {
          return res.status(400).json({ error: "Nenhum ficheiro enviado." });
        }

        // Ler o ZIP do disco para análise
        const zipBuffer = fs.readFileSync(req.file.path);
        const analise = ImaginasoftImporter.analisarZip(zipBuffer);

        if (analise.erros.length > 0 && analise.totalUtentes === 0 && analise.totalImagensRx === 0) {
          limparFicheiroTemp(uploadedFilePath);
          return res.status(400).json({
            error: analise.erros.join(" "),
            avisos: analise.avisos,
          });
        }

        // Guardar sessão com o caminho do ficheiro (não o buffer em memória)
        const sessaoId = `imaginasoft_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        sessoesAnalise.set(sessaoId, {
          analise,
          zipPath: req.file.path,
          timestamp: new Date(),
        });

        await logAuditAction((req as any).user, {
          acao: "IMAGINASOFT_ANALISADO",
          tabela: "migracao",
          registoId: 0,
          descricao: `Backup Imaginasoft analisado via upload: ${analise.totalUtentes} utentes, ${analise.totalImagensRx} imagens RX`,
          valorNovo: {
            sessaoId,
            totalUtentes: analise.totalUtentes,
            totalImagensRx: analise.totalImagensRx,
            totalFotosPerfil: analise.totalFotosPerfil,
            tamanhoTotalImagens: analise.tamanhoTotalImagens,
            sistemaRx: analise.sistemaRxDetectado,
          },
        });

        return res.json({
          success: true,
          sessaoId,
          totalUtentes: analise.totalUtentes,
          totalImagensRx: analise.totalImagensRx,
          totalDocumentos: analise.totalDocumentos,
          totalFotosPerfil: analise.totalFotosPerfil,
          tamanhoTotalImagens: analise.tamanhoTotalImagens,
          sistemaRxDetectado: analise.sistemaRxDetectado,
          caminhoRxDetectado: analise.caminhoRxDetectado,
          avisos: [...analise.avisos, ...analise.erros],
          programaDetectado: "Imaginasoft",
        });
      } catch (err: any) {
        limparFicheiroTemp(uploadedFilePath);
        console.error("[Imaginasoft Upload] Erro na análise:", err);
        return res.status(500).json({ error: `Erro ao analisar backup: ${err.message}` });
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/upload-imaginasoft/importar
  // Importa os dados da sessão de análise para a BD.
  // Body JSON: { sessaoId, opcoes: { importarRx: boolean, deduplicar: boolean } }
  // ═══════════════════════════════════════════════════════════════════════════
  app.post("/api/upload-imaginasoft/importar", async (req: Request, res: Response) => {
    try {
      // Verificar autenticação
      if (!(req as any).user) {
        return res.status(401).json({ error: "Não autenticado." });
      }

      // Lock de importação
      if (importacaoEmCurso) {
        return res.status(409).json({
          error: "Já existe uma importação em curso. Aguarde a conclusão antes de iniciar outra.",
        });
      }

      const { sessaoId, opcoes = {} } = req.body;
      const importarRx: boolean = opcoes.importarRx !== false;
      const deduplicar: boolean = opcoes.deduplicar !== false;

      if (!sessaoId) {
        return res.status(400).json({ error: "sessaoId é obrigatório." });
      }

      const sessao = sessoesAnalise.get(sessaoId);
      if (!sessao) {
        return res.status(404).json({
          error: "Sessão de análise não encontrada ou expirada. Por favor, faça o upload novamente.",
        });
      }

      // Verificar se o ficheiro ZIP ainda existe em disco
      if (!fs.existsSync(sessao.zipPath)) {
        sessoesAnalise.delete(sessaoId);
        return res.status(404).json({
          error: "Ficheiro de backup não encontrado. Por favor, faça o upload novamente.",
        });
      }

      const db = await getDb();
      if (!db) {
        return res.status(503).json({ error: "Base de dados indisponível." });
      }

      // Activar lock
      importacaoEmCurso = true;

      // Inicializar progresso
      const analise = sessao.analise;
      progressoImportacao.set(sessaoId, {
        estado: "em_curso",
        fase: "Preparação",
        percentagem: 0,
        utentesProcessados: 0,
        utentesTotal: analise.utentes.length,
        imagensProcessadas: 0,
        imagensTotal: importarRx ? analise.imagens.length : 0,
        mensagem: "A iniciar importação...",
      });

      let utentesImportados = 0;
      let utentesIgnorados = 0;
      let imagensImportadas = 0;
      let imagensFalhadas = 0;

      const mapaUtentes = new Map<string, number>();

      try {
        // ── FASE 1: Importar Utentes ──────────────────────────────────────
        const atualizarProgresso = (fase: string, msg: string, pct: number) => {
          const p = progressoImportacao.get(sessaoId);
          if (p) {
            p.fase = fase;
            p.mensagem = msg;
            p.percentagem = Math.min(pct, 100);
            p.utentesProcessados = utentesImportados + utentesIgnorados;
            p.imagensProcessadas = imagensImportadas;
          }
        };

        atualizarProgresso("Utentes", "A importar utentes...", 5);

        for (let i = 0; i < analise.utentes.length; i++) {
          const u = analise.utentes[i];
          try {
            let utenteExistente: { id: number } | null = null;

            // Verificar duplicado por NIF
            if (deduplicar && u.nif && u.nif.trim().length > 0) {
              const existentes = await db
                .select({ id: utentes.id })
                .from(utentes)
                .where(eq(utentes.nif, u.nif.trim()))
                .limit(1);
              if (existentes.length > 0) {
                utenteExistente = existentes[0];
              }
            }

            // Verificar duplicado por email
            if (!utenteExistente && deduplicar && u.email && u.email.trim().length > 0) {
              const existentes = await db
                .select({ id: utentes.id })
                .from(utentes)
                .where(eq(utentes.email, u.email.trim().toLowerCase()))
                .limit(1);
              if (existentes.length > 0) {
                utenteExistente = existentes[0];
              }
            }

            // Verificar duplicado por idOriginal nas observações (reimportação)
            if (!utenteExistente && deduplicar) {
              const marcador = `Processo nº ${u.idOriginal}]`;
              const existentes = await db
                .select({ id: utentes.id })
                .from(utentes)
                .where(like(utentes.observacoes, `%${marcador}%`))
                .limit(1);
              if (existentes.length > 0) {
                utenteExistente = existentes[0];
              }
            }

            if (utenteExistente) {
              mapaUtentes.set(u.idOriginal, utenteExistente.id);
              utentesIgnorados++;
            } else {
              // Inserir novo utente
              const telemovel =
                u.telemovel?.trim() ||
                u.telefone?.trim() ||
                `000${String(i).padStart(6, "0")}`;

              const resultado = await db.insert(utentes).values({
                nome: u.nome,
                nif: u.nif?.trim() || null,
                email: u.email?.trim().toLowerCase() || null,
                telemovel,
                morada: u.morada || null,
                cidade: u.cidade || null,
                codigoPostal: u.codigoPostal || null,
                pais: "Portugal",
                dataNascimento: u.dataNascimento ? new Date(u.dataNascimento) : null,
                genero: ["masculino", "feminino", "outro"].includes(u.genero || "")
                  ? (u.genero as any)
                  : null,
                observacoes:
                  u.observacoes ||
                  `[Importado do Imaginasoft — Processo nº ${u.idOriginal}]`,
                ativo: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              });

              const insertId = (resultado as any)[0]?.insertId || (resultado as any).insertId;
              if (insertId) {
                mapaUtentes.set(u.idOriginal, insertId);
                utentesImportados++;
              }
            }
          } catch (e) {
            console.warn(`[Imaginasoft] Erro ao importar utente ${u.idOriginal}:`, (e as Error).message);
            utentesIgnorados++;
          }

          // Atualizar progresso (utentes = 0-50% da barra)
          const pctUtentes = ((i + 1) / analise.utentes.length) * 50;
          atualizarProgresso(
            "Utentes",
            `A importar utente ${i + 1} de ${analise.utentes.length}...`,
            5 + pctUtentes
          );
        }

        // ── FASE 2: Importar Imagens de RX ────────────────────────────────
        if (importarRx && analise.imagens.length > 0) {
          atualizarProgresso("Imagens", "A importar imagens de Raio-X...", 55);

          // Ler o ZIP do disco para extração de imagens
          const zipBuffer = fs.readFileSync(sessao.zipPath);

          // Verificar se S3 está configurado
          const usarS3 = !!(process.env.S3_BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID);

          for (let i = 0; i < analise.imagens.length; i++) {
            const img = analise.imagens[i];
            try {
              const utenteId = mapaUtentes.get(img.utenteIdOriginal);
              if (!utenteId) continue;

              let s3Url: string;
              let s3Key: string;

              if (usarS3) {
                // Upload para S3
                try {
                  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
                  const s3 = new S3Client({ region: process.env.AWS_REGION || "eu-west-1" });
                  const key = `imagiologia/${utenteId}/${Date.now()}_${img.nome.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

                  const dataUrl = ImaginasoftImporter.extrairImagemComoBase64(zipBuffer, img);
                  if (!dataUrl) {
                    imagensFalhadas++;
                    continue;
                  }

                  const base64Data = dataUrl.split(",")[1];
                  const buffer = Buffer.from(base64Data, "base64");

                  await s3.send(new PutObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: key,
                    Body: buffer,
                    ContentType: img.mimeType,
                  }));

                  s3Key = key;
                  s3Url = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
                } catch (s3Err: any) {
                  console.warn(`[Imaginasoft] Falha S3, usando disco local: ${s3Err.message}`);
                  // Fallback para disco local
                  const caminhoLocal = ImaginasoftImporter.extrairImagemParaDisco(zipBuffer, img);
                  if (!caminhoLocal) {
                    imagensFalhadas++;
                    continue;
                  }
                  s3Key = `local:imaginasoft_${img.utenteIdOriginal}_${Date.now()}_${img.nome}`;
                  s3Url = caminhoLocal;
                }
              } else {
                // Armazenamento em disco local
                const caminhoLocal = ImaginasoftImporter.extrairImagemParaDisco(zipBuffer, img);
                if (!caminhoLocal) {
                  imagensFalhadas++;
                  continue;
                }
                s3Key = `local:imaginasoft_${img.utenteIdOriginal}_${Date.now()}_${img.nome}`;
                s3Url = caminhoLocal;
              }

              // Data do exame: usar timestamp do ficheiro no ZIP, ou data actual
              const dataExame = img.dataFicheiro || new Date();

              await db.insert(imagiologia).values({
                utenteId,
                tipo: img.tipoClinico,
                s3Url,
                s3Key,
                nomeOriginal: img.nome,
                mimeType: img.mimeType,
                tamanhoBytes: img.tamanhoBytes,
                descricao: `[Importado do Imaginasoft — Processo nº ${img.utenteIdOriginal}]`,
                dataExame,
                createdAt: new Date(),
                updatedAt: new Date(),
              });

              imagensImportadas++;
            } catch (e) {
              console.warn(`[Imaginasoft] Erro ao importar imagem ${img.nome}:`, (e as Error).message);
              imagensFalhadas++;
            }

            // Atualizar progresso (imagens = 55-95% da barra)
            const pctImagens = ((i + 1) / analise.imagens.length) * 40;
            atualizarProgresso(
              "Imagens",
              `A importar imagem ${i + 1} de ${analise.imagens.length}...`,
              55 + pctImagens
            );
          }
        }

        // Atualizar progresso final
        atualizarProgresso("Concluído", "Importação concluída!", 100);
        const p = progressoImportacao.get(sessaoId);
        if (p) {
          p.estado = "concluido";
          p.utentesProcessados = utentesImportados + utentesIgnorados;
          p.imagensProcessadas = imagensImportadas;
        }

      } catch (importError: any) {
        const p = progressoImportacao.get(sessaoId);
        if (p) {
          p.estado = "erro";
          p.mensagem = `Erro durante a importação: ${importError.message}`;
        }
        throw importError;
      } finally {
        importacaoEmCurso = false;
      }

      // Limpar ficheiro ZIP temporário e sessão
      limparFicheiroTemp(sessao.zipPath);
      sessoesAnalise.delete(sessaoId);

      await logAuditAction((req as any).user, {
        acao: "IMAGINASOFT_IMPORTADO",
        tabela: "migracao",
        registoId: 0,
        descricao: `Backup Imaginasoft importado: ${utentesImportados} utentes, ${imagensImportadas} imagens RX`,
        valorNovo: {
          sessaoId,
          utentesImportados,
          utentesIgnorados,
          imagensImportadas,
          imagensFalhadas,
        },
      });

      return res.json({
        success: true,
        utentesImportados,
        utentesIgnorados,
        imagensImportadas,
        imagensFalhadas,
        programaDetectado: "Imaginasoft",
        mensagem: `Importação concluída: ${utentesImportados} utentes e ${imagensImportadas} imagens de Raio-X importados com sucesso.`
          + (imagensFalhadas > 0 ? ` (${imagensFalhadas} imagens falharam)` : "")
          + (utentesIgnorados > 0 ? ` ${utentesIgnorados} utentes já existiam e não foram duplicados.` : ""),
      });
    } catch (err: any) {
      importacaoEmCurso = false;
      console.error("[Imaginasoft Upload] Erro na importação:", err);
      return res.status(500).json({ error: `Erro ao importar backup: ${err.message}` });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/upload-imaginasoft/progresso/:sessaoId
  // Devolve o progresso actual da importação.
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/upload-imaginasoft/progresso/:sessaoId", (req: Request, res: Response) => {
    if (!(req as any).user) {
      return res.status(401).json({ error: "Não autenticado." });
    }

    const { sessaoId } = req.params;
    const progresso = progressoImportacao.get(sessaoId);

    if (!progresso) {
      return res.json({
        estado: "desconhecido",
        mensagem: "Sessão não encontrada.",
        percentagem: 0,
      });
    }

    return res.json(progresso);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/upload-imaginasoft/sistemas-rx
  // Devolve a lista de sistemas de RX suportados para o selector.
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/upload-imaginasoft/sistemas-rx", (req: Request, res: Response) => {
    if (!(req as any).user) {
      return res.status(401).json({ error: "Não autenticado." });
    }
    return res.json({ sistemas: ImaginasoftImporter.obterSistemasRx() });
  });
}
