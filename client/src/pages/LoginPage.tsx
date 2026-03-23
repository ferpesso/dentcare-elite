/**
 * LoginPage.tsx — Página de Autenticação Glassmorphism
 * DentCare Elite V35 — Navy + Neon Blue
 *
 * Design: Glassmorphism profundo com orbs neon, tipografia refinada,
 * inputs glass com focus neon, botões com gradiente neon blue
 */
import React, { useState, useRef, useEffect } from "react";
import { Zap, Shield, Brain, Mic, Eye, EyeOff, Loader2, KeyRound, Mail, ArrowLeft, CheckCircle } from "lucide-react";

const FEATURES = [
  { icon: Zap,    label: "Dashboard BI em tempo real",              color: "#FFD000"  },
  { icon: Brain,  label: "Voice Briefing clínico com IA",           color: "#00E5FF" },
  { icon: Shield, label: "Anamnese digital com assinatura RGPD",    color: "#00F5A0" },
  { icon: Mic,    label: "Análise preditiva de negócio",            color: "#B388FF"  },
];

type Ecra = "login" | "2fa" | "recuperar" | "recuperar-sucesso";

export function LoginPage() {
  const [isSetup, setIsSetup]         = useState<boolean | null>(null);
  const [username, setUsername]       = useState("");
  const [password, setPassword]       = useState("");
  const [showPass, setShowPass]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [ecra, setEcra]               = useState<Ecra>("login");
  const [tempToken, setTempToken]     = useState("");
  const [totpCode, setTotpCode]       = useState("");
  const totpRef                       = useRef<HTMLInputElement>(null);
  const [emailRecuperacao, setEmailRecuperacao] = useState("");

  useEffect(() => {
    fetch("/api/auth/setup-required")
      .then(r => r.json())
      .then((d: { setupRequired: boolean }) => setIsSetup(d.setupRequired))
      .catch(() => setIsSetup(false));
  }, []);

  useEffect(() => {
    if (ecra === "2fa") setTimeout(() => totpRef.current?.focus(), 100);
  }, [ecra]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    const endpoint = isSetup ? "/api/auth/setup" : "/api/auth/login";
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ username: username.trim(), password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao autenticar"); return; }
      if (data.requires2FA && data.tempToken) { setTempToken(data.tempToken); setEcra("2fa"); return; }
      window.location.href = "/dashboard";
    } catch { setError("Erro de ligação ao servidor"); } finally { setLoading(false); }
  }

  async function handle2FASubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/login-2fa", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ tempToken, totpCode: totpCode.replace(/\s/g, "") }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Código inválido"); setTotpCode(""); totpRef.current?.focus(); return; }
      window.location.href = "/dashboard";
    } catch { setError("Erro de ligação ao servidor"); } finally { setLoading(false); }
  }

  async function handleRecuperarPassword(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/recuperar-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: emailRecuperacao.trim() }) });
      if (res.ok || res.status === 404) { setEcra("recuperar-sucesso"); } else { const data = await res.json(); setError(data.error || "Erro ao processar pedido"); }
    } catch { setEcra("recuperar-sucesso"); } finally { setLoading(false); }
  }

  function voltarParaLogin() { setEcra("login"); setError(""); setEmailRecuperacao(""); setTotpCode(""); setTempToken(""); }

  // Estilos reutilizáveis para inputs glass
  const inputGlass: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '12px', fontSize: '14px',
    background: 'rgba(8, 15, 30, 0.75)',
    border: '1px solid rgba(0, 229, 255, 0.18)',
    color: '#EEF4FF',
    caretColor: '#00E5FF',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    transition: 'all 0.2s ease',
    outline: 'none',
    fontFamily: "'Space Grotesk', sans-serif",
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #050A14 0%, #080F1E 50%, #050A14 100%)' }}
    >
      {/* Orbs neon de fundo */}
      <div className="absolute animate-float-orb" style={{ top: '-120px', left: '-120px', width: '450px', height: '450px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0, 229, 255, 0.18) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div className="absolute animate-float-orb-slow" style={{ bottom: '-100px', right: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(179, 136, 255, 0.14) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div className="absolute" style={{ top: '30%', left: '60%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0, 229, 255, 0.07) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div className="relative w-full max-w-sm z-10">
        {/* Card Glass com borda neon */}
        <div className="relative rounded-2xl p-px" style={{ background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.28) 0%, rgba(0, 229, 255, 0.05) 40%, rgba(179, 136, 255, 0.20) 100%)' }}>
          <div className="rounded-2xl p-8" style={{
            background: 'rgba(8, 15, 30, 0.88)',
            backdropFilter: 'blur(40px) saturate(1.2)',
            WebkitBackdropFilter: 'blur(40px) saturate(1.2)',
          }}>

            {/* Logo com glow neon */}
            <div className="flex flex-col items-center mb-8">
              <img
                src="/logos/icon.png"
                alt="DentCare"
                className="w-16 h-16 rounded-2xl mb-4"
                style={{
                  boxShadow: '0 0 36px rgba(0, 229, 255, 0.40), 0 8px 28px rgba(0, 0, 0, 0.5)',
                }}
              />
              <h1 className="font-bold text-xl tracking-tight" style={{ color: '#F0F6FF' }}>DentCare</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="h-px w-8" style={{ background: 'linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.45))' }} />
                <p className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: '#00E5FF' }}>
                  Elite V35
                </p>
                <div className="h-px w-8" style={{ background: 'linear-gradient(90deg, rgba(179, 136, 255, 0.45), transparent)' }} />
              </div>
            </div>

            {/* ── ECRÃ 2FA ── */}
            {ecra === "2fa" && (
              <>
                <div className="text-center mb-7">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'rgba(0, 229, 255, 0.08)', border: '1px solid rgba(0, 229, 255, 0.22)' }}>
                    <KeyRound className="w-6 h-6" style={{ color: '#00E5FF' }} />
                  </div>
                  <h2 className="font-semibold text-lg mb-2 tracking-tight" style={{ color: '#F0F6FF' }}>Verificação em Dois Passos</h2>
                  <p className="text-sm leading-relaxed" style={{ color: '#7A94AD' }}>Introduza o código de 6 dígitos da sua aplicação autenticadora</p>
                </div>
                <form onSubmit={handle2FASubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: '#B8CCDF' }}>Código TOTP</label>
                    <input ref={totpRef} type="text" inputMode="numeric" pattern="[0-9 ]{6,7}" maxLength={7} value={totpCode} onChange={e => setTotpCode(e.target.value)} placeholder="000 000" required
                      style={{ ...inputGlass, fontSize: '18px', letterSpacing: '0.3em', textAlign: 'center', fontFamily: 'monospace' }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(0, 229, 255, 0.55)'; e.target.style.boxShadow = '0 0 0 3px rgba(0, 229, 255, 0.10), 0 0 24px rgba(0, 229, 255, 0.09)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0, 229, 255, 0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  {error && <div className="rounded-xl px-3.5 py-2.5" style={{ background: 'rgba(255, 51, 102, 0.08)', border: '1px solid rgba(255, 51, 102, 0.20)' }}><p className="text-xs font-medium" style={{ color: '#FF6688' }}>{error}</p></div>}
                  <button type="submit" disabled={loading || totpCode.replace(/\s/g, "").length < 6} className="btn-primary w-full flex items-center justify-center gap-2 py-3 px-6 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verificar e Entrar"}
                  </button>
                  <button type="button" onClick={voltarParaLogin} className="w-full text-center text-xs py-1 flex items-center justify-center gap-1 transition-colors" style={{ color: '#4E6A85' }} onMouseEnter={e => (e.currentTarget.style.color = '#B8CCDF')} onMouseLeave={e => (e.currentTarget.style.color = '#4E6A85')}>
                    <ArrowLeft className="w-3 h-3" /> Voltar ao login
                  </button>
                </form>
              </>
            )}

            {/* ── ECRÃ RECUPERAR ── */}
            {ecra === "recuperar" && (
              <>
                <div className="text-center mb-7">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(255, 184, 0, 0.08)', border: '1px solid rgba(255, 184, 0, 0.20)' }}>
                    <Mail className="w-6 h-6" style={{ color: '#FFB800' }} />
                  </div>
                  <h2 className="font-semibold text-lg mb-2 tracking-tight" style={{ color: '#F0F6FF' }}>Recuperar Password</h2>
                  <p className="text-sm leading-relaxed" style={{ color: '#7A94AD' }}>Introduza o seu endereço de email. Se existir uma conta associada, receberá um link de recuperação.</p>
                </div>
                <form onSubmit={handleRecuperarPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: '#B8CCDF' }}>Endereço de Email</label>
                    <input type="email" value={emailRecuperacao} onChange={e => setEmailRecuperacao(e.target.value)} placeholder="clinica@exemplo.pt" autoComplete="email" required
                      style={inputGlass}
                      onFocus={e => { e.target.style.borderColor = 'rgba(255, 184, 0, 0.50)'; e.target.style.boxShadow = '0 0 0 3px rgba(255, 184, 0, 0.10), 0 0 20px rgba(255, 184, 0, 0.05)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0, 212, 255, 0.10)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  {error && <div className="rounded-xl px-3.5 py-2.5" style={{ background: 'rgba(255, 51, 102, 0.08)', border: '1px solid rgba(255, 51, 102, 0.20)' }}><p className="text-xs font-medium" style={{ color: '#FF6688' }}>{error}</p></div>}
                  <button type="submit" disabled={loading || !emailRecuperacao.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 px-6 text-sm rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    style={{ background: 'linear-gradient(135deg, #FFB800, #CC9300)', color: '#060D1B', boxShadow: '0 4px 16px rgba(255, 184, 0, 0.25)' }}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar Link de Recuperação"}
                  </button>
                  <button type="button" onClick={voltarParaLogin} className="w-full text-center text-xs py-1 flex items-center justify-center gap-1 transition-colors" style={{ color: '#4E6A85' }} onMouseEnter={e => (e.currentTarget.style.color = '#B8CCDF')} onMouseLeave={e => (e.currentTarget.style.color = '#4E6A85')}>
                    <ArrowLeft className="w-3 h-3" /> Voltar ao login
                  </button>
                </form>
              </>
            )}

            {/* ── ECRÃ RECUPERAÇÃO ENVIADA ── */}
            {ecra === "recuperar-sucesso" && (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(0, 229, 160, 0.08)', border: '1px solid rgba(0, 229, 160, 0.20)' }}>
                  <CheckCircle className="w-7 h-7" style={{ color: '#00E5A0' }} />
                </div>
                <h2 className="font-semibold text-lg mb-3 tracking-tight" style={{ color: '#F0F6FF' }}>Email Enviado</h2>
                <p className="text-sm leading-relaxed mb-6" style={{ color: '#7A94AD' }}>
                  Se existir uma conta associada ao endereço <strong style={{ color: '#B8CCDF' }}>{emailRecuperacao}</strong>, receberá um email com instruções para redefinir a sua password nos próximos minutos.
                </p>
                <p className="text-xs mb-6" style={{ color: '#4E6A85' }}>Não recebeu o email? Verifique a pasta de spam ou tente novamente.</p>
                <button type="button" onClick={voltarParaLogin} className="btn-primary w-full flex items-center justify-center gap-2 py-3 px-6 text-sm">
                  <ArrowLeft className="w-4 h-4" /> Voltar ao Login
                </button>
              </div>
            )}

            {/* ── ECRÃ DE LOGIN ── */}
            {ecra === "login" && (
              <>
                <div className="text-center mb-7">
                  {isSetup === null ? (
                    <div className="flex justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: '#00E5FF' }} /></div>
                  ) : isSetup ? (
                    <>
                      <h2 className="font-semibold text-lg mb-2 tracking-tight" style={{ color: '#F0F6FF' }}>Bem-vindo ao DentCare</h2>
                      <p className="text-sm leading-relaxed" style={{ color: '#7A94AD' }}>Primeiro acesso — crie a sua conta Master</p>
                    </>
                  ) : (
                    <>
                      <h2 className="font-semibold text-lg mb-2 tracking-tight" style={{ color: '#F0F6FF' }}>Bem-vindo de volta</h2>
                      <p className="text-sm leading-relaxed" style={{ color: '#7A94AD' }}>Introduza as suas credenciais para aceder</p>
                    </>
                  )}
                </div>

                {isSetup !== null && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: '#B8CCDF' }}>Nome de utilizador</label>
                      <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder={isSetup ? "Escolha um nome de utilizador" : "Nome de utilizador"} autoComplete="username" required
                        style={inputGlass}
                        onFocus={e => { e.target.style.borderColor = 'rgba(0, 229, 255, 0.55)'; e.target.style.boxShadow = '0 0 0 3px rgba(0, 229, 255, 0.10), 0 0 24px rgba(0, 229, 255, 0.09)'; }}
                        onBlur={e => { e.target.style.borderColor = 'rgba(0, 212, 255, 0.10)'; e.target.style.boxShadow = 'none'; }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-medium" style={{ color: '#B8CCDF' }}>Senha</label>
                        {!isSetup && (
                          <button type="button" onClick={() => { setEcra("recuperar"); setError(""); }}
                            className="text-[10px] font-medium transition-colors" style={{ color: '#B388FF' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#D0B0FF')} onMouseLeave={e => (e.currentTarget.style.color = '#B388FF')}>
                            Esqueci-me da password
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder={isSetup ? "Crie uma senha (mín. 6 caracteres)" : "Senha"} autoComplete={isSetup ? "new-password" : "current-password"} required
                          style={{ ...inputGlass, paddingRight: '40px' }}
                          onFocus={e => { e.target.style.borderColor = 'rgba(0, 229, 255, 0.55)'; e.target.style.boxShadow = '0 0 0 3px rgba(0, 229, 255, 0.10), 0 0 24px rgba(0, 229, 255, 0.09)'; }}
                          onBlur={e => { e.target.style.borderColor = 'rgba(0, 212, 255, 0.10)'; e.target.style.boxShadow = 'none'; }}
                        />
                        <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: '#4E6A85' }}>
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {error && <div className="rounded-xl px-3.5 py-2.5" style={{ background: 'rgba(255, 51, 102, 0.08)', border: '1px solid rgba(255, 51, 102, 0.20)' }}><p className="text-xs font-medium" style={{ color: '#FF6688' }}>{error}</p></div>}
                    <button type="submit" disabled={loading || !username.trim() || !password} className="btn-primary w-full flex items-center justify-center gap-2 py-3 px-6 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isSetup ? "Criar conta Master e entrar" : "Entrar"}
                    </button>
                  </form>
                )}
              </>
            )}

            {/* Separador */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.12), rgba(179, 136, 255, 0.10), transparent)' }} />
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00E5FF', boxShadow: '0 0 8px rgba(0, 229, 255, 0.6)' }} />
                <span className="text-[11px] font-medium" style={{ color: '#4E6A85' }}>Plataforma Segura</span>
              </div>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.12), rgba(179, 136, 255, 0.10), transparent)' }} />
            </div>

            {/* Features com ícones HD e glow */}
            <div className="space-y-2.5">
              {FEATURES.map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: `${color}10`,
                      border: `1px solid ${color}25`,
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color, filter: `drop-shadow(0 0 4px ${color}40)` }} />
                  </div>
                  <span className="text-xs" style={{ color: '#7A94AD' }}>{label}</span>
                </div>
              ))}
            </div>

          </div>
        </div>

        <p className="text-center text-[11px] mt-5 font-medium" style={{ color: '#4E6A85' }}>
          2026 DentCare Elite — Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
