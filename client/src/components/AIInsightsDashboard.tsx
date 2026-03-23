/**
 * AIInsightsDashboard.tsx — Dashboard de Insights de IA
 * DentCare Elite V32.3 — AI-Powered Intelligence
 * UPGRADE V32.3: Moeda dinâmica via ConfigContext (useConfig)
 *
 * Exibe predições, análises e insights automáticos
 */

import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import { useConfig } from "../contexts/ConfigContext";
import {
  TrendingUp,
  AlertTriangle,
  Zap,
  Brain,
  BarChart3,
  Lightbulb,
  RefreshCw,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "./Card";
import { Alert } from "./Alert";
import { SkeletonCard, SkeletonList } from "./SkeletonLoader";

export function AIInsightsDashboard() {
  const { formatMoeda, simboloMoeda } = useConfig();
  const [refreshing, setRefreshing] = useState(false);

  // Queries
  const insightsQuery = trpc.ai.generateInsights.useQuery();
  const forecastQuery = trpc.ai.projectFinancialForecast.useQuery({ daysAhead: 30 });
  const trendsQuery = trpc.ai.analyzeTrends.useQuery();

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      insightsQuery.refetch(),
      forecastQuery.refetch(),
      trendsQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  return (
    <div className="space-y-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-md">
          <Brain className="w-6 h-6 text-brand-primary" />
          <div>
            <h2 className="text-xl font-semibold text-text-dark-primary">
              Inteligência de Dados
            </h2>
            <p className="text-sm text-text-dark-muted">
              Predições, análises e insights automáticos
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-md rounded-lg bg-bg-dark-elevated hover:bg-bg-dark-overlay transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Insights Automáticos */}
      <Card>
        <CardHeader title="💡 Insights Automáticos" />
        <CardBody>
          {insightsQuery.isLoading ? (
            <SkeletonList count={3} />
          ) : insightsQuery.data && insightsQuery.data.length > 0 ? (
            <div className="space-y-md">
              {insightsQuery.data.map((insight, idx) => (
                <Alert
                  key={idx}
                  type="info"
                  description={insight}
                />
              ))}
            </div>
          ) : (
            <p className="text-text-dark-muted text-sm">Nenhum insight disponível no momento.</p>
          )}
        </CardBody>
      </Card>

      {/* Projeção Financeira */}
      <Card>
        <CardHeader
          title="📊 Projeção Financeira (30 dias)"
          subtitle="Receita esperada vs. potencial"
        />
        <CardBody>
          {forecastQuery.isLoading ? (
            <SkeletonCard />
          ) : forecastQuery.data ? (
            <div className="space-y-lg">
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-md">
                <div className="bg-bg-dark-elevated rounded-lg p-lg">
                  <p className="text-text-dark-muted text-xs mb-md">Receita Esperada</p>
                  <p className="text-2xl font-bold text-semantic-success">
                    {formatMoeda(Number(forecastQuery.data.receita_esperada))}
                  </p>
                </div>
                <div className="bg-bg-dark-elevated rounded-lg p-lg">
                  <p className="text-text-dark-muted text-xs mb-md">Receita Potencial</p>
                  <p className="text-2xl font-bold text-brand-primary">
                    {formatMoeda(Number(forecastQuery.data.receita_potencial))}
                  </p>
                </div>
                <div className="bg-bg-dark-elevated rounded-lg p-lg">
                  <p className="text-text-dark-muted text-xs mb-md">Confiança</p>
                  <p className="text-2xl font-bold text-semantic-warning">
                    {Math.round(forecastQuery.data.confianca * 100)}%
                  </p>
                </div>
              </div>

              {/* Detalhes por Data */}
              {forecastQuery.data.detalhes.length > 0 && (
                <div className="mt-lg">
                  <p className="text-sm font-semibold text-text-dark-primary mb-md">
                    Receita por Data
                  </p>
                  <div className="space-y-md max-h-64 overflow-y-auto">
                    {forecastQuery.data.detalhes.slice(0, 10).map((detalhe, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-md bg-bg-dark-elevated rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-text-dark-primary">
                            {new Date(detalhe.data).toLocaleDateString("pt-PT")}
                          </p>
                          <p className="text-xs text-text-dark-muted">
                            {detalhe.consultas} consulta{detalhe.consultas !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-semantic-success">
                          {formatMoeda(Number(detalhe.receita))}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-text-dark-muted text-sm">Erro ao carregar projeção.</p>
          )}
        </CardBody>
      </Card>

      {/* Análise de Tendências */}
      <Card>
        <CardHeader
          title="🏆 Tendências de Tratamentos"
          subtitle="Tratamentos mais populares e rentáveis"
        />
        <CardBody>
          {trendsQuery.isLoading ? (
            <SkeletonList count={5} />
          ) : trendsQuery.data && trendsQuery.data.length > 0 ? (
            <div className="space-y-md">
              {trendsQuery.data.slice(0, 5).map((trend, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between p-lg bg-bg-dark-elevated rounded-lg border border-border-lighter"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-text-dark-primary">
                      {idx + 1}. {trend.tratamento}
                    </p>
                    <div className="flex items-center gap-lg mt-md text-xs text-text-dark-muted">
                      <span>📊 {trend.frequencia} consultas</span>
                      <span>✅ {Math.round(trend.taxa_sucesso * 100)}% sucesso</span>
                      <span>💰 {Math.round(trend.margem_lucro * 100)}% margem</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-semantic-success">
                      {formatMoeda(Number(trend.receita_total))}
                    </p>
                    <p className="text-xs text-text-dark-muted">Total</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-dark-muted text-sm">Nenhum dado disponível.</p>
          )}
        </CardBody>
      </Card>

      {/* Legenda */}
      <div className="bg-bg-dark-surface border border-border-lighter rounded-lg p-lg">
        <p className="text-xs text-text-dark-muted">
          💡 <strong>Insights Automáticos:</strong> Recomendações baseadas em análise de dados históricos.
          <br />
          📊 <strong>Projeção Financeira:</strong> Estimativa de receita com base em consultas agendadas e taxa de conversão histórica.
          <br />
          🏆 <strong>Tendências:</strong> Tratamentos mais populares, com análise de rentabilidade e taxa de sucesso.
        </p>
      </div>
    </div>
  );
}
