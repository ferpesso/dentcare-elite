-- MySQL dump 10.13  Distrib 8.0.43, for Linux (x86_64)
--
-- Host: localhost    Database: dentcare
-- ------------------------------------------------------
-- Server version	8.0.45-0ubuntu0.22.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `__drizzle_migrations`
--

DROP TABLE IF EXISTS `__drizzle_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `__drizzle_migrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `hash` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `agendas`
--

DROP TABLE IF EXISTS `agendas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agendas` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `medico_id` bigint unsigned NOT NULL,
  `tratamento_id` bigint unsigned DEFAULT NULL,
  `dia_semana` enum('domingo','segunda','terca','quarta','quinta','sexta','sabado') COLLATE utf8mb4_unicode_ci NOT NULL,
  `hora_inicio` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hora_fim` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `intervalo_consulta` int NOT NULL DEFAULT '30',
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `agendas_medico_id_medicos_id_fk` (`medico_id`),
  KEY `agendas_tratamento_id_tratamentos_id_fk` (`tratamento_id`),
  CONSTRAINT `agendas_medico_id_medicos_id_fk` FOREIGN KEY (`medico_id`) REFERENCES `medicos` (`id`),
  CONSTRAINT `agendas_tratamento_id_tratamentos_id_fk` FOREIGN KEY (`tratamento_id`) REFERENCES `tratamentos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `anamneses`
--

