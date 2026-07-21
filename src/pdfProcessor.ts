import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

// =========================================================
// CONFIG PDF.JS
// =========================================================

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// =========================================================
// TYPES
// =========================================================

export interface DadosCNH {
  nome: string;
  cpf: string;
  rg?: string;
  dataNascimento?: string;
  categoria?: string;
  validade?: string;
  numeroRegistro?: string;
  renach?: string;
  filiacao?: string[];
  orgaoEmissor?: string;
}

export interface ExtrairCNHOptions {
  onProgress?: (msg: string) => void;
}

export interface ExtrairTACOptions {
  onProgress?: (message: string) => void;
}

export interface DadosDocumento {
  tipoDocumento: 'CRLV' | 'CNH' | 'DESCONHECIDO';

  proprietario: string;
  local: string;
  cpf: string;

  categoria: string;
  validade: string;

  renavam: string;
  placa: string;
  carroceria: string;
  modelo: string
  capacidade: string
  peso: string
}

interface ProcessarDocumentoOptions {
  onProgress?: (message: string) => void;
  onSuccess?: (dados: DadosDocumento) => void;
  onError?: (error: string) => void;
}

// =========================================================
// CONSTANTES
// =========================================================

const CPF_LOOSE_REGEX = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
const CPF_CNPJ_STRICT_REGEX = /\b(?:\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/g;
const CPF_CNPJ_LOOSE_REGEX = /\b(?:\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})\b/;

// =========================================================
// OCR HELPERS (compartilhados)
// =========================================================

async function renderPdfPageToBlob(
  page: PDFPageProxy,
  scale: number,
  cropWidthRatio?: number
): Promise<Blob | null> {
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d') as CanvasRenderingContext2D;

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: context, viewport }).promise;

  let sourceCanvas: HTMLCanvasElement = canvas;

  if (cropWidthRatio) {
    const cropCanvas = document.createElement('canvas');
    const cropCtx = cropCanvas.getContext('2d')!;

    cropCanvas.width = canvas.width * cropWidthRatio;
    cropCanvas.height = canvas.height;

    cropCtx.drawImage(
      canvas,
      0, 0, canvas.width * cropWidthRatio, canvas.height,
      0, 0, cropCanvas.width, cropCanvas.height
    );

    sourceCanvas = cropCanvas;
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    sourceCanvas.toBlob(resolve, 'image/png', cropWidthRatio ? 1 : undefined)
  );

  canvas.remove();
  if (sourceCanvas !== canvas) sourceCanvas.remove();

  return blob;
}

async function recognizeText(
  blob: Blob | File,
  onProgress?: (message: string) => void,
  progressLabel?: (percent: number) => string
): Promise<string> {
  const result = await Tesseract.recognize(blob, 'por', {
    logger: (m: any) => {
      if (m.status === 'recognizing text') {
        const percent = Math.round(m.progress * 100);
        onProgress?.(progressLabel ? progressLabel(percent) : `OCR ${percent}%`);
      }
    },
  });

  return result.data.text;
}

// =========================================================
// MAIN
// =========================================================

export const processarDocumento = async (
  file: File,
  options?: ProcessarDocumentoOptions
): Promise<DadosDocumento> => {
  const { onProgress, onSuccess, onError } = options || {};

  try {
    onProgress?.('Lendo documento...');

    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    // =====================================================
    // EXTRAÇÃO NATIVA
    // =====================================================

    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress?.(`Extraindo página ${i}/${pdf.numPages}...`);

      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item: any) => item.str)
        .join('\n');

      fullText += pageText + '\n';
    }

    // =====================================================
    // FALLBACK OCR
    // =====================================================

    if (fullText.trim().length < 100) {
      fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        onProgress?.(`OCR página ${i}/${pdf.numPages}...`);

        const page = await pdf.getPage(i);
        const blob = await renderPdfPageToBlob(page, 2.5);

        if (!blob) continue;

        const text = await recognizeText(
          blob,
          onProgress,
          (percent) => `OCR ${i}/${pdf.numPages} - ${percent}%`
        );

        fullText += text + '\n';
      }
    }

    // =====================================================
    // LIMPEZA TEXTO
    // =====================================================

    fullText = limparTexto(fullText);

    // =====================================================
    // DETECTAR DOCUMENTO
    // =====================================================

    let dados: DadosDocumento;

    if (fullText.includes('CERTIFICADO DE REGISTRO')) {
      dados = extrairCRLV(fullText);
    } else if (fullText.includes('CARTEIRA NACIONAL')) {
      dados = extrairCNH(fullText);
    } else {
      dados = {
        tipoDocumento: 'DESCONHECIDO',
        proprietario: '',
        local: '',
        cpf: '',
        categoria: '',
        validade: '',
        renavam: '',
        placa: '',
        carroceria: '',
        modelo: '',
        capacidade: '',
        peso: ''
      };
    }

    if (dados.local || dados.proprietario || dados.cpf || dados.placa || dados.renavam) {
      onSuccess?.(dados);
    } else {
      onError?.('Não foi possível extrair os dados.');
    }

    return dados;
  } catch (error) {
    console.error('Erro ao processar documento:', error);
    onError?.('Erro ao processar documento.');
    throw error;
  }
};

