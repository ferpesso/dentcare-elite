import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // req.user é populado pelo authMiddleware (server/_core/auth.ts)
  const user = (opts.req as any).user as User | undefined;
  return {
    req: opts.req,
    res: opts.res,
    user: user ?? null,
  };
}
