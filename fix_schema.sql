-- ============================================================
-- DentCare V35 — Correção completa do schema da BD
-- Adiciona colunas em falta e tabelas em falta
-- ============================================================

-- ─── 1. COLUNAS EM FALTA NA TABELA medicos ─────────────────
ALTER TABLE `medicos` ADD COLUMN IF NOT EXISTS `tipo_remuneracao` ENUM('percentual','percentual_diaria') NOT NULL DEFAULT 'percentual' AFTER `percentual_comissao`;
ALTER TABLE `medicos` ADD COLUMN IF NOT EXISTS `valor_diaria` DECIMAL(10,2) DEFAULT '0.00' AFTER `tipo_remuneracao`;

-- ─── 2. COLUNAS EM FALTA NA TABELA faturas ─────────────────
ALTER TABLE `faturas` ADD COLUMN IF NOT EXISTS `parcelado` BOOLEAN NOT NULL DEFAULT false AFTER `metodo_pagamento`;
ALTER TABLE `faturas` ADD COLUMN IF NOT EXISTS `total_parcelas` INT DEFAULT NULL AFTER `parcelado`;

-- ─── 3. TABELA parcelas (em falta) ─────────────────────────
CREATE TABLE IF NOT EXISTS `parcelas` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `fatura_id` BIGINT UNSIGNED NOT NULL,
  `numero_parcela` INT NOT NULL,
  `total_parcelas` INT NOT NULL,
  `valor` DECIMAL(10,2) NOT NULL,
  `data_vencimento` DATETIME NOT NULL,
  `data_pagamento` DATETIME,
  `estado` ENUM('pendente','paga','atrasada','anulada') NOT NULL DEFAULT 'pendente',
  `metodo_pagamento` ENUM('multibanco','numerario','mbway','transferencia'),
  `observacoes` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `parcelas_id` PRIMARY KEY(`id`),
  CONSTRAINT `parcelas_fatura_id_fk` FOREIGN KEY (`fatura_id`) REFERENCES `faturas`(`id`)
);

-- ─── 4. TABELA materiais_envio_lab (em falta) ──────────────
CREATE TABLE IF NOT EXISTS `materiais_envio_lab` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `envio_id` BIGINT UNSIGNED NOT NULL,
  `tipo_material` ENUM(
    'moldagem_alginato','moldagem_silicone','moldagem_digital',
    'modelo_gesso','modelo_articulador',
    'registo_mordida','registo_arco_facial',
    'provisorio','dente_provisorio','nucleo_espigao',
    'componente_implante','scan_intraoral',
    'fotografias','radiografias','guia_cirurgica',
    'goteira','placa_base','rolos_cera',
    'prova_metal','prova_ceramica','prova_acrilico','prova_zirconia',
    'trabalho_anterior','outro'
  ) NOT NULL DEFAULT 'outro',
  `descricao` VARCHAR(255) NOT NULL,
  `quantidade` INT NOT NULL DEFAULT 1,
  `estado` ENUM(
    'preparado','enviado_lab','recebido_lab','em_uso',
    'devolvido_clinica','recebido_clinica',
    'extraviado','danificado','descartado'
  ) NOT NULL DEFAULT 'preparado',
  `direcao` ENUM('clinica_para_lab','lab_para_clinica') NOT NULL DEFAULT 'clinica_para_lab',
  `data_envio` DATETIME,
  `data_rececao` DATETIME,
  `observacoes` TEXT,
  `verificado_por` VARCHAR(100),
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `materiais_envio_lab_id` PRIMARY KEY(`id`),
  CONSTRAINT `materiais_envio_lab_envio_id_fk` FOREIGN KEY (`envio_id`) REFERENCES `envios_laboratorio`(`id`)
);