// =========================================================
// CRLV
// =========================================================

function extractCpfCnpj(texto: string): string {
  const docs = texto.match(CPF_CNPJ_STRICT_REGEX);
  return docs?.[0] ?? '';
}

function extractPlaca(texto: string): string {
  const placaMatch = texto.match(/\b[A-Z]{3}[0-9][A-Z0-9][0-9]{2}\b/);
  return placaMatch?.[0] ?? '';
}

function extractRenavam(texto: string): string {
  const numeros11 = texto.match(/\b\d{11}\b/g);
  return numeros11?.[0] ?? '';
}

function extractLocal(texto: string): string {
  const linhas = texto.split('\n');
  let encontrouDocumento = false;
  let local = '';

  for (const linha of linhas) {
    const cleaned = linha.trim();
    const temDocumento = CPF_CNPJ_LOOSE_REGEX.test(cleaned);

    if (temDocumento) {
      encontrouDocumento = true;
      continue;
    }

    if (encontrouDocumento) {
      const matchUF = cleaned.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/);

      if (matchUF) {
        local = matchUF[1].slice(-2);
        encontrouDocumento = false;
      }
    }
  }

  return local;
}

const TIPOS_CARROCERIA: Record<string, string> = {
  "CARROCERIA ABERTA": "CARROCERIA ABERTA",
  "CABINE ESTENDIDA": "CABINE ESTENDIDA",
  "CARROCERIA FECHADA": "CARROCERIA FECHADA",
};

function extractCarroceriaEProprietario(texto: string): { carroceria: string; proprietario: string } {
  const carroceriaMatch = Object.keys(TIPOS_CARROCERIA).find((key) => texto.includes(key));

  const carroceria = carroceriaMatch ? TIPOS_CARROCERIA[carroceriaMatch] : '';
  let proprietario = '';

  if (carroceriaMatch === "CARROCERIA FECHADA") {
    proprietario = texto.split('CARROCERIA FECHADA')[1]?.trim().split('\n')[0] ?? '';
  } else if (carroceriaMatch === "CARROCERIA ABERTA") {
    proprietario = texto.split('CARROCERIA ABERTA')[1]?.trim().split('\n')[0] ?? '';
  } else if (carroceriaMatch === "CABINE ESTENDIDA") {
    proprietario = texto.split('CABINE ESTENDIDA')[1]?.trim().split('\n')[0] ?? '';
  } else {
    proprietario = texto.split('NãO APLICAVEL')[1]?.trim().split('\n')[0] ?? '';
  }

  return { carroceria, proprietario };
}

function extractModelo(texto: string): string {
  const modelo = texto
    .split('\n')
    .map(l => l.trim())
    .find(l =>
      /^[A-Z0-9.\s]{2,}\/[A-Z0-9]/i.test(l) &&
      /[A-Z]/i.test(l) &&
      l.length > 5
    );

  return modelo ?? '';
}

function extractCapacidade(texto: string): string {
  const capacidade = texto.split('ALUGUEL')[1]?.trim().split('\n')[0];
  return capacidade ? (Number(capacidade) * 1000).toFixed(2).toString() : '';
}

function extractPeso(texto: string): string {
  const peso = texto.split('/****')[1]?.trim().split('\n')[0];

  if (peso) {
    return (Number(peso) * 1000).toString();
  }

  const linhas2 = texto.split('\n').map(l => l.trim()).filter(Boolean);
  const idxPotencia = linhas2.findIndex(l => /\d+CV\/\d+/i.test(l));

  if (idxPotencia !== -1) {
    const pesoFallback = linhas2[idxPotencia + 1];

    if (/^\d+(\.\d+)?$/.test(pesoFallback)) {
      return String(Number(pesoFallback) * 1000);
    }
  }

  return '';
}

