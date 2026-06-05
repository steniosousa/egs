import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// =========================================================
// CONFIG PDF.JS
// =========================================================

pdfjsLib.GlobalWorkerOptions.workerSrc =
  '/pdf.worker.min.mjs';

// =========================================================
// TYPES
// =========================================================

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

const INVALID_NAMES = [
  'LOCAL',
  'DATA',
  'CPF',
  'CNPJ',
  'INFORMACOES',
  'INFORMAÇÕES',
  'OBSERVACOES',
  'OBSERVAÇÕES',
  'SENATRAN',
  'QRCODE',
  'REPÚBLICA',
  'FEDERATIVA',
  'BRASIL',
  'DETRAN',
  'RENAVAM',
  'CRLV',
  'DIGITAL',
  'INFORMA',
  "INFORMAÇÕES",
  "ALIENAÇÃO FIDUCIÁRIA"
];

// =========================================================
// MAIN
// =========================================================

export const processarDocumento = async (
  file: File,
  options?: ProcessarDocumentoOptions
): Promise<DadosDocumento> => {
  const { onProgress, onSuccess, onError } =
    options || {};

  try {
    onProgress?.('Lendo documento...');

    const arrayBuffer =
      await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
    }).promise;

    let fullText = '';

    // =====================================================
    // EXTRAÇÃO NATIVA
    // =====================================================

    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress?.(
        `Extraindo página ${i}/${pdf.numPages}...`
      );

      const page = await pdf.getPage(i);

      const textContent =
        await page.getTextContent();

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
        onProgress?.(
          `OCR página ${i}/${pdf.numPages}...`
        );

        const page = await pdf.getPage(i);

        const viewport = page.getViewport({
          scale: 2.5,
        });

        const canvas =
          document.createElement('canvas');

        const context = canvas.getContext(
          '2d'
        ) as CanvasRenderingContext2D;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport,
          
        }).promise;

        const blob =
          await new Promise<Blob | null>(
            (resolve) =>
              canvas.toBlob(
                resolve,
                'image/png'
              )
          );

        if (!blob) continue;

        const result =
          await Tesseract.recognize(
            blob,
            'por',
            {
              logger: (m: any) => {
                if (
                  m.status ===
                  'recognizing text'
                ) {
                  onProgress?.(
                    `OCR ${i}/${pdf.numPages} - ${Math.round(
                      m.progress * 100
                    )}%`
                  );
                }
              },
            }
          );

        fullText += result.data.text + '\n';
      }
    }

    // =====================================================
    // LIMPEZA TEXTO
    // =====================================================

    fullText = limparTexto(fullText);

    // console.log(
    //   'Texto final extraído:',
    //   fullText
    // );

    // =====================================================
    // DETECTAR DOCUMENTO
    // =====================================================

    let dados: DadosDocumento;

    if (
      fullText.includes(
        'CERTIFICADO DE REGISTRO'
      )
    ) {
      dados = extrairCRLV(fullText);
    } else if (
      fullText.includes(
        'CARTEIRA NACIONAL'
      )
    ) {
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


    if (
      dados.local ||
      dados.proprietario ||
      dados.cpf ||
      dados.placa ||
      dados.renavam
    ) {
      onSuccess?.(dados);
    } else {
      onError?.(
        'Não foi possível extrair os dados.'
      );
    }

    return dados;
  } catch (error) {
    console.error(
      'Erro ao processar documento:',
      error
    );

    onError?.('Erro ao processar documento.');

    throw error;
  }
};

// =========================================================
// CRLV
// =========================================================

const extrairCRLV = (
  texto: string
): DadosDocumento => {
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
    // =====================================================
    // CPF
    // =====================================================

    const cpfs = texto.match(
      /\b(?:\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})\b/g
    );
    if (cpfs?.length) {
      dados.cpf = cpfs[cpfs.length - 1];
    }

    // =====================================================
    // PLACA
    // =====================================================

    const placaMatch = texto.match(
      /\b[A-Z]{3}[0-9][A-Z0-9][0-9]{2}\b/
    );

    if (placaMatch) {
      dados.placa = placaMatch[0];
    }

    // =====================================================
    // RENAVAM
    // =====================================================

    const numeros11 = texto.match(
      /\b\d{11}\b/g
    );

    if (numeros11?.length) {
      dados.renavam = numeros11[0];
    }

    // =====================================================
    // LOCAL
    // =====================================================

const linhas = texto.split('\n');

let encontrouDocumento = false;

