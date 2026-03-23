-- Migração: Adicionar tabelas de Tratamentos e Evolução Clínica
-- Data: 27 de Fevereiro de 2026
-- Descrição: Implementar sistema completo de tratamentos com especialidades e evolução clínica

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabela: especialidades
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS especialidades (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL UNIQUE,
  descricao TEXT,
  icone VARCHAR(50),
  cor VARCHAR(20),
  ativo BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ativo (ativo),
  INDEX idx_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabela: tratamentos
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tratamentos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  utenteId INT NOT NULL,
  dente VARCHAR(10),
  descricao VARCHAR(255) NOT NULL,
  especialidadeId INT,
  estado ENUM('aberto', 'finalizado', 'suspenso') DEFAULT 'aberto',
  valor DECIMAL(10,2),
  percentualPago DECIMAL(5,2) DEFAULT 0,
  dataInicio DATETIME NOT NULL,
  dataFim DATETIME,
  notas TEXT,
  criadoPor INT NOT NULL,
  atualizadoPor INT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (utenteId) REFERENCES utentes(id) ON DELETE CASCADE,
  FOREIGN KEY (especialidadeId) REFERENCES especialidades(id) ON DELETE SET NULL,
  FOREIGN KEY (criadoPor) REFERENCES users(id),
  FOREIGN KEY (atualizadoPor) REFERENCES users(id),
  
  INDEX idx_utente (utenteId),
  INDEX idx_especialidade (especialidadeId),
  INDEX idx_estado (estado),
  INDEX idx_dente (dente),
  INDEX idx_data (dataInicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabela: evolucoes_clinicas
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evolucoes_clinicas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tratamentoId INT NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  anotacoes TEXT,
  profissional VARCHAR(100),
  procedimento VARCHAR(100),
  data DATETIME NOT NULL,
  criadoPor INT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tratamentoId) REFERENCES tratamentos(id) ON DELETE CASCADE,
  FOREIGN KEY (criadoPor) REFERENCES users(id),
  
  INDEX idx_tratamento (tratamentoId),
  INDEX idx_data (data),
  INDEX idx_profissional (profissional)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabela: pagamentos_tratamento
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pagamentos_tratamento (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tratamentoId INT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  dataPagamento DATETIME NOT NULL,
  metodo ENUM('dinheiro', 'cartao', 'transferencia', 'cheque') DEFAULT 'cartao',
  referencia VARCHAR(100),
  notas TEXT,
  criadoPor INT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tratamentoId) REFERENCES tratamentos(id) ON DELETE CASCADE,
  FOREIGN KEY (criadoPor) REFERENCES users(id),
  
  INDEX idx_tratamento (tratamentoId),
  INDEX idx_data (dataPagamento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- Inserir especialidades padrão
-- ─────────────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO especialidades (nome, descricao, icone, cor) VALUES
('Implantologia', 'Implantes dentários', 'Zap', '#3b82f6'),
('Ortodontia', 'Correção de mordida e alinhamento', 'Smile', '#8b5cf6'),
('Endodontia', 'Tratamento de canal', 'AlertCircle', '#ef4444'),
('Periodontia', 'Doenças da gengiva', 'Heart', '#ec4899'),
('Prostodontia', 'Próteses e coroas', 'Crown', '#f59e0b'),
('Estética', 'Clareamento e restaurações estéticas', 'Sparkles', '#fbbf24'),
('Cirurgia Oral', 'Extrações e cirurgias', 'Scissors', '#6366f1'),
('Pedodontia', 'Odontologia pediátrica', 'Baby', '#06b6d4');

-- ─────────────────────────────────────────────────────────────────────────────
-- Views úteis para relatórios
-- ─────────────────────────────────────────────────────────────────────────────

-- View: Resumo de tratamentos por utente
CREATE OR REPLACE VIEW v_tratamentos_resumo AS
SELECT 
  u.id as utenteId,
  u.nome,
  COUNT(t.id) as totalTratamentos,
  SUM(CASE WHEN t.estado = 'aberto' THEN 1 ELSE 0 END) as abertos,
  SUM(CASE WHEN t.estado = 'finalizado' THEN 1 ELSE 0 END) as finalizados,
  SUM(CASE WHEN t.estado = 'suspenso' THEN 1 ELSE 0 END) as suspensos,
  SUM(t.valor) as valorTotal,
  SUM(t.valor * t.percentualPago / 100) as valorPago,
  SUM(t.valor * (100 - t.percentualPago) / 100) as valorPendente
FROM utentes u
LEFT JOIN tratamentos t ON u.id = t.utenteId
GROUP BY u.id, u.nome;

-- View: Tratamentos por especialidade
CREATE OR REPLACE VIEW v_tratamentos_especialidade AS
SELECT 
  e.id,
  e.nome as especialidade,
  COUNT(t.id) as totalTratamentos,
  SUM(CASE WHEN t.estado = 'aberto' THEN 1 ELSE 0 END) as abertos,
  SUM(CASE WHEN t.estado = 'finalizado' THEN 1 ELSE 0 END) as finalizados,
  SUM(t.valor) as valorTotal
FROM especialidades e
LEFT JOIN tratamentos t ON e.id = t.especialidadeId
GROUP BY e.id, e.nome;

-- View: Evolução clínica recente
CREATE OR REPLACE VIEW v_evolucoes_recentes AS
SELECT 
  ec.id,
  ec.tratamentoId,
  t.descricao as tratamento,
  t.dente,
  u.nome as utente,
  ec.descricao,
  ec.profissional,
  ec.data,
  e.nome as especialidade
FROM evolucoes_clinicas ec
JOIN tratamentos t ON ec.tratamentoId = t.id
JOIN utentes u ON t.utenteId = u.id
LEFT JOIN especialidades e ON t.especialidadeId = e.id
ORDER BY ec.data DESC;
