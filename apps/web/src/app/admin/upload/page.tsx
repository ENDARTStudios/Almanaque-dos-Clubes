'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import { getApiBase } from '@/lib/api-base';
import { useI18n } from '@/i18n/Provider';
import { fill } from '@/components/admin/strings';
import { uploadStrings } from './strings';
import {
  formatBytes,
  uploadAsset,
  UploadError,
  validateFileClient,
  type ClientValidation,
  type UploadFailure,
  type UploadSuccess,
} from './uploader';

/**
 * T-ADMIN-W3 — /admin/upload: envio de assets para o bucket PELA API.
 *
 * O que esta tela faz e o que NÃO faz:
 *   - usa o endpoint REAL `POST /api/v1/upload` (mesmo caminho de escrita do
 *     sistema: authenticate + clubs:write + CSRF). Nenhuma rota nova, nenhuma
 *     credencial de bucket no navegador;
 *   - lê a política do servidor (tamanho máximo, MIME aceitos, bucket) de
 *     GET /admin/diagnostics — o mesmo endpoint do painel de diagnóstico, e não
 *     uma segunda verdade copiada no cliente;
 *   - valida tipo/tamanho/magic bytes ANTES de subir, espelhando
 *     apps/api/src/modules/upload/service.ts, e ainda assim trata o erro do
 *     servidor como autoridade (a validação dele lança erro genérico em produção);
 *   - NÃO mostra histórico de assets anteriores: a API não tem rota de listagem
 *     (lacuna declarada na tela). O que aparece é o que foi enviado nesta sessão,
 *     a partir da resposta da própria API.
 */

interface PolicyResponse {
  data: {
    upload: {
      maxBytes: number;
      allowedMimes: string[];
      bucket: string;
      listingEndpoint: null;
      routes: Array<{ method: string; path: string; permission: string; folder: string }>;
    };
  };
}

interface SessionItem {
  name: string;
  key: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
  at: string;
}

type PolicyState = 'loading' | 'ready' | 'unavailable' | 'forbidden';

/** Rota de asset usada por esta tela (a de CSV/importação fica fora do escopo). */
const ASSET_ROUTE = '/api/v1/upload';