DROP TABLE IF EXISTS `anamneses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `anamneses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `utente_id` bigint unsigned NOT NULL,
  `respostas` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `alergias_detectadas` text COLLATE utf8mb4_unicode_ci,
  `problemas_saude` text COLLATE utf8mb4_unicode_ci,
  `assinatura_digital` text COLLATE utf8mb4_unicode_ci,
  `termos_aceites` text COLLATE utf8mb4_unicode_ci,
  `data_assinatura` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `medico_responsavel_id` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `anamneses_utente_id_utentes_id_fk` (`utente_id`),
  KEY `anamneses_medico_responsavel_id_medicos_id_fk` (`medico_responsavel_id`),
  CONSTRAINT `anamneses_medico_responsavel_id_medicos_id_fk` FOREIGN KEY (`medico_responsavel_id`) REFERENCES `medicos` (`id`),
  CONSTRAINT `anamneses_utente_id_utentes_id_fk` FOREIGN KEY (`utente_id`) REFERENCES `utentes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` bigint unsigned NOT NULL,
  `acao` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tabela` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `registo_id` bigint unsigned NOT NULL,
  `valor_anterior` text COLLATE utf8mb4_unicode_ci,
  `valor_novo` text COLLATE utf8mb4_unicode_ci,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `criado_em` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=133 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `campanhas_marketing`
--

DROP TABLE IF EXISTS `campanhas_marketing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campanhas_marketing` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `tipo_template` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mensagem` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('rascunho','agendada','em_progresso','concluida','cancelada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'rascunho',
  `data_agendamento` datetime DEFAULT NULL,
  `data_conclusao` datetime DEFAULT NULL,
  `total_utentes` int DEFAULT '0',
  `total_enviadas` int DEFAULT '0',
  `total_entregues` int DEFAULT '0',
  `total_lidas` int DEFAULT '0',
  `total_respostas` int DEFAULT '0',
  `criado_por` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `catalogo_tratamentos`
--

DROP TABLE IF EXISTS `catalogo_tratamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `catalogo_tratamentos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `especialidade` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `duracao` int NOT NULL,
  `preco_base` decimal(10,2) NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `configuracoes_clinica`
--

DROP TABLE IF EXISTS `configuracoes_clinica`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `configuracoes_clinica` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `chave` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('string','number','boolean','json') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'string',
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `configuracoes_clinica_chave_unique` (`chave`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `consultas`
--

DROP TABLE IF EXISTS `consultas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consultas` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `utente_id` bigint unsigned NOT NULL,
  `medico_id` bigint unsigned NOT NULL,
  `tratamento_id` bigint unsigned DEFAULT NULL,
  `data_hora_inicio` datetime NOT NULL,
  `data_hora_fim` datetime NOT NULL,
  `utente_nome` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `medico_nome` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo_consulta` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('agendada','confirmada','realizada','cancelada','no-show') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'agendada',
  `observacoes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `tipo_consulta_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `consultas_utente_id_utentes_id_fk` (`utente_id`),
  KEY `consultas_medico_id_medicos_id_fk` (`medico_id`),
  KEY `consultas_tratamento_id_tratamentos_id_fk` (`tratamento_id`),
  CONSTRAINT `consultas_medico_id_medicos_id_fk` FOREIGN KEY (`medico_id`) REFERENCES `medicos` (`id`),
  CONSTRAINT `consultas_tratamento_id_tratamentos_id_fk` FOREIGN KEY (`tratamento_id`) REFERENCES `tratamentos` (`id`),
  CONSTRAINT `consultas_utente_id_utentes_id_fk` FOREIGN KEY (`utente_id`) REFERENCES `utentes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contas_social_media`
--

DROP TABLE IF EXISTS `contas_social_media`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contas_social_media` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `plataforma` enum('facebook','instagram','tiktok','linkedin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome_conta` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_plataforma` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_acesso` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_refresh` text COLLATE utf8mb4_unicode_ci,
  `data_expiracao` datetime DEFAULT NULL,
  `ativa` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `contas_social_media_id_plataforma_unique` (`id_plataforma`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dispositivos_moveis`
--

DROP TABLE IF EXISTS `dispositivos_moveis`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dispositivos_moveis` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` bigint unsigned DEFAULT NULL,
  `device_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('ios','android','web') COLLATE utf8mb4_unicode_ci NOT NULL,
  `push_token` text COLLATE utf8mb4_unicode_ci,
  `ultimo_acesso` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `dispositivos_moveis_device_id_unique` (`device_id`),
  KEY `dispositivos_moveis_usuario_id_users_id_fk` (`usuario_id`),
  CONSTRAINT `dispositivos_moveis_usuario_id_users_id_fk` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `envios_laboratorio`
--

DROP TABLE IF EXISTS `envios_laboratorio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `envios_laboratorio` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `laboratorio_id` bigint unsigned NOT NULL,
  `utente_id` bigint unsigned NOT NULL,
  `medico_id` bigint unsigned DEFAULT NULL,
  `tratamento_id` bigint unsigned DEFAULT NULL,
  `tipo_trabalho` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `dente` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cor` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `material` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('criado','enviado','recebido_lab','em_producao','pronto','devolvido','em_prova','ajuste','concluido','cancelado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'criado',
  `prioridade` enum('normal','urgente','muito_urgente') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `data_envio` datetime DEFAULT NULL,
  `data_recebido_lab` datetime DEFAULT NULL,
  `data_prevista_devolucao` datetime DEFAULT NULL,
  `data_devolucao_real` datetime DEFAULT NULL,
  `data_conclusao` datetime DEFAULT NULL,
  `valor_orcado` decimal(10,2) DEFAULT NULL,
  `valor_final` decimal(10,2) DEFAULT NULL,
  `pago` tinyint(1) NOT NULL DEFAULT '0',
  `observacoes` text COLLATE utf8mb4_unicode_ci,
  `historico_estados` text COLLATE utf8mb4_unicode_ci,
  `notificacao_ativa` tinyint(1) NOT NULL DEFAULT '1',
  `notificacao_lida` tinyint(1) NOT NULL DEFAULT '0',
  `criado_por` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `envios_laboratorio_medico_id_fk` (`medico_id`),
  KEY `envios_laboratorio_tratamento_id_fk` (`tratamento_id`),
  KEY `envios_laboratorio_criado_por_fk` (`criado_por`),
  KEY `idx_envios_lab_estado` (`estado`),
  KEY `idx_envios_lab_notificacao` (`notificacao_ativa`,`estado`),
  KEY `idx_envios_lab_laboratorio` (`laboratorio_id`),
  KEY `idx_envios_lab_utente` (`utente_id`),
  CONSTRAINT `envios_laboratorio_criado_por_fk` FOREIGN KEY (`criado_por`) REFERENCES `users` (`id`),
  CONSTRAINT `envios_laboratorio_laboratorio_id_fk` FOREIGN KEY (`laboratorio_id`) REFERENCES `laboratorios` (`id`),
  CONSTRAINT `envios_laboratorio_medico_id_fk` FOREIGN KEY (`medico_id`) REFERENCES `medicos` (`id`),
  CONSTRAINT `envios_laboratorio_tratamento_id_fk` FOREIGN KEY (`tratamento_id`) REFERENCES `tratamentos` (`id`),
  CONSTRAINT `envios_laboratorio_utente_id_fk` FOREIGN KEY (`utente_id`) REFERENCES `utentes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `especialidades`
--

DROP TABLE IF EXISTS `especialidades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `especialidades` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `icone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cor` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `evolucoes`
--

DROP TABLE IF EXISTS `evolucoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evolucoes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tratamento_id` bigint unsigned NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `anotacoes` text COLLATE utf8mb4_unicode_ci,
  `data` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `profissional` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `criado_por` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `evolucoes_tratamento_id_tratamentos_id_fk` (`tratamento_id`),
  CONSTRAINT `evolucoes_tratamento_id_tratamentos_id_fk` FOREIGN KEY (`tratamento_id`) REFERENCES `tratamentos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `evolucoes_clinicas`
--

DROP TABLE IF EXISTS `evolucoes_clinicas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evolucoes_clinicas` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tratamento_id` bigint unsigned NOT NULL,
  `descricao` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `anotacoes` text COLLATE utf8mb4_unicode_ci,
  `profissional` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `procedimento` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data` datetime NOT NULL,
  `criado_por` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_evolucoes_clinicas_user` (`criado_por`),
  KEY `idx_evolucoes_clinicas_tratamento` (`tratamento_id`),
  KEY `idx_evolucoes_clinicas_data` (`data`),
  CONSTRAINT `fk_evolucoes_clinicas_tratamento` FOREIGN KEY (`tratamento_id`) REFERENCES `tratamentos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_evolucoes_clinicas_user` FOREIGN KEY (`criado_por`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `faturas`
--

DROP TABLE IF EXISTS `faturas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `faturas` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `utente_id` bigint unsigned NOT NULL,
  `medico_id` bigint unsigned DEFAULT NULL,
  `tratamento_id` bigint unsigned DEFAULT NULL,
  `numero_fatura` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_documento` enum('fatura','recibo','nota_credito') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'fatura',
  `data_emissao` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `data_vencimento` datetime DEFAULT NULL,
  `utente_nome` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `utente_nif` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subtotal` decimal(10,2) DEFAULT NULL,
  `valor_base` decimal(10,2) NOT NULL,
  `taxa_iva` decimal(5,2) NOT NULL DEFAULT '23.00',
  `iva` decimal(10,2) DEFAULT NULL,
  `total` decimal(10,2) DEFAULT NULL,
  `valor_iva` decimal(10,2) NOT NULL,
  `valor_total` decimal(10,2) NOT NULL,
  `estado` enum('pendente','paga','anulada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendente',
  `metodo_pagamento` enum('multibanco','numerario','mbway','transferencia') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `parcelado` tinyint(1) NOT NULL DEFAULT '0',
  `total_parcelas` int DEFAULT NULL,
  `observacoes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `faturas_numero_fatura_unique` (`numero_fatura`),
  KEY `faturas_utente_id_utentes_id_fk` (`utente_id`),
  KEY `faturas_medico_id_medicos_id_fk` (`medico_id`),
  KEY `faturas_tratamento_id_tratamentos_id_fk` (`tratamento_id`),
  CONSTRAINT `faturas_medico_id_medicos_id_fk` FOREIGN KEY (`medico_id`) REFERENCES `medicos` (`id`),
  CONSTRAINT `faturas_tratamento_id_tratamentos_id_fk` FOREIGN KEY (`tratamento_id`) REFERENCES `tratamentos` (`id`),
  CONSTRAINT `faturas_utente_id_utentes_id_fk` FOREIGN KEY (`utente_id`) REFERENCES `utentes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `historico_briefing`
--

DROP TABLE IF EXISTS `historico_briefing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `historico_briefing` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` bigint unsigned NOT NULL,
  `secoes` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `duracao` int NOT NULL,
  `conteudo_textual` text COLLATE utf8mb4_unicode_ci,
  `url_audio` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `imagiologia`
--

DROP TABLE IF EXISTS `imagiologia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `imagiologia` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `utente_id` bigint unsigned NOT NULL,
  `tipo` enum('radiografia_periapical','radiografia_panoramica','radiografia_bitewing','radiografia_cefalometrica','fotografia_intraoral','fotografia_extraoral','tomografia_cbct','outro') COLLATE utf8mb4_unicode_ci NOT NULL,
  `s3_url` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `s3_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome_original` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tamanho_bytes` int DEFAULT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `dentes_relacionados` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `analise_ia` text COLLATE utf8mb4_unicode_ci,
  `data_exame` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `imagiologia_utente_id_utentes_id_fk` (`utente_id`),
  CONSTRAINT `imagiologia_utente_id_utentes_id_fk` FOREIGN KEY (`utente_id`) REFERENCES `utentes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `laboratorios`
--

DROP TABLE IF EXISTS `laboratorios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `laboratorios` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nif` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contacto` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `morada` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cidade` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `codigo_postal` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `especialidades` text COLLATE utf8mb4_unicode_ci,
  `tabela_precos` text COLLATE utf8mb4_unicode_ci,
  `prazo_medio_entrega` int DEFAULT '7',
  `avaliacao` decimal(3,1) DEFAULT '5.0',
  `observacoes` text COLLATE utf8mb4_unicode_ci,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `nif` (`nif`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ligacoes`
--

DROP TABLE IF EXISTS `ligacoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ligacoes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `utente_id` bigint unsigned NOT NULL,
  `tipo_ligacao` enum('confirmacao','seguimento','cobranca','agendamento','urgencia') COLLATE utf8mb4_unicode_ci NOT NULL,
  `motivo` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('pendente','em_progresso','concluida','nao_atendeu','cancelada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendente',
  `data_agendada` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `data_concluida` datetime DEFAULT NULL,
  `proxima_ligacao` datetime DEFAULT NULL,
  `notas` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `medicos`
--

DROP TABLE IF EXISTS `medicos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `medicos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cedula_profissional` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `especialidade` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telemovel` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `percentual_comissao` decimal(5,2) NOT NULL DEFAULT '30.00',
  `tipo_remuneracao` enum('percentual','percentual_diaria') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'percentual',
  `valor_diaria` decimal(10,2) DEFAULT '0.00',
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `cor_agenda` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT '#6366F1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `medicos_cedula_profissional_unique` (`cedula_profissional`),
  UNIQUE KEY `medicos_user_id_unique` (`user_id`),
  UNIQUE KEY `medicos_email_unique` (`email`),
  CONSTRAINT `medicos_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `motivos_consulta`
--

DROP TABLE IF EXISTS `motivos_consulta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `motivos_consulta` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `duracao` int NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pagamentos`
--

DROP TABLE IF EXISTS `pagamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pagamentos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `utente_id` bigint unsigned NOT NULL,
  `utente_nome` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `valor` decimal(10,2) NOT NULL,
  `metodo` enum('multibanco','numerario','mbway','transferencia') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('pendente','pago','cancelado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pago',
  `data` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `referencia` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notas` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `pagamentos_utente_id_idx` (`utente_id`),
  CONSTRAINT `pagamentos_utente_id_fk` FOREIGN KEY (`utente_id`) REFERENCES `utentes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pagamentos_tratamento`
--

DROP TABLE IF EXISTS `pagamentos_tratamento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pagamentos_tratamento` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tratamento_id` bigint unsigned NOT NULL,
  `valor` decimal(10,2) NOT NULL,
  `data_pagamento` datetime NOT NULL,
  `metodo` enum('dinheiro','cartao','transferencia','cheque') COLLATE utf8mb4_unicode_ci DEFAULT 'cartao',
  `referencia` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notas` text COLLATE utf8mb4_unicode_ci,
  `criado_por` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_pagamentos_tratamento_user` (`criado_por`),
  KEY `idx_pagamentos_tratamento` (`tratamento_id`),
  KEY `idx_pagamentos_data` (`data_pagamento`),
  CONSTRAINT `fk_pagamentos_tratamento_tratamento` FOREIGN KEY (`tratamento_id`) REFERENCES `tratamentos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pagamentos_tratamento_user` FOREIGN KEY (`criado_por`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `postagens_social`
--

DROP TABLE IF EXISTS `postagens_social`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `postagens_social` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `conta_id` bigint unsigned NOT NULL,
  `conteudo` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `imagens` text COLLATE utf8mb4_unicode_ci,
  `estado` enum('rascunho','agendada','publicada','cancelada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'rascunho',
  `data_agendamento` datetime DEFAULT NULL,
  `data_publicacao` datetime DEFAULT NULL,
  `id_publicacao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `engajamento` text COLLATE utf8mb4_unicode_ci,
  `criado_por` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `postagens_social_conta_id_contas_social_media_id_fk` (`conta_id`),
  CONSTRAINT `postagens_social_conta_id_contas_social_media_id_fk` FOREIGN KEY (`conta_id`) REFERENCES `contas_social_media` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `recibos`
--

DROP TABLE IF EXISTS `recibos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recibos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `fatura_id` bigint unsigned NOT NULL,
  `numero_recibo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data_emissao` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `valor_pago` decimal(10,2) NOT NULL,
  `metodo_pagamento` enum('multibanco','numerario','mbway','transferencia') COLLATE utf8mb4_unicode_ci NOT NULL,
  `observacoes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `recibos_numero_recibo_unique` (`numero_recibo`),
  KEY `recibos_fatura_id_faturas_id_fk` (`fatura_id`),
  CONSTRAINT `recibos_fatura_id_faturas_id_fk` FOREIGN KEY (`fatura_id`) REFERENCES `faturas` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `saft_sequences`
--

DROP TABLE IF EXISTS `saft_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saft_sequences` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ano` int NOT NULL,
  `last_fatura_number` int NOT NULL DEFAULT '0',
  `last_recibo_number` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `saft_sequences_ano_unique` (`ano`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stocks`
--

DROP TABLE IF EXISTS `stocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stocks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `quantidade` int NOT NULL DEFAULT '0',
  `quantidade_minima` int NOT NULL DEFAULT '0',
  `unidade` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `preco_custo` decimal(10,2) NOT NULL DEFAULT '0.00',
  `preco_venda` decimal(10,2) NOT NULL DEFAULT '0.00',
  `fornecedor` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `categoria` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `templates_evolucao`
--

DROP TABLE IF EXISTS `templates_evolucao`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `templates_evolucao` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `template` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `templates_whatsapp`
--

DROP TABLE IF EXISTS `templates_whatsapp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `templates_whatsapp` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `template` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `termos_consentimento`
--

DROP TABLE IF EXISTS `termos_consentimento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `termos_consentimento` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `titulo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `conteudo` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `obrigatorio` tinyint(1) NOT NULL DEFAULT '1',
  `versao` int NOT NULL DEFAULT '1',
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tipos_consulta`
--

DROP TABLE IF EXISTS `tipos_consulta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipos_consulta` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `duracao_padrao` int NOT NULL DEFAULT '30',
  `cor` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'indigo',
  `icone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Stethoscope',
  `ordem` int NOT NULL DEFAULT '0',
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tratamentos`
--

DROP TABLE IF EXISTS `tratamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tratamentos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `consulta_id` bigint unsigned DEFAULT NULL,
  `utente_id` bigint unsigned NOT NULL,
  `medico_id` bigint unsigned NOT NULL,
  `tratamento_id` bigint unsigned DEFAULT NULL,
  `dente` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `data_inicio` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `data_fim_estimada` datetime DEFAULT NULL,
  `valor_bruto` decimal(10,2) NOT NULL DEFAULT '0.00',
  `custos_diretos` decimal(10,2) NOT NULL DEFAULT '0.00',
  `base_calculo` decimal(10,2) NOT NULL DEFAULT '0.00',
  `valor_comissao` decimal(10,2) NOT NULL DEFAULT '0.00',
  `lucro_clinica` decimal(10,2) NOT NULL DEFAULT '0.00',
  `estado` enum('pendente','proposto','em_progresso','concluido','cancelado','anulado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendente',
  `observacoes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `tratamentos_consulta_id_consultas_id_fk` (`consulta_id`),
  KEY `tratamentos_utente_id_utentes_id_fk` (`utente_id`),
  KEY `tratamentos_medico_id_medicos_id_fk` (`medico_id`),
  KEY `tratamentos_tratamento_id_tratamentos_id_fk` (`tratamento_id`),
  CONSTRAINT `tratamentos_consulta_id_consultas_id_fk` FOREIGN KEY (`consulta_id`) REFERENCES `consultas` (`id`),
  CONSTRAINT `tratamentos_medico_id_medicos_id_fk` FOREIGN KEY (`medico_id`) REFERENCES `medicos` (`id`),
  CONSTRAINT `tratamentos_tratamento_id_tratamentos_id_fk` FOREIGN KEY (`tratamento_id`) REFERENCES `tratamentos` (`id`),
  CONSTRAINT `tratamentos_utente_id_utentes_id_fk` FOREIGN KEY (`utente_id`) REFERENCES `utentes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `open_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `login_method` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('master','admin','medico','recepcao','user') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `two_factor_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `two_factor_secret` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_signed_in` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `clinica_id` bigint unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `users_open_id_unique` (`open_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `utentes`
--

DROP TABLE IF EXISTS `utentes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `utentes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nif` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_nascimento` datetime DEFAULT NULL,
  `genero` enum('masculino','feminino','outro') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `morada` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `localidade` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cidade` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `codigo_postal` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pais` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Portugal',
  `telemovel` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observacoes` text COLLATE utf8mb4_unicode_ci,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  `updated_at` datetime NOT NULL DEFAULT '2026-03-03 13:08:12',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `utentes_nif_unique` (`nif`),
  UNIQUE KEY `utentes_email_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `comissoes_medicos`
--

DROP TABLE IF EXISTS `comissoes_medicos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comissoes_medicos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `medico_id` bigint unsigned NOT NULL,
  `fatura_id` bigint unsigned NOT NULL,
  `tratamento_id` bigint unsigned DEFAULT NULL,
  `recibo_id` bigint unsigned DEFAULT NULL,
  `utente_id` bigint unsigned NOT NULL,
  `valor_fatura` decimal(10,2) NOT NULL,
  `percentual_comissao` decimal(5,2) NOT NULL,
  `valor_comissao` decimal(10,2) NOT NULL,
  `estado` enum('pendente','paga','anulada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendente',
  `data_pagamento_utente` datetime NOT NULL,
  `data_pagamento_medico` datetime DEFAULT NULL,
  `observacoes` text COLLATE utf8mb4_unicode_ci,
  `pagamento_comissao_id` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `idx_comissoes_medico` (`medico_id`),
  KEY `idx_comissoes_estado` (`estado`),
  KEY `idx_comissoes_fatura` (`fatura_id`),
  CONSTRAINT `fk_comissoes_medico` FOREIGN KEY (`medico_id`) REFERENCES `medicos` (`id`),
  CONSTRAINT `fk_comissoes_fatura` FOREIGN KEY (`fatura_id`) REFERENCES `faturas` (`id`),
  CONSTRAINT `fk_comissoes_tratamento` FOREIGN KEY (`tratamento_id`) REFERENCES `tratamentos` (`id`),
  CONSTRAINT `fk_comissoes_recibo` FOREIGN KEY (`recibo_id`) REFERENCES `recibos` (`id`),
  CONSTRAINT `fk_comissoes_utente` FOREIGN KEY (`utente_id`) REFERENCES `utentes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notificacoes`
--

DROP TABLE IF EXISTS `notificacoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificacoes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `tipo` enum('info','aviso','alerta','sucesso') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info',
  `titulo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mensagem` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `link` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lida` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `idx_notificacoes_user` (`user_id`),
  KEY `idx_notificacoes_lida` (`lida`),
  CONSTRAINT `fk_notificacoes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clinic_health_snapshots`
--

DROP TABLE IF EXISTS `clinic_health_snapshots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clinic_health_snapshots` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `data` date NOT NULL,
  `score` int NOT NULL DEFAULT '0',
  `metricas` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `idx_health_data` (`data`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `conversas_ia`
--

DROP TABLE IF EXISTS `conversas_ia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conversas_ia` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `titulo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mensagens` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `idx_conversas_user` (`user_id`),
  CONSTRAINT `fk_conversas_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `comunicacoes_log`
--

DROP TABLE IF EXISTS `comunicacoes_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comunicacoes_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `utente_id` bigint unsigned DEFAULT NULL,
  `canal` enum('whatsapp','sms','email','telefone') COLLATE utf8mb4_unicode_ci NOT NULL,
  `direcao` enum('enviada','recebida') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'enviada',
  `destinatario` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `assunto` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `conteudo` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('enviada','entregue','lida','falha') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'enviada',
  `erro` text COLLATE utf8mb4_unicode_ci,
  `provider_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `idx_comunicacoes_utente` (`utente_id`),
  KEY `idx_comunicacoes_canal` (`canal`),
  CONSTRAINT `fk_comunicacoes_utente` FOREIGN KEY (`utente_id`) REFERENCES `utentes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pagamentos_comissoes`
--

DROP TABLE IF EXISTS `pagamentos_comissoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pagamentos_comissoes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `medico_id` bigint unsigned NOT NULL,
  `valor_total` decimal(10,2) NOT NULL,
  `metodo_pagamento` enum('transferencia','numerario','cheque','mbway','outro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'transferencia',
  `referencia` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_pagamento` datetime NOT NULL,
  `observacoes` text COLLATE utf8mb4_unicode_ci,
  `comprovativo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comprovativo_nome` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `idx_pagamentos_comissoes_medico` (`medico_id`),
  KEY `idx_pagamentos_comissoes_data` (`data_pagamento`),
  CONSTRAINT `fk_pagamentos_comissoes_medico` FOREIGN KEY (`medico_id`) REFERENCES `medicos` (`id`),
  CONSTRAINT `fk_pagamentos_comissoes_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-10  7:05:59
