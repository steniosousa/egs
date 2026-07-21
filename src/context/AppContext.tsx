import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { CRLV, CTE, XML } from '../types/types';
import { toast } from 'react-toastify';
import { loginEmpresa, logoutEmpresa } from '../services/authService';

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
    DOCNFE: [],
    percentualCBS: '',
    valorIBS: '',
    valorICMS: '0',
    saida: { city: '', uf: '' },
    destino: { city: '', uf: '' },
    bairro_destinario: "",
    cep_destinatario: "",
    cidade_destinatario: "",
    cidade_estado_destinatario: "",
    CODCIDADE: 0,
    complemente_destinatario: "",
    email_destinatario: "",
    fone_destinatario: "",
    nome_fantasia: "",
    numero_endereco_destinatario: "",
    rua_destinatario: "",
    Uf_destinatario: "",
    INSCESTADUAL_destinatario: "",
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

      const tokenData = await loginEmpresa(url);

      localStorage.setItem('empresa', JSON.stringify({
        token: tokenData.access_token,
        name: url === "GADELOG" ? "GADELOG" : "INTERMEDIUM",
        expires_id: tokenData.expires_in,
        token_timestamp: Date.now().toString()
      }));
      setEmpresa({
        token: tokenData.access_token,
        name: url === "GADELOG" ? "GADELOG" : "INTERMEDIUM",
        expires_id: tokenData.expires_in,
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
      await logoutEmpresa(empresa);
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
