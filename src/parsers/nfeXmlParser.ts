import { formatarCpfCnpj } from "../utils/format";

export interface CamposBasicosNFe {
  temDest: boolean;
  cpfCnpjDestinatario: string;
  inscEstadualDestinatario: string;
  temEmit: boolean;
  cpfCnpjRemetente: string;
  temIde: boolean;
  chaveNotaFiscal: string;
  numeroNotaFiscal: string;
  temVol: boolean;
  produtoPredominante: string;
  temIcmsTot: boolean;
  valorCarga: string;
  pesoTotal: number;
  saidaCidade: string;
  saidaUF: string;
  destinoCidade: string;
  destinoUF: string;
}

/**
 * Campos extras de leitura, não usados pelo fluxo de envio do CT-e — apenas
 * para exibição/conferência na tela (não alteram o payload enviado ao ERP).
 */
export interface CamposAdicionaisNFe {
  protocoloAutorizacao: string;
  dataEmissao: string;
  naturezaOperacao: string;
  placaVeiculoTransporte: string;
  rntcTransportador: string;
  formaPagamento: string;
  valorPagamento: string;
  observacoes: string;
  nomeEmitente: string;
  nomeDestinatario: string;
}

export interface NFeParseResult {
  basicos: CamposBasicosNFe;
  adicionais: CamposAdicionaisNFe;
}

export function parseNFeXml(xmlContent: string): NFeParseResult {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

  const icmsTot = xmlDoc.querySelector("ICMSTot");
  const vol = xmlDoc.querySelector("vol");
  const ide = xmlDoc.querySelector("ide");
  const exit = xmlDoc.querySelector("enderEmit");
  const dest = xmlDoc.querySelector("dest");
  const destination = xmlDoc.querySelector("enderDest");
  const emit = xmlDoc.querySelector("emit");
  const transp = xmlDoc.querySelector("transp");
  const infProt = xmlDoc.querySelector("protNFe infProt");
  const infAdic = xmlDoc.querySelector("infAdic");
  const detPag = xmlDoc.querySelector("pag detPag");

  let cpfCnpjDestinatario = "";
  let inscEstadualDestinatario = "";
  if (dest) {
    const cpfCnpjDest = dest.querySelector("CPF")?.textContent || dest.querySelector("CNPJ")?.textContent || "";
    if (cpfCnpjDest) {
      cpfCnpjDestinatario = formatarCpfCnpj(cpfCnpjDest, 'destinatario');
    }
    inscEstadualDestinatario = dest.querySelector("IE")?.textContent || "";
  }

  let cpfCnpjRemetente = "";
  if (emit) {
    const cpfCnpjRem = emit.querySelector("CPF")?.textContent || emit.querySelector("CNPJ")?.textContent || "";
    if (cpfCnpjRem) {
      cpfCnpjRemetente = formatarCpfCnpj(cpfCnpjRem, 'Remetente');
    }
  }

  const numeroNotaFiscal = (ide?.querySelector("nNF")?.textContent || "").trim();
  const chaveNotaFiscal = (
    xmlDoc.querySelector("infNFe")?.getAttribute("Id")?.replace("NFe", "") || ""
  ).trim();

  const produtoPredominante = vol
    ? (xmlDoc.querySelector("prod")?.querySelector("xProd")?.textContent?.split(' ')[0] || "")
    : "";

  let valorCarga = "0";
  if (icmsTot) {
    valorCarga = icmsTot.querySelector("vNF")?.textContent || "0";
  }

  let pesoTotal = 0;
  if (vol) {
    const volumes = xmlDoc.querySelectorAll("vol");
    pesoTotal = Array.from(volumes).reduce((total, v) => {
      const peso = parseFloat(v.querySelector("pesoB")?.textContent || "0");
      return total + peso;
    }, 0);
  }

  const saidaCidade = exit?.querySelector("xMun")?.textContent || "";
  const saidaUF = exit?.querySelector("UF")?.textContent || "";
  const destinoCidade = destination?.querySelector("xMun")?.textContent || "";
  const destinoUF = destination?.querySelector("UF")?.textContent || "";

  return {
    basicos: {
      temDest: !!dest,
      cpfCnpjDestinatario,
      inscEstadualDestinatario,
      temEmit: !!emit,
      cpfCnpjRemetente,
      temIde: !!ide,
      chaveNotaFiscal,
      numeroNotaFiscal,
      temVol: !!vol,
      produtoPredominante,
      temIcmsTot: !!icmsTot,
      valorCarga,
      pesoTotal,
      saidaCidade,
      saidaUF,
      destinoCidade,
      destinoUF,
    },
    adicionais: {
      protocoloAutorizacao: infProt?.querySelector("nProt")?.textContent || "",
      dataEmissao: ide?.querySelector("dhEmi")?.textContent || ide?.querySelector("dEmi")?.textContent || "",
      naturezaOperacao: ide?.querySelector("natOp")?.textContent || "",
      placaVeiculoTransporte: transp?.querySelector("veicTransp placa")?.textContent || "",
      rntcTransportador: transp?.querySelector("veicTransp RNTC")?.textContent || "",
      formaPagamento: detPag?.querySelector("tPag")?.textContent || "",
      valorPagamento: detPag?.querySelector("vPag")?.textContent || "",
      observacoes: infAdic?.querySelector("infCpl")?.textContent || "",
      nomeEmitente: emit?.querySelector("xNome")?.textContent || "",
      nomeDestinatario: dest?.querySelector("xNome")?.textContent || "",
    },
  };
}
