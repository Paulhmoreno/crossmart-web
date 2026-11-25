import {
  OdooConnectionStatus,
  OdooStockField,
  OdooSyncRunStatus,
  ProductDocumentKind,
} from '@/api/schema';

export const ODOO_COPY = {
  pageTitle: 'Odoo 18 (Fuente ERP)',
  sourceBadge: 'Origen: Odoo',
  managedFieldNote: 'Este dato se administra desde Odoo',
  editorBannerTitle: 'Producto sincronizado desde Odoo',
  editorBannerDescription:
    'SKU, código de barras (EAN), precio base, stock, variantes y fotografías originales se administran desde Odoo. Puedes editar libremente el título comercial, la descripción, etiquetas, categoría comercial, estado y precios específicos por canal.',
  cannotDeleteManaged:
    'Los productos sincronizados desde Odoo no pueden eliminarse manualmente para preservar su vínculo con el ERP.',
  connectionTitle: 'Conexión con Odoo 18 (solo lectura)',
  connectionDescription:
    'Configura la conexión directa a tu ERP. Crossmart solo realiza consultas de lectura y nunca modifica registros en Odoo.',
  urlLabel: 'URL de Odoo',
  urlPlaceholder: 'https://erp.tuempresa.com',
  databaseLabel: 'Base de datos',
  databasePlaceholder: 'nombre_base_datos',
  usernameLabel: 'Usuario',
  usernamePlaceholder: 'usuario@tuempresa.com',
  apiKeyLabel: 'Clave API',
  apiKeyPlaceholder: 'Ingresa la clave API de Odoo',
  apiKeyStoredPlaceholder: 'Clave API guardada y cifrada (déjalo vacío para conservarla)',
  testButton: 'Probar conexión',
  testingButton: 'Probando...',
  connectButton: 'Conectar',
  updateButton: 'Actualizar credenciales',
  savingButton: 'Guardando...',
  disconnectButton: 'Desconectar',
  disconnectTitle: '¿Desconectar Odoo?',
  disconnectDescription:
    'Se eliminarán las credenciales almacenadas en Crossmart. Los productos ya importados no se eliminarán y conservarán su contenido comercial.',
  disconnectConfirm: 'Desconectar',
  advancedToggle: 'Opciones avanzadas (opcional)',
  warehouseLabel: 'Almacén',
  warehouseDefault: 'Automático (predeterminado de Odoo)',
  pricelistLabel: 'Tarifa (lista de precios)',
  pricelistDefault: 'Automático (precio base de Odoo)',
  stockFieldLabel: 'Definición de stock',
  brandFieldLabel: 'Campo de marca en Odoo',
  customFieldsLabel: 'Campos personalizados adicionales (separados por coma)',
  syncIntervalLabel: 'Frecuencia de sincronización automática (minutos, opcional)',
  saleOnlyLabel: 'Sincronizar únicamente productos habilitados para venta',
  syncTitle: 'Sincronización de catálogo',
  syncDescription:
    'Selecciona productos específicos para validar o sincroniza el catálogo completo cuando lo autorices.',
  searchPlaceholder: 'Buscar en Odoo por nombre, SKU o código de barras...',
  searchButton: 'Buscar en Odoo',
  syncSelectedButton: 'Sincronizar seleccionados',
  syncFullButton: 'Sincronizar catálogo completo',
  syncFullConfirmTitle: '¿Sincronizar todo el catálogo de Odoo?',
  syncFullConfirmDescription:
    'Se importarán y actualizarán todos los productos activos según los filtros configurados. Los cambios comerciales realizados en Crossmart se conservarán.',
  syncFullConfirmAction: 'Iniciar sincronización completa',
  documentsTitle: 'Documentos y origen de Odoo',
  documentsEmpty: 'Este producto no tiene fichas técnicas ni manuales adjuntos en Odoo.',
  documentsPrivateBadge: 'Privado · Solo consulta',
  downloadButton: 'Descargar',
} as const;

export const ODOO_CONNECTION_STATUS_LABELS: Record<OdooConnectionStatus, string> = {
  [OdooConnectionStatus.CONNECTED]: 'Conectado',
  [OdooConnectionStatus.ERROR]: 'Con error',
  [OdooConnectionStatus.DISCONNECTED]: 'Desconectado',
};

export const ODOO_SYNC_RUN_STATUS_LABELS: Record<OdooSyncRunStatus, string> = {
  [OdooSyncRunStatus.QUEUED]: 'En cola',
  [OdooSyncRunStatus.RUNNING]: 'Sincronizando',
  [OdooSyncRunStatus.COMPLETED]: 'Completado',
  [OdooSyncRunStatus.FAILED]: 'Error',
};

export const ODOO_STOCK_FIELD_LABELS: Record<OdooStockField, string> = {
  [OdooStockField.free_qty]: 'Stock disponible (free_qty)',
  [OdooStockField.qty_available]: 'Existencias físicas (qty_available)',
};

export const PRODUCT_DOCUMENT_KIND_LABELS: Record<ProductDocumentKind, string> = {
  [ProductDocumentKind.DATASHEET]: 'Ficha técnica',
  [ProductDocumentKind.MANUAL]: 'Manual',
  [ProductDocumentKind.INTERNAL]: 'Documento interno',
  [ProductDocumentKind.OTHER]: 'Otro recurso',
};
