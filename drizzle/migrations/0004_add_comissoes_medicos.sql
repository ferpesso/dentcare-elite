-- ============================================================
-- Migration 0004: Tabela de Comissões dos Médicos
-- DentCare Elite V32.4 — Rastreamento de comissões por pagamento
-- ============================================================
CREATE TABLE IF NOT EXISTS `comissoes_medicos` (
  `id` SERIAL PRIMARY KEY,
  `medico_id` BIGINT UNSIGNED NOT NULL,
  `fatura_id` BIGINT UNSIGNED NOT NULL,
  `tratamento_id` BIGINT UNSIGNED DEFAULT NULL,
  `recibo_id` BIGINT UNSIGNED DEFAULT NULL,
  `utente_id` BIGINT UNSIGNED NOT NULL,
  `valor_fatura` DECIMAL(10, 2) NOT NULL,
  `percentual_comissao` DECIMAL(5, 2) NOT NULL,
  `valor_comissao` DECIMAL(10, 2) NOT NULL,
  `estado` ENUM('pendente', 'paga', 'anulada') NOT NULL DEFAULT 'pendente',
  `data_pagamento_utente` DATETIME NOT NULL,
  `data_pagamento_medico` DATETIME DEFAULT NULL,
  `observacoes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_comissoes_medico` FOREIGN KEY (`medico_id`) REFERENCES `medicos`(`id`),
  CONSTRAINT `fk_comissoes_fatura` FOREIGN KEY (`fatura_id`) REFERENCES `faturas`(`id`),
  CONSTRAINT `fk_comissoes_tratamento` FOREIGN KEY (`tratamento_id`) REFERENCES `tratamentos`(`id`),
  CONSTRAINT `fk_comissoes_recibo` FOREIGN KEY (`recibo_id`) REFERENCES `recibos`(`id`),
  CONSTRAINT `fk_comissoes_utente` FOREIGN KEY (`utente_id`) REFERENCES `utentes`(`id`)
);
-- Índices para consultas frequentes
CREATE INDEX IF NOT EXISTS `idx_comissoes_medico` ON `comissoes_medicos` (`medico_id`);
CREATE INDEX IF NOT EXISTS `idx_comissoes_estado` ON `comissoes_medicos` (`estado`);
CREATE INDEX IF NOT EXISTS `idx_comissoes_fatura` ON `comissoes_medicos` (`fatura_id`);
