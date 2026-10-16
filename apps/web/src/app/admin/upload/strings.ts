import type { Locale } from '@/i18n/config';

/**
 * Strings LOCAIS do painel de upload (/admin/upload) — módulo aditivo dentro da
 * própria pasta da rota (mesmo padrão de `app/admin/metricas/strings.ts`).
 */
export interface UploadStrings {
  title: string;
  subtitle: string;
  internalNote: string;
  restricted: string;

  policyTitle: string;
  policyMax: string;
  policyTypes: string;
  policyBucket: string;
  policyRoute: string;
  policyUnavailable: string;
  policyLoading: string;

  formTitle: string;
  fileLabel: string;
  fileHint: string;
  selected: string;
  noFile: string;
  sizeLabel: string;
  typeLabel: string;
  submit: string;
  submitting: string;
  progressLabel: string;

  validationTitle: string;
  errTooLarge: string;
  errMimeNotAllowed: string;
  errMagicMismatch: string;
  errBadExtension: string;
  errReadFailed: string;

  errorTitle: string;
  errUnauthorized: string;
  errForbidden: string;
  errCsrfUnavailable: string;
  errTooLargeServer: string;
  errServer: string;
  errServerOpaque: string;
  errNetwork: string;
  errUnknown: string;
  retry: string;

  successTitle: string;
  successKey: string;
  successUrl: string;
  successType: string;
  successSize: string;
  copy: string;
  copied: string;
  copyFailed: string;

  sessionTitle: string;
  sessionNote: string;
  sessionEmpty: string;
  noListingNote: string;
  colName: string;
  colKey: string;
  colSize: string;
  colWhen: string;
  colUrl: string;
}

const PT: UploadStrings = {
  title: 'Upload',
  subtitle: 'Envio de assets (imagens) para o armazenamento do acervo.',
  internalNote:
    'Área interna. O arquivo vai direto para o bucket pela API; nenhuma credencial de ' +
    'armazenamento chega ao navegador. A página é noindex pelo layout de /admin.',
  restricted:
    'Acesso restrito: a API recusou a leitura da política (403). Sem permissão de administrador ' +
    'esta área não pode enviar nada — a escrita usa a mesma autorização.',

  policyTitle: 'Política do servidor',
  policyMax: 'Tamanho máximo por arquivo',
  policyTypes: 'Tipos aceitos',
  policyBucket: 'Bucket',
  policyRoute: 'Rota usada',
  policyUnavailable:
    'Não foi possível ler a política do servidor (a API respondeu com erro ou a consulta falhou). ' +
    'A validação no navegador fica limitada a extensão e leitura do arquivo: o SERVIDOR continua ' +
    'validando tamanho, tipo e magic bytes, e pode recusar o envio.',
  policyLoading: 'Lendo a política do servidor…',

  formTitle: 'Enviar um arquivo',
  fileLabel: 'Arquivo',
  fileHint:
    'Tipo e tamanho são conferidos aqui espelhando a checagem do servidor (tamanho, lista de MIME ' +
    'e magic bytes). O servidor é a autoridade final.',
  selected: 'Selecionado',
  noFile: 'Nenhum arquivo escolhido.',
  sizeLabel: 'Tamanho',
  typeLabel: 'Tipo',
  submit: 'Enviar',
  submitting: 'Enviando…',
  progressLabel: 'Progresso do envio',

  validationTitle: 'O arquivo não passou na checagem local:',
  errTooLarge: 'O arquivo tem {size} e o limite do servidor é {max}.',
  errMimeNotAllowed: 'O tipo {mime} não está na lista aceita pelo servidor ({allowed}).',
  errMagicMismatch:
    'O conteúdo do arquivo não corresponde ao tipo declarado ({mime}) — o servidor recusaria pelos ' +
    'magic bytes.',
  errBadExtension: 'O nome do arquivo não tem extensão válida.',
  errReadFailed: 'Não foi possível ler o arquivo para conferir o conteúdo.',

  errorTitle: 'O envio falhou',
  errUnauthorized: 'Sessão ausente ou expirada. Entre novamente e repita o envio.',
  errForbidden:
    'A API recusou a escrita (403). A rota exige a permissão clubs:write e um token CSRF válido.',
  errCsrfUnavailable:
    'Não foi possível obter o token CSRF antes do envio — sem ele a API recusa toda escrita. ' +
    'Recarregue a página (a sessão pode ter expirado).',
  errTooLargeServer: 'O servidor recusou por tamanho (413): o corpo excede o limite configurado.',
  errServer:
    'O servidor recusou o arquivo (HTTP {status}). A validação de tipo/tamanho da API lança erro ' +
    'genérico em produção — por isso a checagem local acima existe. Confira tipo, tamanho e ' +
    'conteúdo do arquivo.',
  errServerOpaque: 'Resposta do servidor: {message}',
  errNetwork: 'Não foi possível falar com a API (rede ou CORS). Nada foi gravado.',
  errUnknown: 'Erro não classificado.',
  retry: 'Tentar de novo',

  successTitle: 'Enviado',
  successKey: 'Chave no bucket',
  successUrl: 'URL',
  successType: 'Tipo',
  successSize: 'Tamanho',
  copy: 'Copiar URL',
  copied: 'Copiado.',
  copyFailed: 'Não foi possível copiar (área de transferência indisponível neste contexto).',

  sessionTitle: 'Enviados nesta sessão',
  sessionNote: 'Lista montada nesta página, com as respostas reais da API. Some ao recarregar.',
  sessionEmpty: 'Nenhum envio nesta sessão.',
  noListingNote:
    'Lacuna declarada: a API NÃO expõe rota de listagem dos assets já gravados (existe apenas a ' +
    'escrita, POST /api/v1/upload). Por isso não há histórico de envios anteriores — só o que ' +
    'foi enviado nesta sessão, a partir da resposta da própria API.',
  colName: 'Arquivo',
  colKey: 'Chave',
  colSize: 'Tamanho',
  colWhen: 'Quando',
  colUrl: 'URL',
};

