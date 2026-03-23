-- Migração 0008: Adicionar tabelas parcelas e pagamentos
-- Corrige o erro: "Table doesn't exist" para tabelas definidas no schema mas sem migração SQL

-- ============================================================
-- PARCELAS (Parcelamento de Faturas)
-- ============================================================
CREATE TABLE IF NOT EXISTS `parcelas` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `fatura_id` bigint unsigned NOT NULL,
  `numero_parcela` int NOT NULL,
  `total_parcelas` int NOT NULL,
  `valor` decimal(10,2) NOT NULL,
  `data_vencimento` datetime NOT NULL,
  `data_pagamento` datetime,
  `estado` enum('pendente','paga','atrasada','anulada') NOT NULL DEFAULT 'pendente',
  `metodo_pagamento` enum('multibanco','numerario','mbway','transferencia'),
  `observacoes` text,
  `created_at` datetime NOT NULL DEFAULT (NOW()),
  `updated_at` datetime NOT NULL DEFAULT (NOW()),
  CONSTRAINT `parcelas_id` PRIMARY KEY(`id`),
  CONSTRAINT `fk_parcelas_fatura` FOREIGN KEY (`fatura_id`) REFERENCES `faturas`(`id`) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS `idx_parcelas_fatura` ON `parcelas` (`fatura_id`);
CREATE INDEX IF NOT EXISTS `idx_parcelas_estado` ON `parcelas` (`estado`);
CREATE INDEX IF NOT EXISTS `idx_parcelas_vencimento` ON `parcelas` (`data_vencimento`);

-- ============================================================
-- PAGAMENTOS (Registo de Pagamentos Avulsos)
-- ============================================================
CREATE TABLE IF NOT EXISTS `pagamentos` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `utente_id` bigint unsigned NOT NULL,
  `utente_nome` varchar(255),
  `valor` decimal(10,2) NOT NULL,
  `metodo` enum('multibanco','numerario','mbway','transferencia'),
  `estado` enum('pendente','pago','cancelado') NOT NULL DEFAULT 'pago',
  `data` datetime NOT NULL DEFAULT (NOW()),
  `referencia` varchar(100),
  `notas` text,
  `created_at` datetime NOT NULL DEFAULT (NOW()),
  `updated_at` datetime NOT NULL DEFAULT (NOW()),
  CONSTRAINT `pagamentos_id` PRIMARY KEY(`id`),
  CONSTRAINT `fk_pagamentos_utente` FOREIGN KEY (`utente_id`) REFERENCES `utentes`(`id`) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS `idx_pagamentos_utente` ON `pagamentos` (`utente_id`);
CREATE INDEX IF NOT EXISTS `idx_pagamentos_data` ON `pagamentos` (`data`);
CREATE INDEX IF NOT EXISTS `idx_pagamentos_estado` ON `pagamentos` (`estado`);
