import 'dotenv/config';
import type { Config } from "drizzle-kit";

// Parse DATABASE_URL para extrair credenciais individuais
// drizzle-kit v0.31+ requer parâmetros explícitos para MySQL
const dbUrl = process.env.DATABASE_URL ?? "mysql://dentcare:dentcare123@localhost:3306/dentcare";
const _url = new URL(dbUrl);

export default {
  schema: "./drizzle/schema*.ts",
  out: "./drizzle/migrations",
  dialect: "mysql",
  dbCredentials: {
    host: _url.hostname,
    port: parseInt(_url.port || "3306"),
    user: _url.username,
    password: _url.password || "",
    database: _url.pathname.slice(1),
  }
} satisfies Config;
