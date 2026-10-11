/**
 * WhatsApp só entrega 1 mídia por mensagem (Meta Cloud API, e todos os providers
 * do backend leem `message.attachments.first`) — um lote de N arquivos precisa
 * virar N mensagens, enviadas em sequência pelo composer.
 */
export const WHATSAPP_MAX_FILES_PER_SEND = 10;

/** Legenda de mídia na Meta aceita até 1024 caracteres (texto puro vai até 4096). */
const META_MAX_CAPTION_LENGTH = 1024;

export interface AttachmentSend {
  content: string;
  files: File[];
}

/** Limite de tamanho da Meta Cloud API por tipo de mídia, em MB. */
export const getMetaMediaSizeLimitMB = (file: File): number => {
  if (file.type.startsWith('image/')) return 5;
  if (file.type.startsWith('video/') || file.type.startsWith('audio/')) return 16;
  return 100;
};

/**
 * Divide um envio em mensagens. Com `splitPerFile` e mais de 1 arquivo, cada
 * arquivo vira uma mensagem e o texto vira legenda do 1º — exceto quando o 1º é
 * áudio (que não aceita legenda) ou o texto excede o limite de legenda: aí o
 * texto sai antes, como mensagem própria.
 */
export const planAttachmentSends = ({
  content,
  files,
  splitPerFile,
}: {
  content: string;
  files: File[];
  splitPerFile: boolean;
}): AttachmentSend[] => {
  if (!splitPerFile || files.length <= 1) {
    return [{ content, files }];
  }

  const perFile = files.map(file => ({ content: '', files: [file] }));

  if (!content) return perFile;

  if (files[0].type.startsWith('audio/') || content.length > META_MAX_CAPTION_LENGTH) {
    return [{ content, files: [] }, ...perFile];
  }

  perFile[0].content = content;
  return perFile;
};
