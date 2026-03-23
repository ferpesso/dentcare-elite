-- ─────────────────────────────────────────────────────────────────────────────
-- Migração 0001: Adicionar tabelas especialidades, evolucoes_clinicas e pagamentos_tratamento
-- FIX: Estas tabelas existiam apenas num ficheiro SQL avulso (docs/0005_...) e não
--      estavam integradas no schema Drizzle nem na migração principal.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `especialidades` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `descricao` text,
  `icone` varchar(50),
  `cor` varchar(20),
  `ativo` boolean NOT NULL DEFAULT true,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir especialidades padrão
INSERT IGNORE INTO `especialidades` (`nome`, `descricao`, `icone`, `cor`) VALUES
('Implantologia', 'Colocação e manutenção de implantes dentários', 'tooth-implant', '#0066FF'),
('Ortodontia', 'Correcção de má-oclusão e alinhamento dentário', 'braces', '#FF6600'),
('Endodontia', 'Tratamento de canais radiculares', 'root-canal', '#CC0000'),
('Periodontologia', 'Tratamento de doenças das gengivas e osso alveolar', 'gum', '#009900'),
('Cirurgia Oral', 'Extracções e cirurgias da cavidade oral', 'scalpel', '#990099'),
('Dentisteria Operatória', 'Restaurações e tratamentos conservadores', 'filling', '#006699'),
('Prostodontia', 'Próteses dentárias fixas e removíveis', 'crown', '#CC6600'),
('Odontopediatria', 'Cuidados dentários para crianças', 'child-tooth', '#FF3399');

CREATE TABLE IF NOT EXISTS `evolucoes_clinicas` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tratamento_id` bigint unsigned NOT NULL,
  `descricao` varchar(255) NOT NULL,
  `anotacoes` text,
  `profissional` varchar(100),
  `procedimento` varchar(100),
  `data` datetime NOT NULL,
  `criado_por` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_evolucoes_clinicas_tratamento` FOREIGN KEY (`tratamento_id`) REFERENCES `tratamentos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_evolucoes_clinicas_user` FOREIGN KEY (`criado_por`) REFERENCES `users` (`id`),
  INDEX `idx_evolucoes_clinicas_tratamento` (`tratamento_id`),
  INDEX `idx_evolucoes_clinicas_data` (`data`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pagamentos_tratamento` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tratamento_id` bigint unsigned NOT NULL,
  `valor` decimal(10,2) NOT NULL,
  `data_pagamento` datetime NOT NULL,
  `metodo` enum('dinheiro','cartao','transferencia','cheque') DEFAULT 'cartao',
  `referencia` varchar(100),
  `notas` text,
  `criado_por` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_pagamentos_tratamento_tratamento` FOREIGN KEY (`tratamento_id`) REFERENCES `tratamentos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pagamentos_tratamento_user` FOREIGN KEY (`criado_por`) REFERENCES `users` (`id`),
  INDEX `idx_pagamentos_tratamento` (`tratamento_id`),
  INDEX `idx_pagamentos_data` (`data_pagamento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