-- ─── 5. TABELA guias_remessa_lab (em falta) ────────────────
CREATE TABLE IF NOT EXISTS `guias_remessa_lab` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `envio_id` BIGINT UNSIGNED NOT NULL,
  `numero_guia` VARCHAR(50) NOT NULL,
  `tipo` ENUM('envio','devolucao','reenvio') NOT NULL DEFAULT 'envio',
  `data_emissao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `data_expedicao` DATETIME,
  `transportadora` VARCHAR(100),
  `codigo_rastreamento` VARCHAR(100),
  `materiais_ids` TEXT,
  `observacoes` TEXT,
  `assinatura_envio` VARCHAR(100),
  `assinatura_rececao` VARCHAR(100),
  `data_rececao_confirmada` DATETIME,
  `emitido_por` BIGINT UNSIGNED,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `guias_remessa_lab_id` PRIMARY KEY(`id`),
  CONSTRAINT `guias_remessa_lab_numero_guia_unique` UNIQUE(`numero_guia`),
  CONSTRAINT `guias_remessa_lab_envio_id_fk` FOREIGN KEY (`envio_id`) REFERENCES `envios_laboratorio`(`id`),
  CONSTRAINT `guias_remessa_lab_emitido_por_fk` FOREIGN KEY (`emitido_por`) REFERENCES `users`(`id`)
);

-- ─── 6. TABELA comissoes_medicos (em falta) ────────────────
CREATE TABLE IF NOT EXISTS `comissoes_medicos` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `medico_id` BIGINT UNSIGNED NOT NULL,
  `fatura_id` BIGINT UNSIGNED NOT NULL,
  `tratamento_id` BIGINT UNSIGNED,
  `recibo_id` BIGINT UNSIGNED,
  `utente_id` BIGINT UNSIGNED NOT NULL,
  `valor_fatura` DECIMAL(10,2) NOT NULL,
  `percentual_comissao` DECIMAL(5,2) NOT NULL,
  `valor_comissao` DECIMAL(10,2) NOT NULL,
  `estado` ENUM('pendente','paga','anulada') NOT NULL DEFAULT 'pendente',
  `data_pagamento_utente` DATETIME NOT NULL,
  `data_pagamento_medico` DATETIME,
  `pagamento_comissao_id` BIGINT UNSIGNED,
  `observacoes` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `comissoes_medicos_id` PRIMARY KEY(`id`),
  CONSTRAINT `comissoes_medicos_medico_id_fk` FOREIGN KEY (`medico_id`) REFERENCES `medicos`(`id`),
  CONSTRAINT `comissoes_medicos_fatura_id_fk` FOREIGN KEY (`fatura_id`) REFERENCES `faturas`(`id`),
  CONSTRAINT `comissoes_medicos_tratamento_id_fk` FOREIGN KEY (`tratamento_id`) REFERENCES `tratamentos`(`id`),
  CONSTRAINT `comissoes_medicos_recibo_id_fk` FOREIGN KEY (`recibo_id`) REFERENCES `recibos`(`id`),
  CONSTRAINT `comissoes_medicos_utente_id_fk` FOREIGN KEY (`utente_id`) REFERENCES `utentes`(`id`)
);
CREATE INDEX IF NOT EXISTS `idx_comissoes_medico` ON `comissoes_medicos` (`medico_id`);
CREATE INDEX IF NOT EXISTS `idx_comissoes_estado` ON `comissoes_medicos` (`estado`);
CREATE INDEX IF NOT EXISTS `idx_comissoes_fatura` ON `comissoes_medicos` (`fatura_id`);

-- ─── 7. TABELA notificacoes (em falta) ─────────────────────
CREATE TABLE IF NOT EXISTS `notificacoes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `tipo` ENUM('consulta','pagamento','utente','alerta','sistema','marketing','laboratorio','stock','ia') NOT NULL DEFAULT 'sistema',
  `prioridade` ENUM('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
  `titulo` VARCHAR(255) NOT NULL,
  `mensagem` TEXT NOT NULL,
  `lida` BOOLEAN NOT NULL DEFAULT false,
  `acao_url` VARCHAR(255),
  `acao_label` VARCHAR(100),
  `metadados` TEXT,
  `expires_at` DATETIME,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `notificacoes_id` PRIMARY KEY(`id`),
  CONSTRAINT `notificacoes_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);

-- ─── 8. TABELA clinic_health_snapshots (em falta) ──────────
CREATE TABLE IF NOT EXISTS `clinic_health_snapshots` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `data` DATETIME NOT NULL,
  `score_geral` DECIMAL(5,2) NOT NULL,
  `score_ocupacao` DECIMAL(5,2) NOT NULL,
  `score_no_show` DECIMAL(5,2) NOT NULL,
  `score_receita` DECIMAL(5,2) NOT NULL,
  `score_retencao` DECIMAL(5,2) NOT NULL,
  `score_satisfacao` DECIMAL(5,2) NOT NULL,
  `classificacao` ENUM('excelente','bom','atencao','critico') NOT NULL,
  `recomendacoes` TEXT,
  `metricas` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `clinic_health_snapshots_id` PRIMARY KEY(`id`)
);

-- ─── 9. TABELA conversas_ia (em falta) ─────────────────────
CREATE TABLE IF NOT EXISTS `conversas_ia` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `titulo` VARCHAR(255) NOT NULL,
  `mensagens` TEXT NOT NULL,
  `total_mensagens` INT NOT NULL DEFAULT 0,
  `total_tools_usadas` INT NOT NULL DEFAULT 0,
  `provider` VARCHAR(50),
  `favorita` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `conversas_ia_id` PRIMARY KEY(`id`),
  CONSTRAINT `conversas_ia_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);