const extrairCRLV = (texto: string): DadosDocumento => {
  const dados: DadosDocumento = {
    tipoDocumento: 'CRLV',
    proprietario: '',
    local: '',
    cpf: '',
    categoria: '',
    validade: '',
    renavam: '',
    placa: '',
    carroceria: '',
    modelo: '',
    capacidade: '',
    peso: ''
  };

  try {
    dados.cpf = extractCpfCnpj(texto);
    dados.placa = extractPlaca(texto);
    dados.renavam = extractRenavam(texto);
    dados.local = extractLocal(texto);

    const { carroceria, proprietario } = extractCarroceriaEProprietario(texto);
    dados.carroceria = carroceria;
    dados.proprietario = proprietario;

    dados.modelo = extractModelo(texto);
    dados.capacidade = extractCapacidade(texto);
    dados.peso = extractPeso(texto);
  } catch (error) {
    console.error('Erro ao extrair CRLV:', error);
  }

  return dados;
};

// =========================================================
// CNH
// =========================================================

export const extrairCNH = (texto: string): DadosDocumento => {
  const dados: DadosDocumento = {
    tipoDocumento: 'CNH',
    proprietario: '',
    local: '',
    cpf: '',
    categoria: '',
    validade: '',
    renavam: '',
    placa: '',
    carroceria: '',
    modelo: '',
    capacidade: '',
    peso: ''
  };

  try {
    const cpfMatch = texto.match(CPF_LOOSE_REGEX);

    if (cpfMatch) {
      dados.cpf = cpfMatch[0];
    }

    const categoriaMatch = texto.match(/\b(ACC|A|B|C|D|E|AB|AC|AD|AE)\b/);

    if (categoriaMatch) {
      dados.categoria = categoriaMatch[0];
    }

    const datas = texto.match(/\b\d{2}\/\d{2}\/\d{4}\b/g);

    if (datas && datas.length >= 2) {
      dados.validade = datas[1];
    }
  } catch (error) {
    console.error('Erro ao extrair CNH:', error);
  }

  return dados;
};

// =========================================================
// HELPERS
// =========================================================

const limparTexto = (texto: string) => {
  return texto
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .replace(/Valide este QRCode.*?Vio/gi, '')
    .replace(/QRCode/gi, '')
    .replace(/Documento emitido por CDT.*/gi, '')
    .trim();
};

// =========================================================
// EXTRAIR DADOS DA CNH (upload dedicado, com OCR + campos adicionais)
// =========================================================

function extrairCamposAdicionaisCNH(textoOCR: string): Partial<DadosCNH> {
  const extras: Partial<DadosCNH> = {};

  const rgMatch = textoOCR.match(/(?:RG|IDENTIDADE)[\s\S]{0,40}?(\d{1,2}\.?\d{3}\.?\d{3}[-.]?[\dXx]?)/i);
  if (rgMatch) extras.rg = rgMatch[1];

  const nascimentoMatch = textoOCR.match(/NASCIMENTO[\s\S]{0,30}?(\d{2}\/\d{2}\/\d{4})/i);
  if (nascimentoMatch) extras.dataNascimento = nascimentoMatch[1];

  const validadeMatch = textoOCR.match(/VALIDADE[\s\S]{0,30}?(\d{2}\/\d{2}\/\d{4})/i);
  if (validadeMatch) extras.validade = validadeMatch[1];

  const categoriaMatch = textoOCR.match(/\bCAT\b[\s\S]{0,15}?\b(ACC|AB|AC|AD|AE|A|B|C|D|E)\b/i);
  if (categoriaMatch) extras.categoria = categoriaMatch[1];

  const registroMatch = textoOCR.match(/REGISTRO[\s\S]{0,30}?(\d{9,11})/i);
  if (registroMatch) extras.numeroRegistro = registroMatch[1];

  const renachMatch = textoOCR.match(/RENACH[\s\S]{0,30}?([A-Z0-9]{8,12})/i);
  if (renachMatch) extras.renach = renachMatch[1];

  const orgaoMatch = textoOCR.match(/\b(SSP|DETRAN|CIRETRAN|PRF)[/\s-]*([A-Z]{2})?\b/);
  if (orgaoMatch) extras.orgaoEmissor = orgaoMatch[0].trim();

  const filiacaoIdx = textoOCR.search(/FILIA[CÇ][AÃ]O/i);
  if (filiacaoIdx !== -1) {
    const trecho = textoOCR.slice(filiacaoIdx).split(/\n/).slice(1, 3).map(l => l.trim()).filter(Boolean);
    if (trecho.length) extras.filiacao = trecho;
  }

  return extras;
}

