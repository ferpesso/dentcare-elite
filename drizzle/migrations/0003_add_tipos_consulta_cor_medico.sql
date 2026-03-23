-- ============================================================
-- Migration 0003: Tipos de Consulta Padronizados + Cor do Médico
-- DentCare Elite V32 — Fase 1 Melhorias Agenda
-- ============================================================

-- Tabela de tipos de consulta padronizados
CREATE TABLE IF NOT EXISTS `tipos_consulta` (
  `id` SERIAL PRIMARY KEY,
  `nome` VARCHAR(100) NOT NULL,
  `descricao` VARCHAR(255),
  `duracao_padrao` INT NOT NULL DEFAULT 30,
  `cor` VARCHAR(30) NOT NULL DEFAULT 'indigo',
  `icone` VARCHAR(50) DEFAULT 'Stethoscope',
  `ordem` INT NOT NULL DEFAULT 0,
  `ativo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Adicionar campo cor ao médico (para distinguir na agenda)
ALTER TABLE `medicos` ADD COLUMN IF NOT EXISTS `cor_agenda` VARCHAR(30) DEFAULT NULL;

-- Adicionar campo tipo_consulta_id à tabela de consultas (referência padronizada)
ALTER TABLE `consultas` ADD COLUMN IF NOT EXISTS `tipo_consulta_id` BIGINT UNSIGNED DEFAULT NULL;

-- Dados iniciais: tipos de consulta comuns em clínicas dentárias
INSERT INTO `tipos_consulta` (`nome`, `descricao`, `duracao_padrao`, `cor`, `icone`, `ordem`) VALUES
  ('Primeira Consulta',       'Avaliação inicial e plano de tratamento',     45,  'blue',    'Search',        1),
  ('Consulta de Rotina',      'Consulta de acompanhamento regular',          30,  'emerald',  'CheckCircle',   2),
  ('Limpeza',                 'Destartarização e polimento',                 30,  'cyan',     'Sparkles',      3),
  ('Extração Simples',        'Extração dentária simples',                   30,  'red',      'Minus',         4),
  ('Extração Complexa',       'Extração cirúrgica ou dente incluso',         60,  'red',      'AlertTriangle', 5),
  ('Endodontia',              'Tratamento de canal radicular',               60,  'amber',    'Crosshair',     6),
  ('Implante',                'Colocação de implante dentário',              90,  'violet',   'Wrench',        7),
  ('Ortodontia (Ajuste)',     'Ajuste de aparelho ortodôntico',              20,  'pink',     'Ruler',         8),
  ('Prótese (Prova)',         'Prova e ajuste de prótese',                   30,  'orange',   'Settings',      9),
  ('Restauração',             'Obturação / restauração dentária',            30,  'teal',     'PenTool',       10),
  ('Branqueamento',           'Branqueamento dentário profissional',         60,  'slate',    'Sun',           11),
  ('Urgência',                'Atendimento de urgência / dor aguda',         30,  'red',      'Zap',           12),
  ('Cirurgia Oral',           'Procedimento cirúrgico oral',                 120, 'rose',     'Scissors',      13),
  ('Consulta Pediátrica',     'Consulta para crianças',                      30,  'sky',      'Baby',          14),
  ('Periodontia',             'Tratamento periodontal',                      45,  'lime',     'Activity',      15),
  ('Radiografia',             'Exame radiográfico',                          15,  'gray',     'Camera',        16);
