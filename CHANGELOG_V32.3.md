# DentCare Elite — Changelog V32.3

**Data de lançamento:** Março 2026  
**Tipo:** Upgrade de Segurança, Correções e Consistência

---

## Resumo Executivo

A versão V32.3 consolida e corrige todos os pontos identificados na auditoria técnica pós-V32.2, com foco em segurança da API, consistência da moeda dinâmica, propagação correcta do nome da clínica e actualização da versão em toda a aplicação.

---

## Correções de Segurança (Críticas)

### SEC-01 — `/api/auth/me` não expunha dados sensíveis
- **Problema:** A rota `GET /api/auth/me` devolvia o objecto completo do utilizador da BD, incluindo `passwordHash` e `twoFactorSecret`.
- **Correcção:** Os campos `passwordHash` e `twoFactorSecret` são agora removidos da resposta antes de ser enviada ao cliente. O objecto interno `req.user` mantém todos os campos para uso no RBAC e 2FA do lado do servidor.

---

## Moeda Dinâmica — Cobertura Completa

### MOE-01 — `src/components/DashboardExecutivo.tsx`
- Adicionado `useConfig` com `formatMoeda` e `simboloMoeda`.
- Substituídas todas as ocorrências de `€{valor}` por `{formatMoeda(valor)}`.

### MOE-02 — `src/components/AlertasSaude.tsx`
- Adicionado `useConfig` com `formatMoeda`.
- Substituída a ocorrência de `€{alerta.impactoFinanceiro.toFixed(2)}` por `{formatMoeda(alerta.impactoFinanceiro)}`.

### MOE-03 — `src/components/OtimizadorAgenda.tsx`
- Adicionado `useConfig` com `formatMoeda`.
- Substituídas todas as ocorrências de `€{potencial}` por `{formatMoeda(potencial)}`.

---

## Nome da Clínica Dinâmico — Cobertura Completa

### NOM-01 — `server/routers/marketing.ts`
- O footer das mensagens WhatsApp interativas era `"DentCare — A sua clínica digital"` (hardcoded).
- Corrigido: o nome da clínica é agora obtido da BD (`configuracoesClinica`) e usado dinamicamente: `` `${nomeClinica} — A sua clínica digital` ``.

### NOM-02 — `server/routers/system.ts`
- O endpoint `config` devolvia `appName: "DentCare Elite"` (hardcoded).
- Corrigido: o `appName` é agora obtido da BD (`nome_clinica`).
- A versão foi actualizada de `"31.0"` para `"32.3"` nos endpoints `health` e `config`.

### NOM-03 — `server/twoFactor.ts`
- O nome da aplicação no QR Code do 2FA era `"DentCare V28 (email)"` (hardcoded).
- Corrigido: a função `generateTwoFactorSecret` aceita agora um parâmetro opcional `nomeClinica` e usa-o como nome da aplicação e emissor no TOTP.

---

## Actualização de Versão

### VER-01 — Cabeçalhos de ficheiros
- Todos os cabeçalhos de comentários `DentCare Elite V32.2` actualizados para `V32.3` em `client/src/` e `server/`.

### VER-02 — Sidebar
- A versão exibida na Sidebar foi actualizada de `Elite V32.2` para `Elite V32.3`.

### VER-03 — SistemaPage
- A descrição do servidor e a informação de versão no painel de sistema foram actualizadas para `V32.3`.

### VER-04 — `package.json`
- Versão actualizada de `32.2.0` para `32.3.0`.

### VER-05 — `ecosystem.config.js`
- Nome do processo PM2 actualizado de `dentcare-v32` para `dentcare-v32.3`.

---

## Notas Técnicas

- Nenhuma migração de base de dados é necessária para esta versão.
- Nenhuma alteração ao schema Drizzle.
- Compatível com todas as instalações V32.2 existentes (upgrade directo).

---

## Próximos Passos (V32.4 — Planeado)

| Prioridade | Funcionalidade |
|---|---|
| Alta | Envio real de email via Nodemailer (recuperação de password) |
| Alta | Session store persistente (Redis/MySQL) para modo cluster |
| Média | Alertas de pagamentos em atraso com notificação real |
| Média | Alertas de stock mínimo com notificação real |
| Baixa | Upload de logótipo da clínica |
| Baixa | Exportação SAFT-PT |
| Baixa | Integração MBWay real |
| Baixa | Tema claro completo |