for (const linha of linhas) {
  const cleaned = linha.trim();

  console.log(cleaned);

  // Detecta CPF ou CNPJ
  const temDocumento = /\b(?:\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})\b/.test(cleaned);

  if (temDocumento) {
    encontrouDocumento = true;
    continue;
  }

  // Próxima linha após CPF/CNPJ
  if (encontrouDocumento) {
    const matchUF = cleaned.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/);

    if (matchUF) {
      dados.local = matchUF[1];
      encontrouDocumento = false;
    }
  }
}

    // =====================================================
    // CARROCERIA
    // =====================================================

    const tiposDeCarroceria = {
      "CARROCERIA ABERTA": "CARROCERIA ABERTA",
      "CABINE ESTENDIDA": "CABINE ESTENDIDA",
      "CARROCERIA FECHADA": "CARROCERIA FECHADA",
    }
    const carroceriaMatch = Object.keys(tiposDeCarroceria).find((key) =>
      texto.includes(key)
    );

    if (carroceriaMatch) {
      dados.carroceria = tiposDeCarroceria[carroceriaMatch as keyof typeof tiposDeCarroceria];
    }


    //MOTORISTA

    if (carroceriaMatch === "CARROCERIA FECHADA") {
      const proprietario = texto.split('CARROCERIA FECHADA')[1]?.trim().split('\n')[0];
      if (proprietario) {
        dados.proprietario = proprietario;
      }
    } else if (carroceriaMatch === "CARROCERIA ABERTA") {
      const proprietario = texto.split('CARROCERIA ABERTA')[1]?.trim().split('\n')[0];
      if (proprietario) {
        dados.proprietario = proprietario;
      }
    } else {
      //fallback
      const proprietario = texto.split('NãO APLICAVEL')[1]?.trim().split('\n')[0];
      if (proprietario) {
        dados.proprietario = proprietario;
      }
    }

    //modelo
    // ***
    // M.BENZ/L 1620


    const modelo = texto.split('***')[1]?.trim().split('\n')[0];
    if (modelo) {
      dados.modelo = modelo;
    }


    //capacidade
    const capacidade = texto.split('ALUGUEL')[1]?.trim().split('\n')[0]
    if (capacidade) {
      dados.capacidade = (Number(capacidade) * 1000).toString();
    }


    //peso
    const peso = texto.split('/****')[1]?.trim().split('\n')[0]
    if (peso) {
      dados.peso = (Number(peso) * 1000).toString();
    }


  } catch (error) {
    console.error(
      'Erro ao extrair CRLV:',
      error
    );
  }

  return dados;
};

// =========================================================
// CNH
// =========================================================

const extrairCNH = (
  texto: string
): DadosDocumento => {
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
    // CPF

    const cpfMatch = texto.match(
      /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/
    );

    if (cpfMatch) {
      dados.cpf = cpfMatch[0];
    }

    // CATEGORIA

    const categoriaMatch = texto.match(
      /\b(ACC|A|B|C|D|E|AB|AC|AD|AE)\b/
    );

    if (categoriaMatch) {
      dados.categoria = categoriaMatch[0];
    }

    // DATAS

    const datas = texto.match(
      /\b\d{2}\/\d{2}\/\d{4}\b/g
    );

    if (datas && datas.length >= 2) {
      dados.validade = datas[1];
    }

    // NOME

    const linhas = texto.split('\n');

    for (const linha of linhas) {
      const cleaned = linha.trim();

      if (
        cleaned.length > 10 &&
        /^[A-ZÀ-Ú\s]+$/.test(cleaned) &&
        !INVALID_NAMES.some((v) =>
          cleaned.includes(v)
        )
      ) {
        dados.local = cleaned;
      }
    }
  } catch (error) {
    console.error(
      'Erro ao extrair CNH:',
      error
    );
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
    .replace(
      /Valide este QRCode.*?Vio/gi,
      ''
    )
    .replace(/QRCode/gi, '')
    .replace(
      /Documento emitido por CDT.*/gi,
      ''
    )
    .trim();
};

const limparCampo = (valor: string) => {
  return valor
    .replace(/\s+/g, ' ')
    .trim();
};

// =========================================================
// EXTRAIR TAC/RNTRC DE IMAGEM
// =========================================================

export interface ExtrairTACOptions {
  onProgress?: (message: string) => void;
}

export const extrairTAC = async (
  imageFile: File | Blob,
  options?: ExtrairTACOptions
): Promise<string> => {
  const { onProgress } = options || {};

  try {
    // Verifica se é PDF
    const isPdf = imageFile instanceof File && imageFile.type === 'application/pdf';

    let texto = '';

    if (isPdf) {
      onProgress?.('Processando PDF...');

      const arrayBuffer = await imageFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      for (let i = 1; i <= pdf.numPages; i++) {
        onProgress?.(`Processando página ${i}/${pdf.numPages}...`);

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.5 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d') as CanvasRenderingContext2D;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport,
          
        }).promise;

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/png')
        );

        if (!blob) continue;

        const result = await Tesseract.recognize(
          blob,
          'por',
          {
            logger: (m: any) => {
              if (m.status === 'recognizing text') {
                onProgress?.(
                  `OCR página ${i}/${pdf.numPages} - ${Math.round(
                    m.progress * 100
                  )}%`
                );
              }
            },
          }
        );

        texto += result.data.text + '\n';
      }
    } else {
      onProgress?.('Iniciando OCR da imagem...');

      const result = await Tesseract.recognize(
        imageFile,
        'por',
        {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              onProgress?.(
                `Reconhecendo texto - ${Math.round(
                  m.progress * 100
                )}%`
              );
            }
          },
        }
      );

      texto = result.data.text;
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
