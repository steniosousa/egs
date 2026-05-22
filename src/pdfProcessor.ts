import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Configura o worker do PDF.js usando o arquivo local na pasta public
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface DadosCNH {
  nome: string;
  cpf: string;
  categoria: string;
  validade: string;
  dataNascimento: string;
}

export const processarCNH = async (
  file: File,
  onProgress?: (message: string) => void,
  onSuccess?: (dados: DadosCNH) => void,
  onError?: (error: string) => void
): Promise<DadosCNH> => {
  try {
    if (onProgress) onProgress("Processando PDF da CNH. Isso pode levar alguns segundos...");
    
    // Lê o arquivo como ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Carrega o documento PDF
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    // Processa cada página do PDF
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);

      // Renderiza a página em um canvas
      const scale = 2.0; // Aumenta a escala para melhor qualidade do OCR
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context!,
        viewport,
        canvas
      }).promise;

      // Converte o canvas para imagem
      const imageUrl = canvas.toDataURL('image/png');

      // Realiza OCR na imagem usando Tesseract.js
      const { data: { text } } = await Tesseract.recognize(
        imageUrl,
        'por',
        {
          logger: (m: any) => {
            if (m.status === 'recognizing text' && onProgress) {
              onProgress(`Página ${i}/${pdf.numPages} - Progresso: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );

      fullText += text + '\n';
    }

    console.log('Texto extraído do PDF:', fullText);

    // Extrai dados do texto da CNH usando regex
    const dadosExtraidos = extrairDadosCNH(fullText);

    if (dadosExtraidos.nome || dadosExtraidos.cpf) {
      if (onSuccess) onSuccess(dadosExtraidos);
    } else {
      if (onError) onError("Não foi possível extrair os dados da CNH automaticamente. Por favor, preencha manualmente.");
    }

    return dadosExtraidos;

  } catch (error) {
    console.error('Erro ao processar CNH:', error);
    if (onError) onError("Erro ao processar o arquivo PDF da CNH.");
    throw error;
  }
};

const extrairDadosCNH = (texto: string): DadosCNH => {
  const dados: DadosCNH = {
    nome: '',
    cpf: '',
    categoria: '',
    validade: '',
    dataNascimento: ''
  };

  try {
    // Extrair CPF (formato: XXX.XXX.XXX-XX ou XXXXXXXXXXX)
    const cpfMatch = texto.match(/(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/);
    if (cpfMatch) {
      dados.cpf = cpfMatch[1];
    }

    // Extrair Nome (geralmente aparece após "Nome" ou está em destaque)
    // Tenta vários padrões comuns
    const nomePatterns = [
      /Nome[:\s]+([A-Z\s]+?)(?=\n|$)/i,
      /NOME[:\s]+([A-Z\s]+?)(?=\n|$)/i,
      /([A-Z][A-Z\s]+[A-Z])(?=\s+CPF)/i,
    ];

    for (const pattern of nomePatterns) {
      const match = texto.match(pattern);
      if (match && match[1]) {
        dados.nome = match[1].trim();
        break;
      }
    }

    // Extrair Categoria (geralmente é uma letra como A, B, C, D, E, etc.)
    const categoriaMatch = texto.match(/Categoria[:\s]+([A-Z])/i);
    if (categoriaMatch) {
      dados.categoria = categoriaMatch[1];
    }

    // Extrair Validade (formato de data brasileiro: DD/MM/AAAA ou DD/MM/AA)
    const validadePatterns = [
      /Validade[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
      /Valid[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
      /Exp[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
    ];

    for (const pattern of validadePatterns) {
      const match = texto.match(pattern);
      if (match && match[1]) {
        dados.validade = match[1];
        break;
      }
    }

    // Extrair Data de Nascimento
    const nascimentoPatterns = [
      /Nascimento[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
      /Data\s+Nasc[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
      /Dt\.?\s*Nasc[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
    ];

    for (const pattern of nascimentoPatterns) {
      const match = texto.match(pattern);
      if (match && match[1]) {
        dados.dataNascimento = match[1];
        break;
      }
    }

  } catch (error) {
    console.error('Erro ao extrair dados:', error);
  }

  return dados;
};
