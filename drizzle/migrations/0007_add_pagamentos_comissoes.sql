-- ============================================================
-- Migration 0007: Tabela de Pagamentos de Comissões (Comprovativos Agrupados)
-- DentCare Elite V35 — Pagamento em lote com comprovativo de depósito
-- ============================================================

-- 1. Criar tabela de pagamentos agrupados de comissões
CREATE TABLE IF NOT EXISTS `pagamentos_comissoes` (
  `id` SERIAL PRIMARY KEY,
  `medico_id` BIGINT UNSIGNED NOT NULL,
  `valor_total` DECIMAL(10, 2) NOT NULL,
  `metodo_pagamento` ENUM('transferencia', 'numerario', 'cheque', 'mbway', 'outro') NOT NULL DEFAULT 'transferencia',
  `referencia` VARCHAR(255) DEFAULT NULL,
  `data_pagamento` DATETIME NOT NULL,
  `observacoes` TEXT DEFAULT NULL,
  `comprovativo_url` VARCHAR(500) DEFAULT NULL,
  `comprovativo_nome` VARCHAR(255) DEFAULT NULL,
  `created_by` BIGINT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_pagamentos_comissoes_medico` FOREIGN KEY (`medico_id`) REFERENCES `medicos`(`id`),
  CONSTRAINT `fk_pagamentos_comissoes_user` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);

-- Índices para consultas frequentes
CREATE INDEX `idx_pagamentos_comissoes_medico` ON `pagamentos_comissoes` (`medico_id`);
CREATE INDEX `idx_pagamentos_comissoes_data` ON `pagamentos_comissoes` (`data_pagamento`);

-- 2. Adicionar coluna de ligação na tabela comissoes_medicos
-- Esta coluna liga cada comissão individual ao pagamento agrupado
ALTER TABLE `comissoes_medicos` ADD COLUMN IF NOT EXISTS `pagamento_comissao_id` BIGINT UNSIGNED DEFAULT NULL;
