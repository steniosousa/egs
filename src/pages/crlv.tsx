import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { CheckCircle2, FileText, IdCard, Truck, Upload, User, X } from "lucide-react";
import { veiculo } from "../send";
import { formatarCpfCnpj } from "../utils/format";
import { extrairTAC, processarDocumento, extrairDadosCNH } from "../pdfProcessor";
import { useApp } from "../context/AppContext";
import { buscarCadastroPorCpfCnpj, criarCadastro } from "../services/cadastroService";
import { buscarVeiculoPorPlaca, criarVeiculo as criarVeiculoService } from "../services/veiculoService";
import { Button, Card, SectionHeader, Badge, Input, Select, EmptyState } from "../components/ui";
import { FileDropzone, UploadStatus } from "../components/upload/FileDropzone";

function InlineFileButton({
  label,
  accept,
  onFile,
}: {
  label: string;
  accept: string;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        icon={<Upload className="h-4 w-4" />}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </Button>
    </>
  );
}

export default function CRLVView() {
  const { empresa, dadosXML, setDadosXML, dadosCRLV, setDadosCRLV } = useApp();

  const [motoristaLoading, setMotoristaLoading] = useState(false);
  const [veiculoLoading, setVeiculoLoading] = useState(false);
  const [proprietarioLoading, setProprietarioLoading] = useState(false);

  const [crlvStatus, setCrlvStatus] = useState<UploadStatus>("idle");
  const [crlvMessage, setCrlvMessage] = useState<string | undefined>();

  const [cnhStatus, setCnhStatus] = useState<UploadStatus>("idle");
  const [rntcMotoristaStatus, setRntcMotoristaStatus] = useState<UploadStatus>("idle");
  const [rntcVeiculoStatus, setRntcVeiculoStatus] = useState<UploadStatus>("idle");
  const [rntcProprietarioStatus, setRntcProprietarioStatus] = useState<UploadStatus>("idle");

  const handleCRLVUpload = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Por favor, selecione um arquivo PDF válido.");
      return;
    }

    setCrlvStatus("processing");
    setCrlvMessage(undefined);

    await processarDocumento(file, {
      onProgress: (message: string) => {
        setCrlvMessage(message);
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
          tipoCarroceria: '',
          rntc_veículo: '',
          tipoVeiculo: '',
          rntc_proprietatio: '',
          tipoRodado: "",
          tipoProprietario: "",
          nome_motorista: "",
          cpf_motorista: '',
          rntc_motorista: ''
        });

        setDadosXML({ ...dadosXML, placaVeiculoTração: dados.placa });

        if (dados.cpf) {
          formatarCpfCnpj(dados.cpf, 'proprietario');
        }

        setCrlvStatus("success");
        toast.success('Dados da CNH extraídos com sucesso!');
      },

      onError: (error: string) => {
        setCrlvStatus("error");
        toast.error(error);
      },
    });
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

    setProprietarioLoading(true)
    try {
      const value = await buscarCadastroPorCpfCnpj(empresa, cpf)

      if (value[0]) {
        toast.info("Proprietário já cadastrado")
        veiculo.IDCADASTRO = value[0].IDCADASTRO
        return
      }
      toast.info('Proprietário em processo de cadastro')

      await criarProprietario()

    } catch (e) {
      toast.error("Erro ao verificar se motorista está cadastrado")
    } finally {
      setProprietarioLoading(false)
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
      setVeiculoLoading(true)
      const value = await buscarVeiculoPorPlaca(empresa, placa)

      if (value[0]) {
        toast.info("Veículo já cadastrado")
        setDadosXML({ ...dadosXML, placaVeiculoTração: value[0].PLACA, nome_veiculo: value[0].DESCRICAO });
        return
      }
      toast.info('Veiculo em processo de cadastro')

      await criarVeiculo()
    } catch {
      toast.error("Erro ao verificar se veiculo está cadastrado")
    } finally {
      setVeiculoLoading(false)
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

    setMotoristaLoading(true)
    try {
      const value = await buscarCadastroPorCpfCnpj(empresa, cpf)

      if (value[0]) {
        setDadosXML({
          ...dadosXML,
          cpf_motorista: dadosCRLV.cpf_motorista.replace(/\D/g, ''),
          nome_motorista: value[0].NOME,
        })

        toast.info("Motorista já cadastrado")
        return
      }
      toast.info('Motorista em processo de cadastro')

      await criarMotorista()

    } catch (e) {
      toast.error("Erro ao verificar se motorista está cadastrado")
    } finally {
      setMotoristaLoading(false)
    }
  }

  const criarVeiculo = async () => {
    if (!empresa) {
      toast.error("Empresa não encontrada")
      return
    }
    await verificarSeProprietarioTaCadastrado()
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
    veiculo.TIPOPROPRIETARIO = "1"
    veiculo.TIPOCARROCERIA = dadosCRLV.tipoCarroceria
    veiculo.IDGRUPOVEICULO = dadosCRLV.tipoRodado
    veiculo.TIPOVEICULO = dadosCRLV.tipoVeiculo
    veiculo.RNTC = dadosCRLV.rntc_veículo
    veiculo.OBSVEICMOTVEIC = `Veiculo: ${dadosCRLV.placa}\nMotorista: ${dadosCRLV.nome_motorista}` as string

    if (!dadosCRLV.placa || !dadosCRLV.capacidade || !dadosCRLV.peso || !dadosCRLV.local || !dadosCRLV.modelo || !dadosCRLV.renavam || !dadosCRLV.tipoCarroceria || !dadosCRLV.tipoVeiculo || !dadosCRLV.rntc_veículo) {
      toast.error("INFORME A PLACA, CAPACIDADE, PESO, LOCAL, MODELO, RENAVAM, TIPO DE PROPRIETÁRIO, TIPO DE CARROCERIA, TIPO DE VEÍCULO E RNTC")
      return
    }

    try {
      await criarVeiculoService(empresa, veiculo)
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

    const novoProprietario = {
      RAZAOSOCIAL: dadosCRLV.proprietario,
      CPFCNPJ: dadosCRLV.cpf_proprietario.replace(/\D/g, ''),
      RNTC: dadosCRLV.rntc_proprietatio
    }

    try {
      await criarCadastro(empresa, novoProprietario)
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
      const data = await criarCadastro(empresa, motorista)
      if (!data.IDCADASTRO) {
        toast.error("Erro ao criar motorista")
        return
      }

      setDadosXML({
        ...dadosXML,
        cpf_motorista: dadosCRLV.cpf_motorista.replace(/\D/g, ''),
      })
      veiculo.IDPROPVEICULO = data.value[0].IDCADASTRO
      toast.success("Motorista cadastrado com sucesso!")
    } catch (e) {
      toast.error("Erro ao criar motorista")
    }
  }

  const handleExtrairCNH = async (file: File) => {
    setCnhStatus("processing");
    try {
      toast.info("Processando documento...");
      const dadosCNH = await extrairDadosCNH(file);
      console.log(dadosCNH)
      if (dadosCNH && dadosCRLV) {
        setDadosCRLV({
          ...dadosCRLV,
          cpf_motorista: dadosCNH.cpf,
          nome_motorista: dadosCNH.nome,
        });
        setDadosXML({
          ...dadosXML,
          cpf_motorista: dadosCNH.cpf,
        });
        setCnhStatus("success");
        toast.success("Dados da CNH extraídos com sucesso!");
      } else {
        setCnhStatus("error");
        toast.warning("Não foi possível extrair os dados da CNH");
      }
    } catch (error) {
      setCnhStatus("error");
      toast.error("Erro ao processar documento");
    }
  };

  const handleExtrairTac = async (
    file: File,
    campo: "rntc_motorista" | "rntc_veículo" | "rntc_proprietatio",
    setStatus: (status: UploadStatus) => void
  ) => {
    if (!dadosCRLV) return;
    setStatus("processing");
    try {
      toast.info("Processando documento...");
      const tac = await extrairTAC(file);

      if (tac) {
        setDadosCRLV({ ...dadosCRLV, [campo]: tac });
        setStatus("success");
        toast.success(`RNTC extraído: ${tac}`);
      } else {
        setStatus("error");
        toast.warning("Não foi possível extrair o RNTC");
      }
    } catch (error) {
      setStatus("error");
      toast.error("Erro ao processar documento");
    }
  };

  if (!dadosCRLV) {
    return (
      <Card className="animate-fade-in">
        <EmptyState
          icon={FileText}
          title="Importar documento CRLV"
          description="Carregue o CRLV em PDF para extrair automaticamente os dados do veículo, do proprietário e do motorista."
        />
        <div className="mt-6">
          <FileDropzone
            accept=".pdf"
            label="Clique para selecionar ou arraste o arquivo PDF aqui"
            hint="Apenas arquivos .pdf (máx. 10MB)"
            status={crlvStatus}
            statusMessage={crlvMessage}
            onFileSelected={handleCRLVUpload}
          />
        </div>
      </Card>
    );
  }

  return (
    <div className="w-full animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <Badge tone="success" icon={CheckCircle2}>CRLV processado</Badge>
        <Button variant="ghost" size="sm" icon={<X className="h-4 w-4" />} onClick={() => setDadosCRLV(null)}>
          Limpar CRLV
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* MOTORISTA */}
        <Card>
          <SectionHeader
            icon={User}
            title="Motorista"
            subtitle="Dados do motorista do veículo"
            action={<InlineFileButton label="CNH" accept="image/*,.pdf" onFile={handleExtrairCNH} />}
          />

          {cnhStatus === "success" && (
            <Badge tone="success" icon={CheckCircle2} className="mb-4">CNH processada</Badge>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="CPF do motorista"
              value={dadosCRLV.cpf_motorista}
              onChange={(e) => setDadosCRLV({ ...dadosCRLV, cpf_motorista: e.target.value })}
            />

            <Input
              label="Nome"
              value={dadosCRLV.nome_motorista}
              onChange={(e) => setDadosCRLV({ ...dadosCRLV, nome_motorista: e.target.value })}
            />

            <div className="md:col-span-2">
              <Input
                label="RNTC do Motorista"
                value={dadosCRLV.rntc_motorista}
                placeholder="RNTC do motorista"
                onChange={(e) => setDadosCRLV({ ...dadosCRLV, rntc_motorista: e.target.value })}
              />
              <div className="mt-2">
                <FileDropzone
                  accept="image/*,.pdf"
                  label="Extrair RNTC do documento"
                  status={rntcMotoristaStatus}
                  onFileSelected={(file) => handleExtrairTac(file, "rntc_motorista", setRntcMotoristaStatus)}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <Button loading={motoristaLoading} onClick={verificarSeMotoristaTaCadastrado}>
              Processar
            </Button>
          </div>
        </Card>

        {/* VEÍCULO */}
        <Card>
          <SectionHeader icon={Truck} title="Veículo" subtitle="Informações do CRLV" tone="success" />

          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="Cidade / UF"
              value={dadosCRLV.local}
              onChange={(e) => setDadosCRLV({ ...dadosCRLV, local: e.target.value })}
            />

            <Input
              label="Modelo"
              value={dadosCRLV.modelo}
              onChange={(e) => setDadosCRLV({ ...dadosCRLV, modelo: e.target.value })}
            />

            <Input
              label="RENAVAM"
              value={dadosCRLV.renavam}
              onChange={(e) => setDadosCRLV({ ...dadosCRLV, renavam: e.target.value })}
            />

            <Select
              label="Tipo de Carroceria"
              value={dadosCRLV.tipoCarroceria}
              onChange={(e) => setDadosCRLV({ ...dadosCRLV, tipoCarroceria: e.target.value })}
            >
              <option>SELECIONAR</option>
              <option value="01">ABERTA</option>
              <option value="02">FECHADA/BAÚ</option>
              <option value="03">GRANELERA</option>
              <option value="00">NÃO APLICÁVEL</option>
              <option value="04">PORTA CONTAINER</option>
              <option value="05">SIDER</option>
              <option value="09">BASCULANTE</option>
            </Select>

            <Select
              label="Tipo de Veículo"
              value={dadosCRLV.tipoVeiculo}
              onChange={(e) => setDadosCRLV({ ...dadosCRLV, tipoVeiculo: e.target.value })}
            >
              <option>SELECIONAR</option>
              <option value="R">REBOQUE</option>
              <option value="T">TRAÇÃO</option>
            </Select>

            <Select
              label="Tipo de Rodado"
              value={dadosCRLV.tipoRodado}
              onChange={(e) => setDadosCRLV({ ...dadosCRLV, tipoRodado: e.target.value })}
            >
              <option>SELECIONAR</option>
              <option value="01">TRUCK</option>
              <option value="02">TOCO</option>
              <option value="03">CAVALO MECÂNICO</option>
              <option value="04">VAN</option>
              <option value="05">UTILITÁRIO</option>
              <option value="06">OUTROS</option>
            </Select>

            <Input
              label="Capacidade"
              value={!isNaN(Number(dadosCRLV.capacidade)) ? dadosCRLV.capacidade : "Veículo sem Capacidade"}
              onChange={(e) => setDadosCRLV({ ...dadosCRLV, capacidade: e.target.value })}
            />

            <Input
              label="Peso"
              value={dadosCRLV.peso}
              onChange={(e) => setDadosCRLV({ ...dadosCRLV, peso: e.target.value })}
            />

            <Input
              label="Placa"
              value={dadosCRLV.placa}
              onChange={(e) => setDadosCRLV({ ...dadosCRLV, placa: e.target.value })}
            />

            <div className="md:col-span-2">
              <Input
                label="RNTC do Veículo"
                value={dadosCRLV.rntc_veículo}
                placeholder="RNTC do veículo"
                onChange={(e) => setDadosCRLV({ ...dadosCRLV, rntc_veículo: e.target.value })}
              />
              <div className="mt-2">
                <FileDropzone
                  accept="image/*,.pdf"
                  label="Extrair RNTC do documento"
                  status={rntcVeiculoStatus}
                  onFileSelected={(file) => handleExtrairTac(file, "rntc_veículo", setRntcVeiculoStatus)}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <Button loading={veiculoLoading} onClick={verificarSeVeiculoTaCadastrado}>
              Processar
            </Button>
          </div>
        </Card>

        {/* PROPRIETÁRIO */}
        <Card>
          <SectionHeader icon={IdCard} title="Proprietário" subtitle="Dados do proprietário do veículo" />

          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="CPF/CNPJ do proprietario"
              value={dadosCRLV.cpf_proprietario}
              onChange={(e) => setDadosCRLV({ ...dadosCRLV, cpf_proprietario: e.target.value })}
            />

            <Input
              label="Proprietário"
              value={dadosCRLV.proprietario}
              onChange={(e) => setDadosCRLV({ ...dadosCRLV, proprietario: e.target.value })}
            />

            <div className="md:col-span-2">
              <Input
                label="RNTC do Proprietário"
                value={dadosCRLV.rntc_proprietatio}
                placeholder="RNTC do proprietário"
                onChange={(e) => setDadosCRLV({ ...dadosCRLV, rntc_proprietatio: e.target.value })}
              />
              <div className="mt-2">
                <FileDropzone
                  accept="image/*,.pdf"
                  label="Extrair RNTC do documento"
                  status={rntcProprietarioStatus}
                  onFileSelected={(file) => handleExtrairTac(file, "rntc_proprietatio", setRntcProprietarioStatus)}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <Button loading={proprietarioLoading} onClick={verificarSeProprietarioTaCadastrado}>
              Processar
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
