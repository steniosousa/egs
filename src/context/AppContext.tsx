import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { CRLV, CTE, XML } from '../types/types';
import { toast } from 'react-toastify';
import axios from 'axios';

interface AppContextType {
  empresa: {
    token: string;
    name: string;
    expires_id: string;
    token_timestamp: string;
  } | null;
  setEmpresa: (empresa: {
    token: string;
    name: string;
    expires_id: string;
    token_timestamp: string;
  } | null) => void;
  dadosCRLV: CRLV | null;
  setDadosCRLV: (dados: CRLV | null) => void;
  limparDados: () => void;
  getToken: (url: "GADELOG" | "INTERMEDIUM") => Promise<void>;
  cteSelecionado: CTE | null;
  setCteSelecionado: (cte: CTE | null) => void;
  dadosXML: XML;
  setDadosXML: (dados: XML) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

interface companyTips {
  token: string;
  name: string;
  expires_id: string;
  token_timestamp: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [empresa, setEmpresa] = useState<companyTips | null>(null);
  const [dadosCRLV, setDadosCRLV] = useState<CRLV | null>(null);
  const [dadosXML, setDadosXML] = useState<XML>({
    cpf_motorista: '',
    cpfCnpjDestinatario: '',
    cpfCnpjRemetente: '',
    quantidadeCarga: '0',
    valorCarga: '0',
    valorServico: 0,
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
    destino: { city: '', uf: '' },
  });
  const [cteSelecionado, setCteSelecionado] = useState<CTE | null>(null)


  const getToken = async (url: "GADELOG" | "INTERMEDIUM"): Promise<void> => {

    try {
      setLoading(true);
      if (empresa && empresa.name && empresa.name === url) {
        await sair()
        localStorage.clear();
        setEmpresa(null)
      };


      if (empresa && empresa.token && empresa.expires_id && empresa.token_timestamp) {
        const currentTime = Date.now();
        const tokenTime = parseInt(empresa.token_timestamp);
        const expiresIn = parseInt(empresa.expires_id) * 1000;

        if (currentTime - tokenTime < (expiresIn - 300000)) {
          return;
        }
      }

      const { data }: { data: { AUXTOKEN: string, URLAPI: string } } = await axios.get(`https://api.egssistemas.com.br/EGSWEB/api/Sistema/GetServerUrlByChaveAcessoV1?CHAVEACESSO=${url === "GADELOG" ? "2570123" : "50201"}&EGSERP=true`);
      const params = new URLSearchParams();
      params.append('auxtoken', data.AUXTOKEN);
      params.append('captcha', '');
      params.append('codigo2fa', '');
      params.append('grant_type', 'password');
      params.append('username', url === "GADELOG" ? "HENRIQUE" : 'FINANCEIRO');
      params.append('password', url === "GADELOG" ? "291546" : 'inter2026');

      const tokenData: { data: { access_token: string, token_type: string, expires_in: string } } = await axios.post(`https://api.egssistemas.com.br/${url === "GADELOG" ? "EGSAPP4" : "EGSCTE"}/token`, params, {
        headers: {
          authorization: url === "GADELOG" ? "Basic MjU3MDEyMzplZyR5c3RlbQ==" : 'Basic NTAyMDE6ZWckeXN0ZW0='
        }
      });


      localStorage.setItem('empresa', JSON.stringify({
        token: tokenData.data.access_token,
        name: url === "GADELOG" ? "GADELOG" : "INTERMEDIUM",
        expires_id: tokenData.data.expires_in,
        token_timestamp: Date.now().toString()
      }));
      setEmpresa({
        token: tokenData.data.access_token,
        name: url === "GADELOG" ? "GADELOG" : "INTERMEDIUM",
        expires_id: tokenData.data.expires_in,
        token_timestamp: Date.now().toString()
      });
    } catch (error) {
      toast.error("Erro ao obter token")
    } finally {
      setLoading(false);
    }
  }


  const sair = async () => {
    if (!empresa) {
      toast.error("Empresa não selecionada")
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


  const limparDados = () => {
    setDadosCRLV(null);
    setLoading(false);
    setEmpresa(null)
    setCteSelecionado(null)
  };

  useEffect(() => {
    const saveLocal = localStorage.getItem('empresa')
    if (saveLocal) {
      setEmpresa(JSON.parse(saveLocal))
      // getToken(JSON.parse(saveLocal).name as "GADELOG" | "INTERMEDIUM")
    }
  }, [])

  return (
    <AppContext.Provider value={{
      loading,
      setLoading,
      empresa,
      setEmpresa,
      dadosCRLV,
      setDadosCRLV,
      limparDados,
      getToken,
      cteSelecionado,
      setCteSelecionado,
      dadosXML,
      setDadosXML
    }}>
      {children}
    </AppContext.Provider>
  );
};
