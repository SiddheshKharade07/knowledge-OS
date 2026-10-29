import { useMutation } from '@tanstack/react-query';
import { BookOpen, Brain, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useAuthStore } from '../stores/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { toast } from 'sonner';
import { KnowledgeOSLogoMark } from '../components/brand/KnowledgeOSLogo';

type Tab = 'signin' | 'reset';

function normalizeEmail(v: string) {
  return v.trim().toLowerCase();
}

export default function LoginPage() {
  const [tab, setTab] = React.useState<Tab>('signin');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const [resetSent, setResetSent] = React.useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const loginMutation = useMutation({
    mutationFn: () => authApi.login({ email: normalizeEmail(email), password }),
    onSuccess: (res) => {
      const user = res.user as any;
      const normalizedUser = {
        id: user.id,
        email: user.email,
        username: user.username,
        userRole: user.userRole,
        active: user.active,
        departmentIds: Array.isArray(user.departmentIds)
          ? user.departmentIds
          : user.departmentIds instanceof Set
            ? Array.from(user.departmentIds)
            : user.departmentIds ?? null,
      } as any;
      setAuth(res.token, normalizedUser);
      toast.success('Signed in');
      navigate('/chat', { replace: true });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Sign in failed');
    },
  });

  const forgotMutation = useMutation({
    mutationFn: () => authApi.forgotPassword({ email: normalizeEmail(email) }),
    onSuccess: (res) => {
      setResetSent(true);
      toast.success(res.message || 'If an account exists, a reset link has been sent.');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Request failed');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === 'signin') {
      if (!email.trim() || !password) {
        toast.error('Enter email and password');
        return;
      }
      loginMutation.mutate();
      return;
    }
    if (!email.trim()) {
      toast.error('Enter your email');
      return;
    }
    forgotMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="grid min-h-screen lg:grid-cols-[45%_55%]">
        <section className="relative hidden overflow-hidden lg:flex lg:flex-col">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f1026]/90 via-[#1e1b4b]/80 to-[#312e81]/75" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.25),transparent_55%)]" />
          <div className="relative z-10 flex h-full flex-col px-10 py-10 xl:px-14">
            <div className="flex items-center gap-3">
              <KnowledgeOSLogoMark size={40} className="rounded-xl shadow-card" />
              <div>
                <p className="text-sm font-semibold">
                  <span className="text-white">Knowledge</span>
                  <span className="text-white/95">OS</span>
                </p>
                <p className="text-xs text-white/70">Enterprise Knowledge Assistant</p>
              </div>
            </div>
            <div className="mt-auto max-w-md">
              <h1 className="text-3xl font-semibold tracking-tight text-white xl:text-4xl">Turn Your Documents into Intelligence</h1>
              <p className="mt-3 text-base leading-relaxed text-white/80">
                Unify your knowledge, discover relevant information, and empower your team with AI-driven insights.
              </p>
              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Centralized Knowledge Base</p>
                    <p className="mt-1 text-sm text-white/70">Your organization's documents, organized in one place.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
                    <Brain className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">AI-Powered Search & Answers</p>
                    <p className="mt-1 text-sm text-white/70">Find relevant information with contextual answers and citations.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Secure & Enterprise Ready</p>
                    <p className="mt-1 text-sm text-white/70">A controlled, reliable environment for organizational knowledge.</p>
                  </div>
                </div>
              </div>
              <div className="mt-10 flex items-center gap-2 text-xs text-white/60">
                <span>Smarter Search</span>
                <span>•</span>
                <span>Better Decisions</span>
                <span>•</span>
                <span>Greater Productivity</span>
              </div>
            </div>
          </div>
        </section>
        <section className="flex flex-col">
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6 lg:px-12 xl:px-16">
            <div className="mb-6 flex w-full max-w-[500px] flex-col items-center text-center lg:hidden">
              <KnowledgeOSLogoMark size={44} className="mb-3 rounded-xl" />
              <h1 className="text-lg font-semibold">
                <span className="text-[#1E293B]">Knowledge</span>
                <span className="text-[#4F46E5]">OS</span>
              </h1>
              <p className="text-sm text-on-surface-variant">Enterprise Knowledge Assistant</p>
            </div>
            <div className="w-full max-w-[500px] xl:max-w-[520px]">
              <div className="mb-7 hidden lg:block">
                <h2 className="text-2xl font-semibold tracking-tight text-on-surface">Welcome Back</h2>
                <p className="mt-1.5 text-sm text-on-surface-variant">Sign in to your KnowledgeOS account</p>
              </div>
              <div className="mb-7 lg:hidden">
                <h2 className="text-xl font-semibold tracking-tight text-on-surface">Welcome Back</h2>
                <p className="mt-1.5 text-sm text-on-surface-variant">Sign in to your KnowledgeOS account</p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-outline-variant/50 bg-surface-container-lowest shadow-card">
                <div className="px-7 pb-5 pt-7 sm:px-8 sm:pb-6 sm:pt-8">
                  <p className="text-sm text-on-surface-variant lg:hidden">
                    Sign in to access your organization's verified knowledge.
                  </p>
                </div>
                <div className="px-7 pb-5 sm:px-8">
                  <div className="grid h-[42px] grid-cols-2 rounded-lg bg-surface-container p-1 text-sm sm:h-[44px]">
                    <button
                      onClick={() => {
                        setTab('signin');
                        setResetSent(false);
                      }}
                      className={`flex h-full items-center justify-center rounded-md px-2 font-medium transition-colors ${
                        tab === 'signin'
                          ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Sign in
                    </button>
                    <button
                      onClick={() => {
                        setTab('reset');
                        setResetSent(false);
                      }}
                      className={`flex h-full items-center justify-center rounded-md px-2 font-medium transition-colors ${
                        tab === 'reset'
                          ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Reset password
                    </button>
                  </div>
                </div>
                {tab === 'signin' ? (
                  <form onSubmit={handleSubmit} className="space-y-5 px-7 pb-7 sm:space-y-6 sm:px-8 sm:pb-8">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-on-surface">Work email</label>
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-[46px] text-sm sm:h-[48px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-on-surface">Password</label>
                        <button
                          type="button"
                          onClick={() => setTab('reset')}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          type={showPw ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-[46px] pr-10 text-sm sm:h-[48px]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-on-surface-variant hover:text-on-surface"
                          aria-label={showPw ? 'Hide password' : 'Show password'}
                        >
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="h-[46px] w-full text-sm sm:h-[48px]" disabled={loginMutation.isPending}>
                      {loginMutation.isPending ? <Spinner className="text-on-primary" /> : null}
                      Sign in
                    </Button>
                  </form>
                ) : (
                  <div className="px-7 pb-7 sm:px-8 sm:pb-8">
                    {resetSent ? (
                      <div className="rounded-lg border border-outline-variant/60 bg-surface-container-low p-5 text-center">
                        <p className="text-sm text-on-surface">
                          If an account with that email exists, a password reset link has been sent.
                        </p>
                        <Button variant="secondary" className="mt-4 h-[46px] sm:h-[48px]" onClick={() => setResetSent(false)}>
                          Send again
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-on-surface">Work email</label>
                          <Input
                            type="email"
                            autoComplete="email"
                            placeholder="name@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-[46px] text-sm sm:h-[48px]"
                          />
                        </div>
                        <Button type="submit" className="h-[46px] w-full text-sm sm:h-[48px]" disabled={forgotMutation.isPending}>
                          {forgotMutation.isPending ? <Spinner className="text-on-primary" /> : null}
                          Send reset link
                        </Button>
                      </form>
                    )}
                  </div>
                )}
                <div className="border-t border-outline-variant/40 px-7 py-4 text-center text-xs text-on-surface-variant sm:px-8 sm:py-5">
                  Standard accounts are created by organization administrators.
                </div>
              </div>
            </div>
          </div>
          <footer className="py-5 text-center text-xs text-on-surface-variant">
            <div className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              <span>KnowledgeOS · Enterprise Knowledge Assistant</span>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}
