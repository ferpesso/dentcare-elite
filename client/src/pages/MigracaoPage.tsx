/**
 * Página de Migração de Dados — DentCare Elite V35
 * Interface para importação de dados de sistemas legados
 */

import React, { useState } from 'react';
import { Upload, AlertCircle, CheckCircle, FileText, Database, Zap } from 'lucide-react';
import { useLocation } from 'wouter';
import { trpc } from '../lib/trpc';
import { parseApiError } from '../lib/parseApiError';

type Etapa = 'selecao' | 'upload' | 'preview' | 'deduplicacao' | 'resultado';

interface EstadoMigracao {
  etapa: Etapa;
  tipo: 'saft' | 'csv' | 'excel' | null;
  sessaoId: string | null;
  dados: any;
  erros: string[];
  avisos: string[];
}

export function MigracaoPage() {
  const [, navigate] = useLocation();
  const [estado, setEstado] = useState<EstadoMigracao>({
    etapa: 'selecao',
    tipo: null,
    sessaoId: null,
    dados: null,
    erros: [],
    avisos: [],
  });

  const importarSaft = trpc.migracao.importarSaft.useMutation();
  const importarCsv = trpc.migracao.importarCsv.useMutation();
  const previewDados = trpc.migracao.previewDados.useQuery(
    { sessaoId: estado.sessaoId || '' },
    { enabled: !!estado.sessaoId && estado.etapa === 'preview' }
  );
  const deduplicar = trpc.migracao.deduplicar.useMutation();
  const executarMigracao = trpc.migracao.executarMigracao.useMutation();

  const handleSelecionarTipo = (tipo: 'saft' | 'csv' | 'excel') => {
    setEstado(prev => ({
      ...prev,
      tipo,
      etapa: 'upload',
    }));
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const ficheiro = event.target.files?.[0];
    if (!ficheiro) return;

    try {
      const conteudo = await ficheiro.text();

      if (estado.tipo === 'saft') {
        const resultado = await importarSaft.mutateAsync({ conteudo });
        setEstado(prev => ({
          ...prev,
          sessaoId: resultado.sessaoId,
          dados: resultado,
          avisos: resultado.avisos,
          etapa: 'preview',
        }));
      } else if (estado.tipo === 'csv' || estado.tipo === 'excel') {
        const resultado = await importarCsv.mutateAsync({
          conteudo,
          tipo: estado.tipo,
        });
        setEstado(prev => ({
          ...prev,
          sessaoId: resultado.sessaoId,
          dados: resultado,
          avisos: resultado.avisos,
          etapa: 'preview',
        }));
      }
    } catch (error) {
      setEstado(prev => ({
        ...prev,
        erros: [...prev.erros, parseApiError(error, 'Erro ao processar ficheiro')],
      }));
    }
  };

  const handleDeduplicar = async () => {
    if (!estado.sessaoId) return;

    try {
      const resultado = await deduplicar.mutateAsync({ sessaoId: estado.sessaoId });
      setEstado(prev => ({
        ...prev,
        dados: { ...prev.dados, deduplicacao: resultado },
        etapa: 'deduplicacao',
      }));
    } catch (error) {
      setEstado(prev => ({
        ...prev,
        erros: [...prev.erros, parseApiError(error, 'Erro na deduplicação')],
      }));
    }
  };

  const handleExecutarMigracao = async () => {
    if (!estado.sessaoId) return;

    try {
      const resultado = await executarMigracao.mutateAsync({
        sessaoId: estado.sessaoId,
        opcoes: {
          deduplicar: true,
          preservarDatas: true,
        },
      });
      setEstado(prev => ({
        ...prev,
        dados: resultado,
        etapa: 'resultado',
      }));
    } catch (error) {
      setEstado(prev => ({
        ...prev,
        erros: [...prev.erros, parseApiError(error, 'Erro ao executar migração')],
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Migração de Dados</h1>
          <p className="text-slate-400">
            Importe dados de sistemas dentários legados (Newsoft, Tugsis, OrisDent, etc.)
          </p>
        </div>

        {/* Indicador de Progresso */}
        <div className="flex gap-2 mb-8">
          {(['selecao', 'upload', 'preview', 'deduplicacao', 'resultado'] as Etapa[]).map((etapa, i) => (
            <div
              key={etapa}
              className={`flex-1 h-2 rounded-full transition-all ${
                ['selecao', 'upload', 'preview', 'deduplicacao', 'resultado'].indexOf(estado.etapa) >= i
                  ? 'bg-[#00E5FF]'
                  : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Alertas */}
        {estado.erros.length > 0 && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-400 mb-1">Erros</h3>
              {estado.erros.map((erro, i) => (
                <p key={i} className="text-sm text-red-300">{erro}</p>
              ))}
            </div>
          </div>
        )}

        {estado.avisos.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-400 mb-1">Avisos</h3>
              {estado.avisos.map((aviso, i) => (
                <p key={i} className="text-sm text-yellow-300">{aviso}</p>
              ))}
            </div>
          </div>
        )}

        {/* Etapa 1: Seleção */}
        {estado.etapa === 'selecao' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { tipo: 'saft' as const, nome: 'SAFT-PT', descricao: 'Ficheiro XML de faturação', icone: FileText },
              { tipo: 'csv' as const, nome: 'CSV', descricao: 'Ficheiro de texto separado por vírgulas', icone: Database },
              { tipo: 'excel' as const, nome: 'Excel', descricao: 'Ficheiro .xlsx ou .xls', icone: Zap },
            ].map(({ tipo, nome, descricao, icone: Icone }) => (
              <button
                key={tipo}
                onClick={() => handleSelecionarTipo(tipo)}
                className="p-6 bg-slate-700/50 border border-slate-600 rounded-xl hover:border-[#00E5FF] hover:bg-slate-700 transition-all text-left group"
              >
                <Icone className="w-8 h-8 text-[#00E5FF] mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-[var(--text-primary)] mb-1">{nome}</h3>
                <p className="text-sm text-slate-400">{descricao}</p>
              </button>
            ))}
          </div>
        )}

        {/* Etapa 2: Upload */}
        {estado.etapa === 'upload' && (
          <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-8">
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-12 text-center hover:border-[#00E5FF] transition-colors">
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Arraste o ficheiro aqui</h3>
              <p className="text-slate-400 mb-6">ou clique para selecionar</p>
              <input
                type="file"
                onChange={handleUpload}
                accept={estado.tipo === 'saft' ? '.xml' : '.csv,.xlsx,.xls'}
                className="hidden"
                id="file-input"
              />
              <label
                htmlFor="file-input"
                className="inline-block px-6 py-2 bg-[#00E5FF] text-white rounded-lg hover:bg-[#00E5FF] transition-colors cursor-pointer"
              >
                Selecionar Ficheiro
              </label>
            </div>
          </div>
        )}

        {/* Etapa 3: Preview */}
        {estado.etapa === 'preview' && previewDados.data && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4">
                <p className="text-slate-400 text-sm mb-1">Utentes</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{previewDados.data.total.utentes}</p>
              </div>
              <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4">
                <p className="text-slate-400 text-sm mb-1">Consultas</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{previewDados.data.total.consultas}</p>
              </div>
              <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4">
                <p className="text-slate-400 text-sm mb-1">Tratamentos</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{previewDados.data.total.tratamentos}</p>
              </div>
            </div>

            <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-6 overflow-x-auto">
              <h3 className="font-semibold text-[var(--text-primary)] mb-4">Amostra de Utentes</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left py-2 px-3 text-slate-400">Nome</th>
                    <th className="text-left py-2 px-3 text-slate-400">NIF</th>
                    <th className="text-left py-2 px-3 text-slate-400">Email</th>
                    <th className="text-left py-2 px-3 text-slate-400">Telemóvel</th>
                  </tr>
                </thead>
                <tbody>
                  {previewDados.data.utentes.slice(0, 5).map((utente: any, i: number) => (
                    <tr key={i} className="border-b border-slate-700 hover:bg-slate-600/30">
                      <td className="py-2 px-3 text-[var(--text-primary)]">{utente.nome}</td>
                      <td className="py-2 px-3 text-slate-400">{utente.nif || '-'}</td>
                      <td className="py-2 px-3 text-slate-400">{utente.email || '-'}</td>
                      <td className="py-2 px-3 text-slate-400">{utente.telemovel || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDeduplicar}
                disabled={deduplicar.isPending}
                className="flex-1 px-6 py-3 bg-[#00E5FF] text-white rounded-lg hover:bg-[#00E5FF] disabled:opacity-50 transition-colors"
              >
                {deduplicar.isPending ? 'A processar...' : 'Próximo: De-duplicação'}
              </button>
              <button
                onClick={() => setEstado(prev => ({ ...prev, etapa: 'selecao' }))}
                className="px-6 py-3 bg-slate-700 text-[var(--text-primary)] rounded-lg hover:bg-slate-600 transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        )}

        {/* Etapa 4: De-duplicação */}
        {estado.etapa === 'deduplicacao' && estado.dados?.deduplicacao && (
          <div className="space-y-6">
            <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-400 mb-1">De-duplicação Concluída</h3>
                <p className="text-sm text-green-300">
                  {estado.dados.deduplicacao.utentesUnicos} utentes únicos detectados
                  ({estado.dados.deduplicacao.duplicatasDetectadas} grupos de duplicatas)
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleExecutarMigracao}
                disabled={executarMigracao.isPending}
                className="flex-1 px-6 py-3 bg-[#00E5FF] text-white rounded-lg hover:bg-[#00E5FF] disabled:opacity-50 transition-colors"
              >
                {executarMigracao.isPending ? 'A importar...' : 'Executar Migração'}
              </button>
              <button
                onClick={() => setEstado(prev => ({ ...prev, etapa: 'preview' }))}
                className="px-6 py-3 bg-slate-700 text-[var(--text-primary)] rounded-lg hover:bg-slate-600 transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        )}

        {/* Etapa 5: Resultado */}
        {estado.etapa === 'resultado' && estado.dados?.sucesso && (
          <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Migração Concluída com Sucesso!</h2>
            <p className="text-green-300 mb-6">
              {estado.dados.utentesImportados} utentes foram importados para o DentCare Elite V35.
            </p>
            <button
              onClick={() => navigate('/utentes')}
              className="px-6 py-3 bg-[#00E5FF] text-white rounded-lg hover:bg-[#00E5FF] transition-colors"
            >
              Ver Utentes Importados
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
