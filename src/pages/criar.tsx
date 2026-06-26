import axios from "axios";
import { toast } from "react-toastify";
import { formatarCpfCnpj } from "../utils/format";
import { useState } from "react";
import { useApp } from "../context/AppContext";
import { CTE, XML } from "../types/types";
import calcularFrete from "../utils/calcular_frete";

export default function CRIAR() {
    const { empresa, dadosXML, setDadosXML, cteSelecionado, setCteSelecionado } = useApp();
    const [destinatarioNaoEncontrado, setDestinatarioNaoEncontrado] = useState(false)
    const [tab, setTab] = useState<'identificação' | 'Comp/Tributos' | 'documentos' | 'Reforma Tributária'>('identificação');


    const processarXML = (xmlContent: string) => {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
            const icmsTot = xmlDoc.querySelector("ICMSTot");
            const vol = xmlDoc.querySelector("vol");
            const ide = xmlDoc.querySelector("ide");
            const exit = xmlDoc.querySelector("enderEmit");
            const dest = xmlDoc.querySelector("dest");
            const destination = xmlDoc.querySelector("enderDest");
            const emit = xmlDoc.querySelector("emit");
            const atualizacoes: Partial<XML> = {};


            if (dest) {
                const cpfCnpjDest = dest.querySelector("CPF")?.textContent || dest.querySelector("CNPJ")?.textContent || "";
                if (cpfCnpjDest) {
                    const cpf = formatarCpfCnpj(cpfCnpjDest, 'destinatario');
                    atualizacoes.cpfCnpjDestinatario = cpf;
                }
            }

            if (emit) {
                const cpfCnpjRem = emit.querySelector("CPF")?.textContent || emit.querySelector("CNPJ")?.textContent || "";
                if (cpfCnpjRem) {
                    const cpf = formatarCpfCnpj(cpfCnpjRem, 'Remetente');
                    atualizacoes.cpfCnpjRemetente = cpf;
                }
            }

            if (ide) {
                const nNF = ide.querySelector("nNF")?.textContent || "";
                const chave = xmlDoc.querySelector("infNFe")?.getAttribute("Id")?.replace("NFe", "") || "";
                atualizacoes.numeroNotaFiscal = nNF;
                atualizacoes.chaveNotaFiscal = chave;
            }

            let produto = "";
            if (vol) {
                produto = xmlDoc.querySelector("prod")?.querySelector("xProd")?.textContent?.split(' ')[0] || "";
            }

            if (produto) {
                atualizacoes.produtoPredominante = produto;
            }

            if (icmsTot) {
                const vNF = icmsTot.querySelector("vNF")?.textContent || "0";
                atualizacoes.valorCarga = vNF;

            }


            if (vol) {
                const volumes = xmlDoc.querySelectorAll("vol");

                const pesoTotal = Array.from(volumes).reduce((total, vol) => {
                    const peso = parseFloat(
                        vol.querySelector("pesoB")?.textContent || "0"
                    );

                    return total + peso;
                }, 0);

                atualizacoes.quantidadeCarga = pesoTotal.toString();

            }

            const saidaCidade = exit?.querySelector("xMun")?.textContent || "";
            const saidaUF = exit?.querySelector("UF")?.textContent || "";
            const destinoCidade = destination?.querySelector("xMun")?.textContent || "";
            const destinoUF = destination?.querySelector("UF")?.textContent || "";

            if (saidaCidade && destinoCidade && saidaUF && destinoUF) {
                const serviço = calcularFrete({
                    city: saidaCidade,
                    uf: saidaUF
                }, {
                    city: destinoCidade,
                    uf: destinoUF
                }, Number(atualizacoes.quantidadeCarga))

                if (!serviço) {
                    toast.error("Erro ao calcular o valor do serviço. Verifique as cidades de origem e destino.");
                    return
                }


                atualizacoes.valorServico = serviço.valorDoServiço
                atualizacoes.valorIBS = (serviço.valorDoServiço * 0.001).toFixed(2).toString()
                atualizacoes.percentualCBS = (serviço.valorDoServiço * 0.009).toFixed(2).toString()
                atualizacoes.valorICMS = (serviço.valorDoServiço * 0.12).toFixed(2).toString()
                atualizacoes.saida = {
                    city: saidaCidade,
                    uf: saidaUF
                };
                atualizacoes.destino = {
                    city: destinoCidade,
                    uf: destinoUF
                };
            }

            setDadosXML({ ...dadosXML, ...atualizacoes });

        } catch (error) {
            toast.error("Erro ao processar o arquivo XML. Verifique o formato do arquivo.");
        }


    };


    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type === "text/xml") {
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

    const loadingData = async () => {

        try {
            if (!empresa) {
                toast.error("Empresa não encontrada")
                return
            }

            const atualizacoes: Partial<CTE> = { ...cteSelecionado };

            if (!dadosXML.cpfCnpjDestinatario || !dadosXML.cpfCnpjRemetente || !dadosXML.placaVeiculoTração || !dadosXML.cpf_motorista) {
                toast.info("Informe o cnpj do destinatário, cpf do remetente, placa do veículo e cpf do motorista para continuar")
                return
            }

            const [destinatario, Remetente, VeiculoTração, Motorista] = await Promise.all([
                axios.post(`https://api.egssistemas.com.br/${empresa.name === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//api/ComboBox/GCADASTRO`, {
                    "search": dadosXML.cpfCnpjDestinatario,
                    "id": null,
                    "propertyList": []
                },
                    {
                        headers: {
                            'Authorization': 'Bearer ' + empresa.token,
                        }
                    }),
                axios.post(`https://api.egssistemas.com.br/${empresa.name === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//api/ComboBox/GCADASTRO`, {
                    "search": dadosXML.cpfCnpjRemetente,
                    "id": null,
                    "propertyList": []
                },
                    {
                        headers: {
                            'Authorization': 'Bearer ' + empresa.token,
                        }
                    }),
                axios.get(`https://api.egssistemas.com.br/${empresa.name === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//api/ComboBox/GVEICULO`, {
                    params: {
                        "search": dadosXML.placaVeiculoTração,
                        "tipoVeiculo": "T"
                    },
                    headers: {
                        'Authorization': 'Bearer ' + empresa.token,
                    }
                }),
                axios.post(`https://api.egssistemas.com.br/${empresa.name === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//api/ComboBox/GCADASTRO`, {
                    "search": dadosXML.cpf_motorista,
                    "id": null,
                    "propertyList": []
                },
                    {
                        headers: {
                            'Authorization': 'Bearer ' + empresa.token,
                        }
                    })
            ]);

            if (Motorista.data[0]) {
                atualizacoes.IDMOTORISTA = Motorista.data[0].IDCADASTRO
                setDadosXML({ ...dadosXML, nome_motorista: Motorista.data[0].NOME })
            } else {
                toast.info("Motorista não encontrado")
            }


            if (Remetente.data[0]) {
                atualizacoes.CODCIDADEEMISSAOCTE = Remetente.data[0].CODCIDADE;
                atualizacoes.CODCIDADEINISERV = Remetente.data[0].CODCIDADE;
                atualizacoes.NOMECIDADEINICIOSERV = Remetente.data[0].NOMEMUNICIPIO;
                atualizacoes.UFFIMSERV = Remetente.data[0].CODESTADO;
                atualizacoes.IDREMETENTE = Remetente.data[0].IDCADASTRO
                setDadosXML({ ...dadosXML, nome_remetente: Remetente.data[0].NOME })
            } else {
                toast.info("Remetente não encontrado")
            }

            if (destinatario.data[0]) {
                atualizacoes.NOMECIDADEFIMSERV = destinatario.data[0].NOMEMUNICIPIO;
                atualizacoes.UFFIMSERV = destinatario.data[0].CODESTADO;
                atualizacoes.CODCIDADEFIMSERV = destinatario.data[0].CODCIDADE;
                atualizacoes.NOMECIDADEEMISSAO = destinatario.data[0].NOMEMUNICIPIO;
                atualizacoes.IDDESTINATARIO = destinatario.data[0].IDCADASTRO;
                atualizacoes.IDCONTRATANTE = destinatario.data[0].IDCADASTRO;
                setDadosXML({ ...dadosXML, nome_destinatario: destinatario.data[0].NOME })
            } else {
                toast.info("Destinatário não encontrado")
                const documento = dadosXML.cpfCnpjDestinatario.replace(/\D/g, "");

                if (documento.length === 14) {
                    await getDadasCNPJ();
                    await createDestinatário();
                    return;
                }
                setDestinatarioNaoEncontrado(true)
            }
            if (VeiculoTração.data[0] && atualizacoes.Veiculos) {
                atualizacoes.Veiculos[0] = {
                    ...atualizacoes.Veiculos?.[0],
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
                    IDVEICULO: VeiculoTração.data[0].IDVEICULO,
                }
                atualizacoes.IDVEICULO = VeiculoTração.data[0].IDVEICULO
                setDadosXML({ ...dadosXML, nome_veiculo: VeiculoTração.data[0].DESCRICAO })
            } else {
                toast.info("Veículo não encontrado")
            }



            if (atualizacoes.DOCNFE && atualizacoes.DOCNFE[0]) {
                atualizacoes.DOCNFE[0].CHAVENFE = dadosXML.chaveNotaFiscal
                atualizacoes.DOCNFE[0].NNF = dadosXML.numeroNotaFiscal
            }

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
        }
    }

    const sendData = async () => {

        if (!empresa) {
            toast.error("Empresa não encontrada")
            return
        }
        try {

            await axios.post(`https://api.egssistemas.com.br/${empresa.name === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//api/CteApi/Salvar`, cteSelecionado, {
                headers: {
                    'Authorization': 'Bearer ' + empresa.token,
                    'Content-Type': 'application/json'
                }
            });

            toast.info('CT-e enviado com sucesso!');

        } catch (error) {
            toast.error('Erro ao enviar CT-e. Verifique os dados e tente novamente.');
        }
    };

    const getDadasCNPJ = async () => {
        if (!empresa) {
            toast.error("Empresa não selecionada")
            return
        }
        try {
            const { data } = await axios.get(`https://api.egssistemas.com.br/${empresa.name === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//api/Sistema/GetCadastroReceiraFederal?CNPJ=${dadosXML.cpfCnpjDestinatario.replace(/\D/g, '')}`,
                {
                    headers: {
                        Authorization: `Bearer ${empresa.token}`
                    }
                })
            setDadosXML({
                ...dadosXML,
                email_destinatario: data.Email,
                fone_destinatario: data.Telefone,
                nome_destinatario: data.Nome,
                nome_fantasia: data.Fantasia,
                cep_destinatario: data.Cep,
                rua_destinatario: data.Logradouro,
                bairro_destinario: data.Bairro,
                numero_endereco_destinatario: data.Numero,
                complemente_destinatario: data.Complemento,
                cidade_estado_destinatario: data.CIDADEESTADO,
                CODCIDADE: data.CODCIDADE,
                Uf_destinatario: data.Uf
            });

        } catch (error) {
            console.error(error)
            toast.error("Erro ao buscar dados do CNPJ")
        }
    }

    const createDestinatário = async () => {
        if (!empresa) {
            toast.error("Empresa nao selecionada")
            return
        }
        try {
            const { data } = await axios.post(`https://api.egssistemas.com.br/${empresa.name === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//api/GcadastroApi/post`,
                {
                    RAZAOSOCIAL: dadosXML.nome_destinatario,
                    NOME: dadosXML.nome_destinatario,
                    CPFCNPJ: dadosXML.cpfCnpjDestinatario.replace(/\D/g, ''),
                    CONSUMIDORFINAL: "1",
                    CONTRIBUINTEICMS: "9",
                    FONE: dadosXML.fone_destinatario,
                    EMAIL: dadosXML.email_destinatario,
                    EMAILNFE: dadosXML.email_destinatario,
                    ENDERECO: dadosXML.rua_destinatario,
                    BAIRRO: dadosXML.bairro_destinario,
                    NUMERO: dadosXML.numero_endereco_destinatario,
                    CEP: dadosXML.cep_destinatario,
                    CODCIDADE: dadosXML.CODCIDADE,
                    CODESTADO: dadosXML.Uf_destinatario,
                    CODPAIS: "1058",
                },
                {
                    headers: {
                        Authorization: `Bearer ${empresa.token}`
                    }
                }
            )
            if (!data.IDCADASTRO) {
                toast.error("Erro ao criar destinatário")
                return
            }


            toast.success("destinatário cadastrado com sucesso!")
        } catch (e) {
            toast.error("Erro ao criar destinatário")
        }
    }
    if (!cteSelecionado) {
        return (
            <></>
        )
    }

    return (

        <div>
            <div className="p-6">
                <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 shadow-sm hover:border-blue-400 transition-colors">
                    <div className="text-center">
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
                                        value={dadosXML.cpfCnpjRemetente}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            formatarCpfCnpj(e.target.value, 'Remetente');
                                        }}
                                        id="Remetente"
                                        name="Remetente"
                                        className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                                        placeholder="00.000.000/0000-00"
                                    />
                                    <span className="text-sm text-gray-500">{dadosXML.nome_remetente}</span>
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
                                        value={dadosXML.cpfCnpjDestinatario}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            setDadosXML({ ...dadosXML, cpfCnpjDestinatario: formatarCpfCnpj(e.target.value, 'destinatario') });
                                        }}
                                        id="destinatario"
                                        name="destinatario"
                                        className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                                        placeholder="00.000.000/0000-00"
                                    />

                                    <span className="text-sm text-gray-500">{dadosXML.nome_destinatario}</span>

                                    {destinatarioNaoEncontrado && (
                                        <div className="mt-6 rounded-2xl border border-amber-200 bg-white shadow-lg overflow-hidden">
                                            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
                                                <h3 className="text-lg font-semibold text-white">
                                                    Destinatário não encontrado
                                                </h3>
                                                <p className="mt-1 text-sm text-amber-100">
                                                    Preencha os dados abaixo para cadastrar um novo destinatário.
                                                </p>
                                            </div>

                                            <div className="p-6 space-y-5">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                                    <div>
                                                        <label className="block mb-2 text-sm font-medium text-gray-700">
                                                            Nome / Inscrição Estadual
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={dadosXML.nome_destinatario}
                                                            onChange={(e) =>
                                                                setDadosXML({
                                                                    ...dadosXML,
                                                                    nome_destinatario: e.target.value,
                                                                })
                                                            }
                                                            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100"
                                                            placeholder="Nome ou Inscrição Estadual"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block mb-2 text-sm font-medium text-gray-700">
                                                            E-mail
                                                        </label>
                                                        <input
                                                            type="email"
                                                            value={dadosXML.email_destinatario}
                                                            onChange={(e) =>
                                                                setDadosXML({
                                                                    ...dadosXML,
                                                                    email_destinatario: e.target.value,
                                                                })
                                                            }
                                                            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100"
                                                            placeholder="email@empresa.com"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block mb-2 text-sm font-medium text-gray-700">
                                                            Telefone
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={dadosXML.fone_destinatario}
                                                            onChange={(e) =>
                                                                setDadosXML({
                                                                    ...dadosXML,
                                                                    fone_destinatario: e.target.value,
                                                                })
                                                            }
                                                            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100"
                                                            placeholder="(99) 99999-9999"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block mb-2 text-sm font-medium text-gray-700">
                                                            Cidade
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={dadosXML.cidade_destinatario}
                                                            onChange={(e) =>
                                                                setDadosXML({
                                                                    ...dadosXML,
                                                                    cidade_destinatario: e.target.value,
                                                                })
                                                            }
                                                            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100"
                                                            placeholder="Cidade"
                                                        />
                                                    </div>

                                                </div>

                                                <div className="flex justify-end border-t pt-5">
                                                    <button onClick={getDadasCNPJ} type="button"
                                                        className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 font-medium text-white shadow-md transition-all hover:bg-orange-700 hover:shadow-lg active:scale-95"
                                                    >Buscar por CNPJ</button>

                                                    <button
                                                        type="button"
                                                        onClick={createDestinatário}
                                                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg active:scale-95"
                                                    >
                                                        Criar Destinatário
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
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
                                    <input type="text" value={dadosXML.produtoPredominante} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        setDadosXML({ ...dadosXML, produtoPredominante: e.target.value });
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
                                        value={`R$ ${dadosXML.valorCarga}`}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            setDadosXML({ ...dadosXML, valorCarga: e.target.value });
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
                                        value={dadosXML.quantidadeCarga}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            const value = e.target.value.replace('.', '').replace(',', '.');
                                            setDadosXML({ ...dadosXML, quantidadeCarga: value });
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
                                        value={dadosXML.valorServico}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            setDadosXML({ ...dadosXML, valorServico: parseFloat(e.target.value) });
                                        }}
                                        className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                                        placeholder="R$ 0,00"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                )}
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
                                        value={dadosXML.placaVeiculoTração}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            setDadosXML({ ...dadosXML, placaVeiculoTração: e.target.value });
                                        }}
                                        id="placaVeiculoTração"
                                        name="placaVeiculoTração"
                                        className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                                        placeholder="ABC-1234"
                                    />
                                    <span className="text-sm text-gray-500">{dadosXML.nome_veiculo}</span>
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
                                        value={formatarCpfCnpj(dadosXML.cpf_motorista, 'cpf_motorista')}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            setDadosXML({ ...dadosXML, cpf_motorista: e.target.value });
                                        }}
                                        id="proprietario"
                                        name="proprietario"
                                        className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                                        placeholder="000.000.000-00"
                                    />
                                    <span className="text-sm text-gray-500">{dadosXML.nome_motorista}</span>
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
                                    value={dadosXML.valorICMS}
                                    onChange={(e) => {
                                        setDadosXML({ ...dadosXML, valorICMS: e.target.value });
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
                                        value={dadosXML.numeroNotaFiscal}
                                        onChange={(e) => {
                                            setDadosXML({ ...dadosXML, numeroNotaFiscal: e.target.value });
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
                                        value={dadosXML.chaveNotaFiscal}
                                        onChange={(e) => {
                                            setDadosXML({ ...dadosXML, chaveNotaFiscal: e.target.value });
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
                                        value={dadosXML.valorServico}
                                        onChange={(e) => {
                                            const value = e.target.value.replace('R$', '').replace(',', '.').trim();
                                            setDadosXML({ ...dadosXML, valorServico: parseFloat(value) || 0 });
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
                                        value={dadosXML.valorIBS || ''}
                                        onChange={(e) => {
                                            setDadosXML({ ...dadosXML, valorIBS: e.target.value });
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
                                        value={cteSelecionado.IBSCBS?.vCBS}
                                        onChange={(e) => {
                                            const value = e.target.value.replace('%', '').replace(',', '.').trim();
                                            setCteSelecionado({ ...cteSelecionado, IBSCBS: { ...cteSelecionado.IBSCBS, vCBS: parseFloat(value) || 0 } });

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
                                        value={cteSelecionado.IBSCBS?.vIBS}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(',', '.').trim();
                                            setCteSelecionado({ ...cteSelecionado, IBSCBS: { ...cteSelecionado.IBSCBS, vIBS: parseFloat(value) || 0 } });

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
    )
}