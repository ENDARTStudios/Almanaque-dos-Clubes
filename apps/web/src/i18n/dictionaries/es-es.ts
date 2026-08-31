import type { Dictionary } from '../types';

const es: Dictionary = {
  site: {
    name: 'Almanaque dos Clubes',
    tagline: 'La historia del fútbol mundial en un solo lugar',
    description:
      'La mayor colección de datos históricos del fútbol mundial. Busca clubes, jugadores, competiciones y rankings con inteligencia artificial y fuentes verificadas.',
  },
  nav: {
    clubs: 'Clubes',
    players: 'Jugadores',
    rankings: 'Rankings',
    search: 'Buscar',
    login: 'Entrar',
    dashboard: 'Panel',
    signOut: 'Salir',
  },
  footer: {
    tagline:
      'La historia completa del fútbol mundial a tu alcance. Clubes, jugadores, competiciones y rankings auditables.',
    platformTitle: 'Plataforma',
    platformClubs: 'Clubes',
    platformPlayers: 'Jugadores',
    platformRankings: 'Rankings',
    platformSearch: 'Búsqueda Avanzada',
    aboutTitle: 'Acerca de',
    aboutUs: 'Sobre nosotros',
    plans: 'Planes',
    api: 'API',
    blog: 'Blog',
    contact: 'Contacto',
    telegram: 'Telegram',
    legalTitle: 'Legal',
    privacy: 'Privacidad',
    terms: 'Términos de Uso',
    security: 'Seguridad',
    copyright: 'Copyright © 2026 END ART Studios',
  },
  common: {
    loading: 'Cargando...',
    backHome: 'Volver al inicio',
    viewAll: 'Ver todo',
    learnMore: 'Más información',
    comingSoonTitle: 'Módulo en desarrollo',
    comingSoonDesc: 'Próximamente: contenido completo de este módulo.',
    resultsFor: 'Resultados para:',
    resultsNote: 'La búsqueda full-text se implementará con PostgreSQL tsvector + pg_trgm para ofrecer resultados rápidos incluso con grandes volúmenes de datos.',
    notFoundTitle: 'Página no encontrada',
    notFoundDesc: 'El contenido que buscas no existe o ha sido movido.',
  },
  home: {
    heroTitle: 'La Historia del Fútbol',
    heroTitleAccent: 'en un Solo Lugar',
    heroSubtitle:
      'La mayor colección de datos históricos del fútbol mundial. Busca clubes, jugadores, competiciones y rankings con inteligencia artificial y fuentes verificadas.',
    ctaSearch: 'Comenzar Búsqueda',
    ctaRegister: 'Crear Cuenta Gratuita',
    stats: {
      clubs: 'Clubes registrados',
      players: 'Jugadores registrados',
      competitions: 'Competiciones históricas',
      matches: 'Partidos catalogados',
    },
    featuresTitle: 'Todo sobre el Fútbol Mundial',
    featuresSubtitle: 'Datos históricos completos con herramientas modernas de búsqueda y análisis.',
    features: [
      { title: 'Historia Completa', desc: 'Accede a la colección completa de clubes, jugadores y competiciones desde el siglo XIX.' },
      { title: 'Rankings Auditables', desc: 'Rankings históricos con fuentes verificadas y fecha de publicación.' },
      { title: 'Búsqueda Inteligente', desc: 'Búsqueda de texto avanzada con índices full-text y búsqueda difusa.' },
      { title: 'IA con Citas', desc: 'Pregunta sobre fútbol y recibe respuestas con fuentes verificables.' },
      { title: 'Datos Estructurados', desc: 'API REST con datos normalizados y paginación cursor-based.' },
      { title: 'Multilingüe', desc: 'Soporte para clubes y competiciones de todos los países y federaciones.' },
    ],
  },
  auth: {
    loginTitle: 'Entrar',
    loginSubtitle: 'Accede a tu cuenta de Almanaque dos Clubes',
    email: 'Correo',
    password: 'Contraseña',
    name: 'Nombre',
    loginSubmit: 'Entrar',
    loginErrorDefault: 'Error al iniciar sesión',
    noAccount: '¿No tienes cuenta?',
    loginLink: 'Crea una gratis',
    registerTitle: 'Crear Cuenta',
    registerSubtitle: 'Regístrate gratis en Almanaque dos Clubes',
    registerSubmit: 'Registrarse',
    haveAccount: '¿Ya tienes cuenta?',
    registerLink: 'Inicia sesión',
    acceptTerms: 'He leído y acepto los Términos de Uso y Servicio',
    acceptPrivacy: 'He leído y acepto la Política de Privacidad (LGPD)',
    acceptRequired: 'Debes aceptar los Términos de Uso y la Política de Privacidad para registrarte.',
    registerErrorDefault: 'Error al crear la cuenta',
  },
  pages: {
    clubs: { title: 'Clubes', subtitle: 'Explora {n} clubes de fútbol registrados.', placeholder: 'Buscar clubes por nombre, país o ciudad...' },
    players: { title: 'Jugadores', subtitle: 'Busca jugadores de fútbol de todas las épocas y lugares.', placeholder: 'Buscar jugadores por nombre, país o posición...' },
    rankings: { title: 'Rankings', subtitle: 'Rankings históricos con fuentes verificadas y fecha de publicación.' },
    search: { title: 'Búsqueda Avanzada', subtitle: 'Busca clubes, jugadores, competiciones y estadísticas con filtros avanzados.', placeholder: 'Escribe un término para buscar...' },
  },
  langSelector: { label: 'Idioma', current: 'Idioma actual' },
  legal: {
    updatedLabel: 'Última actualización',
    terms: {
      title: 'Términos de Uso y Servicio',
      intro:
        'Estos Términos de Uso y Servicio ("Términos") rigen el acceso y el uso de la plataforma Almanaque dos Clubes, operada por END ART Studios (CNPJ 45.370.930/0001-75). Al crear una cuenta o utilizar la plataforma, el usuario declara haber leído, comprendido y aceptado íntegramente estos Términos.',
      sections: [
        { title: '1. Aceptación', body: [
          'Al registrarse o utilizar la plataforma, el usuario acepta estos Términos y la Política de Privacidad. Si no está de acuerdo, no utilice la plataforma.',
          'La aceptación se exige en el momento del registro como consentimiento expreso y no puede dispensarse.',
        ]},
        { title: '2. Registro y cuenta', body: [
          'El registro requiere información verdadera y actualizada (nombre y correo válido) y la creación de una contraseña segura.',
          'El usuario es responsable de mantener la confidencialidad de las credenciales de acceso y de todas las actividades realizadas en su cuenta.',
          'El usuario debe tener capacidad legal para contratar; los menores de edad requieren autorización de sus responsables.',
        ]},
        { title: '3. Uso permitido', body: [
          'La plataforma está destinada a la consulta, investigación y análisis de datos históricos del fútbol mundial.',
          'Está prohibido usar la plataforma para fines ilícitos, vulnerar derechos de terceros, intentar acceder a datos de otros usuarios o comprometer la seguridad de la plataforma.',
        ]},
        { title: '4. Planes y pagos (CDC)', body: [
          'La plataforma ofrece planes gratuitos y de pago (Free, Pro y Elite), tal como se describe en el sitio.',
          'El cobro puede procesarse mediante un proveedor de pagos externo. Las relaciones de consumo se rigen por el Código de Defensa del Consumidor (Ley n.º 8.078/1990), incluido el derecho de arrepentimiento cuando corresponda.',
        ]},
        { title: '5. Propiedad intelectual', body: [
          'Todo el contenido, la marca, el software y el código fuente de la plataforma son propiedad de END ART Studios y están protegidos por derechos de autor y la legislación aplicable.',
          'El usuario no puede copiar, modificar, distribuir, sublicenciar ni utilizar el software sin autorización previa por escrito, según el archivo LICENSE.',
        ]},
        { title: '6. Contenido y datos', body: [
          'Los datos históricos se muestran con base en fuentes verificadas. END ART Studios no garantiza la actualización continua de todos los datos, pero realiza esfuerzos de verificación.',
          'El usuario puede reportar imprecisiones para su revisión.',
        ]},
        { title: '7. Limitación de responsabilidad', body: [
          'La plataforma se proporciona "tal cual". END ART Studios no se hace responsable de daños indirectos derivados del uso, en la medida permitida por la ley.',
        ]},
        { title: '8. Suspensión y rescisión', body: [
          'El incumplimiento de estos Términos puede conllevar la suspensión o cancelación de la cuenta, sin perjuicio de otras medidas legales.',
        ]},
        { title: '9. Cambios', body: [
          'Estos Términos pueden actualizarse. Los cambios relevantes se comunicarán, y el uso continuado de la plataforma tras una actualización implica la aceptación de la nueva versión.',
        ]},
        { title: '10. Contacto y jurisdicción', body: [
          'Consultas sobre estos Términos: endart.studios@gmail.com. Juzgado competente: comarca de Osasco, São Paulo, salvo disposición legal en contrario.',
        ]},
      ],
    },
    privacy: {
      title: 'Política de Privacidad',
      intro:
        'Esta Política de Privacidad describe cómo END ART Studios (CNPJ 45.370.930/0001-75) recopila, utiliza, almacena y protege los datos personales de los usuarios de la plataforma Almanaque dos Clubes, de conformidad con la Ley General de Protección de Datos (Ley n.º 13.709/2018 — LGPD) y demás normas aplicables.',
      sections: [
        { title: '1. Datos recopilados', body: [
          'Datos de registro: nombre, correo y contraseña (almacenada de forma segura con hash).',
          'Datos de uso: información de navegación, dispositivos y registros de acceso, para seguridad y mejora del servicio.',
          'Datos de cobro: procesados por proveedores de pago externos; END ART Studios no almacena datos completos de tarjeta.',
        ]},
        { title: '2. Finalidades del tratamiento', body: [
          'Crear y gestionar la cuenta, autenticar al usuario y proteger el acceso.',
          'Prestar los servicios contratados, incluidos los planes de pago y las funciones de IA.',
          'Garantizar la seguridad de la plataforma y prevenir fraudes y actividades abusivas.',
          'Comunicar actualizaciones, cambios de términos e información relevante.',
        ]},
        { title: '3. Base legal', body: [
          'El tratamiento se basa en el consentimiento (art. 7.º, I, de la LGPD), la ejecución del contrato, el interés legítimo y el cumplimiento de obligaciones legales, según corresponda.',
        ]},
        { title: '4. Compartición', body: [
          'No vendemos datos personales. Los datos pueden compartirse con proveedores de infraestructura y pagos, estrictamente necesarios para la operación, y con las autoridades cuando la ley lo exija.',
        ]},
        { title: '5. Derechos del titular (LGPD)', body: [
          'El usuario puede solicitar confirmación, acceso, corrección, anonimización, portabilidad, eliminación y revocación del consentimiento.',
          'Para ejercer sus derechos, contacta con el canal de privacidad indicado abajo.',
        ]},
        { title: '6. Cookies', body: [
          'Utilizamos cookies y tecnologías similares para el funcionamiento, la autenticación y las preferencias (como el idioma). El usuario puede gestionar las cookies en su navegador.',
        ]},
        { title: '7. Seguridad', body: [
          'Adoptamos medidas técnicas y organizativas (cifrado de contraseña, control de acceso, monitorización) para proteger los datos. Ningún sistema es infalible; almacenamos las contraseñas con hash y nunca en texto claro.',
        ]},
        { title: '8. Conservación', body: [
          'Los datos se conservan durante el tiempo necesario para las finalidades y obligaciones legales, o hasta la eliminación a petición del titular o el cierre de la cuenta.',
        ]},
        { title: '9. Menores', body: [
          'La plataforma no está destinada a menores sin el consentimiento de sus responsables. No recopilamos intencionalmente datos de menores.',
        ]},
        { title: '10. Delegado de Protección de Datos (DPO) y contacto', body: [
          'Solicitudes de privacidad y ejercicio de derechos: endart.studios@gmail.com.',
          'END ART Studios es el responsable del tratamiento de los datos de la plataforma.',
        ]},
      ],
    },
  },
};

export default es;
