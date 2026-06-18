import axios from "axios";
import { proprietário, veiculo } from "../send";
import { toast } from "react-toastify";
import { formatarCpfCnpj } from "../utils/format";
import { extrairTAC, processarDocumento, extrairDadosCNH } from "../pdfProcessor";
import { useState } from "react";
import { useApp } from "../context/AppContext";

export default function CRLVView() {
    const { empresa, dadosXML, setDadosXML, dadosCRLV, setDadosCRLV } = useApp();
    const [loading, setLoading] = useState(false)

    const handleCRLVUpload = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];

        if (file && file.type === 'application/pdf') {

            processarDocumento(file, {
                onProgress: (message: string) => {
                    toast.info(message);
                },

                onSuccess: (dados) => {
                    setDadosCRLV({
                        proprietario: dados.proprietario || '',
                        local: dados.local || '',
                        cpf_proprietario: dados.cpf || '',
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
                        rntc_veículo: '',
                        tipoVeiculo: '',
                        rntc_proprietatio: '',
                        tipoRodado: "",
                        nome_motorista: "",
                        cpf_motorista: '',
                        rntc_motorista: ''
                    });

                    setDadosXML({ ...dadosXML, placaVeiculoTração: dados.placa });

                    if (dados.cpf) {
                        formatarCpfCnpj(
                            dados.cpf,
                            'proprietario'
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

    const verificarSeProprietarioTaCadastrado = async () => {
        if (!empresa) {
            toast.error("Empresa não encontrada")
            return
        }
        if (!dadosCRLV || !dadosCRLV.cpf_proprietario) {
            toast.error("INFORME O CPF DO PROPRIETÁRIO")
            return
        }

        const cpf = dadosCRLV.cpf_proprietario;

        setLoading(true)
        try {
            const { data } = await axios.get(`https://api.egssistemas.com.br/${empresa.name === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//odata/Gcadastro`, {
                params: {
                    $filter: `(contains(tolower(CPFCNPJ), '${cpf}')) and (STATUS ne 'C')`,
                    $count: true,
                    $top: 20
                },
                headers: {
                    Authorization: `Bearer ${empresa.token}`
                }
            })

            if (data.value[0]) {
                toast.info("Proprietário já cadastrado")
                return
            }

            toast.info('Proprietário em processo de cadastro')

            criarProprietario()

        } catch (e) {
            toast.error("Erro ao verificar se motorista está cadastrado")
        } finally {
            setLoading(false)
        }
    }

    const verificarSeVeiculoTaCadastrado = async () => {

        if (!empresa) {
            toast.error("Empresa não encontrada")
            return
        }
        try {
            if (!dadosCRLV || !dadosCRLV.placa) {
                toast.error("INFORME A PLACA DO VEÍCULO")
                return
            }

            const placa = dadosCRLV.placa;

            if (!placa) {
                toast.error("Informe a placa do veículo")
                return
            }
            setLoading(true)
            const { data } = await axios.get(`https://api.egssistemas.com.br/${empresa.name === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//odata/Gveiculo`, {
                params: {
                    $filter: `(contains(tolower(PLACA), '${placa}')) and (STATUS ne 'C')`,
                    $count: true,
                    $top: 20
                },
                headers: {
                    Authorization: `Bearer ${empresa.token}`
                }
            })



            if (data.value[0]) {
                toast.info("Veículo já cadastrado")
                setDadosXML({ ...dadosXML, placaVeiculoTração: data.value[0].PLACA, nome_veiculo: data.value[0].DESCRICAO });
                return
            }
            toast.info('Veiculo em processo de cadastro')

            criarVeiculo()
        } catch {
            toast.error("Erro ao verificar se veiculo está cadastrado")

        } finally {
            setLoading(false)
        }
    }

    const verificarSeMotoristaTaCadastrado = async () => {
        if (!empresa) {
            toast.error("Empresa não encontrada")
            return
        }
        if (!dadosCRLV || !dadosCRLV.cpf_motorista) {
            toast.error("INFORME O CPF DO MOTORISTA")
            return
        }

        const cpf = dadosCRLV.cpf_motorista;

        setLoading(true)
        try {
            const { data } = await axios.get(`https://api.egssistemas.com.br/${empresa.name === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//odata/Gcadastro`, {
                params: {
                    $filter: `(contains(tolower(CPFCNPJ), '${cpf}')) and (STATUS ne 'C')`,
                    $count: true,
                    $top: 20
                },
                headers: {
                    Authorization: `Bearer ${empresa.token}`
                }
            })

            if (data.value[0]) {
                setDadosXML({
                    ...dadosXML,
                    cpf_motorista: dadosCRLV.cpf_motorista.replace(/\D/g, ''),
                    nome_motorista: data.value[0].NOME,

                })

                toast.info("Motorista já cadastrado")

                return
            }
            toast.info('Motorista em processo de cadastro')

            criarMotorista()

        } catch (e) {
            toast.error("Erro ao verificar se motorista está cadastrado")
        } finally {
            setLoading(false)
        }
    }

    const criarVeiculo = async () => {
        if (!empresa) {
            toast.error("Empresa não encontrada")
            return
        }
        if (!dadosCRLV) {
            toast.error("INFORME A PLACA DO VEÍCULO")
            return
        }
        veiculo.PLACA = dadosCRLV.placa
        veiculo.CAPACIDADEKG = parseInt(dadosCRLV.capacidade)
        veiculo.TARA = parseInt(dadosCRLV.peso)
        veiculo.UF = dadosCRLV.local?.slice(-2)
        veiculo.DESCRICAO = dadosCRLV.modelo
        veiculo.RENAVAN = dadosCRLV.renavam
        veiculo.TIPOPROPRIETARIO = dadosCRLV.tipoProprietario
        veiculo.TIPOCARROCERIA = dadosCRLV.tipoCarroceria
        veiculo.TIPOVEICULO = dadosCRLV.tipoVeiculo
        veiculo.RNTC = dadosCRLV.rntc_veículo

        if (!dadosCRLV.placa || !dadosCRLV.capacidade || !dadosCRLV.peso || !dadosCRLV.local || !dadosCRLV.modelo || !dadosCRLV.renavam || !dadosCRLV.tipoProprietario || !dadosCRLV.tipoCarroceria || !dadosCRLV.tipoVeiculo || !dadosCRLV.rntc_veículo) {
            toast.error("INFORME A PLACA, CAPACIDADE, PESO, LOCAL, MODELO, RENAVAM, TIPO DE PROPRIETÁRIO, TIPO DE CARROCERIA, TIPO DE VEÍCULO E RNTC")
            return
        }

        try {
            const { data } = await axios.post(`https://api.egssistemas.com.br/${empresa.name === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//api/GveiculoApi/Post`,
                veiculo,
                {
                    headers: {
                        Authorization: `Bearer ${empresa.token}`
                    }
                }
            )
            toast.success("Veículo cadastrado com sucesso!")

        } catch {
            toast.error("Erro ao criar veículo")
        }
    }

    const criarProprietario = async () => {
        if (!empresa) {
            toast.error("Empresa não encontrada")
            return
        }

        if (!dadosCRLV) {
            toast.error("CRLV não encontrado")
            return
        }
        if (!dadosCRLV.cpf_proprietario || !dadosCRLV.proprietario || !dadosCRLV.rntc_proprietatio) {
            toast.error("INFORME O CPF, O NOME DO PROPRIETÁRIO, O RNTC")
            return
        }

        const proprietário = {
            RAZAOSOCIAL: dadosCRLV.proprietario,
            CPFCNPJ: dadosCRLV.cpf_proprietario.replace(/\D/g, ''),
            RNTC: dadosCRLV.rntc_proprietatio
        }


        try {
            await axios.post(`https://api.egssistemas.com.br/${empresa.name === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//api/GcadastroApi/post`,
                proprietário,
                {
                    headers: {
                        Authorization: `Bearer ${empresa.token}`
                    }
                }
            )

            toast.success("Proprietário cadastrado com sucesso!")
        } catch (e) {
            toast.error("Erro ao criar proprietário")
        }
    }

    const criarMotorista = async () => {
        if (!empresa) {
            toast.error("Empresa não encontrada")
            return
        }

        if (!dadosCRLV) {
            toast.error("CRLV não encontrado")
            return
        }
        if (!dadosCRLV.cpf_motorista || !dadosCRLV.nome_motorista || !dadosCRLV.rntc_motorista) {
            toast.error("INFORME O CPF, O NOME DO MOTORISTA E O RNTC")
            return
        }

        const motorista = {
            RAZAOSOCIAL: dadosCRLV.nome_motorista,
            CPFCNPJ: dadosCRLV.cpf_motorista.replace(/\D/g, ''),
            RNTC: dadosCRLV.rntc_motorista
        }

        try {
            const { data } = await axios.post(`https://api.egssistemas.com.br/${empresa.name === "GADELOG" ? "EGSAPP4" : "EGSCTE"}//api/GcadastroApi/post`,
                motorista,
                {
                    headers: {
                        Authorization: `Bearer ${empresa.token}`
                    }
                }
            )
            if (!data.IDCADASTRO) {
                toast.error("Erro ao criar motorista")
                return
            }


            setDadosXML({
                ...dadosXML,
                cpf_motorista: dadosCRLV.cpf_motorista.replace(/\D/g, ''),
            })
            toast.success("Motorista cadastrado com sucesso!")
        } catch (e) {
            toast.error("Erro ao criar motorista")
        }
    }

    const fieldClass = `
            w-full
            h-12
            px-4
            rounded-xl
            border
            border-slate-300
            bg-white
            text-slate-700
            shadow-sm
            transition-all
            focus:outline-none
            focus:ring-4
            focus:ring-blue-100
            focus:border-blue-500
            `;


    return (
        <div className="w-full">
            {dadosCRLV ? (
                <div className="grid xl:grid-cols-3 gap-8">

                    {/* MOTORISTA */}
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
                                👤
                            </div>

                            <div>
                                <h3 className="font-semibold text-slate-800">
                                    Motorista
                                </h3>

                                <p className="text-sm text-slate-500">
                                    Dados do motorista do veículo
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    id="cnh-image-upload-motorista"
                                    type="file"
                                    accept="image/*,.pdf"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];

                                        if (!file) return;

                                        try {
                                            toast.info("Processando documento...");

                                            const dadosCNH = await extrairDadosCNH(file);

                                            if (dadosCNH) {
                                                setDadosCRLV({
                                                    ...dadosCRLV,
                                                    cpf_motorista: dadosCNH.cpf,
                                                    nome_motorista: dadosCNH.nome,
                                                });
                                                setDadosXML({
                                                    ...dadosXML,
                                                    cpf_motorista: dadosCNH.cpf,
                                                });
                                            } else {
                                                toast.warning("Não foi possível extrair o RNTC");
                                            }
                                        } catch (error) {
                                            toast.error("Erro ao processar documento");
                                        }
                                    }}
                                />

                                <label
                                    htmlFor="cnh-image-upload-motorista"
                                    className="
                                            h-12
                                            px-5
                                            shrink-0
                                            bg-blue-600
                                            hover:bg-blue-700
                                            text-white
                                            rounded-xl
                                            flex
                                            items-center
                                            cursor-pointer
                                            transition-colors
                                            "
                                >
                                    CNH
                                </label>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                    CPF do motorista
                                </label>

                                <input
                                    type="text"
                                    value={dadosCRLV.cpf_motorista}
                                    onChange={(e) => {
                                        setDadosCRLV({ ...dadosCRLV, cpf_motorista: e.target.value });
                                    }}
                                    className={fieldClass}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                    Nome
                                </label>

                                <input
                                    type="text"
                                    value={dadosCRLV.nome_motorista}
                                    onChange={(e) => {
                                        setDadosCRLV({
                                            ...dadosCRLV,
                                            nome_motorista: e.target.value,
                                        });
                                        proprietário.RAZAOSOCIAL = e.target.value;
                                    }}
                                    className={fieldClass}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                    RNTC do Motorista
                                </label>

                                <div className="flex items-center gap-2">

                                    <input
                                        type="text"
                                        value={dadosCRLV.rntc_motorista}
                                        onChange={(e) =>
                                            setDadosCRLV({
                                                ...dadosCRLV,
                                                rntc_motorista: e.target.value,
                                            })
                                        }
                                        className={`${fieldClass} flex-1`}
                                        placeholder="RNTC do motorista"
                                    />

                                    <input
                                        id="rntc-image-upload-motorista"
                                        type="file"
                                        accept="image/*,.pdf"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];

                                            if (!file) return;

                                            try {
                                                toast.info("Processando documento...");

                                                const tac = await extrairTAC(file);

                                                if (tac) {
                                                    setDadosCRLV({
                                                        ...dadosCRLV,
                                                        rntc_motorista: tac,
                                                    });

                                                    toast.success(`RNTC extraído: ${tac}`);
                                                } else {
                                                    toast.warning("Não foi possível extrair o RNTC");
                                                }
                                            } catch (error) {
                                                toast.error("Erro ao processar documento");
                                            }
                                        }}
                                    />

                                    <label
                                        htmlFor="rntc-image-upload-motorista"
                                        className="
                                            h-12
                                            px-5
                                            shrink-0
                                            bg-blue-600
                                            hover:bg-blue-700
                                            text-white
                                            rounded-xl
                                            flex
                                            items-center
                                            cursor-pointer
                                            transition-colors
                                            "
                                    >
                                        Extrair
                                    </label>

                                </div>
                            </div>

                        </div>
                        <div className="w-full flex justify-center mt-4">
                            <button
                                type="button"
                                onClick={verificarSeMotoristaTaCadastrado}
                                disabled={loading}
                                className="
                                    h-12
                                    px-6
                                    bg-blue-600
                                    hover:bg-blue-700
                                    disabled:bg-blue-400
                                    disabled:cursor-not-allowed
                                    text-white
                                    font-semibold
                                    rounded-xl
                                    shadow-sm
                                    transition-all
                                    flex
                                    items-center
                                    justify-center
                                    gap-2
                                "
                            >
                                {loading ? (
                                    <>
                                        <svg
                                            className="w-5 h-5 animate-spin"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                                opacity="0.25"
                                            />
                                            <path
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                            />
                                        </svg>

                                        Processando...
                                    </>
                                ) : (
                                    "Processar"
                                )}
                            </button>
                        </div>

                    </div>
                    {/* VEÍCULO */}
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
                                🚚
                            </div>

                            <div>
                                <h3 className="font-semibold text-slate-800">
                                    Veículo
                                </h3>

                                <p className="text-sm text-slate-500">
                                    Informações do CRLV
                                </p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-5">

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                    Cidade / UF
                                </label>

                                <input
                                    value={dadosCRLV.local}
                                    className={fieldClass}
                                    onChange={(e) => {
                                        setDadosCRLV({
                                            ...dadosCRLV,
                                            local: e.target.value
                                        })
                                    }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                    Modelo
                                </label>

                                <input
                                    value={dadosCRLV.modelo}
                                    className={fieldClass}
                                    onChange={(e) => {
                                        setDadosCRLV({
                                            ...dadosCRLV,
                                            modelo: e.target.value
                                        })
                                    }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                    RENAVAM
                                </label>

                                <input
                                    value={dadosCRLV.renavam}
                                    className={fieldClass}
                                    onChange={(e) => {
                                        setDadosCRLV({
                                            ...dadosCRLV,
                                            renavam: e.target.value
                                        })
                                    }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                    Tipo de Carroceria
                                </label>

                                <select
                                    value={dadosCRLV.tipoCarroceria}
                                    className={fieldClass}
                                    onChange={(e) => {
                                        setDadosCRLV({
                                            ...dadosCRLV,
                                            tipoCarroceria: e.target.value
                                        })
                                    }}
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
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                    Tipo de Veículo
                                </label>

                                <select
                                    value={dadosCRLV.tipoVeiculo}
                                    className={fieldClass}
                                    onChange={(e) => {
                                        setDadosCRLV({
                                            ...dadosCRLV,
                                            tipoVeiculo: e.target.value
                                        })
                                    }}
                                >
                                    <option>SELECIONAR</option>
                                    <option value="R">REBOQUE</option>
                                    <option value="T">TRAÇÃO</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                    Tipo de Rodado
                                </label>

                                <select
                                    value={dadosCRLV.tipoRodado}
                                    className={fieldClass}
                                    onChange={(e) => {
                                        setDadosCRLV({
                                            ...dadosCRLV,
                                            tipoRodado: e.target.value
                                        })
                                    }}
                                >
                                    <option>SELECIONAR</option>
                                    <option value="01">TRUCK</option>
                                    <option value="02">TOCO</option>
                                    <option value="03">CAVALO MECÂNICO</option>
                                    <option value="04">VAN</option>
                                    <option value="05">UTILITÁRIO</option>
                                    <option value="06">OUTROS</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                    Capacidade
                                </label>

                                <input
                                    value={!isNaN(Number(dadosCRLV.capacidade)) ? dadosCRLV.capacidade : "Veículo sem Capacidade"}
                                    className={fieldClass}
                                    onChange={(e) => {
                                        setDadosCRLV({
                                            ...dadosCRLV,
                                            capacidade: e.target.value
                                        })
                                    }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                    Peso
                                </label>

                                <input
                                    value={dadosCRLV.peso}
                                    className={fieldClass}
                                    onChange={(e) => {
                                        setDadosCRLV({
                                            ...dadosCRLV,
                                            peso: e.target.value
                                        })
                                    }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                    Placa
                                </label>

                                <input
                                    value={dadosCRLV.placa}
                                    className={fieldClass}
                                    onChange={(e) => {
                                        setDadosCRLV({
                                            ...dadosCRLV,
                                            placa: e.target.value
                                        })
                                    }}
                                />
                            </div>

                            {/* Tipo Proprietário */}
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                    Tipo de Proprietário
                                </label>

                                <select
                                    value={dadosCRLV.tipoProprietario}
                                    onChange={(e) =>
                                        setDadosCRLV({
                                            ...dadosCRLV,
                                            tipoProprietario: e.target.value,
                                        })
                                    }
                                    className={fieldClass}
                                >
                                    <option>SELECIONAR</option>
                                    <option value="0">TAC-AGREGADO</option>
                                    <option value="1">TAC-INDEPENDENTE</option>
                                    <option value="2">OUTROS</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                    RNTC do Veículo
                                </label>

                                <div className="flex items-center gap-2">

                                    <input
                                        type="text"
                                        value={dadosCRLV.rntc_veículo}
                                        onChange={(e) =>
                                            setDadosCRLV({
                                                ...dadosCRLV,
                                                rntc_veículo: e.target.value,
                                            })
                                        }
                                        className={`${fieldClass} flex-1`}
                                        placeholder="RNTC do proprietário"
                                    />

                                    <input
                                        id="rntc-image-upload-veiculo"
                                        type="file"
                                        accept="image/*,.pdf"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];

                                            if (!file) return;

                                            try {
                                                toast.info("Processando documento...");

                                                const tac = await extrairTAC(file);

                                                if (tac) {
                                                    setDadosCRLV({
                                                        ...dadosCRLV,
                                                        rntc_veículo: tac,
                                                    });

                                                    toast.success(`RNTC extraído: ${tac}`);
                                                } else {
                                                    toast.warning("Não foi possível extrair o RNTC");
                                                }
                                            } catch (error) {
                                                toast.error("Erro ao processar documento");
                                            }
                                        }}
                                    />

                                    <label
                                        htmlFor="rntc-image-upload-veiculo"
                                        className="
                                            h-12
                                            px-5
                                            shrink-0
                                            bg-blue-600
                                            hover:bg-blue-700
                                            text-white
                                            rounded-xl
                                            flex
                                            items-center
                                            cursor-pointer
                                            transition-colors
                                            "
                                    >
                                        Extrair
                                    </label>

                                </div>
                            </div>

                        </div>

                        <div className="w-full flex justify-center mt-10">
                            <button
                                type="button"
                                onClick={verificarSeVeiculoTaCadastrado}
                                disabled={loading}
                                className="
                                    h-12
                                    px-6
                                    bg-blue-600
                                    hover:bg-blue-700
                                    disabled:bg-blue-400
                                    disabled:cursor-not-allowed
                                    text-white
                                    font-semibold
                                    rounded-xl
                                    shadow-sm
                                    transition-all
                                    flex
                                    items-center
                                    justify-center
                                    gap-2
                                "
                            >
                                {loading ? (
                                    <>
                                        <svg
                                            className="w-5 h-5 animate-spin"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                                opacity="0.25"
                                            />
                                            <path
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                            />
                                        </svg>

                                        Processando...
                                    </>
                                ) : (
                                    "Processar"
                                )}
                            </button>
                        </div>
                    </div>

                    {/* PROPRIETÁRIO */}
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
                                👤
                            </div>

                            <div>
                                <h3 className="font-semibold text-slate-800">
                                    Proprietário
                                </h3>

                                <p className="text-sm text-slate-500">
                                    Dados do proprietário do veículo
                                </p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-5">

                            {/* CPF/CNPJ */}
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                    CPF/CNPJ do proprietario
                                </label>

                                <input
                                    type="text"
                                    value={dadosCRLV.cpf_proprietario}
                                    onChange={(e) => {
                                        setDadosCRLV({ ...dadosCRLV, cpf_proprietario: e.target.value });
                                        proprietário.CPFCNPJ = e.target.value;
                                    }}
                                    className={fieldClass}
                                />
                            </div>

                            {/* Proprietário */}
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                    Proprietário
                                </label>

                                <input
                                    type="text"
                                    value={dadosCRLV.proprietario}
                                    onChange={(e) => {
                                        setDadosCRLV({
                                            ...dadosCRLV,
                                            proprietario: e.target.value,
                                        });
                                        proprietário.RAZAOSOCIAL = e.target.value;
                                    }}
                                    className={fieldClass}
                                />
                            </div>

                            {/* RNTC Proprietário */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                    RNTC do Proprietário
                                </label>

                                <div className="flex items-center gap-2">

                                    <input
                                        type="text"
                                        value={dadosCRLV.rntc_proprietatio}
                                        onChange={(e) =>
                                            setDadosCRLV({
                                                ...dadosCRLV,
                                                rntc_proprietatio: e.target.value,
                                            })
                                        }
                                        className={`${fieldClass} flex-1`}
                                        placeholder="RNTC do proprietário"
                                    />

                                    <input
                                        id="rntc-image-upload-proprietario"
                                        type="file"
                                        accept="image/*,.pdf"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];

                                            if (!file) return;

                                            try {
                                                toast.info("Processando documento...");

                                                const tac = await extrairTAC(file);

                                                if (tac) {
                                                    setDadosCRLV({
                                                        ...dadosCRLV,
                                                        rntc_proprietatio: tac,
                                                    });

                                                    toast.success(`RNTC extraído: ${tac}`);
                                                } else {
                                                    toast.warning("Não foi possível extrair o RNTC");
                                                }
                                            } catch (error) {
                                                toast.error("Erro ao processar documento");
                                            }
                                        }}
                                    />

                                    <label
                                        htmlFor="rntc-image-upload-proprietario"
                                        className="
                                            h-12
                                            px-5
                                            shrink-0
                                            bg-blue-600
                                            hover:bg-blue-700
                                            text-white
                                            rounded-xl
                                            flex
                                            items-center
                                            cursor-pointer
                                            transition-colors
                                            "
                                    >
                                        Extrair
                                    </label>

                                </div>
                            </div>



                        </div>
                        <div className="w-full flex justify-center mt-10">
                            <button
                                type="button"
                                onClick={verificarSeProprietarioTaCadastrado}
                                disabled={loading}
                                className="
                                    h-12
                                    px-6
                                    bg-blue-600
                                    hover:bg-blue-700
                                    disabled:bg-blue-400
                                    disabled:cursor-not-allowed
                                    text-white
                                    font-semibold
                                    rounded-xl
                                    shadow-sm
                                    transition-all
                                    flex
                                    items-center
                                    justify-center
                                    gap-2
                                "
                            >
                                {loading ? (
                                    <>
                                        <svg
                                            className="w-5 h-5 animate-spin"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                                opacity="0.25"
                                            />
                                            <path
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                            />
                                        </svg>

                                        Processando...
                                    </>
                                ) : (
                                    "Processar"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                    <div className="text-center">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">Importar Documento CRLV</h3>
                            <p className="text-sm text-gray-600 mb-4">Carregue o CRLV para extrair os dados automaticamente</p>
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
                                    onChange={handleCRLVUpload}
                                />
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}