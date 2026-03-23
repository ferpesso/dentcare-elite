-- FIX v35: Criar tabelas em falta identificadas na análise de integração
-- Tabelas: notificacoes, clinic_health_snapshots, conversas_ia, comunicacoes_log

-- ============================================================
-- NOTIFICAÇÕES PERSISTENTES (Centro de Notificações)
-- ============================================================
CREATE TABLE IF NOT EXISTS `notificacoes` (
  `id` serial AUTO_INCREMENT PRIMARY KEY,
  `user_id` bigint unsigned NOT NULL,
  `tipo` enum('consulta','pagamento','utente','alerta','sistema','marketing','laboratorio','stock','ia') NOT NULL DEFAULT 'sistema',
  `prioridade` enum('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
  `titulo` varchar(255) NOT NULL,
  `mensagem` text NOT NULL,
  `lida` boolean NOT NULL DEFAULT false,
  `acao_url` varchar(255),
  `acao_label` varchar(100),
  `metadados` text,
  `expires_at` datetime,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `notificacoes_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);

-- ============================================================
-- CLINIC HEALTH SNAPSHOTS (Score de Saúde Diário)
-- ============================================================
CREATE TABLE IF NOT EXISTS `clinic_health_snapshots` (
  `id` serial AUTO_INCREMENT PRIMARY KEY,
  `data` datetime NOT NULL,
  `score_geral` decimal(5,2) NOT NULL,
  `score_ocupacao` decimal(5,2) NOT NULL,
  `score_no_show` decimal(5,2) NOT NULL,
  `score_receita` decimal(5,2) NOT NULL,
  `score_retencao` decimal(5,2) NOT NULL,
  `score_satisfacao` decimal(5,2) NOT NULL,
  `classificacao` enum('excelente','bom','atencao','critico') NOT NULL,
  `recomendacoes` text,
  `metricas` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- CONVERSAS IA (Histórico de Conversas do Assistente)
-- ============================================================
CREATE TABLE IF NOT EXISTS `conversas_ia` (
  `id` serial AUTO_INCREMENT PRIMARY KEY,
  `user_id` bigint unsigned NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `mensagens` text NOT NULL,
  `total_mensagens` int NOT NULL DEFAULT 0,
  `total_tools_usadas` int NOT NULL DEFAULT 0,
  `provider` varchar(50),
  `favorita` boolean NOT NULL DEFAULT false,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `conversas_ia_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);

-- ============================================================
-- LOG DE COMUNICAÇÕES (Conectores + Comunicação Integrada)
-- ============================================================
CREATE TABLE IF NOT EXISTS `comunicacoes_log` (
  `id` serial AUTO_INCREMENT PRIMARY KEY,
  `utente_id` bigint unsigned NOT NULL,
  `consulta_id` bigint unsigned,
  `canal` varchar(50) NOT NULL,
  `tipo` varchar(100) NOT NULL,
  `direcao` varchar(20) NOT NULL DEFAULT 'saida',
  `mensagem` text,
  `estado` varchar(50) NOT NULL DEFAULT 'enviada',
  `resposta_utente` text,
  `enviado_por` bigint unsigned,
  `metadata` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `comunicacoes_log_utente_id_fk` FOREIGN KEY (`utente_id`) REFERENCES `utentes`(`id`),
  CONSTRAINT `comunicacoes_log_consulta_id_fk` FOREIGN KEY (`consulta_id`) REFERENCES `consultas`(`id`),
  CONSTRAINT `comunicacoes_log_enviado_por_fk` FOREIGN KEY (`enviado_por`) REFERENCES `users`(`id`)
);
