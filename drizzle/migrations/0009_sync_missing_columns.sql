-- ============================================================
-- Migration 0009: Sincronizar colunas em falta entre schema.ts e BD
-- DentCare Elite V35.5 — Correcção de dessincronização crítica
-- ============================================================
-- Problema: Várias colunas foram adicionadas ao schema.ts (Drizzle ORM)
-- mas nunca foram criadas na base de dados via migration SQL.
-- Isto causava erros "Failed query" ao tentar inserir/atualizar dados.
-- ============================================================

-- ─── TABELA: utentes ──────────────────────────────────────────────────────
-- Coluna 'localidade' em falta (causava erro ao criar/editar utentes)
ALTER TABLE `utentes`
  ADD COLUMN IF NOT EXISTS `localidade` VARCHAR(100) DEFAULT NULL;

-- ─── TABELA: medicos ──────────────────────────────────────────────────────
-- Colunas 'tipo_remuneracao' e 'valor_diaria' em falta
-- (causavam erro ao criar/editar médicos)
ALTER TABLE `medicos`
  ADD COLUMN IF NOT EXISTS `tipo_remuneracao` ENUM('percentual','percentual_diaria') NOT NULL DEFAULT 'percentual',
  ADD COLUMN IF NOT EXISTS `valor_diaria` DECIMAL(10,2) DEFAULT '0.00';

-- ─── TABELA: consultas ────────────────────────────────────────────────────
-- Colunas desnormalizadas 'utente_nome' e 'medico_nome' em falta
-- (causavam erros ao criar consultas quando o ORM tentava escrever nestes campos)
ALTER TABLE `consultas`
  ADD COLUMN IF NOT EXISTS `utente_nome` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `medico_nome` VARCHAR(255) DEFAULT NULL;

-- ─── TABELA: faturas ──────────────────────────────────────────────────────
-- Múltiplas colunas em falta que causavam erros no módulo de faturação
ALTER TABLE `faturas`
  ADD COLUMN IF NOT EXISTS `utente_nome` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `utente_nif` VARCHAR(15) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `subtotal` DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `iva` DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `total` DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `parcelado` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `total_parcelas` INT DEFAULT NULL;
