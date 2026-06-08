import axios from "axios";
import { useEffect, useState } from "react";
import { carregarTabela } from "./tabelaMatrix";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CRLV, XML } from "./types/types";
import CRLVView from "./pages/crlv";

function App() {
  const [escolherEmpresa, setEscolherEmpresa] = useState('')
  const token = localStorage.getItem('token');
  const [loading, setLoading] = useState<boolean>(() => !token);
  const [loadingTabela, setLoadingTabela] = useState<boolean>(true)
  const [escolhaCte, setEscolhaCte] = useState<number | null>(null)
  const [ctes, setCtes] = useState<{ REM_NOME: string, DATACREATE: string, IDCTE: number, NOMECIDADEEMISSAO: string, NOMECIDADEFIMSERV: string }[]>([])
  const [dadosCRLV, setDadosCRLV] = useState<CRLV>({ tipoVeiculo: '', tipoRodado: '', rntc_veículo: '', tipoCarroceria: "", tipoProprietario: '', proprietario: '', local: '', cpf: '', categoria: '', validade: '', renavam: '', placa: '', carroceria: '', modelo: '', capacidade: '', peso: '', rntc_proprietatio: "" })
  const [dadosXML, setDadosXML] = useState<XML>({
    cpf_motorista: '',
    cpfCnpjDestinatario: '',
    cpfCnpjRemetente: '',
    quantidadeCarga: '0',
    valorCarga: '0',
    valorServico: '0',
    produtoPredominante: '',
    placaVeiculoTração: '',
    nome_motorista: '',
    nome_veiculo: '',
    nome_remetente: '',
    nome_destinatario: '',
    numeroNotaFiscal: '',
    chaveNotaFiscal: '',
    percentualCBS: '',
    valorIBS: '',
    valorICMS: '0',
    saida: { city: '', uf: '' },
    destino: { city: '', uf: '' }
  })

  const getToken = async () => {
    try {
      const currentToken = localStorage.getItem('token');
      const expiresId = localStorage.getItem('expires_id');
      const tokenTimestamp = localStorage.getItem('token_timestamp');

      if (currentToken && expiresId && tokenTimestamp) {
        const currentTime = Date.now();
        const tokenTime = parseInt(tokenTimestamp);
        const expiresIn = parseInt(expiresId) * 1000;

        if (currentTime - tokenTime < (expiresIn - 300000)) {
          setLoading(false);
          getCTES()
          return;
        }
      }

      const { data }: { data: { AUXTOKEN: string, URLAPI: string } } = await axios.get(`https://api.egssistemas.com.br/EGSWEB/api/Sistema/GetServerUrlByChaveAcessoV1?CHAVEACESSO=${escolherEmpresa === "GADELOG" ? "2570123" : "50201"}&EGSERP=true`);
      setTimeout(async () => {
        try {

          const params = new URLSearchParams();
          params.append('auxtoken', data.AUXTOKEN);
          params.append('captcha', '');
          params.append('codigo2fa', '');
          params.append('grant_type', 'password');
          params.append('username', escolherEmpresa === "GADELOG" ? "HENRIQUE" : 'FINANCEIRO');
          params.append('password', escolherEmpresa === "GADELOG" ? "291546" : 'inter2026');

          const tokenData: { data: { access_token: string, token_type: string, expires_in: string } } = await axios.post(`https://api.egssistemas.com.br/${escolherEmpresa === "GADELOG" ? "EGSAPP4" : "EGSCTE"}/token`, params, {
            headers: {
              authorization: escolherEmpresa === "GADELOG" ? "Basic MjU3MDEyMzplZyR5c3RlbQ==" : 'Basic NTAyMDE6ZWckeXN0ZW0='
            }
          });

          localStorage.setItem('expires_id', tokenData.data.expires_in);
          localStorage.setItem('token', tokenData.data.access_token);
          localStorage.setItem('token_timestamp', Date.now().toString());
          localStorage.setItem('company', escolherEmpresa)
          getCTES()

          setLoading(false);
        } catch (error: any) {
          toast.error(error.response.data.error_description || "Erro ao obter token")
          setLoading(false)
        }
      }, 1000);
    } catch (error) {
      toast.error("Erro ao obter token")
      setLoading(false);
    }
  }

  const getCTES = async () => {
    try {
      const { data } = await axios.get(`https://api.egssistemas.com.br/${escolherEmpresa === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//odata/CTe?%24orderby=NUMCTE%20desc&%24top=40&%24count=true`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      )
      setCtes(data.value)
    } catch (e) {
      toast.error("Erro ao recuperar CTES")
    }
  }

  const buscarCteEscolhida = async () => {
    try {
      const { data } = await axios.get(`https://api.egssistemas.com.br/${escolherEmpresa === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//api/CteApi/GetCTe?IDCTE=${escolhaCte}&CODEMPRESA=1&MODELODOC=57&OPERACAO=COPIA`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      )
      // setSendObj(data)
    } catch (e) {
      toast.error("Erro ao recuperar a nota escolhida")
    }
  }

  const sair = async () => {
    const currentToken = localStorage.getItem('token');
    const company = localStorage.getItem('company')
    setLoading(true)

    if (!company) {
      return
    }
    if (!currentToken) {
      return
    }
    try {
      await axios.post(
        `https://api.egssistemas.com.br/${company === "GADELOG" ? "EGSAPP4" : "EGSCTE"}/api/Sistema/PostSair`,
        null,
        {
          headers: {
            Authorization: `Bearer ${currentToken}`
          },
          withCredentials: true
        }
      );
      limparXML()
      localStorage.clear()
    } catch {
      toast.error("Erro ao sair")
    } finally {
      setLoading(false)
    }
  }

  const limparXML = () => {
    setDadosCRLV({ tipoVeiculo: '', tipoRodado: '', rntc_veículo: '', tipoCarroceria: "", tipoProprietario: '', proprietario: '', local: '', cpf: '', categoria: '', validade: '', renavam: '', placa: '', carroceria: '', modelo: '', capacidade: '', peso: '', rntc_proprietatio: '' })
  }

  useEffect(() => {
    if (!escolhaCte || escolhaCte === 0) {
      return
    }
    buscarCteEscolhida()
  }, [escolhaCte])


  useEffect(() => {
    if (escolherEmpresa === '') {
      sair()
      return
    }
    getToken()
  }, [escolherEmpresa]);

  useEffect(() => {
    const loadTabela = async () => {
      await carregarTabela();
    };

    loadTabela();
  }, []);



  if (!loading && !loadingTabela) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <p className="mt-4 text-gray-600">
            {loading ? 'Carregando aplicação...' : 'Carregando tabela de fretes...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex w-full max-w-lg bg-white p-1.5 rounded-2xl shadow-lg border border-gray-200">
          <button
            onClick={() => setEscolherEmpresa("GADELOG")}
            className={`flex-1 flex items-center justify-center gap-3 px-5 py-3 rounded-xl font-semibold transition-all duration-300 ${escolherEmpresa === "GADELOG"
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
            onClick={() => setEscolherEmpresa("INTERMEDIUM")}
            className={`flex-1 flex items-center justify-center gap-3 px-5 py-3 rounded-xl font-semibold transition-all duration-300 ${escolherEmpresa === "INTERMEDIUM"
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

        <button
          onClick={sair}
          className="bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
        >
          Sair
        </button>
      </div>

      <div className="max-w-3x4 mx-auto">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          <CRLVView dadosCRLV={dadosCRLV} escolherEmpresa={escolherEmpresa} setDadosCRLV={setDadosCRLV} />
        </div>
      </div>
    </div>
  );
}

export default App;