const EN: UploadStrings = {
  title: 'Upload',
  subtitle: 'Upload of assets (images) to the archive storage.',
  internalNote:
    'Internal area. The file goes straight to the bucket through the API; no storage credential ' +
    'reaches the browser. The page is noindex via the /admin layout.',
  restricted:
    'Restricted: the API refused to read the policy (403). Without administrator permission this ' +
    'area cannot send anything — the write uses the same authorization.',

  policyTitle: 'Server policy',
  policyMax: 'Max size per file',
  policyTypes: 'Accepted types',
  policyBucket: 'Bucket',
  policyRoute: 'Route used',
  policyUnavailable:
    'Could not read the server policy (the API answered with an error or the request failed). ' +
    'Browser-side validation is limited to extension and file reading: the SERVER still validates ' +
    'size, type and magic bytes, and may refuse the upload.',
  policyLoading: 'Reading the server policy…',

  formTitle: 'Send a file',
  fileLabel: 'File',
  fileHint:
    'Type and size are checked here mirroring the server check (size, MIME allowlist and magic ' +
    'bytes). The server is the final authority.',
  selected: 'Selected',
  noFile: 'No file chosen.',
  sizeLabel: 'Size',
  typeLabel: 'Type',
  submit: 'Upload',
  submitting: 'Uploading…',
  progressLabel: 'Upload progress',

  validationTitle: 'The file failed the local check:',
  errTooLarge: 'The file is {size} and the server limit is {max}.',
  errMimeNotAllowed: 'Type {mime} is not in the list accepted by the server ({allowed}).',
  errMagicMismatch:
    'The file content does not match the declared type ({mime}) — the server would reject it on ' +
    'magic bytes.',
  errBadExtension: 'The file name has no valid extension.',
  errReadFailed: 'Could not read the file to check its content.',

  errorTitle: 'The upload failed',
  errUnauthorized: 'Missing or expired session. Sign in again and retry.',
  errForbidden:
    'The API refused the write (403). The route requires the clubs:write permission and a valid ' +
    'CSRF token.',
  errCsrfUnavailable:
    'Could not obtain the CSRF token before uploading — without it the API refuses every write. ' +
    'Reload the page (the session may have expired).',
  errTooLargeServer: 'The server refused on size (413): the body exceeds the configured limit.',
  errServer:
    'The server refused the file (HTTP {status}). The API type/size validation throws a generic ' +
    'error in production — that is why the local check above exists. Review type, size and file ' +
    'content.',
  errServerOpaque: 'Server response: {message}',
  errNetwork: 'Could not reach the API (network or CORS). Nothing was stored.',
  errUnknown: 'Unclassified error.',
  retry: 'Try again',

  successTitle: 'Uploaded',
  successKey: 'Bucket key',
  successUrl: 'URL',
  successType: 'Type',
  successSize: 'Size',
  copy: 'Copy URL',
  copied: 'Copied.',
  copyFailed: 'Could not copy (clipboard unavailable in this context).',

  sessionTitle: 'Uploaded in this session',
  sessionNote: 'List built on this page from the real API responses. It is lost on reload.',
  sessionEmpty: 'No upload in this session.',
  noListingNote:
    'Declared gap: the API exposes NO listing route for assets already stored (write only, POST ' +
    '/api/v1/upload). Therefore there is no history of previous uploads — only what was sent in ' +
    'this session, taken from the API response itself.',
  colName: 'File',
  colKey: 'Key',
  colSize: 'Size',
  colWhen: 'When',
  colUrl: 'URL',
};

