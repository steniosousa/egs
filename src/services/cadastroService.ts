import axios from "axios";
import { API_ROOT, authHeader, getApiBase } from "./apiClient";

export async function buscarCadastroPorCpfCnpj(empresa: { name: string; token: string }, cpfCnpj: string) {
  const { data } = await axios.get(`${API_ROOT}/${getApiBase(empresa.name)}//odata/Gcadastro`, {
    params: {
      $filter: `(contains(tolower(CPFCNPJ), '${cpfCnpj}')) and (STATUS ne 'C')`,
      $count: true,
      $top: 20
    },
    headers: authHeader(empresa.token)
  });
  return data.value;
}

export async function criarCadastro(empresa: { name: string; token: string }, cadastro: Record<string, unknown>) {
  const { data } = await axios.post(`${API_ROOT}/${getApiBase(empresa.name)}//api/GcadastroApi/post`,
    cadastro,
    {
      headers: authHeader(empresa.token)
    }
  );
  return data;
}

export async function buscarCadastroReceitaFederal(empresa: { name: string; token: string }, cnpj: string) {
  const { data } = await axios.get(`${API_ROOT}/${getApiBase(empresa.name)}//api/Sistema/GetCadastroReceiraFederal?CNPJ=${cnpj}`,
    {
      headers: authHeader(empresa.token)
    }
  );
  return data;
}
