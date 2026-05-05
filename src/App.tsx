import axios from "axios";
import { useEffect, useState } from "react";
import { custoPorEstado } from "./frete";
import { sendObj } from "./send";





function App() {
  const token = localStorage.getItem('token');
  const [tab, setTab] = useState<'identificação' | 'Comp/Tributos' | 'documentos' | 'Reforma Tributária'>('identificação');
  const [loading, setLoading] = useState<boolean>(() => !token);
  const [cpfCnpjDestinatario, setCpfCnpjDestinatario] = useState<string>('');
  const [cpfCnpjRemetente, setCpfCnpjRemetente] = useState<string>('');
  const [quantidadeCarga, setQuantidadeCarga] = useState<number>(0);
  const [valorCarga, setValorCarga] = useState<string>('0');
  const [valorServico, setValorServico] = useState<string>('0');
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [produtoPredominante, setProdutoPredominante] = useState<string>('');
  const [placaVeiculoTração, setPlacaVeiculoTração] = useState<string>('');
  const [motorista, setMotorista] = useState<string>('')
  const [veiculoNome, setVeiculoNome] = useState('')
  const [motoristaNome, setMotoristaNome] = useState('')
  const [remeteneNome, setRemetenteNome] = useState('')
  const [destinatarioNome, setDestinatarioNome] = useState('')
  const [numeroNotaFiscal, setNumeroNotaFiscal] = useState<string>('')
  const [chaveNotaFiscal, setChaveNotaFiscal] = useState<string>('')
  const [percentualCBS, setPercentualCBS] = useState<string>('')
  const [valorIBS, setValorIBS] = useState<string>('')
  const [saida, setSaida] = useState<{ city: string, uf: string }>({ city: '', uf: '' })
  const [destino, setDestino] = useState<{ city: string, uf: string }>({ city: '', uf: '' })
  const [valorICMS, setValorICMS] = useState('0')
  const [escolhaCte, setEscolhaCte] = useState<number>(0)
  const [ctes, setCtes] = useState<{ REM_NOME: string, DATACREATE: string, IDCTE: number, NOMECIDADEEMISSAO: string, NOMECIDADEFIMSERV: string }[]>([])
  // const [sendObj, setSendObj] = useState<any>({})



  const processarXML = (xmlContent: string) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

      const dest = xmlDoc.querySelector("dest");
      if (dest) {
        const cpfCnpjDest = dest.querySelector("CPF")?.textContent || dest.querySelector("CNPJ")?.textContent || "";
        if (cpfCnpjDest) {
          formatarCpfCnpj(cpfCnpjDest, 'destinatario');
        }
      }

      const emit = xmlDoc.querySelector("emit");
      if (emit) {
        const cpfCnpjRem = emit.querySelector("CPF")?.textContent || emit.querySelector("CNPJ")?.textContent || "";
        if (cpfCnpjRem) {
          formatarCpfCnpj(cpfCnpjRem, 'Remetente');
        }
      }

      const icmsTot = xmlDoc.querySelector("ICMSTot");
      const vol = xmlDoc.querySelector("vol");
      const ide = xmlDoc.querySelector("ide");
      const exit = xmlDoc.querySelector("enderEmit");
      const destination = xmlDoc.querySelector("enderDest");
      if (ide) {
        const nNF = ide.querySelector("nNF")?.textContent || "";
        const chave = xmlDoc.querySelector("infNFe")?.getAttribute("Id")?.replace("NFe", "") || "";
        setNumeroNotaFiscal(nNF);
        setChaveNotaFiscal(chave);
      }

      let produto = "";
      if (vol) {
        produto = xmlDoc.querySelector("prod")?.querySelector("xProd")?.textContent?.split(' ')[0] || "";
      }

      if (produto) {
        setProdutoPredominante(produto);
      }

      let totalValor = 0;
      if (icmsTot) {
        const vNF = icmsTot.querySelector("vNF")?.textContent || "0";
        totalValor = parseFloat(vNF.replace(',', '.'));
      }
      if (totalValor > 0) {
        const valorFormatado = totalValor.toLocaleString('pt-BR');
        setValorCarga(valorFormatado);
        sendObj.VALORCARGA = totalValor;
      }

      if (vol) {
        const qVol = vol.querySelector("pesoB")?.textContent || "0";
        const esp = vol.querySelector("esp")?.textContent || "";


        setQuantidadeCarga(parseFloat(qVol));

        console.log(parseFloat(qVol))
        sendObj.VALORCARGAAVERB = parseFloat(qVol);
        sendObj.CARGAQTD[0].QUANTIDADE = parseFloat(qVol);
      }

      const chNFe = xmlDoc.querySelector("chNFe")?.textContent || xmlDoc.querySelector("infNFe")?.getAttribute("Id")?.replace("NFe", "") || "";
      if (chNFe) {
        sendObj.DOCNFE = [{
          IDENT: 0,
          IDCTE: 0,
          CHAVENFE: chNFe,
          VALORNFE: null,
          PESOB: null,
          PESOL: null,
          PIN: null,
          DATAPREVENTREGA: null,
          PITEM: 0,
          NNF: xmlDoc.querySelector("nNF")?.textContent || "",
          NCM: null,
          DESCPRODUTO: null
        }];
      }


      const saidaCidade = exit?.querySelector("xMun")?.textContent || "";
      const saidaUF = exit?.querySelector("UF")?.textContent || "";
      const destinoCidade = destination?.querySelector("xMun")?.textContent || "";
      const destinoUF = destination?.querySelector("UF")?.textContent || "";

      if (saidaCidade && destinoCidade && saidaUF && destinoUF) {
        setSaida({
          city: saidaCidade,
          uf: saidaUF
        })
        setDestino({
          city: destinoCidade,
          uf: destinoUF
        })
      }


      console.log("Dados extraídos do XML com sucesso!");
    } catch (error) {
      console.error("Erro ao processar XML:", error);
      alert("Erro ao processar o arquivo XML. Verifique o formato do arquivo.");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "text/xml") {
      setXmlFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const xmlContent = e.target?.result as string;
        processarXML(xmlContent);
      };
      reader.readAsText(file);
    } else {
      alert("Por favor, selecione um arquivo XML válido.");
    }
  };

  function formatarCpfCnpj(input: string, path: string) {
    let value = input.replace(/\D/g, '');

    if (value.length > 14) {
      value = value.substring(0, 14);
    }

    let formattedValue = '';

    if (value.length <= 11) {
      // Formato CPF: XXX.XXX.XXX-XX
      if (value.length <= 3) {
        formattedValue = value;
      } else if (value.length <= 6) {
        formattedValue = value.replace(/(\d{3})(\d{0,3})/, '$1.$2');
      } else if (value.length <= 9) {
        formattedValue = value.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
      } else {
        formattedValue = value.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
      }
    } else {
      // Formato CNPJ: XX.XXX.XXX/XXXX-XX
      if (value.length <= 2) {
        formattedValue = value;
      } else if (value.length <= 5) {
        formattedValue = value.replace(/(\d{2})(\d{0,3})/, '$1.$2');
      } else if (value.length <= 8) {
        formattedValue = value.replace(/(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
      } else if (value.length <= 12) {
        formattedValue = value.replace(/(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
      } else {
        formattedValue = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
      }
    }

    if (path === 'destinatario') {
      setCpfCnpjDestinatario(formattedValue);
    } else if (path === 'Remetente') {
      setCpfCnpjRemetente(formattedValue);
    } else if (path === 'motorista') {
      setMotorista(formattedValue);
    }
  }
  const loadingData = async () => {
    try {

      const [destinatario, Remetente, VeiculoTração, Motorista] = await Promise.all([
        axios.post("https://api.egssistemas.com.br/EGSCTE//api/ComboBox/GCADASTRO", {
          "search": cpfCnpjDestinatario,
          "id": null,
          "propertyList": []
        },
          {
            headers: {
              'Authorization': 'Bearer ' + token,
            }
          }),
        axios.post("https://api.egssistemas.com.br/EGSCTE//api/ComboBox/GCADASTRO", {
          "search": cpfCnpjRemetente,
          "id": null,
          "propertyList": []
        },
          {
            headers: {
              'Authorization': 'Bearer ' + token,
            }
          }),
        axios.get("https://api.egssistemas.com.br/EGSCTE//api/ComboBox/GVEICULO", {
          params: {
            "search": placaVeiculoTração,
            "tipoVeiculo": "T"
          },
          headers: {
            'Authorization': 'Bearer ' + token,
          }
        }),
        axios.post("https://api.egssistemas.com.br/EGSCTE//api/ComboBox/GCADASTRO", {
          "search": motorista,
          "id": null,
          "propertyList": []
        },
          {
            headers: {
              'Authorization': 'Bearer ' + token,
            }
          })
      ]);
      sendObj.IDDESTINATARIO = destinatario.data[0].IDCADASTRO;
      sendObj.IDCONTRATANTE = Remetente.data[0].IDCADASTRO;
      sendObj.CARGAQTD[0].DESCMEDIDA = VeiculoTração.data[0].DESCRICAO;
      sendObj.CARGAQTD[0].QUANTIDADE = 1;
      sendObj.DESCCARGA = produtoPredominante;
      sendObj.TIPOCARGA = produtoPredominante;
      sendObj.Veiculos[0] = {
        ...sendObj.Veiculos[0],
        IDENT: VeiculoTração.data[0].IDENT,
        RENAVAN: VeiculoTração.data[0].RENAVAN,
        PLACA: VeiculoTração.data[0].PLACA,
        TARA: VeiculoTração.data[0].TARA,
        CAPACIDADEKG: VeiculoTração.data[0].CAPACIDADEKG,
        CAPACIDADEM3: VeiculoTração.data[0].CAPACIDADEM3,
        PROPRIO: VeiculoTração.data[0].PROPRIO,
        TIPOVEICULO: VeiculoTração.data[0].TIPOVEICULO,
        TIPORODADO: VeiculoTração.data[0].TIPORODADO,
        TIPOCARROCERIA: VeiculoTração.data[0].TIPOCARROCERIA,
        UFLICENCIADO: VeiculoTração.data[0].UFLICENCIADO,
        CPFCNPJ: VeiculoTração.data[0].CPFCNPJ,
        RNTC: VeiculoTração.data[0].RNTC,
        NOMEPROPRIETARIO: VeiculoTração.data[0].NOMEPROPRIETARIO,
        INSCESTADUAL: VeiculoTração.data[0].INSCESTADUAL,
        UFINSCESTADUAL: VeiculoTração.data[0].UFINSCESTADUAL,
        TIPOPROPRIETARIO: VeiculoTração.data[0].TIPOPROPRIETARIO,
        IDVEICULO: VeiculoTração.data[0].IDVEICULO
      }
      sendObj.IDVEICULO = VeiculoTração.data[0].IDVEICULO
      sendObj.DOCNFE[0].CHAVENFE = chaveNotaFiscal
      sendObj.DOCNFE[0].NNF = numeroNotaFiscal
      setMotoristaNome(Motorista.data[0].NOME)
      setDestinatarioNome(destinatario.data[0].NOME)
      setRemetenteNome(Remetente.data[0].NOME)
      setVeiculoNome(VeiculoTração.data[0].DESCRICAO)
      console.group(VeiculoTração.data[0])
      console.log(sendObj);
    }
    catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }
  const sendData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Token não encontrado. Faça login primeiro.');
        return;
      }

      console.log('Enviando dados:', sendObj);

      // Aqui você fará a requisição POST para enviar os dados do CT-e
      const response = await axios.post("https://api.egssistemas.com.br/EGSCTE/api/CTE", sendObj, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        }
      });

      console.log('Resposta do servidor:', response.data);
      alert('CT-e enviado com sucesso!');

    } catch (error) {
      console.error('Erro ao enviar CT-e:', error);
      alert('Erro ao enviar CT-e. Verifique os dados e tente novamente.');
    }
  };

  const getToken = async () => {
    try {
      const { data }: { data: { AUXTOKEN: string, URLAPI: string } } = await axios.get("https://api.egssistemas.com.br/EGSWEB/api/Sistema/GetServerUrlByChaveAcessoV1?CHAVEACESSO=50201&EGSERP=true");
      console.log(data);
      setTimeout(async () => {
        const params = new URLSearchParams();
        params.append('auxtoken', data.AUXTOKEN);
        params.append('captcha', '');
        params.append('codigo2fa', '');
        params.append('grant_type', 'password');
        params.append('username', 'FINANCEIRO');
        params.append('password', 'inter2026');

        const tokenData: { data: { access_token: string, token_type: string, expires_in: string } } = await axios.post("https://api.egssistemas.com.br/EGSCTE/token", params, {
          headers: {
            authorization: 'Basic NTAyMDE6ZWckeXN0ZW0='
          }
        });

        localStorage.setItem('token', tokenData.data.access_token);
        setLoading(false);
        console.log(tokenData.data.access_token);
      }, 1000);
    } catch (error) {
      console.error(error);
    }

  }


  const getCTES = async () => {
    try {
      const { data } = await axios.get('https://api.egssistemas.com.br/EGSCTE//odata/CTe?%24orderby=NUMCTE%20desc&%24top=40&%24count=true',
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      )
      setCtes(data.value)
      console.log(data.value)
    } catch (e) {
      console.log(e)
    }
  }

  const calcularFrete = (saida: { city: string, uf: string }, destino: { city: string, uf: string }) => {
    const cargaEmKg = quantidadeCarga / 1000
    const custoDestino = custoPorEstado.find((item) => item.CITY === destino.city && item.UF === destino.uf);
    const valorDoServiço = (238 * cargaEmKg)
    const valorDoServicoComLocalString = valorDoServiço.toLocaleString('pt-br')
    console.log("valor do servico", valorDoServicoComLocalString)
    setValorServico(valorDoServicoComLocalString)
    setValorICMS((valorDoServiço * 0.12).toFixed(2))
    setPercentualCBS((valorDoServiço * 0.009).toFixed(2))
    setValorIBS((valorDoServiço * 0.001).toFixed(2))
  }


  const buscarCteEscolhida = async () => {
    try {
      const { data } = await axios.get(`https://api.egssistemas.com.br/EGSCTE//api/CteApi/GetCTe?IDCTE=${escolhaCte}&CODEMPRESA=1&MODELODOC=57&OPERACAO=COPIA`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      )
      console.log(data)
      // setSendObj(data)
    } catch (e) {
      console.log(e)
    }
  }

  useEffect(() => {
    if (!escolhaCte || escolhaCte === 0) {
      return
    }
    // buscarCteEscolhida()
  }, [escolhaCte])

  useEffect(() => {
    // getCTES()
    // getToken()
    // localStorage.setItem('token', 'k_CigZKN6BKgdHCtNXBqsOninhGPAuQVij4sAhnioz3fnRKKtG8nE48HBwj5z4ZCldB47e30J4QwGtvkpxgNX6SMPlMwciMH5D4NU5EU3ZFAP594fDBZm1EBO4jhkopvwkUdEZSbHxhHxK3HIx6b-CRRi8g44sLBSPafoIi13b6MET7T4wCKt5tJLyR2Jj_z0WsttlBSMTlJ9__AQcP_9c1gAwp3scMG9f6i4atgELtoGYJdlQYNnsdsAPgpJ92bIZA9kpSblenrNtxgn3ntc1a5kwdenTxKRbqd30Wr2JnEVZhyGqJpu-6yO8QX_uXudX3r1DJyl0FXKtcbIyJuHhcURHOLnVPDPOuRctoyGL5P190GFQ8QUFJtntFfGUooAC-DolbMzMSDVG4xyPCIk5oJkVPlpic_Hy3NEhSvprBOSrHoETBjXSrhwnGDltnzc1wyuVwTbTMxKytB6y0RlZpIUi8gkn25Q8VWMeBD4gwCc0JsOfx8_Os2kyOcTJTEu25UZw_HvcVWbfUqZxQdK50FwwFirySAH4z3_nCko78');
  }, []);

  useEffect(() => { calcularFrete(saida, destino) }, [quantidadeCarga])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white shadow-xl rounded-lg overflow-hidden">
            {!escolhaCte ? (
              <div>
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                  <h1 className="text-2xl font-bold text-white">CT-e EGS</h1>
                </div>
                <div className="p-6">
                  <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 shadow-sm hover:border-blue-400 transition-colors">
                    <div className="text-center">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Importar XML</h3>
                        <p className="text-sm text-gray-600 mb-4">Carregue um arquivo XML para preencher automaticamente os dados</p>
                      </div>

                      <div className="border-t border-gray-200 pt-4">
                        <label htmlFor="xml-upload" className="group relative flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all">

                          <div className="flex flex-col items-center justify-center pt-5 pb-6">

                            <p className="mb-2 text-sm text-gray-600">
                              <span className="font-semibold text-blue-600">Clique para selecionar</span> ou arraste o arquivo XML aqui
                            </p>
                            <p className="text-xs text-gray-500">Apenas arquivos .xml (máx. 10MB)</p>
                          </div>
                          <input
                            id="xml-upload"
                            name="xml-upload"
                            type="file"
                            accept=".xml"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleFileUpload}
                          />
                        </label>
                      </div>

                      {xmlFile && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center">
                            <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium text-green-800">
                              Arquivo carregado: <span className="font-semibold">{xmlFile.name}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setXmlFile(null)}
                              className="ml-auto text-sm text-red-600 hover:text-red-800 transition-colors"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Navegação por Abas */}
                  <div className="border-b border-gray-200">
                    <nav className="flex space-x-8 px-6" aria-label="Tabs">
                      <button
                        type="button"
                        onClick={() => setTab("identificação")}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${tab === "identificação"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                          }`}
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 016 0zm-4 0a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Identificação
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab("Comp/Tributos")}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${tab === "Comp/Tributos"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                          }`}
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2zM9 5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Componentes/Tributos
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab("documentos")}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${tab === "documentos"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                          }`}
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2zM9 5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Documentos
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab("Reforma Tributária")}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${tab === "Reforma Tributária"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                          }`}
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                        </svg>
                        Reforma Tributária
                      </button>
                    </nav>
                  </div>
                </div>

                <form>
                  {tab === "identificação" && (
                    <div className="space-y-8">
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                          </svg>
                          Dados das Partes
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label htmlFor="Remetente" className="block text-sm font-semibold text-gray-700 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                              </svg>
                              Remetente CPF/CNPJ
                            </label>
                            <input
                              type="text"
                              value={cpfCnpjRemetente}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                formatarCpfCnpj(e.target.value, 'Remetente');
                              }}
                              id="Remetente"
                              name="Remetente"
                              className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                              placeholder="00.000.000/0000-00"
                            />
                            <span className="text-sm text-gray-500">{remeteneNome}</span>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="destinatario" className="block text-sm font-semibold text-gray-700 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                              </svg>
                              Destinatário CPF/CNPJ
                            </label>
                            <input
                              type="text"
                              value={cpfCnpjDestinatario}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                formatarCpfCnpj(e.target.value, 'destinatario');
                              }}
                              id="destinatario"
                              name="destinatario"
                              className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                              placeholder="00.000.000/0000-00"
                            />
                            <span className="text-sm text-gray-500">{destinatarioNome}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                          </svg>
                          Dados da Carga
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                              </svg>
                              Produto predominante
                            </label>
                            <input type="text" value={produtoPredominante} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              setProdutoPredominante(e.target.value);
                            }} className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out" placeholder="Ex: Fio, Tecido, etc." />
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                              </svg>
                              Valor da carga
                            </label>
                            <input
                              type="text"
                              value={valorCarga}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const value = e.target.value.replace('R$', '').replace(',', '.').trim();
                                setValorCarga(e.target.value);
                                sendObj.VALORCARGA = parseFloat(value) || 0;
                              }}
                              className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                              placeholder="R$ 0,00"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path>
                              </svg>
                              Quantidade carga
                            </label>
                            <input
                              type="text"
                              value={quantidadeCarga.toLocaleString('pt-BR')}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const value = e.target.value.replace('.', '').replace(',', '.');
                                setQuantidadeCarga(parseFloat(value));
                                sendObj.CARGAQTD[0].QUANTIDADE = parseFloat(value) || 0;
                                sendObj.VALORCARGAAVERB = parseFloat(value) || 0;
                              }}
                              className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                              placeholder="0,00"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                              </svg>
                              Valor serviço / Receber
                            </label>
                            <input
                              type="text"
                              value={valorServico}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const value = e.target.value.replace('R$', '').replace(',', '.').trim();
                                setValorServico(e.target.value);
                                sendObj.VALORSERVICO = parseFloat(value) || 0;
                                sendObj.VALORRECEBER = parseFloat(value) || 0;
                              }}
                              className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                              placeholder="R$ 0,00"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                  )}
                  {/* 373.249.934-00  AAW1H16 */}

                  {tab === "Comp/Tributos" && (
                    <div className="space-y-8">
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label htmlFor="placaVeiculoTração" className="block text-sm font-semibold text-gray-700 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                              </svg>
                              Veículo Tração ( PLACA )
                            </label>
                            <input
                              type="text"
                              value={placaVeiculoTração}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setPlacaVeiculoTração(e.target.value);
                              }}
                              id="placaVeiculoTração"
                              name="placaVeiculoTração"
                              className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                              placeholder="ABC-1234"
                            />
                            <span className="text-sm text-gray-500">{veiculoNome}</span>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="motorista" className="block text-sm font-semibold text-gray-700 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                              </svg>
                              Motorista ( CPF )
                            </label>
                            <input
                              type="text"
                              value={motorista}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                formatarCpfCnpj(e.target.value, 'motorista');
                              }}
                              id="motorista"
                              name="motorista"
                              className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                              placeholder="000.000.000-00"
                            />
                            <span className="text-sm text-gray-500">{motoristaNome}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                          </svg>
                          Dados da Carga
                        </h2>
                        <div className="space-y-2">
                          <label htmlFor="icms" className="block text-sm font-semibold text-gray-700 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                            </svg>
                            Valor do ICMS ( 12 %)
                          </label>
                          <input
                            type="text"
                            value={valorICMS}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              setValorICMS(e.target.value);
                            }}
                            id="icms"
                            name="icms"
                            className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                          />
                        </div>
                      </div>


                    </div>
                  )}

                  {tab === "documentos" && (
                    <div className="space-y-8">
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          </svg>
                          Documentos Fiscais
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label htmlFor="numeroNotaFiscal" className="block text-sm font-semibold text-gray-700 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                              </svg>
                              Número da Nota Fiscal
                            </label>
                            <input
                              type="text"
                              value={numeroNotaFiscal}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setNumeroNotaFiscal(e.target.value);
                              }}
                              id="numeroNotaFiscal"
                              name="numeroNotaFiscal"
                              className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                              placeholder="000000000"
                            />
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="chaveNotaFiscal" className="block text-sm font-semibold text-gray-700 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
                              </svg>
                              Chave da Nota Fiscal
                            </label>
                            <input
                              type="text"
                              value={chaveNotaFiscal}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setChaveNotaFiscal(e.target.value);
                              }}
                              id="chaveNotaFiscal"
                              name="chaveNotaFiscal"
                              className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                              placeholder="Chave de 44 dígitos"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {tab === 'Reforma Tributária' && (
                    <div className="space-y-8">
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                          </svg>
                          Contribuições da Reforma Tributária
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <label htmlFor="valorBC" className="block text-sm font-semibold text-gray-700 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                              </svg>
                              v. BC IBS/CBS  ( serviço )
                            </label>
                            <input
                              type="text"
                              value={valorServico}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const value = e.target.value.replace('R$', '').replace(',', '.').trim();
                                setValorServico(e.target.value);
                                sendObj.IBSCBS.vBC = parseFloat(value) || 0;
                              }}
                              id="valorBC"
                              name="valorBC"
                              className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                              placeholder="R$ 0,00"
                            />
                          </div>

                          <div className="space-y-2">
                            <label htmlFor="valorBC" className="block text-sm font-semibold text-gray-700 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                              </svg>
                              v IBS
                            </label>
                            <input
                              type="text"
                              value={valorIBS}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const value = e.target.value.replace('R$', '').replace(',', '.').trim();
                                setValorIBS(e.target.value);
                                sendObj.IBSCBS.vBC = parseFloat(value) || 0;
                              }}
                              id="valorBC"
                              name="valorBC"
                              className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                              placeholder="R$ 0,00"
                            />
                          </div>



                          <div className="space-y-2">
                            <label htmlFor="percentualCBS" className="block text-sm font-semibold text-gray-700 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                              </svg>
                              v. CBS
                            </label>
                            <input
                              type="text"
                              value={percentualCBS}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const value = e.target.value.replace('%', '').replace(',', '.').trim();
                                setPercentualCBS(e.target.value);
                                sendObj.IBSCBS.vCBS = parseFloat(value) || 0;
                              }}
                              id="percentualCBS"
                              name="percentualCBS"
                              className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                              placeholder="0,00%"
                            />
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="valorIBS" className="block text-sm font-semibold text-gray-700 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                              </svg>
                              v. IBS UF / v. IBS ( 0.1% )
                            </label>
                            <input
                              type="text"
                              value={valorIBS}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const value = e.target.value.replace('R$', '').replace(',', '.').trim();
                                setValorIBS(e.target.value);
                                sendObj.IBSCBS.vIBSUF = parseFloat(value) || 0;
                                sendObj.IBSCBS.vIBS = parseFloat(value) || 0;
                              }}
                              id="valorIBS"
                              name="valorIBS"
                              className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                              placeholder="R$ 0,00"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}



                  <div className="flex justify-center p-6">
                    <button
                      type="button"
                      onClick={() => loadingData()}
                      className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform transition duration-150 ease-in-out hover:scale-105"
                    >
                      <span className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Buscar
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => alert("depois envio, to cansado")}
                      className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg shadow-lg hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transform transition duration-150 ease-in-out hover:scale-105"
                    >
                      <span className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                        </svg>
                        Enviar CT-e
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Selecione um CT-e</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {ctes.length > 0 ? (
                    ctes.map((cte) => (
                      <div
                        key={cte.IDCTE}
                        onClick={() => setEscolhaCte(cte.IDCTE)}
                        className="bg-gray-50 hover:bg-gray-100 p-4 rounded-lg cursor-pointer transition duration-200 border border-gray-200 hover:border-blue-300"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-gray-800">CT-e: {cte.IDCTE}</p>
                            <p className="text-sm text-gray-600">Remetente: {cte.REM_NOME}</p>
                            <p className="text-sm text-gray-600">Origem: {cte.NOMECIDADEEMISSAO}</p>
                            <p className="text-sm text-gray-600">Destino: {cte.NOMECIDADEFIMSERV}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">
                              {new Date(cte.DATACREATE).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Nenhum CT-e encontrado</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
