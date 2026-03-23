-- Migration: Materiais de Envio para Laboratório
-- DentCare V32.8 — Gestão Completa de Materiais Clínica ↔ Laboratório
--
-- Funcionalidades:
-- - Checklist de materiais enviados e recebidos
-- - Rastreamento individual de cada material (moldagem, modelo, registo mordida, etc.)
-- - Estado de cada material (enviado, recebido, devolvido, extraviado)
-- - Guia de remessa/expedição com numeração automática
-- - Associação directa envio ↔ tratamento

-- ─── Tabela de Materiais por Envio ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `materiais_envio_lab` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `envio_id` bigint unsigned NOT NULL,
  `tipo_material` enum(
    'moldagem_alginato',
    'moldagem_silicone',
    'moldagem_digital',
    'modelo_gesso',
    'modelo_articulador',
    'registo_mordida',
    'registo_arco_facial',
    'provisorio',
    'dente_provisorio',
    'nucleo_espigao',
    'componente_implante',
    'scan_intraoral',
    'fotografias',
    'radiografias',
    'guia_cirurgica',
    'goteira',
    'placa_base',
    'rolos_cera',
    'prova_metal',
    'prova_ceramica',
    'prova_acrilico',
    'prova_zirconia',
    'trabalho_anterior',
    'outro'
  ) NOT NULL DEFAULT 'outro',
  `descricao` varchar(255) NOT NULL,
  `quantidade` int NOT NULL DEFAULT 1,
  `estado` enum(
    'preparado',
    'enviado_lab',
    'recebido_lab',
    'em_uso',
    'devolvido_clinica',
    'recebido_clinica',
    'extraviado',
    'danificado',
    'descartado'
  ) NOT NULL DEFAULT 'preparado',
  `direcao` enum('clinica_para_lab', 'lab_para_clinica') NOT NULL DEFAULT 'clinica_para_lab',
  `data_envio` datetime,
  `data_rececao` datetime,
  `observacoes` text,
  `verificado_por` varchar(100),
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `materiais_envio_lab_id` PRIMARY KEY(`id`),
  CONSTRAINT `materiais_envio_lab_envio_id_fk` FOREIGN KEY (`envio_id`) REFERENCES `envios_laboratorio`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `idx_materiais_envio_id` ON `materiais_envio_lab` (`envio_id`);
--> statement-breakpoint
CREATE INDEX `idx_materiais_estado` ON `materiais_envio_lab` (`estado`);
--> statement-breakpoint
CREATE INDEX `idx_materiais_direcao` ON `materiais_envio_lab` (`direcao`);

-- ─── Tabela de Guias de Remessa ─────────────────────────────────────────────
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `guias_remessa_lab` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `envio_id` bigint unsigned NOT NULL,
  `numero_guia` varchar(50) NOT NULL UNIQUE,
  `tipo` enum('envio', 'devolucao', 'reenvio') NOT NULL DEFAULT 'envio',
  `data_emissao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `data_expedicao` datetime,
  `transportadora` varchar(100),
  `codigo_rastreamento` varchar(100),
  `materiais_ids` text, -- JSON: [1, 2, 3] IDs dos materiais incluídos
  `observacoes` text,
  `assinatura_envio` varchar(100), -- Quem assinou o envio
  `assinatura_rececao` varchar(100), -- Quem assinou a receção
  `data_rececao_confirmada` datetime,
  `emitido_por` bigint unsigned,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `guias_remessa_lab_id` PRIMARY KEY(`id`),
  CONSTRAINT `guias_remessa_lab_envio_id_fk` FOREIGN KEY (`envio_id`) REFERENCES `envios_laboratorio`(`id`) ON DELETE CASCADE,
  CONSTRAINT `guias_remessa_lab_emitido_por_fk` FOREIGN KEY (`emitido_por`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_guias_remessa_envio` ON `guias_remessa_lab` (`envio_id`);
--> statement-breakpoint
CREATE INDEX `idx_guias_remessa_numero` ON `guias_remessa_lab` (`numero_guia`);
