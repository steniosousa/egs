import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { carregarTabela } from "./tabelaMatrix";
import { toast } from 'react-toastify';
import { Building2, FileCode2, FileText, LogOut, Wifi } from "lucide-react";
import { AppProvider, useApp } from "./context/AppContext";
import { listarCtes, buscarCtePorId, CteListItem } from "./services/cteService";
import { logoutEmpresa } from "./services/authService";
import { Button, Spinner, Tabs, TabItem } from "./components/ui";

const CRLVView = lazy(() => import("./pages/crlv"));
const CRIAR = lazy(() => import("./pages/criar"));
const CTEView = lazy(() => import("./pages/cte"));

type MainTab = 'crlv' | 'xml';

const MAIN_TABS: TabItem<MainTab>[] = [
  { value: 'crlv', label: 'CRLV', icon: FileText },
  { value: 'xml', label: 'XML / CT-e', icon: FileCode2 },
];

function AppContent() {
  const { empresa, limparDados, getToken, cteSelecionado, setCteSelecionado, loading, setLoading } = useApp();
  const token = localStorage.getItem('token');
  const [tab, setTab] = useState<MainTab>('crlv');
  const [ctes, setCtes] = useState<CteListItem[]>([])

  const getCTES = useCallback(async () => {
    if (!empresa) {
      toast.error("Empresa não selecionada")
      return
    }

    try {
      const data = await listarCtes(empresa)
      setCtes(data)
    } catch (e) {
      toast.error("Erro ao recuperar CTES")
    }
  }, [empresa])

  const buscarCteEscolhida = async (id: string) => {
    if (!empresa) {
      toast.error("Empresa não selecionada")
      return
    }
    try {
      const data = await buscarCtePorId(empresa, id)
      setCteSelecionado(data)
    } catch (e) {
      toast.error("Erro ao recuperar a nota escolhida")
    }
  }

  const sair = async () => {
    if (!empresa) {
      toast.error("Empresa não selecionada")
      return
    }
    if (!token) {
      return
    }
    try {
      await logoutEmpresa(empresa);
      limparDados()
      localStorage.clear()
    } catch {
      toast.error("Erro ao sair")
    }
  }

  useEffect(() => {
    if (empresa && empresa.name && tab === 'xml') {
      getCTES()
    }
  }, [empresa, tab, getCTES])

  useEffect(() => {
    const loadTabela = async () => {
      setLoading(true)
      try {
        await carregarTabela();
      } catch (e) {
        toast.error("Erro ao carregar tabela")
      } finally {
        setLoading(false)
      }
    };

    loadTabela();
  }, [setLoading]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-card">
              <Wifi className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Any ESG</p>
              <p className="text-xs text-slate-400">Gestão de CT-e, CRLV e documentos</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-xl border border-slate-200 bg-slate-100/70 p-1">
              <button
                onClick={async () => await getToken("GADELOG")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 ${empresa && empresa.name === "GADELOG"
                  ? "bg-white text-brand-700 shadow-card"
                  : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                <Building2 className="h-4 w-4" strokeWidth={2.25} />
                Gadelog
              </button>
              <button
                onClick={async () => await getToken("INTERMEDIUM")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 ${empresa && empresa.name === "INTERMEDIUM"
                  ? "bg-white text-brand-700 shadow-card"
                  : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                <Building2 className="h-4 w-4" strokeWidth={2.25} />
                Intermedium
              </button>
            </div>

            {loading && <Spinner size="sm" />}

            <Tabs items={MAIN_TABS} value={tab} onChange={setTab} />

            <Button variant="secondary" size="sm" icon={<LogOut className="h-4 w-4" />} onClick={sair}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Suspense fallback={<div className="flex justify-center py-16"><Spinner label="Carregando módulo..." /></div>}>
          {tab === 'crlv' && <CRLVView />}
          {tab === 'xml' && !cteSelecionado && <CTEView ctes={ctes} buscarCteEscolhida={buscarCteEscolhida} />}
          {tab === 'xml' && cteSelecionado && <CRIAR />}
        </Suspense>
      </main>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
