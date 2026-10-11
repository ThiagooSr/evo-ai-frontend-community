import { describe, it, expect } from 'vitest';
import {
  WHATSAPP_MAX_FILES_PER_SEND,
  getMetaMediaSizeLimitMB,
  planAttachmentSends,
} from './attachmentSendPlan';

const file = (name: string, type: string) => new File(['x'], name, { type });

const pdfA = file('a.pdf', 'application/pdf');
const pdfB = file('b.pdf', 'application/pdf');
const png = file('c.png', 'image/png');
const mp3 = file('x.mp3', 'audio/mpeg');

describe('planAttachmentSends', () => {
  it('splits one message per file with the text as caption of the first', () => {
    expect(planAttachmentSends({ content: 'Segue', files: [pdfA, pdfB, png], splitPerFile: true })).toEqual([
      { content: 'Segue', files: [pdfA] },
      { content: '', files: [pdfB] },
      { content: '', files: [png] },
    ]);
  });

  it('sends the text as a standalone message before the files when the first file is audio', () => {
    expect(planAttachmentSends({ content: 'oi', files: [mp3, pdfA], splitPerFile: true })).toEqual([
      { content: 'oi', files: [] },
      { content: '', files: [mp3] },
      { content: '', files: [pdfA] },
    ]);
  });

  it('does not emit an empty text message when the first file is audio and there is no text', () => {
    expect(planAttachmentSends({ content: '', files: [mp3, pdfA], splitPerFile: true })).toEqual([
      { content: '', files: [mp3] },
      { content: '', files: [pdfA] },
    ]);
  });

  it('sends text longer than the Meta caption limit as a standalone message', () => {
    const longText = 'a'.repeat(1025);
    expect(planAttachmentSends({ content: longText, files: [pdfA, pdfB], splitPerFile: true })).toEqual([
      { content: longText, files: [] },
      { content: '', files: [pdfA] },
      { content: '', files: [pdfB] },
    ]);
  });

  it('splits without captions when there is no text', () => {
    expect(planAttachmentSends({ content: '', files: [pdfA, pdfB], splitPerFile: true })).toEqual([
      { content: '', files: [pdfA] },
      { content: '', files: [pdfB] },
    ]);
  });

  it('keeps a single message with every file when splitting is off', () => {
    expect(planAttachmentSends({ content: 'Segue', files: [pdfA, pdfB, png], splitPerFile: false })).toEqual([
      { content: 'Segue', files: [pdfA, pdfB, png] },
    ]);
  });

  it('keeps the single-file flow untouched even when splitting is on', () => {
    expect(planAttachmentSends({ content: 'oi', files: [mp3], splitPerFile: true })).toEqual([
      { content: 'oi', files: [mp3] },
    ]);
  });

  it('keeps a text-only message as is', () => {
    expect(planAttachmentSends({ content: 'oi', files: [], splitPerFile: true })).toEqual([
      { content: 'oi', files: [] },
    ]);
  });
});

describe('getMetaMediaSizeLimitMB', () => {
  it('follows the Meta Cloud API limits per media type', () => {
    expect(getMetaMediaSizeLimitMB(png)).toBe(5);
    expect(getMetaMediaSizeLimitMB(file('v.mp4', 'video/mp4'))).toBe(16);
    expect(getMetaMediaSizeLimitMB(mp3)).toBe(16);
    expect(getMetaMediaSizeLimitMB(pdfA)).toBe(100);
  });
});

describe('WHATSAPP_MAX_FILES_PER_SEND', () => {
  it('caps a batch at 10 files', () => {
    expect(WHATSAPP_MAX_FILES_PER_SEND).toBe(10);
  });
});