-- ─── 10. TABELA comunicacoes_log (em falta) ────────────────
CREATE TABLE IF NOT EXISTS `comunicacoes_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `utente_id` BIGINT UNSIGNED NOT NULL,
  `consulta_id` BIGINT UNSIGNED,
  `canal` VARCHAR(50) NOT NULL,
  `tipo` VARCHAR(100) NOT NULL,
  `direcao` VARCHAR(20) NOT NULL DEFAULT 'saida',
  `mensagem` TEXT,
  `estado` VARCHAR(50) NOT NULL DEFAULT 'enviada',
  `resposta_utente` TEXT,
  `enviado_por` BIGINT UNSIGNED,
  `metadata` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `comunicacoes_log_id` PRIMARY KEY(`id`),
  CONSTRAINT `comunicacoes_log_utente_id_fk` FOREIGN KEY (`utente_id`) REFERENCES `utentes`(`id`),
  CONSTRAINT `comunicacoes_log_consulta_id_fk` FOREIGN KEY (`consulta_id`) REFERENCES `consultas`(`id`),
  CONSTRAINT `comunicacoes_log_enviado_por_fk` FOREIGN KEY (`enviado_por`) REFERENCES `users`(`id`)
);

-- ─── 11. TABELA pagamentos_comissoes (em falta) ────────────
CREATE TABLE IF NOT EXISTS `pagamentos_comissoes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `medico_id` BIGINT UNSIGNED NOT NULL,
  `valor_total` DECIMAL(10,2) NOT NULL,
  `metodo_pagamento` ENUM('transferencia','numerario','cheque','mbway','outro') NOT NULL DEFAULT 'transferencia',
  `referencia` VARCHAR(255),
  `data_pagamento` DATETIME NOT NULL,
  `observacoes` TEXT,
  `comprovativo_url` VARCHAR(500),
  `comprovativo_nome` VARCHAR(255),
  `created_by` BIGINT UNSIGNED,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `pagamentos_comissoes_id` PRIMARY KEY(`id`),
  CONSTRAINT `pagamentos_comissoes_medico_id_fk` FOREIGN KEY (`medico_id`) REFERENCES `medicos`(`id`),
  CONSTRAINT `pagamentos_comissoes_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);

-- ─── 12. Garantir que a coluna cor_agenda tem o default correto ─
-- (já existe, mas pode ter default diferente)
ALTER TABLE `medicos` MODIFY COLUMN `cor_agenda` VARCHAR(30) DEFAULT '#6366F1';

-- ─── FIM ────────────────────────────────────────────────────
SELECT 'Schema corrigido com sucesso!' AS resultado;
