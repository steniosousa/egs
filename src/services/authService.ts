import axios from "axios";
import { API_ROOT, authHeader, getApiBase } from "./apiClient";

export type EmpresaUrl = "GADELOG" | "INTERMEDIUM";

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: string;
}

export async function loginEmpresa(url: EmpresaUrl): Promise<TokenResponse> {
  const { data }: { data: { AUXTOKEN: string, URLAPI: string } } = await axios.get(`${API_ROOT}/EGSWEB/api/Sistema/GetServerUrlByChaveAcessoV1?CHAVEACESSO=${url === "GADELOG" ? "2570123" : "50201"}&EGSERP=true`);

  const params = new URLSearchParams();
  params.append('auxtoken', data.AUXTOKEN);
  params.append('captcha', '');
  params.append('codigo2fa', '');
  params.append('grant_type', 'password');
  params.append('username', url === "GADELOG" ? "HENRIQUE" : 'FINANCEIRO');
  params.append('password', url === "GADELOG" ? "291546" : 'inter2026');

  const tokenData: { data: TokenResponse } = await axios.post(`${API_ROOT}/${url === "GADELOG" ? "EGSAPP4" : "EGSCTE"}/token`, params, {
    headers: {
      authorization: url === "GADELOG" ? "Basic MjU3MDEyMzplZyR5c3RlbQ==" : 'Basic NTAyMDE6ZWckeXN0ZW0='
    }
  });

  return tokenData.data;
}

export async function logoutEmpresa(empresa: { name: string; token: string }): Promise<void> {
  await axios.post(
    `${API_ROOT}/${getApiBase(empresa.name)}/api/Sistema/PostSair`,
    null,
    {
      headers: authHeader(empresa.token),
      withCredentials: true
    }
  );
}
