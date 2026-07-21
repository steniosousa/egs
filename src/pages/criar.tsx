import { useState } from "react";
import { toast } from "react-toastify";
import {
  FileCode2,
  Landmark,
  Package,
  Percent,
  RefreshCw,
  Send,
  Truck,
  Users,
} from "lucide-react";
import { formatarCpfCnpj } from "../utils/format";
import { useApp } from "../context/AppContext";
import { CTE, XML } from "../types/types";
import calcularFrete, { pegarTipoDeCaminhao } from "../utils/calcular_frete";
import { parseNFeXml } from "../parsers/nfeXmlParser";
import { comboBoxCadastro, comboBoxVeiculo, comboBoxCidade } from "../services/comboboxService";
import { buscarCadastroReceitaFederal, criarCadastro } from "../services/cadastroService";
import { salvarCte } from "../services/cteService";
import { Button, Card, Input, Select, Tabs, TabItem } from "../components/ui";
import { FileDropzone } from "../components/upload/FileDropzone";

type TabKey = 'identificação' | 'Comp/Tributos' | 'documentos' | 'Reforma Tributária';

const TABS: TabItem<TabKey>[] = [
  { value: 'identificação', label: 'Identificação', icon: Users },
  { value: 'Comp/Tributos', label: 'Componentes/Tributos', icon: Truck },
  { value: 'documentos', label: 'Documentos', icon: FileCode2 },
  { value: 'Reforma Tributária', label: 'Reforma Tributária', icon: Landmark },
];

