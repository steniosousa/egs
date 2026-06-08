export interface XML {
    cpf_motorista: string,
    cpfCnpjDestinatario: string,
    cpfCnpjRemetente: string,
    quantidadeCarga: string,
    valorCarga: string,
    valorServico: string,
    produtoPredominante: string,
    placaVeiculoTração: string,
    nome_motorista: string,
    nome_veiculo: string,
    nome_remetente: string,
    nome_destinatario: string,
    numeroNotaFiscal: string,
    chaveNotaFiscal: string,
    percentualCBS: string,
    valorIBS: string,
    valorICMS: string,
    saida: { city: string, uf: string },
    destino: { city: string, uf: string }
}


export interface CRLV {
    tipoVeiculo: string,
    tipoRodado: string,
    rntc_veículo: string,
    tipoCarroceria: string,
    tipoProprietario: string,
    proprietario: string,
    local: string,
    cpf: string,
    categoria: string,
    validade: string,
    renavam: string,
    placa: string,
    carroceria: string,
    modelo: string,
    capacidade: string,
    peso: string,
    rntc_proprietatio: string
}