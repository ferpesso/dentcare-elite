# DentCare Elite V34 — Atualização de Inteligência e Produtividade

A versão 34 do DentCare foca-se na introdução de ferramentas avançadas de produtividade e análise de negócio, mantendo o compromisso de ser **100% gratuito** (sem custos de APIs ou dependências externas pagas). Esta atualização transforma a forma como as clínicas analisam os seus dados e interagem com a plataforma.

A principal novidade desta versão é a introdução do **Score de Saúde da Clínica**. Trata-se de um algoritmo composto inovador que avalia a saúde geral do negócio, atribuindo uma classificação de 0 a 100. Este cálculo tem em conta cinco dimensões críticas: a ocupação da agenda, a taxa de no-show, a receita face aos objetivos estabelecidos, a retenção de pacientes e a satisfação estimada. Mais do que apenas apresentar um número, o sistema gera recomendações automáticas e inteligentes para ajudar os gestores a melhorar os resultados nestas áreas.

Para maximizar a produtividade dos utilizadores, implementámos a **Barra de Comandos Inteligente**. Acessível em qualquer parte da aplicação através do atalho de teclado `Ctrl+K`, esta ferramenta funciona como um motor de pesquisa universal. Permite aos utilizadores encontrar rapidamente páginas específicas, localizar utentes ou executar ações diretas, como iniciar o processo de uma nova consulta ou emitir uma fatura. Em complemento, foi adicionado um sistema global de atalhos de teclado que facilita a navegação sem necessidade de recorrer ao rato.

O sistema de alertas foi totalmente redesenhado com o novo **Centro de Notificações Inteligente**. Em vez de simples avisos temporários, as notificações são agora persistentes e guardadas na base de dados. O centro organiza as mensagens por nível de prioridade (Crítica, Alta, Média, Baixa) e permite filtrá-las por categoria, como pagamentos ou avisos do sistema. Os utilizadores podem ainda interagir diretamente com as notificações, marcando-as como lidas ou eliminando-as rapidamente.

A capacidade analítica da plataforma foi reforçada através do **Resumo Semanal Automático**. Esta funcionalidade compila um relatório exaustivo que compara os indicadores-chave de desempenho (KPIs) com a semana transata. O documento destaca os pacientes que geraram maior receita, alerta para tendências preocupantes (como o aumento de faltas) e pode ser exportado num formato HTML elegante, ideal para envio por email ou apresentação em reuniões de equipa.

No que diz respeito à inteligência artificial, o Assistente IA recebeu um conjunto de **seis novas ferramentas MCP (Model Context Protocol)**, elevando o total de capacidades reais para vinte e duas. As novas adições dividem-se em ferramentas de análise, capazes de detetar tendências e comparar períodos, e ferramentas de automação, que conseguem gerar listas de pacientes para reativação ou sugerir otimizações para a agenda da clínica. A própria interface do chat com a IA foi melhorada, suportando agora a renderização de texto formatado (Markdown), histórico de conversas persistente e a possibilidade de exportar os diálogos.

Por fim, a interface gráfica recebeu novas visualizações de dados para facilitar a interpretação da informação. Destacam-se o **Heatmap da Agenda**, que ilustra a densidade de ocupação por dia e hora, ajudando a identificar os períodos de maior afluência. O **Funil de Pacientes** oferece uma perspetiva clara da taxa de conversão, desde o primeiro registo até à fidelização do utente. Adicionalmente, a nova **Timeline do Paciente** centraliza todo o histórico clínico, financeiro e de comunicação numa única linha cronológica interativa.

A nível técnico, estas funcionalidades foram suportadas pela adição de novas tabelas à base de dados, especificamente para o armazenamento de notificações, histórico de conversas com a IA e registos diários do score de saúde, acompanhadas dos respetivos routers de comunicação no backend.

---
*Atualização desenvolvida por DentCare AI.*