export default function CRIAR() {
  const { empresa, dadosXML, setDadosXML, cteSelecionado, setCteSelecionado } = useApp();
  const [destinatarioNaoEncontrado, setDestinatarioNaoEncontrado] = useState(false)
  const [tab, setTab] = useState<TabKey>('identificação');
  const [driverName, setDriverName] = useState('')
  const [rementName, setRemetenteName] = useState("")
  const [destName, setDestName] = useState("")
  const [veicName, setVeicName] = useState("")
  const [moreOneNota, setMoreOneNota] = useState(false)
  const [notasCarregadas, setNotasCarregadas] = useState<string[]>([])
  const [dadosDeNotasCarregadas, setDadosDeNotasCarregadas] = useState<{ peso: number, valorCarga: number, destino: { city: string, uf: string } }[]>([])
  const [tipoVeiculo, setTipoVeiculo] = useState<'14' | '19' | '27_30' | '32_35' | '38_40' | '50'>('50')
  const [processando, setProcessando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const atualizacoes: Partial<XML> = {};

  const processarXML = (xmlContent: string) => {
    try {
      const { basicos } = parseNFeXml(xmlContent);

      if (basicos.temDest) {
        if (basicos.cpfCnpjDestinatario) {
          atualizacoes.cpfCnpjDestinatario = basicos.cpfCnpjDestinatario;
        }
        if (basicos.inscEstadualDestinatario) {
          atualizacoes.INSCESTADUAL_destinatario = basicos.inscEstadualDestinatario;
        }
      }

      if (basicos.temEmit && basicos.cpfCnpjRemetente) {
        atualizacoes.cpfCnpjRemetente = basicos.cpfCnpjRemetente;
      }

      if (basicos.temIde) {
        if (!atualizacoes.DOCNFE) {
          atualizacoes.DOCNFE = [];
        }

        const existe = atualizacoes.DOCNFE.some(
          x => (x.chaveNotaFiscal || "").trim() === basicos.chaveNotaFiscal
        );

        if (!existe) {
          atualizacoes.DOCNFE.push({
            chaveNotaFiscal: basicos.chaveNotaFiscal,
            numeroNotaFiscal: basicos.numeroNotaFiscal
          });
        }
      }

      if (basicos.temVol) {
        atualizacoes.produtoPredominante = basicos.produtoPredominante;
      }

      let valorCarga = 0;
      if (basicos.temIcmsTot) {
        atualizacoes.valorCarga = basicos.valorCarga;
        valorCarga = parseFloat(basicos.valorCarga);
      }

      if (basicos.temVol) {
        const tipoVeiculoCalculado = pegarTipoDeCaminhao(basicos.pesoTotal);
        setTipoVeiculo(tipoVeiculoCalculado);
        atualizacoes.quantidadeCarga = basicos.pesoTotal.toString();
      }

      atualizacoes.saida = {
        city: basicos.saidaCidade,
        uf: basicos.saidaUF
      }
      atualizacoes.destino = {
        city: basicos.destinoCidade,
        uf: basicos.destinoUF
      }

      if (basicos.saidaCidade && basicos.destinoCidade && basicos.saidaUF && basicos.destinoUF) {
        const tipoVeiculoCalculado = basicos.temVol ? pegarTipoDeCaminhao(basicos.pesoTotal) : undefined;

        if (moreOneNota) {
          setDadosDeNotasCarregadas(prevDados => [...prevDados, { peso: Number(basicos.pesoTotal), valorCarga, destino: { city: basicos.destinoCidade, uf: basicos.destinoUF } }]);
          setDadosXML({ ...dadosXML, ...atualizacoes });
        } else {
          calcularAposEscolherVipoDeCaminha(
            basicos.saidaCidade,
            basicos.saidaUF,
            basicos.destinoCidade,
            basicos.destinoUF,
            Number(atualizacoes.quantidadeCarga),
            tipoVeiculoCalculado
          )
        }
      }
    } catch (error) {
      toast.error("Erro ao processar o arquivo XML. Verifique o formato do arquivo.");
    }
  };

  const calcularAposEscolherVipoDeCaminha = (saidaCidade: string, saidaUF: string, destinoCidade: string, destinoUF: string, quantidadeCarga: number, tipoVeiculoSelecionado?: string) => {
    const tipoVeiculoFinal = (tipoVeiculoSelecionado ?? tipoVeiculo ?? '50') as '14' | '19' | '27_30' | '32_35' | '38_40' | '50';

    setTipoVeiculo(tipoVeiculoFinal);

    const serviço = calcularFrete({
      city: saidaCidade,
      uf: saidaUF
    }, {
      city: destinoCidade,
      uf: destinoUF
    }, quantidadeCarga, tipoVeiculoFinal)
    if (!serviço) {
      toast.error("Erro ao calcular o valor do serviço. Verifique as cidades de origem e destino.");
      return
    }

    calcularPorcentagens({ serviço, saidaCidade, saidaUF, destinoCidade, destinoUF });
  }

  const somarValoresMaisDeUmaNota = () => {
    let pesoTotal = 0;
    let valorTotalCarga = 0;

    dadosDeNotasCarregadas.forEach((nota) => {
      pesoTotal += nota.peso;
      valorTotalCarga += nota.valorCarga;
    })

    atualizacoes.valorCarga = valorTotalCarga.toString();
    atualizacoes.quantidadeCarga = pesoTotal.toString();
    setDadosXML({ ...dadosXML, quantidadeCarga: pesoTotal.toString(), valorCarga: valorTotalCarga.toString() });

    const serviço = calcularFrete({
      city: dadosDeNotasCarregadas[0].destino.city,
      uf: dadosDeNotasCarregadas[0].destino.uf
    }, {
      city: dadosDeNotasCarregadas[0].destino.city,
      uf: dadosDeNotasCarregadas[0].destino.uf
    }, Number(pesoTotal), tipoVeiculo)

    if (!serviço) {
      return
    }

    calcularPorcentagens({ serviço: { valorDoServiço: serviço.valorDoServiço }, saidaCidade: dadosXML.saida.city, saidaUF: dadosXML.saida.uf, destinoCidade: dadosXML.destino.city, destinoUF: dadosXML.destino.uf })
    setDadosXML({ ...dadosXML, ...atualizacoes });
  }

  const calcularPorcentagens = ({ serviço, saidaCidade, saidaUF, destinoCidade, destinoUF }: { serviço: { valorDoServiço: number }, saidaCidade: string, saidaUF: string, destinoCidade: string, destinoUF: string }) => {
    atualizacoes.valorServico = serviço.valorDoServiço
    atualizacoes.valorICMS = (serviço.valorDoServiço * 0.12).toFixed(2).toString()
    atualizacoes.saida = {
      city: saidaCidade,
      uf: saidaUF
    };
    atualizacoes.destino = {
      city: destinoCidade,
      uf: destinoUF
    };

    setDadosXML({ ...dadosXML, ...atualizacoes });
  }

  const handleFileUpload = (file: File) => {
    if (file.type === "text/xml" || file.name.toLowerCase().endsWith('.xml')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const xmlContent = e.target?.result as string;
        if (moreOneNota) {
          setNotasCarregadas(prevNotas => [...prevNotas, xmlContent]);
          return;
        }
        processarXML(xmlContent);
      };
      reader.readAsText(file);
    } else {
      toast.error("Por favor, selecione um arquivo XML válido.");
    }
  };

  const processarTodasNotas = () => {
    if (notasCarregadas.length === 0) {
      toast.error("Nenhuma nota carregada para processar.");
      return;
    }
    if (notasCarregadas.some(xml => !xml || xml.trim() === "")) {
      toast.error("Uma ou mais notas carregadas estão vazias. Verifique os arquivos XML.");
      return;
    }
    notasCarregadas.forEach((e) => {
      processarXML(notasCarregadas[notasCarregadas.indexOf(e)]);
    });
  }

  const loadingData = async () => {
    if (!tipoVeiculo) {
      toast.error("Selecione o tipo de veículo para continuar")
      return
    }
    setProcessando(true)
    try {
      if (!empresa) {
        toast.error("Empresa não encontrada")
        throw new Error("Empresa não encontrada")
      }

      const atualizacoes: Partial<CTE> = { ...cteSelecionado };

      if (!dadosXML.cpfCnpjDestinatario || !dadosXML.cpfCnpjRemetente || !dadosXML.placaVeiculoTração || !dadosXML.cpf_motorista) {
        toast.info("Informe o cnpj do destinatário, cpf do remetente, placa do veículo e cpf do motorista para continuar")
        return
      }

      const [destinatarioData, remetenteData, veiculoTracaoData, motoristaData] = await Promise.all([
        comboBoxCadastro(empresa, dadosXML.cpfCnpjDestinatario),
        comboBoxCadastro(empresa, dadosXML.cpfCnpjRemetente),
        comboBoxVeiculo(empresa, dadosXML.placaVeiculoTração),
        comboBoxCadastro(empresa, dadosXML.cpf_motorista),
      ]);

      if (motoristaData[0]) {
        atualizacoes.IDMOTORISTA = motoristaData[0].IDCADASTRO
        setDriverName(motoristaData[0].NOME)
      } else {
        toast.info("Motorista não encontrado")
        throw new Error("Motorista não encontrado")
      }

      if (remetenteData[0]) {
        atualizacoes.CODCIDADEEMISSAOCTE = remetenteData[0].CODCIDADE;
        atualizacoes.CODCIDADEINISERV = remetenteData[0].CODCIDADE;
        atualizacoes.NOMECIDADEINICIOSERV = remetenteData[0].NOMEMUNICIPIO;
        atualizacoes.UFFIMSERV = remetenteData[0].CODESTADO;
        atualizacoes.IDREMETENTE = remetenteData[0].IDCADASTRO
        setRemetenteName(remetenteData[0].NOME)
      } else {
        toast.info("Remetente não encontrado")
        throw new Error("Remetente não encontrado")
      }

      if (destinatarioData[0]) {
        atualizacoes.NOMECIDADEFIMSERV = destinatarioData[0].NOMEMUNICIPIO;
        atualizacoes.UFFIMSERV = destinatarioData[0].CODESTADO;
        atualizacoes.CODCIDADEFIMSERV = destinatarioData[0].CODCIDADE;
        atualizacoes.NOMECIDADEEMISSAO = destinatarioData[0].NOMEMUNICIPIO;
        atualizacoes.IDDESTINATARIO = destinatarioData[0].IDCADASTRO;
        atualizacoes.IDCONTRATANTE = destinatarioData[0].IDCADASTRO;
        setDestName(destinatarioData[0].NOME)
      } else {
        toast.info("Destinatário não encontrado")
        const documento = dadosXML.cpfCnpjDestinatario.replace(/\D/g, "");

        setDestinatarioNaoEncontrado(true)
        if (documento.length === 14) {
          await getDadasCNPJ();
          return;
        }
        throw new Error("Destinatário não encontrado")
      }
      if (veiculoTracaoData[0] && atualizacoes.Veiculos) {
        atualizacoes.Veiculos[0] = {
          ...atualizacoes.Veiculos?.[0],
          IDENT: veiculoTracaoData[0].IDENT,
          RENAVAN: veiculoTracaoData[0].RENAVAN,
          PLACA: veiculoTracaoData[0].PLACA,
          TARA: veiculoTracaoData[0].TARA,
          CAPACIDADEKG: veiculoTracaoData[0].CAPACIDADEKG,
          CAPACIDADEM3: veiculoTracaoData[0].CAPACIDADEM3,
          PROPRIO: veiculoTracaoData[0].PROPRIO,
          TIPOVEICULO: veiculoTracaoData[0].TIPOVEICULO,
          TIPORODADO: veiculoTracaoData[0].TIPORODADO,
          TIPOCARROCERIA: veiculoTracaoData[0].TIPOCARROCERIA,
          UFLICENCIADO: veiculoTracaoData[0].UFLICENCIADO,
          CPFCNPJ: veiculoTracaoData[0].CPFCNPJ,
          RNTC: veiculoTracaoData[0].RNTC,
          NOMEPROPRIETARIO: veiculoTracaoData[0].NOMEPROPRIETARIO,
          INSCESTADUAL: veiculoTracaoData[0].INSCESTADUAL,
          UFINSCESTADUAL: veiculoTracaoData[0].UFINSCESTADUAL,
          IDVEICULO: veiculoTracaoData[0].IDVEICULO,
        }
        atualizacoes.OBSVEICMOTVEIC = `Veiculo: ${veiculoTracaoData[0].PLACA}\nMotorista: ${veiculoTracaoData[0].NOMEPROPRIETARIO}` as string

        atualizacoes.IDVEICULO = veiculoTracaoData[0].IDVEICULO
        setVeicName(veiculoTracaoData[0].DESCRICAO)
      } else {
        toast.info("Veículo não encontrado")
        throw new Error("Veículo não encontrado")
      }
      atualizacoes.DOCNFE = [];
      dadosXML.DOCNFE.forEach((nota) => {
        if (!atualizacoes.DOCNFE) {
          atualizacoes.DOCNFE = [];
        }

        const existe = atualizacoes.DOCNFE.some(
          n => n.CHAVENFE === nota.chaveNotaFiscal
        );

        if (!existe) {
          atualizacoes.DOCNFE.push({
            CHAVENFE: nota.chaveNotaFiscal,
            NNF: nota.numeroNotaFiscal,
          });
        }
      });

      const valorCargaCorrigido = Number(dadosXML.valorCarga)
      atualizacoes.VALORCARGA = valorCargaCorrigido
      atualizacoes.DESCCARGA = dadosXML.produtoPredominante;
      atualizacoes.TIPOCARGA = dadosXML.produtoPredominante;
      atualizacoes.VALORSERVICO = dadosXML.valorServico
      atualizacoes.VALORRECEBER = dadosXML.valorServico


      if (atualizacoes.UFINISERV === "CE" && atualizacoes.UFFIMSERV !== "CE") {
        atualizacoes.ICMS_VALORICMS = parseFloat(dadosXML.valorICMS);
        atualizacoes.ICMS_VALORBC = dadosXML.valorServico
      } else {
        atualizacoes.ICMS_VALORICMS = 0;
        atualizacoes.ICMS_VALORBC = 0
      }
      if (atualizacoes.IBSCBS) {
        if (empresa.name !== 'GADELOG') {
          atualizacoes.IBSCBS.vIBS = parseFloat(dadosXML.valorIBS)
          atualizacoes.IBSCBS.vCBS = parseFloat(dadosXML.percentualCBS)
        }
        atualizacoes.IBSCBS.vBC = parseFloat(dadosXML.valorIBS)
        atualizacoes.IBSCBS.vIBSUF = parseFloat(dadosXML.valorIBS)
      }

      if (atualizacoes.CARGAQTD && atualizacoes.CARGAQTD[0]) {
        atualizacoes.CARGAQTD[0].QUANTIDADE = parseFloat(dadosXML.quantidadeCarga);
        atualizacoes.PESOKG = parseFloat(dadosXML.quantidadeCarga);
      }


      if (cteSelecionado) {
        setCteSelecionado({
          ...cteSelecionado,
          ...atualizacoes,
          DOCNFE: atualizacoes.DOCNFE ? [...atualizacoes.DOCNFE] : []
        });
      }

      toast.info('Infomações atualizdas')

    }
    catch (error) {
      toast.error("Erro ao carregar dados")
    } finally {
      setProcessando(false)
    }
  }

  const sendData = async () => {
    if (!empresa) {
      toast.error("Empresa não encontrada")
      return
    }
    setEnviando(true)
    try {
      await salvarCte(empresa, cteSelecionado as CTE);
      limparNotasCarregadas()
      escolherOutraCTE()
      toast.info('CT-e enviado com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar CT-e. Verifique os dados e tente novamente.');
    } finally {
      setEnviando(false)
    }
  };

  const getDadasCNPJ = async () => {
    if (!empresa) {
      toast.error("Empresa não selecionada")
      return
    }

    try {
      const data = await buscarCadastroReceitaFederal(empresa, dadosXML.cpfCnpjDestinatario.replace(/\D/g, ''))
      const codCidade = await comboBoxCidade(empresa, data.CIDADEESTADO.split(' - ')[0])

      await createDestinatário({
        email: data.email,
        telefone: data.Telefone,
        nome: data.Nome,
        endereco: data.Logradouro,
        bairro: data.Bairro,
        numero: data.Numero,
        complemento: data.Complemento,
        cep: data.Cep,
        cidade: data.CIDADEESTADO,
        uf: data.Uf,
        CODCIDADE: codCidade[0].CODMUNICIPIO
      })
    } catch (error) {
      toast.error("Erro ao buscar dados do CNPJ")
    }
  }

  const createDestinatário = async ({ email, telefone, nome, endereco, bairro, numero, complemento, cep, uf, CODCIDADE }: { email: string, telefone: string, nome: string, endereco: string, bairro: string, numero: string, complemento: string, cep: string, cidade: string, uf: string, CODCIDADE: string }) => {
    if (!empresa) {
      toast.error("Empresa nao selecionada")
      return
    }
    try {
      const data = await criarCadastro(empresa, {
        RAZAOSOCIAL: nome,
        NOME: nome,
        CPFCNPJ: dadosXML.cpfCnpjDestinatario.replace(/\D/g, ''),
        CONSUMIDORFINAL: "0",
        CONTRIBUINTEICMS: "1",
        FONE: telefone,
        EMAIL: email,
        EMAILNFE: email,
        ENDERECO: endereco,
        BAIRRO: bairro,
        NUMERO: numero,
        CEP: cep,
        CODESTADO: uf,
        CODPAIS: "1058",
        INSCESTADUAL: dadosXML.INSCESTADUAL_destinatario,
        CODCIDADE: CODCIDADE,
        COMPLEMENTO: complemento
      })
      if (!data.IDCADASTRO) {
        toast.error("Erro ao criar destinatário")
        return
      }

      toast.success("destinatário cadastrado com sucesso!")
    } catch (e) {
      toast.error("Erro ao criar destinatário")
    }
  }

  const limparNotasCarregadas = () => {
    setNotasCarregadas([]);
    setDadosDeNotasCarregadas([])
    setMoreOneNota(false)
  }

  const escolherOutraCTE = () => {
    setCteSelecionado(null)
  }

  if (!cteSelecionado) {
    return <p className="p-8 text-center text-slate-500">Carregando...</p>
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <Button variant="ghost" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={() => escolherOutraCTE()}>
          Escolher outro XML
        </Button>
      </div>

      <div className="p-6 space-y-6">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">Importar nota fiscal (XML)</p>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={moreOneNota}
                onChange={() => setMoreOneNota(!moreOneNota)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Mais de 1 nota
            </label>
          </div>

          <FileDropzone
            accept=".xml"
            label="Clique para selecionar ou arraste o arquivo XML aqui"
            hint="Apenas arquivos .xml (máx. 10MB)"
            onFileSelected={handleFileUpload}
          />

          {notasCarregadas.length > 0 && (
            <div className="mt-4 flex flex-col justify-center gap-2 md:flex-row">
              <Button size="sm" onClick={() => processarTodasNotas()} disabled={notasCarregadas.length === 0}>
                Processar todas as notas carregadas
              </Button>
              <Button size="sm" variant="secondary" onClick={() => somarValoresMaisDeUmaNota()} disabled={notasCarregadas.length === 0}>
                Somar valores de todas as notas carregadas
              </Button>
              <Button size="sm" variant="ghost" onClick={() => limparNotasCarregadas()} disabled={notasCarregadas.length === 0}>
                Limpar Notas
              </Button>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Tabs items={TABS} value={tab} onChange={setTab} />

          <Select
            containerClassName="w-full md:w-56"
            value={tipoVeiculo || '50'}
            onChange={(e) => {
              const valorSelecionado = e.target.value as '14' | '19' | '27_30' | '32_35' | '38_40' | '50';
              setTipoVeiculo(valorSelecionado);
              calcularAposEscolherVipoDeCaminha(dadosXML.saida.city, dadosXML.saida.uf, dadosXML.destino.city, dadosXML.destino.uf, Number(dadosXML.quantidadeCarga), valorSelecionado)
            }}
          >
            <option disabled>Tipo de Veículo</option>
            <option value="14">14 TON</option>
            <option value="19">19 TON</option>
            <option value="27_30">27-30 TON</option>
            <option value="32_35">32-35 TON</option>
            <option value="38_40">38-40 TON</option>
            <option value="50">50 TON</option>
          </Select>
        </div>

        <form className="space-y-6">
          {tab === "identificação" && (
            <div className="space-y-6">
              <Card>
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800">
                  <Users className="h-5 w-5 text-brand-600" />
                  Dados das Partes
                </h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <Input
                      label="Remetente CPF/CNPJ"
                      value={dadosXML.cpfCnpjRemetente}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        formatarCpfCnpj(e.target.value, 'Remetente');
                      }}
                      placeholder="00.000.000/0000-00"
                    />
                    <span className="text-sm text-slate-500">{rementName}</span>
                  </div>
                  <div>
                    <Input
                      label="Destinatário CPF/CNPJ"
                      value={dadosXML.cpfCnpjDestinatario}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setDadosXML({ ...dadosXML, cpfCnpjDestinatario: formatarCpfCnpj(e.target.value, 'destinatario') });
                      }}
                      placeholder="00.000.000/0000-00"
                    />
                    <span className="text-sm text-slate-500">{destName}</span>

                    {destinatarioNaoEncontrado && (
                      <Card className="mt-4 border-warning-200" padded={false}>
                        <div className="rounded-t-2xl bg-gradient-to-r from-warning-500 to-warning-600 px-6 py-4">
                          <h3 className="text-lg font-semibold text-white">Destinatário não encontrado</h3>
                          <p className="mt-1 text-sm text-warning-50">Preencha os dados abaixo para cadastrar um novo destinatário.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
                          <Input
                            label="Nome / Inscrição Estadual"
                            value={dadosXML.nome_destinatario}
                            onChange={(e) => setDadosXML({ ...dadosXML, nome_destinatario: e.target.value })}
                            placeholder="Nome ou Inscrição Estadual"
                          />
                          <Input
                            type="email"
                            label="E-mail"
                            value={dadosXML.email_destinatario}
                            onChange={(e) => setDadosXML({ ...dadosXML, email_destinatario: e.target.value })}
                            placeholder="email@empresa.com"
                          />
                          <Input
                            label="Telefone"
                            value={dadosXML.fone_destinatario}
                            onChange={(e) => setDadosXML({ ...dadosXML, fone_destinatario: e.target.value })}
                            placeholder="(99) 99999-9999"
                          />
                          <Input
                            label="Cidade"
                            value={dadosXML.cidade_destinatario}
                            onChange={(e) => setDadosXML({ ...dadosXML, cidade_destinatario: e.target.value })}
                            placeholder="Cidade"
                          />
                        </div>
                      </Card>
                    )}
                  </div>
                </div>
              </Card>

              <Card>
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800">
                  <Package className="h-5 w-5 text-brand-600" />
                  Dados da Carga
                </h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <Input
                    label="Produto predominante"
                    value={dadosXML.produtoPredominante}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDadosXML({ ...dadosXML, produtoPredominante: e.target.value })}
                    placeholder="Ex: Fio, Tecido, etc."
                  />
                  <Input
                    label="Valor da carga"
                    value={`R$ ${dadosXML.valorCarga}`}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDadosXML({ ...dadosXML, valorCarga: e.target.value })}
                    placeholder="R$ 0,00"
                  />
                  <Input
                    label="Quantidade carga"
                    value={dadosXML.quantidadeCarga}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const value = e.target.value.replace('.', '').replace(',', '.');
                      setDadosXML({ ...dadosXML, quantidadeCarga: value });
                    }}
                    placeholder="0,00"
                  />
                  <Input
                    label="Valor serviço / Receber"
                    value={dadosXML.valorServico}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDadosXML({ ...dadosXML, valorServico: parseFloat(e.target.value) })}
                    placeholder="R$ 0,00"
                  />
                </div>
              </Card>
            </div>
          )}

          {tab === "Comp/Tributos" && (
            <div className="space-y-6">
              <Card>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <Input
                      label="Veículo Tração ( PLACA )"
                      value={dadosXML.placaVeiculoTração}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDadosXML({ ...dadosXML, placaVeiculoTração: e.target.value })}
                      placeholder="ABC-1234"
                    />
                    <span className="text-sm text-slate-500">{veicName}</span>
                  </div>
                  <div>
                    <Input
                      label="Motorista ( CPF )"
                      value={formatarCpfCnpj(dadosXML.cpf_motorista, 'cpf_motorista')}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDadosXML({ ...dadosXML, cpf_motorista: e.target.value })}
                      placeholder="000.000.000-00"
                    />
                    <span className="text-sm text-slate-500">{driverName}</span>
                  </div>
                </div>
              </Card>
              <Card>
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800">
                  <Percent className="h-5 w-5 text-brand-600" />
                  Dados da Carga
                </h2>
                <Input
                  label="Valor do ICMS ( 12 %)"
                  value={dadosXML.valorICMS}
                  onChange={(e) => setDadosXML({ ...dadosXML, valorICMS: e.target.value })}
                />
              </Card>
            </div>
          )}

          {tab === "documentos" && (
            <div className="space-y-6">
              <Card>
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800">
                  <FileCode2 className="h-5 w-5 text-brand-600" />
                  Documentos Fiscais
                </h2>
                <div className="space-y-4">
                  {dadosXML && dadosXML.DOCNFE.length > 0 && dadosXML.DOCNFE.map((doc, index) => (
                    <div key={doc.chaveNotaFiscal || index} className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <Input
                        label="Número da Nota Fiscal"
                        value={doc.numeroNotaFiscal}
                        onChange={(e) => {
                          setDadosXML({
                            ...dadosXML,
                            DOCNFE: dadosXML.DOCNFE.map((item, i) =>
                              i === index ? { ...item, numeroNotaFiscal: e.target.value } : item
                            )
                          });
                        }}
                        placeholder="000000000"
                      />
                      <Input
                        label="Chave da Nota Fiscal"
                        value={doc.chaveNotaFiscal}
                        onChange={(e) => {
                          setDadosXML({
                            ...dadosXML,
                            DOCNFE: dadosXML.DOCNFE.map((item, i) =>
                              i === index ? { ...item, chaveNotaFiscal: e.target.value } : item
                            )
                          });
                        }}
                        placeholder="Chave de 44 dígitos"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {tab === 'Reforma Tributária' && (
            <div className="space-y-6">
              <Card>
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800">
                  <Landmark className="h-5 w-5 text-brand-600" />
                  Contribuições da Reforma Tributária
                </h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <Input
                    label="v. BC IBS/CBS ( serviço )"
                    value={dadosXML.valorServico}
                    onChange={(e) => {
                      const value = e.target.value.replace('R$', '').replace(',', '.').trim();
                      setDadosXML({ ...dadosXML, valorServico: parseFloat(value) || 0 });
                    }}
                    placeholder="R$ 0,00"
                  />
                  <Input
                    label="v IBS"
                    value={dadosXML.valorIBS || ''}
                    onChange={(e) => setDadosXML({ ...dadosXML, valorIBS: e.target.value })}
                    placeholder="R$ 0,00"
                  />
                  <Input
                    label="v. CBS"
                    value={cteSelecionado.IBSCBS?.vCBS}
                    onChange={(e) => {
                      const value = e.target.value.replace('%', '').replace(',', '.').trim();
                      setCteSelecionado({ ...cteSelecionado, IBSCBS: { ...cteSelecionado.IBSCBS, vCBS: parseFloat(value) || 0 } });
                    }}
                    placeholder="0,00%"
                  />
                  <Input
                    label="v. IBS UF / v. IBS ( 0.1% )"
                    value={cteSelecionado.IBSCBS?.vIBS}
                    onChange={(e) => {
                      const value = e.target.value.replace(',', '.').trim();
                      setCteSelecionado({ ...cteSelecionado, IBSCBS: { ...cteSelecionado.IBSCBS, vIBS: parseFloat(value) || 0 } });
                    }}
                    placeholder="R$ 0,00"
                  />
                </div>
              </Card>
            </div>
          )}

          <div className="flex justify-center gap-3 p-2">
            <Button
              type="button"
              variant="success"
              icon={<RefreshCw className="h-4 w-4" />}
              loading={processando}
              onClick={() => loadingData()}
            >
              Processar
            </Button>
            <Button
              type="button"
              variant="success"
              icon={<Send className="h-4 w-4" />}
              loading={enviando}
              onClick={() => sendData()}
            >
              Enviar CT-e
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
