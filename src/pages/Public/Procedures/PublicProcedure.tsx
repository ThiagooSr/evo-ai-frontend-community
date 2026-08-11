import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BookOpenCheck, CheckSquare, File, Image, Loader2 } from 'lucide-react';

import { proceduresService } from '@/services/procedures';
import type { Procedure, ProcedureAttachment, ProcedureBlock } from '@/types/procedures';
import {
  getAttachmentName,
  getAttachmentPreviewUrl,
  getAttachmentUrl,
  isImageAttachment,
} from '@/utils/procedureAttachments';

function renderBlock(block: ProcedureBlock) {
  if (block.type === 'heading') {
    return <h2 className="text-2xl font-semibold text-gray-950">{block.text}</h2>;
  }

  if (block.type === 'checklist') {
    return (
      <div className="flex items-start gap-3 rounded-md border border-gray-200 bg-white px-4 py-3">
        <CheckSquare className="mt-0.5 h-5 w-5 text-emerald-600" />
        <p className="text-base text-gray-800">{block.text}</p>
      </div>
    );
  }

  if (block.type === 'image' && block.url) {
    return (
      <a href={block.url} target="_blank" rel="noreferrer" className="block">
        <img
          src={block.url}
          alt={block.label || block.text || 'Procedimento'}
          className="max-h-[560px] w-full rounded-md border border-gray-200 object-contain"
        />
      </a>
    );
  }

  if (block.type === 'video' && block.url) {
    return <video src={block.url} controls className="w-full rounded-md border border-gray-200" />;
  }

  if (['file', 'link', 'button'].includes(block.type) && block.url) {
    return (
      <a
        href={block.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        <File className="h-4 w-4" />
        {block.label || block.text || 'Abrir'}
      </a>
    );
  }

  return <p className="text-base leading-7 text-gray-700">{block.text}</p>;
}

function renderAttachment(attachment: ProcedureAttachment) {
  const url = getAttachmentUrl(attachment);
  const name = getAttachmentName(attachment);

  if (isImageAttachment(attachment) && url) {
    return (
      <a
        key={attachment.id}
        href={url}
        target="_blank"
        rel="noreferrer"
        className="group block overflow-hidden rounded-md border border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm"
      >
        <div className="aspect-video bg-gray-50">
          <img
            src={getAttachmentPreviewUrl(attachment)}
            alt={name}
            loading="lazy"
            onError={event => {
              if (event.currentTarget.src !== url) event.currentTarget.src = url;
            }}
            className="h-full w-full object-contain transition-transform group-hover:scale-[1.01]"
          />
        </div>
        <div className="flex items-center gap-2 border-t border-gray-200 px-3 py-2 text-sm text-gray-700">
          <Image className="h-4 w-4 text-blue-500" />
          <span className="truncate">{name}</span>
        </div>
      </a>
    );
  }

  return (
    <a
      key={attachment.id}
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
    >
      <File className="h-4 w-4 text-gray-500" />
      {name}
    </a>
  );
}

export default function PublicProcedure() {
  const { token } = useParams();
  const [procedure, setProcedure] = useState<Procedure | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    proceduresService
      .getPublicProcedure(token)
      .then(setProcedure)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-600">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando procedimento...
      </main>
    );
  }

  if (notFound || !procedure) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 text-center">
        <div>
          <BookOpenCheck className="mx-auto mb-4 h-10 w-10 text-gray-300" />
          <h1 className="text-2xl font-semibold text-gray-950">Procedimento indisponivel</h1>
          <p className="mt-2 text-sm text-gray-600">O link pode ter sido removido, expirado ou arquivado.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <article className="mx-auto max-w-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-10">
        <div className="mb-8 border-b border-gray-200 pb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded bg-blue-50 px-2 py-1 text-xs font-semibold uppercase text-blue-700">
            <BookOpenCheck className="h-4 w-4" />
            Procedimento
          </div>
          <h1 className="text-3xl font-semibold text-gray-950">{procedure.title}</h1>
          {procedure.description && <p className="mt-3 text-base leading-7 text-gray-600">{procedure.description}</p>}
        </div>

        <div className="space-y-5">
          {procedure.content_blocks.map(block => (
            <div key={block.id}>{renderBlock(block)}</div>
          ))}
        </div>

        {procedure.attachments.length > 0 && (
          <div className="mt-10 border-t border-gray-200 pt-6">
            <h2 className="text-sm font-semibold uppercase text-gray-500">Anexos</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {procedure.attachments.map(renderAttachment)}
            </div>
          </div>
        )}
      </article>
    </main>
  );
}
