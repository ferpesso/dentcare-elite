-- Script final para criar as tabelas em falta na base de dados railway
-- Ajuste nos tipos de dados para compatibilidade com bigint unsigned

-- 1. Tabela notificacoes
CREATE TABLE IF NOT EXISTS notificacoes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    lida BOOLEAN DEFAULT FALSE,
    tipo VARCHAR(50),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Tabela clinic_health_snapshots
CREATE TABLE IF NOT EXISTS clinic_health_snapshots (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    data_snapshot DATE NOT NULL,
    total_consultas INT DEFAULT 0,
    faturacao_total DECIMAL(10, 2) DEFAULT 0.00,
    novos_utentes INT DEFAULT 0,
    taxa_ocupacao DECIMAL(5, 2),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela conversas_ia
CREATE TABLE IF NOT EXISTS conversas_ia (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    contexto VARCHAR(100),
    mensagem_utilizador TEXT NOT NULL,
    resposta_ia TEXT NOT NULL,
    tokens_utilizados INT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Tabela comunicacoes_log
CREATE TABLE IF NOT EXISTS comunicacoes_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tipo_comunicacao ENUM('email', 'sms', 'whatsapp') NOT NULL,
    destinatario VARCHAR(255) NOT NULL,
    assunto VARCHAR(255),
    conteudo TEXT,
    status VARCHAR(50),
    data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabela pagamentos_comissoes
CREATE TABLE IF NOT EXISTS pagamentos_comissoes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    medico_id BIGINT UNSIGNED NOT NULL,
    valor_comissao DECIMAL(10, 2) NOT NULL,
    referencia_consulta_id BIGINT UNSIGNED,
    status_pagamento ENUM('pendente', 'pago', 'cancelado') DEFAULT 'pendente',
    data_pagamento DATE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE CASCADE
);
