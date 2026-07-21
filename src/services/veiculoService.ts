import axios from "axios";
import { API_ROOT, authHeader, getApiBase } from "./apiClient";

export async function buscarVeiculoPorPlaca(empresa: { name: string; token: string }, placa: string) {
  const { data } = await axios.get(`${API_ROOT}/${getApiBase(empresa.name)}//odata/Gveiculo`, {
    params: {
      $filter: `(contains(tolower(PLACA), '${placa}')) and (STATUS ne 'C')`,
      $count: true,
      $top: 20
    },
    headers: authHeader(empresa.token)
  });
  return data.value;
}

export async function criarVeiculo(empresa: { name: string; token: string }, veiculo: Record<string, unknown>) {
  await axios.post(`${API_ROOT}/${getApiBase(empresa.name)}//api/GveiculoApi/Post`,
    veiculo,
    {
      headers: authHeader(empresa.token)
    }
  );
}
