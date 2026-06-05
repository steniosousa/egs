import axios from "axios";
import { useEffect, useState } from "react";
import { carregarTabela, buscarValor19Ton, buscarValor27_30Ton, buscarValor14Ton, buscarValor32_35Ton, buscarValor38_40Ton, buscarValor50Ton } from "./tabelaMatrix";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { processarDocumento, extrairTAC } from './pdfProcessor';
import { proprietário, veiculo } from "./send";

function App() {
  const [escolherEmpresa, setEscolherEmpresa] = useState('')
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
  const [loadingTabela, setLoadingTabela] = useState<boolean>(true)
  const [saida, setSaida] = useState<{ city: string, uf: string }>({ city: '', uf: '' })
  const [destino, setDestino] = useState<{ city: string, uf: string }>({ city: '', uf: '' })
  const [valorICMS, setValorICMS] = useState('0')
  const [escolhaCte, setEscolhaCte] = useState<number | null>(null)
  const [ctes, setCtes] = useState<{ REM_NOME: string, DATACREATE: string, IDCTE: number, NOMECIDADEEMISSAO: string, NOMECIDADEFIMSERV: string }[]>([])
  const [sendObj, setSendObj] = useState<any>({})
  const [dadosBuscados, setDadosBuscados] = useState(false)
  const [crlvFile, setCnhFile] = useState<File | null>(null)
  const [rntcImage, setRntcImage] = useState<File | null>(null)
  const [rntcImageveiculo, setRntcImageveiculo] = useState<File | null>(null)
  const [dadosCNH, setDadosCNH] = useState({ tipoVeiculo: '', tipoRodado: '', rntc: '', tipoCarroceria: "", tipoProprietario: '', proprietario: '', local: '', cpf: '', categoria: '', validade: '', renavam: '', placa: '', carroceria: '', modelo: '', capacidade: '', peso: '', rntc_proprietatio: "" })

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

      let totalValor = '0';
      if (icmsTot) {
        const vNF = icmsTot.querySelector("vNF")?.textContent || "0";
        totalValor = vNF
      }
      if (totalValor !== '0') {
        const valueWithToFixed = parseInt(totalValor).toFixed(2)
        setValorCarga(totalValor);
        sendObj.VALORCARGA = Number(valueWithToFixed);
      }

      if (vol) {
        const qVol = vol.querySelector("pesoB")?.textContent || "0";
        const volumes = xmlDoc.querySelectorAll("vol");

        const pesoTotal = Array.from(volumes).reduce((total, vol) => {
          const peso = parseFloat(
            vol.querySelector("pesoB")?.textContent || "0"
          );

          return total + peso;
        }, 0);

        console.log(pesoTotal); // 14000
        setQuantidadeCarga(pesoTotal);
        sendObj.CARGAQTD[0].QUANTIDADE = pesoTotal;
        sendObj.PESOKG = pesoTotal;
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


    } catch (error) {
      toast.error("Erro ao processar o arquivo XML. Verifique o formato do arquivo.");
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
      toast.error("Por favor, selecione um arquivo XML válido.");
    }
  };

  const handleCnhUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (file && file.type === 'application/pdf') {
      setCnhFile(file);

      processarDocumento(file, {
        onProgress: (message: string) => {
          toast.info(message);
        },

        onSuccess: (dados) => {
          setDadosCNH({
            proprietario: dados.proprietario || '',
            local: dados.local || '',
            cpf: dados.cpf || '',
            categoria: dados.categoria || '',
            validade: dados.validade || '',
            renavam: dados.renavam || '',
            placa: dados.placa || '',
            carroceria: dados.carroceria || '',
            modelo: dados.modelo || '',
            capacidade: dados.capacidade || '',
            peso: dados.peso || '',
            tipoProprietario: '',
            tipoCarroceria: '',
            rntc: '',
            tipoVeiculo: '',
            rntc_proprietatio: '',
            tipoRodado: ""
          });

          if (dados.cpf) {
            formatarCpfCnpj(
              dados.cpf,
              'proprietario'
            );
          }

          if (dados.placa) {
            setPlacaVeiculoTração(
              dados.placa
            );
          }

          toast.success(
            'Dados da CNH extraídos com sucesso!'
          );
        },

        onError: (error: string) => {
          toast.error(error);
        },
      });
    } else {
      toast.error(
        'Por favor, selecione um arquivo PDF válido.'
      );
    }
  };

  function formatarCpfCnpj(input: string, path: string) {
    let value = input.replace(/\D/g, '');

    if (value.length > 14) {
      value = value.substring(0, 14);
    }

    let formattedValue = '';

    if (value.length <= 11) {
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
    } else if (path === 'proprietario') {
      setMotorista(formattedValue);
    }
  }

  const loadingData = async () => {
    try {

      if (!cpfCnpjDestinatario || !cpfCnpjRemetente || !placaVeiculoTração || !motorista) {
        toast.info("Informe o cnpj do destinatário, cpf do remetente, placa do veículo e cpf do motorista para continuar")
        return
      }

      const [destinatario, Remetente, VeiculoTração, Motorista] = await Promise.all([
        axios.post(`https://api.egssistemas.com.br/${escolherEmpresa === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//api/ComboBox/GCADASTRO`, {
          "search": cpfCnpjDestinatario,
          "id": null,
          "propertyList": []
        },
          {
            headers: {
              'Authorization': 'Bearer ' + token,
            }
          }),
        axios.post(`https://api.egssistemas.com.br/${escolherEmpresa === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//api/ComboBox/GCADASTRO`, {
          "search": cpfCnpjRemetente,
          "id": null,
          "propertyList": []
        },
          {
            headers: {
              'Authorization': 'Bearer ' + token,
            }
          }),
        axios.get(`https://api.egssistemas.com.br/${escolherEmpresa === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//api/ComboBox/GVEICULO`, {
          params: {
            "search": placaVeiculoTração,
            "tipoVeiculo": "T"
          },
          headers: {
            'Authorization': 'Bearer ' + token,
          }
        }),
        axios.post(`https://api.egssistemas.com.br/${escolherEmpresa === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//api/ComboBox/GCADASTRO`, {
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
      sendObj.DESCCARGA = produtoPredominante;
      sendObj.TIPOCARGA = produtoPredominante;

      if (Remetente.data[0]) {
        setRemetenteNome(Remetente.data[0].NOME)
        sendObj.CODCIDADEEMISSAOCTE = Remetente.data[0].CODCIDADE;
        sendObj.CODCIDADEINISERV = Remetente.data[0].CODCIDADE;
        sendObj.NOMECIDADEINICIOSERV = Remetente.data[0].NOMEMUNICIPIO;
        sendObj.IDREMETENTE = Remetente.data[0].IDCADASTRO
      } else {
        toast.info("Remetente não encontrado")
      }

      if (destinatario.data[0]) {
        setDestinatarioNome(destinatario.data[0].NOME)
        sendObj.NOMECIDADEFIMSERV = destinatario.data[0].NOMEMUNICIPIO;
        sendObj.UFINISERV = destinatario.data[0].CODESTADO;
        sendObj.CODCIDADEFIMSERV = destinatario.data[0].CODCIDADE;
        sendObj.NOMECIDADEEMISSAO = destinatario.data[0].NOMEMUNICIPIO;
        sendObj.IDDESTINATARIO = destinatario.data[0].IDCADASTRO;
        sendObj.IDCONTRATANTE = destinatario.data[0].IDCADASTRO;

      } else {
        toast.info("Destinatpario não encontrado")
      }
      if (VeiculoTração.data[0]) {
        sendObj.CARGAQTD[0].DESCMEDIDA = VeiculoTração.data[0].DESCRICAO;
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
        setVeiculoNome(VeiculoTração.data[0].DESCRICAO)
      } else {
        toast.info("Veículo não encontrado")
      }

      if (Motorista.data[0]) {
        sendObj.IDMOTORISTA = Motorista.data[0].IDCADASTRO
        setMotoristaNome(Motorista.data[0].NOME)
      } else {
        toast.info("Motorista não encontrado")
      }


      sendObj.DOCNFE[0].CHAVENFE = chaveNotaFiscal
      sendObj.DOCNFE[0].NNF = numeroNotaFiscal
      setDadosBuscados(true)
    }
    catch (error) {
      toast.error("Erro ao carregar dados")
    }
  }

  const sendData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Token não encontrado. Faça login primeiro.');
        return;
      }

      if (!dadosBuscados) {
        toast.info("Antes de enviar clique no botão 'Buscar Informações'")
        return
      }

      await axios.post(`https://api.egssistemas.com.br/${escolherEmpresa === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//api/CteApi/Salvar`, sendObj, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        }
      });

      toast.info('CT-e enviado com sucesso!');

    } catch (error) {
      toast.error('Erro ao enviar CT-e. Verifique os dados e tente novamente.');
    }
  };

  const getToken = async () => {
    try {
      const currentToken = localStorage.getItem('token');
      const expiresId = localStorage.getItem('expires_id');
      const tokenTimestamp = localStorage.getItem('token_timestamp');

      if (currentToken && expiresId && tokenTimestamp) {
        const currentTime = Date.now();
        const tokenTime = parseInt(tokenTimestamp);
        const expiresIn = parseInt(expiresId) * 1000;

        if (currentTime - tokenTime < (expiresIn - 300000)) {
          setLoading(false);
          getCTES()
          return;
        }
      }

      const { data }: { data: { AUXTOKEN: string, URLAPI: string } } = await axios.get(`https://api.egssistemas.com.br/EGSWEB/api/Sistema/GetServerUrlByChaveAcessoV1?CHAVEACESSO=${escolherEmpresa === "GADELOG" ? "2570123" : "50201"}&EGSERP=true`);
      setTimeout(async () => {
        try {

          const params = new URLSearchParams();
          params.append('auxtoken', data.AUXTOKEN);
          params.append('captcha', '');
          params.append('codigo2fa', '');
          params.append('grant_type', 'password');
          params.append('username', escolherEmpresa === "GADELOG" ? "HENRIQUE" : 'FINANCEIRO');
          params.append('password', escolherEmpresa === "GADELOG" ? "291546" : 'inter2026');

          const tokenData: { data: { access_token: string, token_type: string, expires_in: string } } = await axios.post(`https://api.egssistemas.com.br/${escolherEmpresa === "GADELOG" ? "EGSAPP4" : "EGSCTE"}/token`, params, {
            headers: {
              authorization: escolherEmpresa === "GADELOG" ? "Basic MjU3MDEyMzplZyR5c3RlbQ==" : 'Basic NTAyMDE6ZWckeXN0ZW0='
            }
          });

          localStorage.setItem('expires_id', tokenData.data.expires_in);
          localStorage.setItem('token', tokenData.data.access_token);
          localStorage.setItem('token_timestamp', Date.now().toString());
          localStorage.setItem('company', escolherEmpresa)
          getCTES()

          setLoading(false);
        } catch (error: any) {
          toast.error(error.response.data.error_description || "Erro ao obter token")
          setLoading(false)
        }
      }, 1000);
    } catch (error) {
      toast.error("Erro ao obter token")
      setLoading(false);
    }
  }

  const getCTES = async () => {
    try {
      const { data } = await axios.get(`https://api.egssistemas.com.br/${escolherEmpresa === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//odata/CTe?%24orderby=NUMCTE%20desc&%24top=40&%24count=true`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      )
      setCtes(data.value)
    } catch (e) {
      toast.error("Erro ao recuperar CTES")
    }
  }

  const calcularFrete = (saida: { city: string, uf: string }, destino: { city: string, uf: string }) => {
    const cargaEmKg = quantidadeCarga / 1000

    let valorTabela = 0;
    let tipoCaminhao = '50';


    if (quantidadeCarga >= 13980 && quantidadeCarga < 19000) {
      tipoCaminhao = '14';
    } else if (quantidadeCarga >= 19000 && quantidadeCarga < 27000) {
      tipoCaminhao = '19';
    } else if (quantidadeCarga >= 27000 && quantidadeCarga < 31980) {
      tipoCaminhao = '27_30';
    } else if (quantidadeCarga >= 31980 && quantidadeCarga < 38000) {
      tipoCaminhao = '32_35';
    } else if (quantidadeCarga >= 38000 && quantidadeCarga < 50000) {
      tipoCaminhao = '38_40';
    }

    switch (tipoCaminhao) {
      case '14':
        valorTabela = buscarValor14Ton(destino.city, destino.uf);
        break;
      case '19':
        valorTabela = buscarValor19Ton(destino.city, destino.uf);
        break;
      case '27_30':
        valorTabela = buscarValor27_30Ton(destino.city, destino.uf);
        break;
      case '32_35':
        valorTabela = buscarValor32_35Ton(destino.city, destino.uf);
        break;
      case '38_40':
        valorTabela = buscarValor38_40Ton(destino.city, destino.uf);
        break;
      case '50':
        valorTabela = buscarValor50Ton(destino.city, destino.uf);
        break;
      default:
        valorTabela = buscarValor14Ton(destino.city, destino.uf);
    }

    if (!valorTabela || valorTabela === 0) {
      toast.error(`Valor do frete não encontrado para ${destino.city}/${destino.uf} com caminhão de ${tipoCaminhao} toneladas`)
      return
    }

    const valorDoServiço = valorTabela * cargaEmKg
    const valorDoServicoComLocalString = valorDoServiço.toLocaleString('pt-br')

    setValorServico(valorDoServicoComLocalString)
    setValorICMS((valorDoServiço * 0.12).toFixed(2))
    setPercentualCBS((valorDoServiço * 0.009).toFixed(2))
    setValorIBS((valorDoServiço * 0.001).toFixed(2))
    sendObj.VALORSERVICO = valorDoServiço;
    sendObj.VALORRECEBER = valorDoServiço;
    sendObj.ICMS_VALORICMS = parseFloat((valorDoServiço * 0.12).toFixed(2));
    sendObj.ICMS_VALORBC = valorDoServiço;
    sendObj.IBSCBS.vBC = Number(valorDoServiço.toFixed(2));
    sendObj.IBSCBS.vIBS = parseFloat((valorDoServiço * 0.001).toFixed(2));
    sendObj.IBSCBS.vIBSUF = parseFloat((valorDoServiço * 0.001).toFixed(2));
    sendObj.IBSCBS.vCBS = parseFloat((valorDoServiço * 0.009).toFixed(2));
  }

  const buscarCteEscolhida = async () => {
    try {
      const { data } = await axios.get(`https://api.egssistemas.com.br/${escolherEmpresa === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//api/CteApi/GetCTe?IDCTE=${escolhaCte}&CODEMPRESA=1&MODELODOC=57&OPERACAO=COPIA`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      )
      setSendObj(data)
    } catch (e) {
      toast.error("Erro ao recuperar a nota escolhida")
    }
  }

  const verificarSeProprietarioTaCadastrado = async () => {
    const cpf = dadosCNH.cpf;

    if (!cpf) {
      toast.error("INFORME O CPF DO PROPRIETÁRIO")
      return
    }
    try {
      const { data } = await axios.get(`https://api.egssistemas.com.br/${escolherEmpresa === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//odata/Gcadastro`, {
        params: {
          $filter: `(contains(tolower(CPFCNPJ), '${cpf}')) and (STATUS ne 'C')`,
          $count: true,
          $top: 20
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (data.value[0]) {
        veiculo.IDCADASTRO = data.value[0].IDCADASTRO

        toast.info("Proprietário já cadastrado")
        return
      }

      criarProprietario()

    } catch (e) {
      toast.error("Erro ao verificar se motorista está cadastrado")
    }
  }
  const verificarSeVeiculoTaCadastrado = async () => {
    try {
      const placa = dadosCNH.placa;

      if (!placa) {
        toast.error("Informe a placa do veículo")
        return
      }
      const { data } = await axios.get(`https://api.egssistemas.com.br/${escolherEmpresa === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//odata/Gveiculo`, {
        params: {
          $filter: `(contains(tolower(PLACA), '${placa}')) and (STATUS ne 'C')`,
          $count: true,
          $top: 20
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })



      if (data.value[0]) {
        toast.success("Veículo já cadastrado")
        return
      }
      criarVeiculo()
    } catch {
      toast.error("Erro ao verificar se veiculo está cadastrado")

    }
  }

  const criarVeiculo = async () => {
    veiculo.PLACA = dadosCNH.placa
    veiculo.CAPACIDADEKG = parseInt(dadosCNH.capacidade)
    veiculo.TARA = parseInt(dadosCNH.peso)
    veiculo.UF = dadosCNH.local?.slice(-2)
    veiculo.DESCRICAO = dadosCNH.modelo
    veiculo.RENAVAN = dadosCNH.renavam
    veiculo.TIPOPROPRIETARIO = dadosCNH.tipoProprietario
    veiculo.TIPOCARROCERIA = dadosCNH.tipoCarroceria
    veiculo.TIPOVEICULO = dadosCNH.tipoVeiculo
    veiculo.RNTC = dadosCNH.rntc

    if (!dadosCNH.placa || !dadosCNH.capacidade || !dadosCNH.peso || !dadosCNH.local || !dadosCNH.modelo || !dadosCNH.renavam || !dadosCNH.tipoProprietario || !dadosCNH.tipoCarroceria || !dadosCNH.tipoVeiculo || !dadosCNH.rntc) {
      toast.error("INFORME A PLACA, CAPACIDADE, PESO, LOCAL, MODELO, RENAVAM, TIPO DE PROPRIETÁRIO, TIPO DE CARROCERIA, TIPO DE VEÍCULO E RNTC")
      return
    }

    try {
      await axios.post(`https://api.egssistemas.com.br/${escolherEmpresa === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//api/GveiculoApi/Post`,
        veiculo,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      )
      toast.success("Veículo cadastrado com sucesso!")
    } catch {
      toast.error("Erro ao criar veículo")
    }
  }

  const criarProprietario = async () => {
    if (!dadosCNH.cpf || !dadosCNH.proprietario || proprietário.RNTC === "00000000") {
      toast.error("INFORME O CPF, O NOME DO PROPRIETÁRIO E O RNTC")
      return
    }

    proprietário.RAZAOSOCIAL = dadosCNH.proprietario
    proprietário.RNTC = dadosCNH.rntc_proprietatio
    proprietário.CPFCNPJ = dadosCNH.cpf.replace(/\D/g, '')

    try {
      const { data } = await axios.post(`https://api.egssistemas.com.br/${escolherEmpresa === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//api/GcadastroApi/post`,
        proprietário,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      )
      veiculo.IDCADASTRO = data.value.IDCADASTRO

      toast.success("Proprietário cadastrado com sucesso!")
    } catch (e) {
      toast.error("Erro ao criar proprietário")
    }
  }

  const sair = async () => {
    const currentToken = localStorage.getItem('token');
    const company = localStorage.getItem('company')
    setLoading(true)
    if (!currentToken) {
      toast.info("CLique novamente")
      return
    }
    try {
      await axios.post(
        `https://api.egssistemas.com.br/${company === "GADELOG" ? "EGSAPP4" : "EGSCTE"}/api/Sistema/PostSair`,
        null,
        {
          headers: {
            Authorization: `Bearer ${currentToken}`
          },
          withCredentials: true
        }
      );
      setEscolhaCte(null)
      setDadosCNH({ tipoVeiculo: '', tipoRodado: '', rntc: '', tipoCarroceria: "", tipoProprietario: '', proprietario: '', local: '', cpf: '', categoria: '', validade: '', renavam: '', placa: '', carroceria: '', modelo: '', capacidade: '', peso: '', rntc_proprietatio: '' })
      setEscolherEmpresa("")
      localStorage.clear()
    } catch {
      toast.error("Erro ao sair")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!escolhaCte || escolhaCte === 0) {
      return
    }
    buscarCteEscolhida()
  }, [escolhaCte])


  useEffect(() => {
    if (!destino || !destino.city || !destino.uf || loadingTabela) return
    calcularFrete(saida, destino)
  }, [quantidadeCarga, loadingTabela, destino.city, destino.uf])

  useEffect(() => {
    if (escolherEmpresa === '') {
      sair()
      return
    }
    const loadTabela = async () => {
      try {
        setLoadingTabela(true);
        await carregarTabela();
        setTimeout(() => {
          setLoadingTabela(false);
        }, 100);
      } catch (error) {
        toast.error('Erro ao carregar tabela de fretes');
        setLoadingTabela(false);
      }
    };

    loadTabela();
    getToken()
  }, [escolherEmpresa]);




  if (escolherEmpresa === '') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md items-center justify-center flex flex-col">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Selecione a Empresa</h2>
          <p className="text-gray-500 mb-8 text-center">Escolha qual sistema deseja acessar</p>
          <div className="flex flex-col gap-4 w-full">
            <button onClick={() => setEscolherEmpresa("GADELOG")} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-4 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Gadelog
            </button>
            <button onClick={() => setEscolherEmpresa("INTERMEDIUM")} className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-6 py-4 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Intermedium
            </button>
          </div>
        </div>
      </div>
    )
  }


  if (loading || loadingTabela) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <p className="mt-4 text-gray-600">
            {loading ? 'Carregando aplicação...' : 'Carregando tabela de fretes...'}
          </p>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white shadow-xl rounded-lg overflow-hidden">
            {escolhaCte ? (
              <div>
                <div className="flex justify-between items-center">
                  <button onClick={() => setEscolhaCte(null)} className="bg-gray-200 px-4 py-2 rounded">Voltar</button>
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                  </div>
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
                                setValorCarga(e.target.value);
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
                                sendObj.PESOKG = parseFloat(value) || 0;
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
                            <label htmlFor="proprietario" className="block text-sm font-semibold text-gray-700 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                              </svg>
                              Motorista ( CPF )
                            </label>
                            <input
                              type="text"
                              value={motorista}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                formatarCpfCnpj(e.target.value, 'proprietario');
                              }}
                              id="proprietario"
                              name="proprietario"
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



                  <div className="flex justify-center p-6 gap-2">
                    <button
                      type="button"
                      onClick={() => loadingData()}
                      className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform transition duration-150 ease-in-out hover:scale-105"
                    >
                      <span className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Buscar Informações
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => sendData()}
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
              <div>
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex flex-row justify-between">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Selecione um CT-e</h2>
                    <button onClick={() => sair()} className="bg-gray-200 px-4 py-2 rounded">Sair</button>
                  </div>
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
                <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">PDF CRLV do Motorista</h2>

                  <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 shadow-sm hover:border-blue-400 transition-colors">
                    <div className="text-center">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Importar CRLV</h3>
                        <p className="text-sm text-gray-600 mb-4">Carregue o CRLV da CNH para extrair os dados automaticamente</p>
                      </div>

                      <div className="border-t border-gray-200 pt-4">
                        <label htmlFor="crlv-upload" className="group relative flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all">

                          <div className="flex flex-col items-center justify-center pt-5 pb-6">

                            <p className="mb-2 text-sm text-gray-600">
                              <span className="font-semibold text-blue-600">Clique para selecionar</span> ou arraste o arquivo PDF aqui
                            </p>
                            <p className="text-xs text-gray-500">Apenas arquivos .pdf (máx. 10MB)</p>
                          </div>
                          <input
                            id="crlv-upload"
                            name="crlv-upload"
                            type="file"
                            accept=".pdf"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleCnhUpload}
                          />
                        </label>
                      </div>

                      {crlvFile && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center">
                            <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium text-green-800">
                              Arquivo carregado: <span className="font-semibold">{crlvFile.name}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setCnhFile(null)}
                              className="ml-auto text-sm text-red-600 hover:text-red-800 transition-colors"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {(dadosCNH.local || dadosCNH.cpf) && (
                    <div className="mt-6 bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Dados Extraídos da CNH</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ DO PROPRIETÁRIO</label>
                          <input
                            type="text"
                            value={dadosCNH.cpf}
                            onChange={(e) => {
                              setDadosCNH({ ...dadosCNH, cpf: e.target.value })
                              proprietário.CPFCNPJ = e.target.value
                            }
                            }
                            className="block w-full px-4 py-2 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">PROPRIETÁRIO</label>
                          <input
                            type="text"
                            value={dadosCNH.proprietario}
                            onChange={(e) => {
                              setDadosCNH({ ...dadosCNH, proprietario: e.target.value })
                              proprietário.RAZAOSOCIAL = e.target.value
                            }}
                            className="block w-full px-4 py-2 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">RNTC do proprietário</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={dadosCNH.rntc_proprietatio}
                              onChange={(e) => {
                                setDadosCNH({ ...dadosCNH, rntc_proprietatio: e.target.value })
                              }}
                              className="flex-1 block w-full px-4 py-2 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setRntcImage(file);
                                  try {
                                    toast.info('Processando documento...');
                                    const tac = await extrairTAC(file, {
                                      onProgress: (msg) => console.log(msg)
                                    });
                                    if (tac) {
                                      setDadosCNH({ ...dadosCNH, rntc_proprietatio: tac });
                                      toast.success('RNTC extraído: ' + tac);
                                    } else {
                                      toast.warning('Não foi possível extrair o RNTC');
                                    }
                                  } catch (error) {
                                    toast.error('Erro ao processar documento');
                                    console.error(error);
                                  }
                                }
                              }}
                              className="hidden"
                              id="rntc-image-upload-proprietario"
                            />
                            <label
                              htmlFor="rntc-image-upload-proprietario"
                              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer flex items-center gap-2 transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>Extrair</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">TIPO DE PROPRIETÁRIO</label>
                          <select
                            value={dadosCNH.tipoProprietario}
                            onChange={(e) => setDadosCNH({ ...dadosCNH, tipoProprietario: e.target.value })}
                            className="block w-full px-4 py-2 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option>SELECIONAR</option>
                            <option value="0">TAC-AGREGADO</option>
                            <option value="1">TAC-INDEPENDENTE</option>
                            <option value="2">OUTROS</option>
                          </select>
                        </div>
                        <div className="h-4 border-b border-gray-300 w-full" />
                        <div className="h-4 border-b border-gray-300 w-full" />
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CIDADE/UF</label>
                          <input
                            type="text"
                            value={dadosCNH.local?.slice(-2) || ''}
                            onChange={(e) => setDadosCNH({ ...dadosCNH, local: e.target.value })}
                            className="block w-full px-4 py-2 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                          <input
                            type="text"
                            value={dadosCNH.modelo}
                            onChange={(e) => setDadosCNH({ ...dadosCNH, modelo: e.target.value })}
                            className="block w-full px-4 py-2 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">RENAVAM</label>
                          <input
                            type="text"
                            value={dadosCNH.renavam}
                            onChange={(e) => setDadosCNH({ ...dadosCNH, renavam: e.target.value })}
                            className="block w-full px-4 py-2 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">TIPO DE CARROCERIA</label>
                          <select
                            value={dadosCNH.tipoCarroceria}
                            onChange={(e) => setDadosCNH({ ...dadosCNH, tipoCarroceria: e.target.value })}
                            className="block w-full px-4 py-2 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option>SELECIONAR</option>
                            <option value="01">ABERTA</option>
                            <option value="02">FECHADA/BAÚ</option>
                            <option value="03">GRANELERA</option>
                            <option value="00">NÃO APLICÁVEL</option>
                            <option value="04">PORTA CONTAINER</option>
                            <option value="05">SIDER</option>
                            <option value="09">BASCULANTE</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">TIPO DE VEICULO</label>
                          <select
                            value={dadosCNH.tipoVeiculo}
                            onChange={(e) => setDadosCNH({ ...dadosCNH, tipoVeiculo: e.target.value })}
                            className="block w-full px-4 py-2 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option>SELECIONAR</option>
                            <option value="R">REBOQUE</option>
                            <option value="T">TRAÇÃO</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">TIPO DE RODADO</label>
                          <select
                            value={dadosCNH.tipoRodado}
                            onChange={(e) => {
                              setDadosCNH({ ...dadosCNH, tipoRodado: e.target.value })
                              veiculo.IDGRUPOVEICULO = e.target.value
                            }}
                            className="block w-full px-4 py-2 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option>SELECIONAR</option>
                            <option value="01">TRUCK</option>
                            <option value="02">TOCO</option>
                            <option value="03">CAVALOR MECANICO</option>
                            <option value="04">VAN</option>
                            <option value="05">UTILITÁRIO</option>
                            <option value="06">OUTROS</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">RNTC do veiculo</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={dadosCNH.rntc}
                              onChange={(e) => {
                                setDadosCNH({ ...dadosCNH, rntc: e.target.value })
                              }}
                              className="flex-1 block w-full px-4 py-2 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setRntcImageveiculo(file);
                                  try {
                                    toast.info('Processando documento...');
                                    const tac = await extrairTAC(file, {
                                      onProgress: (msg) => console.log(msg)
                                    });
                                    if (tac) {
                                      setDadosCNH({ ...dadosCNH, rntc: tac });
                                      toast.success('RNTC extraído: ' + tac);
                                    } else {
                                      toast.warning('Não foi possível extrair o RNTC');
                                    }
                                  } catch (error) {
                                    toast.error('Erro ao processar documento');
                                    console.error(error);
                                  }
                                }
                              }}
                              className="hidden"
                              id="rntc-image-upload"
                            />
                            <label
                              htmlFor="rntc-image-upload"
                              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer flex items-center gap-2 transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>Extrair</span>
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CAPACIDADE</label>
                          <input
                            type="text"
                            value={dadosCNH.capacidade}
                            onChange={(e) => setDadosCNH({ ...dadosCNH, capacidade: e.target.value })}
                            className="block w-full px-4 py-2 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">PESO</label>
                          <input
                            type="text"
                            value={dadosCNH.peso}
                            onChange={(e) => setDadosCNH({ ...dadosCNH, peso: e.target.value })}
                            className="block w-full px-4 py-2 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">PLACA</label>
                          <input
                            type="text"
                            value={dadosCNH.placa}
                            onChange={(e) => setDadosCNH({ ...dadosCNH, placa: e.target.value })}
                            className="block w-full px-4 py-2 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>


                      </div>
                      <div className="flex gap-2 mt-10">
                        <button onClick={verificarSeProprietarioTaCadastrado} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          verificar / cadastrar proprietário
                        </button>
                        <button onClick={verificarSeVeiculoTaCadastrado} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          verificar / cadastrar veiculo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

export default App;
