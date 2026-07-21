export const API_ROOT = "https://api.egssistemas.com.br";

export function getApiBase(empresaName: string): string {
  return empresaName === "GADELOG" ? "EGSAPP4" : "EGSCTE";
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
