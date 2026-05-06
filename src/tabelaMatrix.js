import * as XLSX from 'xlsx';

let tabelaData = null;

export const carregarTabela = async () => {
  try {
    const response = await fetch('/TABELA MATRIZ.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    const headers = jsonData[0];
    const data = jsonData.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    
    tabelaData = data;
    console.log('Tabela carregada com sucesso:', data.length, 'linhas');
    return data;
  } catch (error) {
    console.error('Erro ao carregar tabela:', error);
    return [];
  }
};

export const buscarValor14Ton = (cidade, uf) => {
  return buscarValorPorColuna(cidade, uf, 'Truck 14 TON');
};

export const buscarValor19Ton = (cidade, uf) => {
  return buscarValorPorColuna(cidade, uf, 'Bitruck 19 TON');
};

export const buscarValor27_30Ton = (cidade, uf) => {
  return buscarValorPorColuna(cidade, uf, '5 Eixos 27/30 TON');
};

export const buscarValor32_35Ton = (cidade, uf) => {
  return buscarValorPorColuna(cidade, uf, '6 Eixos 32/35 TON');
};

export const buscarValor38_40Ton = (cidade, uf) => {
  return buscarValorPorColuna(cidade, uf, '7 Eixos 38/40 TON');
};

export const buscarValor50Ton = (cidade, uf) => {
  return buscarValorPorColuna(cidade, uf, '9 Eixos 50 TON');
};

// Função para buscar usando os nomes das colunas (se tiver cabeçalho)
export const buscarValorPorColuna = (cidade, uf, tipoCaminhao) => {
  if (!tabelaData) {
    console.warn('Tabela não carregada. Execute carregarTabela() primeiro.');
    return null;
  }
  console.log(`Buscando: ${cidade}/${uf} - Tipo: ${tipoCaminhao}`);
  
  // Buscar a linha que corresponde à cidade e UF
  const linhaEncontrada = tabelaData.find(row => {
    const cidadeRow = String(row.B || row['Destino'] || row[''] || '').trim().toLowerCase();
    const ufRow = String(row.C || row['UF'] || row[''] || '').trim().toLowerCase();
    
    return cidadeRow === cidade.toLowerCase() && ufRow === uf.toLowerCase();
  });
  
  if (linhaEncontrada) {
    // Retornar o valor da coluna especificada (tipo de caminhão)
    const valor = linhaEncontrada[tipoCaminhao] || 0;
    console.log(`Valor encontrado para ${cidade}/${uf} (${tipoCaminhao}):`, valor);
    return valor;
  }
  
  console.warn(`Não encontrado valor para ${cidade}/${uf} (${tipoCaminhao})`);
  return null;
};

