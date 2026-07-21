import axios from "axios";
import { CTE } from "../types/types";
import { API_ROOT, getApiBase } from "./apiClient";

export interface CteListItem {
  REM_NOME: string;
  DATACREATE: string;
  IDCTE: number;
  NOMECIDADEEMISSAO: string;
  NOMECIDADEFIMSERV: string;
}

export async function listarCtes(empresa: { name: string; token: string }): Promise<CteListItem[]> {
  const { data } = await axios.get(`${API_ROOT}/${getApiBase(empresa.name)}//odata/CTe?%24orderby=NUMCTE%20desc&%24top=40&%24count=true`,
    {
      headers: {
        Authorization: `Bearer ${empresa.token}`
      }
    }
  );
  return data.value;
}

export async function buscarCtePorId(empresa: { name: string; token: string }, id: string): Promise<CTE> {
  const { data } = await axios.get(`${API_ROOT}/${getApiBase(empresa.name)}//api/CteApi/GetCTe?IDCTE=${id}&CODEMPRESA=1&MODELODOC=57&OPERACAO=COPIA`,
    {
      headers: {
        Authorization: `Bearer ${empresa.token}`
      }
    }
  );
  return data;
}

export async function salvarCte(empresa: { name: string; token: string }, cte: CTE | Partial<CTE>): Promise<void> {
  await axios.post(`${API_ROOT}/${getApiBase(empresa.name)}//api/CteApi/Salvar`, cte, {
    headers: {
      'Authorization': 'Bearer ' + empresa.token,
      'Content-Type': 'application/json'
    }
  });
}
