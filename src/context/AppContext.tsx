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
  };
  setEmpresa: (empresa: {
    token: string;
    name: string;
    expires_id: string;
    token_timestamp: string;
  }) => void;
  dadosCRLV: CRLV | null;
  setDadosCRLV: (dados: CRLV) => void;
  limparDados: () => void;
  getToken: (url: "GADELOG" | "INTERMEDIUM") => Promise<void>;
  cteSelecionado: CTE | null;
  setCteSelecionado: (cte: CTE | null) => void;
  dadosXML: XML;
  setDadosXML: (dados: XML) => void;
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
  const [empresa, setEmpresa] = useState({
    token: '',
    name: '',
    expires_id: '',
    token_timestamp: ''
  });
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

  useEffect(() => {
    const saveLocal = localStorage.getItem('empresa')
    if (saveLocal) {
      setEmpresa(JSON.parse(saveLocal))
    }
  }, [])


  const getToken = async (url: "GADELOG" | "INTERMEDIUM"): Promise<void> => {
    try {
      if (empresa.token && empresa.expires_id && empresa.token_timestamp) {
        const currentTime = Date.now();
        const tokenTime = parseInt(empresa.token_timestamp);
        const expiresIn = parseInt(empresa.expires_id) * 1000;

        if (currentTime - tokenTime < (expiresIn - 300000)) {
          return;
        }
      }

      const { data }: { data: { AUXTOKEN: string, URLAPI: string } } = await axios.get(`https://api.egssistemas.com.br/EGSWEB/api/Sistema/GetServerUrlByChaveAcessoV1?CHAVEACESSO=${url === "GADELOG" ? "2570123" : "50201"}&EGSERP=true`);
      setTimeout(async () => {
        try {

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

          setEmpresa({
            token: tokenData.data.access_token,
            name: url === "GADELOG" ? "GADELOG" : "INTERMEDIUM",
            expires_id: tokenData.data.expires_in,
            token_timestamp: Date.now().toString()
          });

          localStorage.setItem('empresa', JSON.stringify({
            token: tokenData.data.access_token,
            name: url === "GADELOG" ? "GADELOG" : "INTERMEDIUM",
            expires_id: tokenData.data.expires_in,
            token_timestamp: Date.now().toString()
          }));


        } catch (error: any) {
          toast.error(error.response.data.error_description || "Erro ao obter token")
        }
      }, 1000);
    } catch (error) {
      toast.error("Erro ao obter token")
    }
  }

  const limparDados = () => {
    setDadosCRLV(null);

  };

  return (
    <AppContext.Provider value={{
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
