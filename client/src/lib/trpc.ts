/**
 * lib/trpc.ts — Cliente tRPC
 * DentCare Elite V10.2
 *
 * Exporta o cliente tRPC para uso em toda a aplicação.
 */

import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../server/routers';

export const trpc = createTRPCReact<AppRouter>();
