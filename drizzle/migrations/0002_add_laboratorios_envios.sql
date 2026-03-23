-- Migration: Módulo de Laboratórios e Envios
-- DentCare V32 — Controlo de Laboratórios Externos

CREATE TABLE IF NOT EXISTS `laboratorios` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `nome` varchar(255) NOT NULL,
  `nif` varchar(15) UNIQUE,
  `contacto` varchar(100),
  `email` varchar(255),
  `telefone` varchar(20),
  `morada` varchar(255),
  `cidade` varchar(100),
  `codigo_postal` varchar(20),
  `website` varchar(255),
  `especialidades` text,
  `tabela_precos` text,
  `prazo_medio_entrega` int DEFAULT 7,
  `avaliacao` decimal(3,1) DEFAULT 5.0,
  `observacoes` text,
  `ativo` boolean NOT NULL DEFAULT true,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `laboratorios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `envios_laboratorio` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `laboratorio_id` bigint unsigned NOT NULL,
  `utente_id` bigint unsigned NOT NULL,
  `medico_id` bigint unsigned,
  `tratamento_id` bigint unsigned,
  `tipo_trabalho` varchar(100) NOT NULL,
  `descricao` text NOT NULL,
  `dente` varchar(50),
  `cor` varchar(50),
  `material` varchar(100),
  `estado` enum('criado','enviado','recebido_lab','em_producao','pronto','devolvido','em_prova','ajuste','concluido','cancelado') NOT NULL DEFAULT 'criado',
  `prioridade` enum('normal','urgente','muito_urgente') NOT NULL DEFAULT 'normal',
  `data_envio` datetime,
  `data_recebido_lab` datetime,
  `data_prevista_devolucao` datetime,
  `data_devolucao_real` datetime,
  `data_conclusao` datetime,
  `valor_orcado` decimal(10,2),
  `valor_final` decimal(10,2),
  `pago` boolean NOT NULL DEFAULT false,
  `observacoes` text,
  `historico_estados` text,
  `notificacao_ativa` boolean NOT NULL DEFAULT true,
  `notificacao_lida` boolean NOT NULL DEFAULT false,
  `criado_por` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `envios_laboratorio_id` PRIMARY KEY(`id`),
  CONSTRAINT `envios_laboratorio_laboratorio_id_fk` FOREIGN KEY (`laboratorio_id`) REFERENCES `laboratorios`(`id`),
  CONSTRAINT `envios_laboratorio_utente_id_fk` FOREIGN KEY (`utente_id`) REFERENCES `utentes`(`id`),
  CONSTRAINT `envios_laboratorio_medico_id_fk` FOREIGN KEY (`medico_id`) REFERENCES `medicos`(`id`),
  CONSTRAINT `envios_laboratorio_tratamento_id_fk` FOREIGN KEY (`tratamento_id`) REFERENCES `tratamentos`(`id`),
  CONSTRAINT `envios_laboratorio_criado_por_fk` FOREIGN KEY (`criado_por`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_envios_lab_estado` ON `envios_laboratorio` (`estado`);
--> statement-breakpoint
CREATE INDEX `idx_envios_lab_notificacao` ON `envios_laboratorio` (`notificacao_ativa`, `estado`);
--> statement-breakpoint
CREATE INDEX `idx_envios_lab_laboratorio` ON `envios_laboratorio` (`laboratorio_id`);
--> statement-breakpoint
CREATE INDEX `idx_envios_lab_utente` ON `envios_laboratorio` (`utente_id`);
