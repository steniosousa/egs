import axios from "axios";
import { useEffect, useState } from "react";
import { carregarTabela } from "./tabelaMatrix";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CRLVView from "./pages/crlv";
import { AppProvider, useApp } from "./context/AppContext";
import CTEView from "./pages/cte";
import CRIAR from "./pages/criar";

function AppContent() {
  const { empresa, limparDados, getToken, cteSelecionado, setCteSelecionado, loading, setLoading,dadosCRLV } = useApp();
  const token = localStorage.getItem('token');
  const [tab, setTab] = useState<'crlv' | 'xml'>('crlv');
  const [ctes, setCtes] = useState<{ REM_NOME: string, DATACREATE: string, IDCTE: number, NOMECIDADEEMISSAO: string, NOMECIDADEFIMSERV: string }[]>([])

  const getCTES = async () => {
    if (!empresa) {
      toast.error("Empresa não selecionada")
      return
    }

    try {
      const { data } = await axios.get(`https://api.egssistemas.com.br/${empresa.name === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//odata/CTe?%24orderby=NUMCTE%20desc&%24top=40&%24count=true`,
        {
          headers: {
            Authorization: `Bearer ${empresa.token}`
          }
        }
      )
      setCtes(data.value)
    } catch (e) {
      toast.error("Erro ao recuperar CTES")
    }
  }

  const buscarCteEscolhida = async (id: string) => {
    if (!empresa) {
      toast.error("Empresa não selecionada")
      return
    }
    try {
      const { data } = await axios.get(`https://api.egssistemas.com.br/${empresa.name === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//api/CteApi/GetCTe?IDCTE=${id}&CODEMPRESA=1&MODELODOC=57&OPERACAO=COPIA`,
        {
          headers: {
            Authorization: `Bearer ${empresa.token}`
          }
        }
      )

      console.log(data)
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
      await axios.post(
        `https://api.egssistemas.com.br/${empresa.name === "GADELOG" ? "EGSAPP4" : "EGSCTE"}/api/Sistema/PostSair`,
        null,
        {
          headers: {
            Authorization: `Bearer ${empresa.token}`
          },
          withCredentials: true
        }
      );
      limparDados()
      localStorage.clear()
    } catch {
      toast.error("Erro ao sair")
    }
  }

  useEffect(() => {
   console.log(dadosCRLV)
  }, [dadosCRLV])

  useEffect(() => {
    if (empresa && empresa.name && tab === 'xml') {
      getCTES()
    }
  }, [empresa, tab])

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
  }, []);


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex w-full max-w-lg bg-white p-1.5 rounded-2xl shadow-lg border border-gray-200">
          <button
            onClick={async () => await getToken("GADELOG")}
            className={`flex-1 flex items-center justify-center gap-3 px-5 py-3 rounded-xl font-semibold transition-all duration-300 ${empresa && empresa.name === "GADELOG"
              ? "bg-blue-600 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-100"
              }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Gadelog
          </button>

          <button
            onClick={async () => await getToken("INTERMEDIUM")}
            className={`flex-1 flex items-center justify-center gap-3 px-5 py-3 rounded-xl font-semibold transition-all duration-300 ${empresa && empresa.name === "INTERMEDIUM"
              ? "bg-emerald-600 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-100"
              }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Intermedium
          </button>
        </div>
        {loading &&
          <div className="flex items-center justify-center flex-col">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p>Carregando...</p>
          </div>
        }
        <div className="flex gap-2">
          <button
            onClick={() => setTab('crlv')}
            className={`px-5 py-3 rounded-xl font-semibold transition-all duration-200 ${tab === 'crlv'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            CRLV
          </button>

          <button
            disabled={dadosCRLV == null}
            onClick={() => setTab('xml')}
            className={`px-5 py-3 rounded-xl font-semibold transition-all duration-200 ${tab === 'xml'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            XML
          </button>
        </div>
        <button
          onClick={sair}
          className="bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
        >
          Sair
        </button>
      </div>

      <div className="max-w-3x4 mx-auto">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          {tab === 'crlv' && <CRLVView />}
          {tab === 'xml' && !cteSelecionado && <CTEView ctes={ctes} buscarCteEscolhida={buscarCteEscolhida} />}
          {tab === 'xml' && cteSelecionado && <CRIAR />}
        </div>
      </div>
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