function UploadPanel() {
  const { locale } = useI18n();
  const L = uploadStrings[locale] ?? uploadStrings['pt-br'];
  const inputRef = useRef<HTMLInputElement>(null);

  const [policy, setPolicy] = useState<{
    maxBytes: number;
    allowedMimes: string[];
    bucket: string;
  } | null>(null);
  const [policyState, setPolicyState] = useState<PolicyState>('loading');
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<ClientValidation | { kind: 'read_failed' } | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failure, setFailure] = useState<UploadFailure | null>(null);
  const [success, setSuccess] = useState<UploadSuccess | null>(null);
  const [copied, setCopied] = useState(false);
  const [session, setSession] = useState<SessionItem[]>([]);

  const loadPolicy = useCallback(async () => {
    setPolicyState('loading');
    try {
      const res = await api.get<PolicyResponse>('/admin/diagnostics');
      setPolicy({
        maxBytes: res.data.upload.maxBytes,
        allowedMimes: res.data.upload.allowedMimes,
        bucket: res.data.upload.bucket,
      });
      setPolicyState('ready');
    } catch (e) {
      const status = (e as Error & { status?: number }).status;
      setPolicy(null);
      setPolicyState(status === 403 ? 'forbidden' : 'unavailable');
    }
  }, []);

  useEffect(() => {
    // promise callback (não sincrono) — regra react-hooks/set-state-in-effect
    void Promise.resolve().then(loadPolicy);
  }, [loadPolicy]);

  const checkFile = useCallback(
    async (candidate: File) => {
      if (!policy) return; // sem política não há checagem local: o servidor decide
      try {
        const problem = await validateFileClient(candidate, {
          maxBytes: policy.maxBytes,
          allowedMimes: policy.allowedMimes,
        });
        setLocalError(problem);
      } catch {
        setLocalError({ kind: 'read_failed' });
      }
    },
    [policy],
  );

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFailure(null);
    setSuccess(null);
    setCopied(false);
    setProgress(0);
    const chosen = event.target.files?.[0] ?? null;
    setFile(chosen);
    setLocalError(null);
    if (chosen) void checkFile(chosen);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || uploading) return;
    setFailure(null);
    setSuccess(null);
    setCopied(false);

    if (policy) {
      const problem = await validateFileClient(file, {
        maxBytes: policy.maxBytes,
        allowedMimes: policy.allowedMimes,
      });
      if (problem) {
        setLocalError(problem);
        return;
      }
    }

    setUploading(true);
    setProgress(0);
    try {
      const result = await uploadAsset({
        file,
        base: getApiBase(),
        onProgress: setProgress,
      });
      setSuccess(result);
      setSession((prev) => [
        {
          name: file.name,
          key: result.key,
          url: result.url,
          sizeBytes: result.sizeBytes,
          mimeType: result.mimeType,
          at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (e) {
      setFailure(
        e instanceof UploadError
          ? e
          : { kind: 'unknown', status: null, serverCode: null, serverMessage: null },
      );
    } finally {
      setUploading(false);
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const localErrorMessage = (problem: ClientValidation | { kind: 'read_failed' }): string => {
    switch (problem.kind) {
      case 'too_large':
        return fill(L.errTooLarge, {
          size: formatBytes(problem.bytes),
          max: formatBytes(problem.maxBytes),
        });
      case 'mime_not_allowed':
        return fill(L.errMimeNotAllowed, {
          mime: problem.mimeType || '—',
          allowed: problem.allowedMimes.join(', '),
        });
      case 'magic_mismatch':
        return fill(L.errMagicMismatch, { mime: problem.mimeType });
      case 'bad_extension':
        return L.errBadExtension;
      default:
        return L.errReadFailed;
    }
  };

  const failureMessage = (f: UploadFailure): string => {
    switch (f.kind) {
      case 'unauthorized':
        return L.errUnauthorized;
      case 'forbidden':
        return f.serverCode === 'CSRF_UNAVAILABLE'
          ? L.errCsrfUnavailable
          : f.serverCode === 'CSRF_INVALID'
            ? L.errCsrfUnavailable
            : L.errForbidden;
      case 'too_large':
        return L.errTooLargeServer;
      case 'network':
        return L.errNetwork;
      case 'server':
        return fill(L.errServer, { status: f.status === null ? '?' : String(f.status) });
      default:
        return L.errUnknown;
    }
  };

  // 403 na leitura da política = a mesma autorização da escrita falhou: a API não
  // deixaria enviar nada. Estado honesto em vez de um formulário que só dá erro.
  if (policyState === 'forbidden') {
    return (
      <p
        role="alert"
        className="rounded-xl border border-danger-ink/40 bg-danger-surface p-4 text-sm text-danger-ink"
        data-testid="upload-forbidden"
      >
        {L.restricted}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {/* Política do servidor */}
      <section
        aria-label={L.policyTitle}
        className="rounded-xl border border-border bg-muted p-4"
        data-testid="upload-policy"
      >
        <h2 className="font-heading text-sm font-semibold text-foreground">{L.policyTitle}</h2>
        {policyState === 'loading' && (
          <p role="status" className="mt-2 text-sm text-ink-2">
            {L.policyLoading}
          </p>
        )}
        {policyState !== 'loading' && policy === null && (
          <p className="mt-2 text-xs text-warn-ink" data-testid="upload-policy-unavailable">
            {L.policyUnavailable}
          </p>
        )}
        {policy && (
          <dl
            className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2"
            data-testid="upload-policy-values"
          >
            <div className="flex gap-2">
              <dt className="text-ink-3">{L.policyMax}:</dt>
              <dd className="text-ink-2">{formatBytes(policy.maxBytes)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ink-3">{L.policyTypes}:</dt>
              <dd className="font-mono break-all text-ink-2">{policy.allowedMimes.join(', ')}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ink-3">{L.policyBucket}:</dt>
              <dd className="font-mono break-all text-ink-2">{policy.bucket}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ink-3">{L.policyRoute}:</dt>
              <dd className="font-mono break-all text-ink-2">{ASSET_ROUTE}</dd>
            </div>
          </dl>
        )}
      </section>

      {/* Formulário */}
      <section aria-label={L.formTitle}>
        <h2 className="font-heading text-lg font-semibold text-foreground">{L.formTitle}</h2>
        <form onSubmit={onSubmit} className="mt-3 rounded-xl border border-border bg-muted p-4">
          <label htmlFor="upload-file" className="block text-sm font-medium text-foreground">
            {L.fileLabel}
          </label>
          <input
            id="upload-file"
            ref={inputRef}
            type="file"
            accept={policy?.allowedMimes.join(',')}
            onChange={onFileChange}
            aria-describedby="upload-file-hint upload-file-message"
            aria-invalid={localError !== null || failure !== null}
            className="mt-2 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-on-primary"
          />
          <p id="upload-file-hint" className="mt-2 text-xs text-ink-3">
            {L.fileHint}
          </p>

          {file ? (
            <p className="mt-2 text-xs text-ink-2" data-testid="upload-selected">
              {L.selected}: <span className="font-mono break-all">{file.name}</span> · {L.sizeLabel}{' '}
              {formatBytes(file.size)} · {L.typeLabel}{' '}
              <span className="font-mono">{file.type || '—'}</span>
            </p>
          ) : (
            <p className="mt-2 text-xs text-ink-3">{L.noFile}</p>
          )}

          {localError && (
            <p
              id="upload-file-message"
              role="alert"
              className="mt-2 rounded-lg border border-danger-ink/40 bg-danger-surface p-2.5 text-xs text-danger-ink"
              data-testid="upload-local-error"
            >
              <strong className="font-semibold">{L.validationTitle} </strong>
              {localErrorMessage(localError)}
            </p>
          )}

          {!localError && failure === null && (
            <p id="upload-file-message" className="sr-only">
              {L.fileHint}
            </p>
          )}

          <button
            type="submit"
            disabled={!file || uploading || localError !== null}
            className="mt-4 min-h-9 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
            data-testid="upload-submit"
          >
            {uploading ? L.submitting : L.submit}
          </button>

          {uploading && (
            <div className="mt-4">
              <p className="text-xs text-ink-2" id="upload-progress-label">
                {L.progressLabel}: {progress}%
              </p>
              <div
                role="progressbar"
                aria-labelledby="upload-progress-label"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                className="mt-1 h-2 w-full overflow-hidden rounded-full bg-background"
                data-testid="upload-progress"
              >
                {/* Sem transição de largura: animar `width` é animar layout (régua de movimento). */}
                <div className="h-2 rounded-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </form>
      </section>

      {/* Falha */}
      {failure && (
        <section
          aria-label={L.errorTitle}
          role="alert"
          className="rounded-xl border border-danger-ink/40 bg-danger-surface p-4"
          data-testid="upload-error"
        >
          <h2 className="font-heading text-sm font-semibold text-danger-ink">{L.errorTitle}</h2>
          <p className="mt-1 text-xs text-danger-ink">{failureMessage(failure)}</p>
          {failure.serverMessage && (
            <p className="mt-1 break-all text-xs text-danger-ink/80">
              {fill(L.errServerOpaque, { message: failure.serverMessage })}
            </p>
          )}
          <button
            type="button"
            onClick={() => setFailure(null)}
            className="mt-3 min-h-8 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-ink-2 hover:border-primary/50 hover:text-primary-ink"
          >
            {L.retry}
          </button>
        </section>
      )}

      {/* Sucesso */}
      {success && (
        <section
          aria-label={L.successTitle}
          className="rounded-xl border border-success-ink/40 bg-success-surface p-4"
          data-testid="upload-success"
        >
          <h2 className="font-heading text-sm font-semibold text-success-ink">{L.successTitle}</h2>
          <dl className="mt-2 space-y-1 text-xs">
            <div className="flex gap-2">
              <dt className="text-ink-3">{L.successKey}:</dt>
              <dd className="break-all font-mono text-ink-2">{success.key}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ink-3">{L.successSize}:</dt>
              <dd className="text-ink-2">{formatBytes(success.sizeBytes)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ink-3">{L.successType}:</dt>
              <dd className="font-mono text-ink-2">{success.mimeType}</dd>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <dt className="text-ink-3">{L.successUrl}:</dt>
              <dd className="break-all">
                <a
                  href={success.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-mono text-primary-ink underline-offset-2 hover:underline"
                >
                  {success.url}
                </a>
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => void copyUrl(success.url)}
            className="mt-3 min-h-8 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-ink-2 hover:border-primary/50 hover:text-primary-ink"
          >
            {L.copy}
          </button>
          {copied && (
            <p role="status" className="mt-1 text-xs text-ink-2">
              {L.copied}
            </p>
          )}
        </section>
      )}

      {/* Sessão + lacuna declarada */}
      <section aria-label={L.sessionTitle}>
        <h2 className="font-heading text-lg font-semibold text-foreground">{L.sessionTitle}</h2>
        <p className="mt-1 text-sm text-ink-2">{L.sessionNote}</p>
        <p
          className="mt-2 rounded-xl border border-info-ink/40 bg-info-surface p-3 text-xs text-ink-2"
          data-testid="upload-no-listing"
        >
          {L.noListingNote}
        </p>
        {session.length === 0 ? (
          <p className="mt-3 text-sm text-ink-2">{L.sessionEmpty}</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-muted">
            <table className="w-full min-w-[34rem] text-left text-xs">
              <caption className="sr-only">{L.sessionTitle}</caption>
              <thead>
                <tr className="border-b border-border text-ink-3">
                  <th scope="col" className="px-3 py-2 font-medium">
                    {L.colName}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {L.colKey}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {L.colSize}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {L.colWhen}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {L.colUrl}
                  </th>
                </tr>
              </thead>
              <tbody>
                {session.map((item) => (
                  <tr key={item.key} className="border-b border-border/50 last:border-b-0">
                    <td className="break-all px-3 py-2 text-ink-2">{item.name}</td>
                    <td className="break-all px-3 py-2 font-mono text-ink-2">{item.key}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-2">
                      {formatBytes(item.sizeBytes)}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-ink-2">
                      {new Date(item.at).toLocaleTimeString()}
                    </td>
                    <td className="break-all px-3 py-2">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="font-mono text-primary-ink underline-offset-2 hover:underline"
                      >
                        {L.successUrl}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default function AdminUploadPage() {
  const { locale } = useI18n();
  const L = uploadStrings[locale] ?? uploadStrings['pt-br'];
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">{L.title}</h1>
      <p className="mt-1 text-ink-2">{L.subtitle}</p>
      <p className="mt-2 text-xs text-ink-3">{L.internalNote}</p>
      <div className="mt-8">
        <ProtectedRoute>
          <UploadPanel />
        </ProtectedRoute>
      </div>
    </div>
  );
}