export async function extrairDadosCNH(
  file: File,
  options?: ExtrairCNHOptions
): Promise<DadosCNH | null> {
  const { onProgress } = options || {};

  let textoOCR = '';

  const isPdf =
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf');

  // ==========================
  // PDF
  // ==========================
  if (isPdf) {
    onProgress?.('Processando PDF...');

    const pdfBuffer = await file.arrayBuffer();
    const pdf: PDFDocumentProxy = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      onProgress?.(`Renderizando página ${pageNum}/${pdf.numPages}`);

      const page = await pdf.getPage(pageNum);
      const blob = await renderPdfPageToBlob(page, 6, 0.58);

      if (!blob) continue;

      onProgress?.(`Executando OCR página ${pageNum}`);

      const text = await recognizeText(blob, onProgress);
      textoOCR += '\n' + text;
    }

    await pdf.destroy();
  }
  // ==========================
  // IMAGEM
  // ==========================
  else {
    onProgress?.('Processando imagem...');
    textoOCR = await recognizeText(file, onProgress);
  }

  // ==========================
  // LIMPEZA
  // ==========================
  textoOCR = textoOCR
    .toUpperCase()
    .replace(/\r/g, '\n')
    .replace(/[|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // ==========================
  // CPF
  // ==========================
  const cpfMatch = textoOCR.match(/CPF[\s\S]{0,80}?(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/i);
  const cpf = cpfMatch?.[1] || '';

  // ==========================
  // NOME
  // ==========================
  let nome = '';

  const match = textoOCR.match(/[A-Z]{2,}\s*<<\s*[A-Z]{2,}(?:\s*<\s*[A-Z]{2,})+/i);

  if (match) {
    nome = match[0]
      .replace(/</g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const dados: DadosCNH = {
    nome,
    cpf,
    ...extrairCamposAdicionaisCNH(textoOCR),
  };

  if (!dados.nome && !dados.cpf) {
    return null;
  }

  return dados;
}

export const extrairTAC = async (
  imageFile: File | Blob,
  options?: ExtrairTACOptions
): Promise<string> => {
  const { onProgress } = options || {};

  try {
    const isPdf = imageFile instanceof File && imageFile.type === 'application/pdf';

    let texto = '';

    if (isPdf) {
      onProgress?.('Processando PDF...');

      const arrayBuffer = await (imageFile as File).arrayBuffer();
      const pdf: PDFDocumentProxy = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      for (let i = 1; i <= pdf.numPages; i++) {
        onProgress?.(`Processando página ${i}/${pdf.numPages}...`);

        const page = await pdf.getPage(i);
        const blob = await renderPdfPageToBlob(page, 2.5);

        if (!blob) continue;

        const text = await recognizeText(
          blob,
          onProgress,
          (percent) => `OCR página ${i}/${pdf.numPages} - ${percent}%`
        );

        texto += text + '\n';
      }

      await pdf.destroy();
    } else {
      onProgress?.('Iniciando OCR da imagem...');

      texto = await recognizeText(
        imageFile,
        onProgress,
        (percent) => `Reconhecendo texto - ${percent}%`
      );
    }

    onProgress?.('Texto extraído com sucesso');

    // Procura por padrão de RNTRC/TAC (geralmente 9 dígitos)
    // Pode aparecer com ou sem pontos/hífens
    const tacMatch = texto.match(/\b\d{9}\b/);

    if (tacMatch) {
      const numeroSemZero = tacMatch[0].startsWith('0') ? tacMatch[0].slice(1) : tacMatch[0];
      onProgress?.('TAC encontrado: ' + numeroSemZero);
      return numeroSemZero;
    }

    // Tenta padrão alternativo com formatação (ex: 049.363.300)
    const tacFormatadoMatch = texto.match(/\b\d{3}\.?\d{3}\.?\d{3}\b/);

    if (tacFormatadoMatch) {
      const numeroLimpo = tacFormatadoMatch[0].replace(/\./g, '');
      onProgress?.('TAC encontrado: ' + numeroLimpo);
      const numeroSemZero = numeroLimpo.startsWith('0') ? numeroLimpo.slice(1) : numeroLimpo;
      return numeroSemZero.split('').slice(0, 9).join('');
    }

    onProgress?.('Nenhum número TAC encontrado');
    return '';
  } catch (error) {
    console.error('Erro ao extrair TAC:', error);
    onProgress?.('Erro ao extrair TAC');
    throw error;
  }
};
