/**
 * T-ADMIN-W3 — transporte e validação do upload de assets (/admin/upload).
 *
 * Regras desta entrega:
 *   - O único caminho de escrita é `POST /api/v1/upload` (o endpoint REAL da API,
 *     `apps/api/src/modules/upload/routes.ts`). Nada de rota nova, nada de
 *     credencial de bucket no browser: a API assina e grava no bucket.
 *   - A validação do cliente ESPELHA a do servidor
 *     (`apps/api/src/modules/upload/service.ts`): limite de bytes, allowlist de MIME
 *     e magic bytes. O servidor continua sendo a autoridade — a checagem aqui serve
 *     para dar erro legível ANTES de subir 50 MiB, não para substituí-la.
 *   - `XMLHttpRequest` (e não `fetch`) porque só o XHR expõe progresso de UPLOAD
 *     (`upload.onprogress`). `fetch` só informa progresso de download.
 */

export interface UploadPolicy {
  maxBytes: number;
  allowedMimes: string[];
}

export interface UploadSuccess {
  key: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

export type UploadFailureKind =
  | 'unauthorized' // 401 — sessão ausente/expirada
  | 'forbidden' // 403 — sem permissão clubs:write, ou CSRF inválido
  | 'too_large' // 413 — limite do servidor
  | 'server' // 5xx — inclusive validação recusada pelo servidor
  | 'network' // nem chegou a responder
  | 'unknown';

export interface UploadFailure {
  kind: UploadFailureKind;
  status: number | null;
  /** Código do envelope da API (`error.code`), quando houver. */
  serverCode: string | null;
  /** Mensagem da API. Em produção a API responde genérico em 5xx — e isso é declarado na tela. */
  serverMessage: string | null;
}

export class UploadError extends Error implements UploadFailure {
  kind: UploadFailureKind;
  status: number | null;
  serverCode: string | null;
  serverMessage: string | null;

  constructor(failure: UploadFailure) {
    super(failure.serverMessage ?? failure.kind);
    this.name = 'UploadError';
    this.kind = failure.kind;
    this.status = failure.status;
    this.serverCode = failure.serverCode;
    this.serverMessage = failure.serverMessage;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

/**
 * Assinaturas por tipo — MESMA tabela de `apps/api/src/modules/upload/service.ts`
 * (exceto `text/csv`, que não tem magic bytes confiável e não é aceito em /upload).
 */
const MIME_MAGIC_BYTES = new Map<string, number[]>([
  ['image/jpeg', [0xff, 0xd8, 0xff]],
  ['image/png', [0x89, 0x50, 0x4e, 0x47]],
  ['image/webp', [0x52, 0x49, 0x46, 0x46]],
  ['application/pdf', [0x25, 0x50, 0x44, 0x46]],
]);

export type ClientValidation =
  | { kind: 'too_large'; bytes: number; maxBytes: number }
  | { kind: 'mime_not_allowed'; mimeType: string; allowedMimes: string[] }
  | { kind: 'magic_mismatch'; mimeType: string }
  | { kind: 'bad_extension' };

async function readHead(file: File, length = 8): Promise<Uint8Array> {
  const slice = file.slice(0, length);
  if (typeof slice.arrayBuffer === 'function') {
    return new Uint8Array(await slice.arrayBuffer());
  }
  // Fallback (FileReader) para ambientes sem Blob.arrayBuffer.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(new Error('falha ao ler o arquivo'));
    reader.readAsArrayBuffer(slice);
  });
}

/** Mesmas três checagens do servidor (tamanho, allowlist de MIME, magic bytes) + extensão. */
export async function validateFileClient(
  file: File,
  policy: UploadPolicy,
): Promise<ClientValidation | null> {
  if (file.size > policy.maxBytes) {
    return { kind: 'too_large', bytes: file.size, maxBytes: policy.maxBytes };
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || ext.length > 10) return { kind: 'bad_extension' };
  if (!policy.allowedMimes.includes(file.type)) {
    return { kind: 'mime_not_allowed', mimeType: file.type, allowedMimes: policy.allowedMimes };
  }
  const signature = MIME_MAGIC_BYTES.get(file.type);
  if (signature && signature.length > 0) {
    const head = await readHead(file, signature.length);
    const ok = signature.every((byte, i) => head[i] === byte);
    if (!ok) return { kind: 'magic_mismatch', mimeType: file.type };
  }
  return null;
}

async function readCsrfToken(base: string): Promise<string | null> {
  try {
    const res = await fetch(`${base}/auth/csrf-token`, { credentials: 'include' });
    if (!res.ok) return null;
    const body = (await res.json()) as Record<string, unknown>;
    const data = (body.data ?? body) as Record<string, unknown>;
    const token = data.csrfToken ?? data.token;
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

function classify(status: number): UploadFailureKind {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 413) return 'too_large';
  if (status >= 400) return 'server';
  return 'unknown';
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string };
  code?: string;
  message?: string;
}

function parseEnvelope(raw: string): ErrorEnvelope {
  try {
    return JSON.parse(raw) as ErrorEnvelope;
  } catch {
    return {};
  }
}

/**
 * Envia UM arquivo para `POST /api/v1/upload`. Rejeita com `UploadError`, que
 * carrega o status e a mensagem REAL do servidor (a tela não inventa causa).
 */
export async function uploadAsset(opts: {
  file: File;
  base: string;
  onProgress: (percent: number) => void;
}): Promise<UploadSuccess> {
  const { file, base, onProgress } = opts;
  const token = await readCsrfToken(base);
  if (token === null) {
    throw new UploadError({
      kind: 'forbidden',
      status: null,
      serverCode: 'CSRF_UNAVAILABLE',
      serverMessage: null,
    });
  }

  const form = new FormData();
  form.append('file', file, file.name);

  return new Promise<UploadSuccess>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${base}/upload`);
    xhr.withCredentials = true;
    xhr.setRequestHeader('x-csrf-token', token);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      }
    };

    xhr.onload = () => {
      const envelope = parseEnvelope(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300) {
        const body = JSON.parse(xhr.responseText) as { data?: UploadSuccess };
        if (body.data?.key) {
          onProgress(100);
          resolve(body.data);
          return;
        }
        reject(
          new UploadError({
            kind: 'unknown',
            status: xhr.status,
            serverCode: null,
            serverMessage: null,
          }),
        );
        return;
      }
      const code = envelope.error?.code ?? envelope.code ?? null;
      reject(
        new UploadError({
          kind: classify(xhr.status),
          status: xhr.status,
          serverCode: code,
          serverMessage: envelope.error?.message ?? envelope.message ?? null,
        }),
      );
    };
    xhr.onerror = () =>
      reject(
        new UploadError({
          kind: 'network',
          status: null,
          serverCode: null,
          serverMessage: null,
        }),
      );
    xhr.onabort = xhr.onerror;
    xhr.send(form);
  });
}
