import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

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
}

export interface ExtrairCNHOptions {
  onProgress?: (msg: string) => void;
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
          dados.local = matchUF[1].slice(-2);
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

export const extrairCNH = (
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
        dados.local = cleaned.slice(-2) || "";
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

// =========================================================
// EXTRAIR TAC/RNTRC DE IMAGEM
// =========================================================

export interface DadosCNH {
  nome: string;
  cpf: string;
}

export interface ExtrairTACOptions {
  onProgress?: (message: string) => void;
}

export async function extrairDadosCNH(
  file: File,
  options?: ExtrairCNHOptions
): Promise<DadosCNH | null> {
  const { onProgress } = options || {};

  try {
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

      const pdf = await pdfjsLib.getDocument({
        data: pdfBuffer,
      }).promise;

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        onProgress?.(
          `Renderizando página ${pageNum}/${pdf.numPages}`
        );

        const page = await pdf.getPage(pageNum);

        const viewport = page.getViewport({
          scale: 6,
        });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext(
          '2d'
        ) as CanvasRenderingContext2D;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: ctx,
          viewport,
        }).promise;

        // remove QR Code
        const cropCanvas =
          document.createElement('canvas');

        const cropCtx =
          cropCanvas.getContext('2d')!;

        cropCanvas.width = canvas.width * 0.58;
        cropCanvas.height = canvas.height;

        cropCtx.drawImage(
          canvas,
          0,
          0,
          canvas.width * 0.58,
          canvas.height,
          0,
          0,
          cropCanvas.width,
          cropCanvas.height
        );

        const blob =
          await new Promise<Blob | null>(
            (resolve) =>
              cropCanvas.toBlob(
                resolve,
                'image/png',
                1
              )
          );

        if (!blob) continue;

        onProgress?.(
          `Executando OCR página ${pageNum}`
        );

        const result =
          await Tesseract.recognize(
            blob,
            'por',
            {
              logger: (m) => {
                if (
                  m.status ===
                  'recognizing text'
                ) {
                  onProgress?.(
                    `OCR ${Math.round(
                      m.progress * 100
                    )}%`
                  );
                }
              },
            }
          );

        textoOCR +=
          '\n' + result.data.text;

        canvas.remove();
        cropCanvas.remove();
      }

      await pdf.destroy();
    }

    // ==========================
    // IMAGEM
    // ==========================
    else {
      onProgress?.(
        'Processando imagem...'
      );

      const result =
        await Tesseract.recognize(
          file,
          'por',
          {
            logger: (m) => {
              if (
                m.status ===
                'recognizing text'
              ) {
                onProgress?.(
                  `OCR ${Math.round(
                    m.progress * 100
                  )}%`
                );
              }
            },
          }
        );

      textoOCR = result.data.text;
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
    const cpfMatch =
      textoOCR.match(
        /CPF[\s\S]{0,80}?(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/i
      );

    const cpf = cpfMatch?.[1] || '';

    // ==========================
    // NOME
    // ==========================
    let nome = '';

    // 1 - MRZ (mais confiável)
    const mrzMatch = textoOCR.match(
      /([A-Z]+(?:<{1,2}[A-Z]+)+)<{2,}/
    );

    if (mrzMatch) {
      nome = mrzMatch[1]
        .replace(/<{1,2}/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // 2 - Nome antes da primeira data
    if (!nome) {
      const match = textoOCR.match(
        /([A-ZÀ-Ú]{2,}(?:\s+[A-ZÀ-Ú]{2,}){1,8})\s+\d{2}\/\d{2}\/\d{4}/
      );

      if (match) {
        nome = match[1]
          .replace(
            /^(DRIVER LICENSE|PERMISO DE CONDUCCION|NAME AND SURNAME)\s+/,
            ''
          )
          .trim();
      }
    }

    // 3 - Procura após PERMISO DE CONDUCCION
    if (!nome) {
      const match = textoOCR.match(
        /PERMISO\s+DE\s+CONDUCCION\s*[=:]?\s*([A-ZÀ-Ú\s]+?)\s+\d{2}\/\d{2}\/\d{4}/
      );

      if (match) {
        nome = match[1]
          .replace(/\s+/g, ' ')
          .trim();
      }
    }

    // 4 - Limpeza final
    nome = nome
      .replace(
        /\b(DRIVER LICENSE|PERMISO DE CONDUCCION|NAME AND SURNAME)\b/g,
        ''
      )
      .replace(/\s+/g, ' ')
      .trim();
    const dados: DadosCNH = {
      nome,
      cpf,
    };

    if (!dados.nome && !dados.cpf) {
      return null;
    }

    return dados;
  } catch (error) {
    console.error(error);
    throw error;
  }
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
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
      }).promise;

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

        // Limpa o canvas e remove do DOM
        context.clearRect(0, 0, canvas.width, canvas.height);
        canvas.remove();

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

      // Destroi o documento PDF para liberar recursos
      await pdf.destroy();
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
