CREATE TABLE `agendas` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`medico_id` bigint unsigned NOT NULL,
	`tratamento_id` bigint unsigned,
	`dia_semana` enum('domingo','segunda','terca','quarta','quinta','sexta','sabado') NOT NULL,
	`hora_inicio` varchar(5) NOT NULL,
	`hora_fim` varchar(5) NOT NULL,
	`intervalo_consulta` int NOT NULL DEFAULT 30,
	`ativo` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.498',
	`updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.498',
	CONSTRAINT `agendas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `anamneses` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`utente_id` bigint unsigned NOT NULL,
	`respostas` text NOT NULL,
	`alergias_detectadas` text,
	`problemas_saude` text,
	`assinatura_digital` text,
	`termos_aceites` text,
	`data_assinatura` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	`medico_responsavel_id` bigint unsigned,
	`created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	`updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	CONSTRAINT `anamneses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`usuario_id` bigint unsigned NOT NULL,
	`acao` varchar(50) NOT NULL,
	`tabela` varchar(100) NOT NULL,
	`registo_id` bigint unsigned NOT NULL,
	`valor_anterior` text,
	`valor_novo` text,
	`descricao` text,
	`criado_em` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.497',
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campanhas_marketing` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`tipo_template` varchar(50) NOT NULL,
	`mensagem` text NOT NULL,
	`estado` enum('rascunho','agendada','em_progresso','concluida','cancelada') NOT NULL DEFAULT 'rascunho',
	`data_agendamento` datetime,
	`data_conclusao` datetime,
	`total_utentes` int DEFAULT 0,
	`total_enviadas` int DEFAULT 0,
	`total_entregues` int DEFAULT 0,
	`total_lidas` int DEFAULT 0,
	`total_respostas` int DEFAULT 0,
	`criado_por` bigint unsigned NOT NULL,
	`created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	`updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	CONSTRAINT `campanhas_marketing_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `catalogo_tratamentos` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`especialidade` varchar(100) NOT NULL,
	`duracao` int NOT NULL,
	`preco_base` decimal(10,2) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	`updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	CONSTRAINT `catalogo_tratamentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `configuracoes_clinica` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`chave` varchar(100) NOT NULL,
	`valor` text NOT NULL,
	`tipo` enum('string','number','boolean','json') NOT NULL DEFAULT 'string',
	`descricao` text,
	`updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	CONSTRAINT `configuracoes_clinica_id` PRIMARY KEY(`id`),
	CONSTRAINT `configuracoes_clinica_chave_unique` UNIQUE(`chave`)
);
--> statement-breakpoint
CREATE TABLE `consultas` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`utente_id` bigint unsigned NOT NULL,
	`medico_id` bigint unsigned NOT NULL,
	`tratamento_id` bigint unsigned,
	`data_hora_inicio` datetime NOT NULL,
	`data_hora_fim` datetime NOT NULL,
	`tipo_consulta` varchar(100),
	`estado` enum('agendada','confirmada','realizada','cancelada','no-show') NOT NULL DEFAULT 'agendada',
	`observacoes` text,
	`created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.498',
	`updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.498',
	CONSTRAINT `consultas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contas_social_media` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`plataforma` enum('facebook','instagram','tiktok','linkedin') NOT NULL,
	`nome_conta` varchar(255) NOT NULL,
	`id_plataforma` varchar(255) NOT NULL,
	`token_acesso` text NOT NULL,
	`token_refresh` text,
	`data_expiracao` datetime,
	`ativa` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	`updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	CONSTRAINT `contas_social_media_id` PRIMARY KEY(`id`),
	CONSTRAINT `contas_social_media_id_plataforma_unique` UNIQUE(`id_plataforma`)
);
--> statement-breakpoint
CREATE TABLE `dispositivos_moveis` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`usuario_id` bigint unsigned,
	`device_id` varchar(255) NOT NULL,
	`tipo` enum('ios','android','web') NOT NULL,
	`push_token` text,
	`ultimo_acesso` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	`created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	`updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	CONSTRAINT `dispositivos_moveis_id` PRIMARY KEY(`id`),
	CONSTRAINT `dispositivos_moveis_device_id_unique` UNIQUE(`device_id`)
);
--> statement-breakpoint
CREATE TABLE `evolucoes` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`tratamento_id` bigint unsigned NOT NULL,
	`descricao` text NOT NULL,
	`anotacoes` text,
	`data` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	`profissional` varchar(255) NOT NULL,
	`criado_por` bigint unsigned NOT NULL,
	`created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	`updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	CONSTRAINT `evolucoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `faturas` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`utente_id` bigint unsigned NOT NULL,
	`medico_id` bigint unsigned,
	`tratamento_id` bigint unsigned,
	`numero_fatura` varchar(50) NOT NULL,
	`tipo_documento` enum('fatura','recibo','nota_credito') NOT NULL DEFAULT 'fatura',
	`data_emissao` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.498',
	`data_vencimento` datetime,
	`valor_base` decimal(10,2) NOT NULL,
	`taxa_iva` decimal(5,2) NOT NULL DEFAULT '23.00',
	`valor_iva` decimal(10,2) NOT NULL,
	`valor_total` decimal(10,2) NOT NULL,
	`estado` enum('pendente','paga','anulada') NOT NULL DEFAULT 'pendente',
	`metodo_pagamento` enum('multibanco','numerario','mbway','transferencia'),
	`observacoes` text,
	`created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.498',
	`updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.498',
	CONSTRAINT `faturas_id` PRIMARY KEY(`id`),
	CONSTRAINT `faturas_numero_fatura_unique` UNIQUE(`numero_fatura`)
);
--> statement-breakpoint
CREATE TABLE `historico_briefing` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`usuario_id` bigint unsigned NOT NULL,
	`secoes` text NOT NULL,
	`duracao` int NOT NULL,
	`conteudo_textual` text,
	`url_audio` text,
	`created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	CONSTRAINT `historico_briefing_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `imagiologia` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`utente_id` bigint unsigned NOT NULL,
	`tipo` enum('radiografia_periapical','radiografia_panoramica','radiografia_bitewing','radiografia_cefalometrica','fotografia_intraoral','fotografia_extraoral','tomografia_cbct','outro') NOT NULL,
	`s3_url` text NOT NULL,
	`s3_key` varchar(255) NOT NULL,
	`nome_original` varchar(255),
	`mime_type` varchar(100),
	`tamanho_bytes` int,
	`descricao` text,
	`dentes_relacionados` varchar(100),
	`analise_ia` text,
	`data_exame` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	`created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	`updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	CONSTRAINT `imagiologia_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ligacoes` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`utente_id` bigint unsigned NOT NULL,
	`tipo_ligacao` enum('confirmacao','seguimento','cobranca','agendamento','urgencia') NOT NULL,
	`motivo` text NOT NULL,
	`estado` enum('pendente','em_progresso','concluida','nao_atendeu','cancelada') NOT NULL DEFAULT 'pendente',
	`data_agendada` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	`data_concluida` datetime,
	`proxima_ligacao` datetime,
	`notas` text,
	`created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	`updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	CONSTRAINT `ligacoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medicos` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned,
	`nome` varchar(255) NOT NULL,
	`cedula_profissional` varchar(50) NOT NULL,
	`especialidade` varchar(100),
	`telemovel` varchar(20),
	`email` varchar(255),
	`percentual_comissao` decimal(5,2) NOT NULL DEFAULT '30.00',
	`ativo` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.497',
	`updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.497',
	CONSTRAINT `medicos_id` PRIMARY KEY(`id`),
	CONSTRAINT `medicos_user_id_unique` UNIQUE(`user_id`),
	CONSTRAINT `medicos_cedula_profissional_unique` UNIQUE(`cedula_profissional`),
	CONSTRAINT `medicos_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `motivos_consulta` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`duracao` int NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	`updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	CONSTRAINT `motivos_consulta_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `postagens_social` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`conta_id` bigint unsigned NOT NULL,
	`conteudo` text NOT NULL,
	`imagens` text,
	`estado` enum('rascunho','agendada','publicada','cancelada') NOT NULL DEFAULT 'rascunho',
	`data_agendamento` datetime,
	`data_publicacao` datetime,
	`id_publicacao` varchar(255),
	`engajamento` text,
	`criado_por` bigint unsigned NOT NULL,
	`created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	`updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	CONSTRAINT `postagens_social_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recibos` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`fatura_id` bigint unsigned NOT NULL,
	`numero_recibo` varchar(50) NOT NULL,
	`data_emissao` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.498',
	`valor_pago` decimal(10,2) NOT NULL,
	`metodo_pagamento` enum('multibanco','numerario','mbway','transferencia') NOT NULL,
	`observacoes` text,
	`created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.498',
	`updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.498',
	CONSTRAINT `recibos_id` PRIMARY KEY(`id`),
	CONSTRAINT `recibos_numero_recibo_unique` UNIQUE(`numero_recibo`)
);
--> statement-breakpoint
CREATE TABLE `saft_sequences` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`ano` int NOT NULL,
	`last_fatura_number` int NOT NULL DEFAULT 0,
	`last_recibo_number` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	`updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	CONSTRAINT `saft_sequences_id` PRIMARY KEY(`id`),
	CONSTRAINT `saft_sequences_ano_unique` UNIQUE(`ano`)
);
--> statement-breakpoint
CREATE TABLE `stocks` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`quantidade` int NOT NULL DEFAULT 0,
	`quantidade_minima` int NOT NULL DEFAULT 0,
	`unidade` varchar(50),
	`preco_custo` decimal(10,2) NOT NULL DEFAULT '0.00',
	`preco_venda` decimal(10,2) NOT NULL DEFAULT '0.00',
	`fornecedor` varchar(255),
	`categoria` varchar(100),
	`ativo` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.498',
	`updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.498',
	CONSTRAINT `stocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `templates_evolucao` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`template` text NOT NULL,
	`categoria` varchar(100) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	`updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	CONSTRAINT `templates_evolucao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `templates_whatsapp` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`template` text NOT NULL,
	`categoria` varchar(100) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	`updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	CONSTRAINT `templates_whatsapp_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `termos_consentimento` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`conteudo` text NOT NULL,
	`obrigatorio` boolean NOT NULL DEFAULT true,
	`versao` int NOT NULL DEFAULT 1,
	`ativo` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	`updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.499',
	CONSTRAINT `termos_consentimento_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tratamentos` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`consulta_id` bigint unsigned,
	`utente_id` bigint unsigned NOT NULL,
	`medico_id` bigint unsigned NOT NULL,
	`tratamento_id` bigint unsigned,
	`dente` varchar(50),
	`descricao` text NOT NULL,
	`data_inicio` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.498',
	`data_fim_estimada` datetime,
	`valor_bruto` decimal(10,2) NOT NULL DEFAULT '0.00',
	`custos_diretos` decimal(10,2) NOT NULL DEFAULT '0.00',
	`base_calculo` decimal(10,2) NOT NULL DEFAULT '0.00',
	`valor_comissao` decimal(10,2) NOT NULL DEFAULT '0.00',
	`lucro_clinica` decimal(10,2) NOT NULL DEFAULT '0.00',
	`estado` enum('pendente','proposto','em_progresso','concluido','cancelado','anulado') NOT NULL DEFAULT 'pendente',
	`observacoes` text,
	`created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.498',
	`updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.498',
	CONSTRAINT `tratamentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`open_id` varchar(255) NOT NULL,
	`name` varchar(255),
	`email` varchar(255),
	`login_method` varchar(100),
	`role` enum('master','admin','medico','recepcao','user') NOT NULL DEFAULT 'user',
	`password_hash` varchar(255),
	`username` varchar(100),
	`two_factor_enabled` boolean NOT NULL DEFAULT false,
	`two_factor_secret` varchar(255),
	`last_signed_in` datetime,
	`created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.496',
	`updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.496',
	`clinica_id` bigint unsigned NOT NULL DEFAULT 1,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_open_id_unique` UNIQUE(`open_id`)
);
--> statement-breakpoint
CREATE TABLE `utentes` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`nif` varchar(15),
	`data_nascimento` datetime,
	`genero` enum('masculino','feminino','outro'),
	`morada` varchar(255),
	`cidade` varchar(100),
	`codigo_postal` varchar(20),
	`pais` varchar(100) DEFAULT 'Portugal',
	`telemovel` varchar(20) NOT NULL,
	`email` varchar(255),
	`observacoes` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.497',
	`updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12.497',
	CONSTRAINT `utentes_id` PRIMARY KEY(`id`),
	CONSTRAINT `utentes_nif_unique` UNIQUE(`nif`),
	CONSTRAINT `utentes_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `agendas` ADD CONSTRAINT `agendas_medico_id_medicos_id_fk` FOREIGN KEY (`medico_id`) REFERENCES `medicos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agendas` ADD CONSTRAINT `agendas_tratamento_id_tratamentos_id_fk` FOREIGN KEY (`tratamento_id`) REFERENCES `tratamentos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `anamneses` ADD CONSTRAINT `anamneses_utente_id_utentes_id_fk` FOREIGN KEY (`utente_id`) REFERENCES `utentes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `anamneses` ADD CONSTRAINT `anamneses_medico_responsavel_id_medicos_id_fk` FOREIGN KEY (`medico_responsavel_id`) REFERENCES `medicos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consultas` ADD CONSTRAINT `consultas_utente_id_utentes_id_fk` FOREIGN KEY (`utente_id`) REFERENCES `utentes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consultas` ADD CONSTRAINT `consultas_medico_id_medicos_id_fk` FOREIGN KEY (`medico_id`) REFERENCES `medicos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consultas` ADD CONSTRAINT `consultas_tratamento_id_tratamentos_id_fk` FOREIGN KEY (`tratamento_id`) REFERENCES `tratamentos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dispositivos_moveis` ADD CONSTRAINT `dispositivos_moveis_usuario_id_users_id_fk` FOREIGN KEY (`usuario_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `evolucoes` ADD CONSTRAINT `evolucoes_tratamento_id_tratamentos_id_fk` FOREIGN KEY (`tratamento_id`) REFERENCES `tratamentos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `faturas` ADD CONSTRAINT `faturas_utente_id_utentes_id_fk` FOREIGN KEY (`utente_id`) REFERENCES `utentes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `faturas` ADD CONSTRAINT `faturas_medico_id_medicos_id_fk` FOREIGN KEY (`medico_id`) REFERENCES `medicos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `faturas` ADD CONSTRAINT `faturas_tratamento_id_tratamentos_id_fk` FOREIGN KEY (`tratamento_id`) REFERENCES `tratamentos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `imagiologia` ADD CONSTRAINT `imagiologia_utente_id_utentes_id_fk` FOREIGN KEY (`utente_id`) REFERENCES `utentes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medicos` ADD CONSTRAINT `medicos_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `postagens_social` ADD CONSTRAINT `postagens_social_conta_id_contas_social_media_id_fk` FOREIGN KEY (`conta_id`) REFERENCES `contas_social_media`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recibos` ADD CONSTRAINT `recibos_fatura_id_faturas_id_fk` FOREIGN KEY (`fatura_id`) REFERENCES `faturas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tratamentos` ADD CONSTRAINT `tratamentos_consulta_id_consultas_id_fk` FOREIGN KEY (`consulta_id`) REFERENCES `consultas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tratamentos` ADD CONSTRAINT `tratamentos_utente_id_utentes_id_fk` FOREIGN KEY (`utente_id`) REFERENCES `utentes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tratamentos` ADD CONSTRAINT `tratamentos_medico_id_medicos_id_fk` FOREIGN KEY (`medico_id`) REFERENCES `medicos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tratamentos` ADD CONSTRAINT `tratamentos_tratamento_id_tratamentos_id_fk` FOREIGN KEY (`tratamento_id`) REFERENCES `tratamentos`(`id`) ON DELETE no action ON UPDATE no action;