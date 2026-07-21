import axios from "axios";
import { API_ROOT, getApiBase } from "./apiClient";

export async function comboBoxCadastro(empresa: { name: string; token: string }, search: string) {
  const { data } = await axios.post(`${API_ROOT}/${getApiBase(empresa.name)}//api/ComboBox/GCADASTRO`, {
    "search": search,
    "id": null,
    "propertyList": []
  },
    {
      headers: {
        'Authorization': 'Bearer ' + empresa.token,
      }
    });
  return data;
}

export async function comboBoxVeiculo(
  empresa: { name: string; token: string },
  search: string,
) {
  const { data } = await axios.get(
    `${API_ROOT}/${getApiBase(empresa.name)}/odata/Gveiculo`,
    {
      params: {
        '$filter': `(contains(tolower(PLACA), '${search.toLowerCase()}')) and (STATUS ne 'C')`,
        '$count': true,
        '$top': 20,
      },
      headers: {
        Authorization: `Bearer ${empresa.token}`,
      },
    }
  );

  return data.value;
}

/**
 * A URL desta busca é fixa em EGSAPP4 independente da empresa logada — comportamento
 * original preservado (não alterar).
 */
export async function comboBoxCidade(empresa: { token: string }, search: string) {
  const { data } = await axios.get(`${API_ROOT}/EGSAPP4//api/ComboBox/GCIDADE?search=${search}`, {
    headers: {
      Authorization: `Bearer ${empresa.token}`
    }
  });
  return data;
}