const ES: UploadStrings = {
  title: 'Upload',
  subtitle: 'Envío de assets (imágenes) al almacenamiento del acervo.',
  internalNote:
    'Área interna. El archivo va directo al bucket por la API; ninguna credencial de ' +
    'almacenamiento llega al navegador. La página es noindex por el layout de /admin.',
  restricted:
    'Acceso restringido: la API rechazó la lectura de la política (403). Sin permiso de ' +
    'administrador esta área no puede enviar nada — la escritura usa la misma autorización.',

  policyTitle: 'Política del servidor',
  policyMax: 'Tamaño máximo por archivo',
  policyTypes: 'Tipos aceptados',
  policyBucket: 'Bucket',
  policyRoute: 'Ruta usada',
  policyUnavailable:
    'No se pudo leer la política del servidor (la API respondió con error o la consulta falló). ' +
    'La validación en el navegador queda limitada a extensión y lectura del archivo: el SERVIDOR ' +
    'sigue validando tamaño, tipo y magic bytes, y puede rechazar el envío.',
  policyLoading: 'Leyendo la política del servidor…',

  formTitle: 'Enviar un archivo',
  fileLabel: 'Archivo',
  fileHint:
    'El tipo y el tamaño se verifican aquí replicando la comprobación del servidor (tamaño, lista ' +
    'de MIME y magic bytes). El servidor es la autoridad final.',
  selected: 'Seleccionado',
  noFile: 'Ningún archivo elegido.',
  sizeLabel: 'Tamaño',
  typeLabel: 'Tipo',
  submit: 'Enviar',
  submitting: 'Enviando…',
  progressLabel: 'Progreso del envío',

  validationTitle: 'El archivo no pasó la comprobación local:',
  errTooLarge: 'El archivo pesa {size} y el límite del servidor es {max}.',
  errMimeNotAllowed: 'El tipo {mime} no está en la lista aceptada por el servidor ({allowed}).',
  errMagicMismatch:
    'El contenido del archivo no corresponde al tipo declarado ({mime}) — el servidor lo ' +
    'rechazaría por magic bytes.',
  errBadExtension: 'El nombre del archivo no tiene extensión válida.',
  errReadFailed: 'No se pudo leer el archivo para comprobar su contenido.',

  errorTitle: 'El envío falló',
  errUnauthorized: 'Sesión ausente o expirada. Inicia sesión de nuevo y repite el envío.',
  errForbidden:
    'La API rechazó la escritura (403). La ruta exige el permiso clubs:write y un token CSRF válido.',
  errCsrfUnavailable:
    'No se pudo obtener el token CSRF antes del envío — sin él la API rechaza toda escritura. ' +
    'Recarga la página (la sesión puede haber expirado).',
  errTooLargeServer:
    'El servidor rechazó por tamaño (413): el cuerpo excede el límite configurado.',
  errServer:
    'El servidor rechazó el archivo (HTTP {status}). La validación de tipo/tamaño de la API lanza ' +
    'un error genérico en producción — por eso existe la comprobación local de arriba. Revisa ' +
    'tipo, tamaño y contenido del archivo.',
  errServerOpaque: 'Respuesta del servidor: {message}',
  errNetwork: 'No se pudo hablar con la API (red o CORS). No se grabó nada.',
  errUnknown: 'Error no clasificado.',
  retry: 'Reintentar',

  successTitle: 'Enviado',
  successKey: 'Clave en el bucket',
  successUrl: 'URL',
  successType: 'Tipo',
  successSize: 'Tamaño',
  copy: 'Copiar URL',
  copied: 'Copiado.',
  copyFailed: 'No se pudo copiar (portapapeles no disponible en este contexto).',

  sessionTitle: 'Enviados en esta sesión',
  sessionNote:
    'Lista armada en esta página con las respuestas reales de la API. Se pierde al recargar.',
  sessionEmpty: 'Ningún envío en esta sesión.',
  noListingNote:
    'Brecha declarada: la API NO expone ruta de listado de los assets ya grabados (solo escritura, ' +
    'POST /api/v1/upload). Por eso no hay historial de envíos anteriores — solo lo enviado en esta ' +
    'sesión, a partir de la respuesta de la propia API.',
  colName: 'Archivo',
  colKey: 'Clave',
  colSize: 'Tamaño',
  colWhen: 'Cuándo',
  colUrl: 'URL',
};

export const uploadStrings: Record<Locale, UploadStrings> = {
  'pt-br': PT,
  'en-us': EN,
  'es-es': ES,
};
