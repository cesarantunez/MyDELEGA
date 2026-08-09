// ══════════════════════════════════════════════════════════════
// Seed packs por tipo de negocio (versionados en código).
// Cada pack pre-configura: áreas + plantillas de tareas.
// Fases futuras añaden: checklists de conocimiento, plantilla de
// evaluación con pesos y prompt de dominio del agente IA.
// ══════════════════════════════════════════════════════════════

export interface PackTemplate {
  area: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  checklist: string[]
}

export interface VerticalPack {
  id: string
  label: string
  icon: string
  areas: string[]
  templates: PackTemplate[]
}

const SUPERMERCADO: VerticalPack = {
  id: 'supermercado',
  label: 'Supermercado',
  icon: '🛒',
  areas: [
    'Cajas', 'Almacen', 'Piso de Ventas', 'Perecederos', 'Carniceria',
    'Panaderia', 'Cafe', 'Contabilidad', 'Recibo de Mercancia',
    'Limpieza', 'Seguridad', 'General',
  ],
  templates: [
    // Cajas
    { area: 'Cajas', title: 'Arqueo de caja', description: 'Contar efectivo, verificar corte de caja y cuadrar con sistema POS', priority: 'high', checklist: ['Contar billetes por denominacion', 'Contar monedas', 'Verificar vouchers de tarjeta', 'Comparar con reporte POS', 'Registrar diferencias'] },
    { area: 'Cajas', title: 'Limpieza de banda transportadora', description: 'Limpiar y desinfectar banda transportadora de cada caja', priority: 'medium', checklist: ['Apagar banda', 'Limpiar con desengrasante', 'Desinfectar superficie', 'Secar completamente', 'Encender y verificar funcionamiento'] },
    { area: 'Cajas', title: 'Cambio de rollo de ticket', description: 'Reemplazar rollos de papel en impresoras de ticket', priority: 'low', checklist: ['Verificar nivel de papel en cada caja', 'Reemplazar rollos bajos', 'Hacer impresion de prueba'] },
    { area: 'Cajas', title: 'Verificar terminales de pago', description: 'Comprobar que todas las terminales bancarias funcionen correctamente', priority: 'high', checklist: ['Encender cada terminal', 'Verificar conexion a red', 'Hacer transaccion de prueba', 'Verificar impresion de voucher'] },
    // Almacen
    { area: 'Almacen', title: 'Verificar FIFO', description: 'Asegurar que el producto mas antiguo este al frente (First In, First Out)', priority: 'medium', checklist: ['Revisar fechas en primera fila', 'Rotar producto si es necesario', 'Retirar producto vencido', 'Documentar merma'] },
    { area: 'Almacen', title: 'Inventario parcial', description: 'Conteo fisico de una seccion del almacen para cuadrar existencias', priority: 'medium', checklist: ['Seleccionar seccion a contar', 'Realizar conteo fisico', 'Comparar con sistema', 'Registrar diferencias', 'Investigar faltantes'] },
    { area: 'Almacen', title: 'Limpieza de almacen', description: 'Limpieza general del area de almacenamiento', priority: 'low', checklist: ['Barrer pisos', 'Limpiar estanterias', 'Verificar trampas de plagas', 'Revisar iluminacion'] },
    // Piso de Ventas
    { area: 'Piso de Ventas', title: 'Reposicion de anaqueles', description: 'Llenar anaqueles vacios con producto del almacen', priority: 'high', checklist: ['Identificar anaqueles vacios', 'Traer producto del almacen', 'Acomodar respetando FIFO', 'Verificar etiquetas de precio', 'Reportar faltantes'] },
    { area: 'Piso de Ventas', title: 'Verificar precios', description: 'Confirmar que los precios en anaquel coincidan con el sistema', priority: 'medium', checklist: ['Escanear productos al azar', 'Comparar precio fisico vs sistema', 'Corregir etiquetas erroneas', 'Reportar discrepancias'] },
    { area: 'Piso de Ventas', title: 'Rotacion de producto', description: 'Mover producto proximo a vencer al frente y aplicar descuentos si aplica', priority: 'high', checklist: ['Revisar fechas de caducidad', 'Mover producto proximo a vencer al frente', 'Etiquetar con descuento si aplica', 'Retirar producto vencido'] },
    // Perecederos
    { area: 'Perecederos', title: 'Control de temperatura', description: 'Registrar temperaturas de refrigeradores y congeladores', priority: 'urgent', checklist: ['Medir temperatura de cada refrigerador', 'Medir temperatura de congeladores', 'Registrar en bitacora', 'Reportar equipos fuera de rango', 'Verificar sellos de puertas'] },
    { area: 'Perecederos', title: 'Verificar fechas de caducidad', description: 'Revisar fechas de caducidad en toda la seccion de perecederos', priority: 'high', checklist: ['Revisar lacteos', 'Revisar carnes frias', 'Revisar frutas y verduras', 'Retirar producto vencido', 'Registrar merma'] },
    { area: 'Perecederos', title: 'Limpieza de vitrinas', description: 'Limpiar y desinfectar vitrinas refrigeradas de exhibicion', priority: 'medium', checklist: ['Retirar producto temporalmente', 'Limpiar cristales', 'Desinfectar superficies internas', 'Reacomodar producto', 'Verificar temperatura post-limpieza'] },
    { area: 'Perecederos', title: 'Merma de perecederos', description: 'Documentar y procesar producto que no se puede vender', priority: 'medium', checklist: ['Recolectar producto no apto', 'Pesar y registrar cada articulo', 'Clasificar causa de merma', 'Disponer segun protocolo'] },
    // Carniceria
    { area: 'Carniceria', title: 'Control de cuarto frio', description: 'Verificar temperatura y estado del cuarto frio y refrigeradores de carnes', priority: 'urgent', checklist: ['Medir temperatura del cuarto frio', 'Verificar sellado de puertas', 'Revisar rotacion de producto', 'Registrar en bitacora', 'Reportar anomalias'] },
    { area: 'Carniceria', title: 'Desinfeccion de equipo', description: 'Limpiar y desinfectar sierras, molinos, cuchillos y tablas al cierre', priority: 'high', checklist: ['Desarmar equipo', 'Lavar con jabon industrial', 'Desinfectar con solucion aprobada', 'Secar y armar', 'Verificar filos y estado'] },
    { area: 'Carniceria', title: 'Exhibicion de carnes', description: 'Preparar vitrina de carnes con producto fresco y etiquetado correcto', priority: 'high', checklist: ['Retirar producto del dia anterior', 'Limpiar charolas y vitrina', 'Acomodar cortes frescos', 'Etiquetar con fecha y precio', 'Verificar temperatura de vitrina'] },
    // Panaderia
    { area: 'Panaderia', title: 'Produccion del dia', description: 'Preparar y hornear la produccion programada del dia', priority: 'high', checklist: ['Revisar orden de produccion', 'Verificar insumos disponibles', 'Preparar masas y mezclas', 'Hornear segun programa', 'Dejar enfriar y empacar', 'Etiquetar con fecha'] },
    { area: 'Panaderia', title: 'Limpieza de horno', description: 'Limpieza profunda de hornos al final del turno', priority: 'medium', checklist: ['Apagar y dejar enfriar horno', 'Retirar residuos solidos', 'Aplicar limpiador industrial', 'Enjuagar y secar', 'Verificar funcionamiento'] },
    { area: 'Panaderia', title: 'Inventario de insumos', description: 'Contar insumos de panaderia y solicitar reabastecimiento', priority: 'medium', checklist: ['Contar harina', 'Contar azucar y mantequilla', 'Contar levadura y mejorantes', 'Verificar empaques disponibles', 'Generar pedido de faltantes'] },
    { area: 'Panaderia', title: 'Exhibicion de producto', description: 'Acomodar pan fresco en area de autoservicio', priority: 'medium', checklist: ['Retirar producto del dia anterior', 'Limpiar charolas de exhibicion', 'Colocar producto fresco', 'Verificar pinzas y bolsas disponibles', 'Actualizar precios si es necesario'] },
    // Cafe
    { area: 'Cafe', title: 'Apertura de estacion de cafe', description: 'Preparar la estacion de cafe para el dia', priority: 'high', checklist: ['Encender maquinas y verificar presion', 'Purgar y limpiar grupos', 'Verificar molino y calibracion', 'Surtir vasos, tapas y azucar', 'Preparar primera tanda de prueba'] },
    { area: 'Cafe', title: 'Inventario de cafe e insumos', description: 'Controlar existencias de cafe, leche y desechables', priority: 'medium', checklist: ['Contar cafe en grano', 'Verificar fechas de leche y cremas', 'Contar vasos y tapas', 'Registrar consumo del dia', 'Solicitar faltantes'] },
    // Recibo de Mercancia
    { area: 'Recibo de Mercancia', title: 'Recepcion de mercancia', description: 'Recibir, verificar y registrar mercancia entrante del proveedor', priority: 'high', checklist: ['Verificar orden de compra', 'Contar bultos recibidos', 'Revisar estado del empaque', 'Verificar fechas de caducidad', 'Firmar recibo de conformidad', 'Acomodar en ubicacion asignada'] },
    { area: 'Recibo de Mercancia', title: 'Control de fechas en recibo', description: 'Registrar fechas de vencimiento de lo recibido para seguimiento', priority: 'high', checklist: ['Revisar fecha de cada lote', 'Registrar productos con vencimiento corto', 'Marcar para rotacion prioritaria', 'Notificar al area responsable'] },
    // Contabilidad
    { area: 'Contabilidad', title: 'Archivo de facturas del dia', description: 'Organizar y archivar facturas, recibos y cortes del dia', priority: 'medium', checklist: ['Reunir facturas de proveedores', 'Verificar contra ordenes de compra', 'Registrar en sistema', 'Archivar en carpeta del mes'] },
    // Limpieza
    { area: 'Limpieza', title: 'Limpieza de pasillos y accesos', description: 'Mantener pasillos, entrada y banos limpios y sin obstrucciones', priority: 'medium', checklist: ['Barrer y trapear pasillos', 'Limpiar banos y surtir insumos', 'Limpiar vidrios de entrada', 'Retirar cajas y basura', 'Colocar senalizacion de piso mojado'] },
    // Seguridad
    { area: 'Seguridad', title: 'Ronda de seguridad', description: 'Ronda verificando camaras, extintores y salidas de emergencia', priority: 'high', checklist: ['Verificar camaras de seguridad', 'Revisar extintores', 'Verificar salidas de emergencia', 'Revisar area de cajas fuertes', 'Reportar anomalias'] },
    // General
    { area: 'General', title: 'Apertura de tienda', description: 'Protocolo completo de apertura de la tienda', priority: 'urgent', checklist: ['Desactivar alarma', 'Encender luces y clima', 'Verificar cajas registradoras', 'Revisar limpieza general', 'Verificar entrada de proveedores pendientes', 'Abrir puertas al publico'] },
    { area: 'General', title: 'Cierre de tienda', description: 'Protocolo completo de cierre de la tienda', priority: 'urgent', checklist: ['Verificar que no haya clientes', 'Cerrar cajas y hacer corte', 'Apagar equipos no esenciales', 'Revisar puertas y ventanas', 'Activar alarma', 'Cerrar con llave'] },
    { area: 'General', title: 'Reporte de incidencia', description: 'Documentar cualquier incidencia ocurrida durante el turno', priority: 'high', checklist: ['Describir la incidencia', 'Registrar hora y lugar', 'Identificar personas involucradas', 'Tomar evidencia fotografica', 'Notificar al supervisor'] },
  ],
}

const FARMACIA: VerticalPack = {
  id: 'farmacia',
  label: 'Farmacia',
  icon: '💊',
  areas: ['Mostrador', 'Recetas', 'Almacen', 'Refrigerados', 'Caja', 'Limpieza', 'General'],
  templates: [
    { area: 'Refrigerados', title: 'Control de cadena de frio', description: 'Verificar temperatura de refrigeradores de medicamentos', priority: 'urgent', checklist: ['Medir temperatura de cada refrigerador', 'Registrar en bitacora', 'Verificar termometros calibrados', 'Reportar desviaciones de inmediato'] },
    { area: 'Almacen', title: 'Revision de vencimientos', description: 'Detectar medicamentos proximos a vencer y segregarlos', priority: 'high', checklist: ['Revisar anaquel por anaquel', 'Separar producto a menos de 90 dias', 'Registrar lote y fecha', 'Aplicar politica de devolucion a proveedor'] },
    { area: 'Mostrador', title: 'Surtido de anaqueles', description: 'Reponer producto de venta libre en mostrador y gondolas', priority: 'medium', checklist: ['Identificar faltantes', 'Traer de almacen', 'Rotar por fecha (FIFO)', 'Verificar precios'] },
    { area: 'Caja', title: 'Arqueo de caja', description: 'Corte y cuadre de caja del turno', priority: 'high', checklist: ['Contar efectivo', 'Verificar vouchers', 'Comparar con sistema', 'Registrar diferencias'] },
    { area: 'General', title: 'Apertura de farmacia', description: 'Protocolo de apertura', priority: 'urgent', checklist: ['Desactivar alarma', 'Encender equipos', 'Verificar refrigeradores', 'Abrir al publico'] },
  ],
}

const FERRETERIA: VerticalPack = {
  id: 'ferreteria',
  label: 'Ferreteria',
  icon: '🔧',
  areas: ['Mostrador', 'Bodega', 'Piso de Ventas', 'Caja', 'Materiales', 'General'],
  templates: [
    { area: 'Bodega', title: 'Recepcion de material', description: 'Recibir y verificar pedidos de proveedores', priority: 'high', checklist: ['Verificar orden de compra', 'Contar y revisar material', 'Registrar en sistema', 'Acomodar por categoria'] },
    { area: 'Piso de Ventas', title: 'Orden y surtido de anaqueles', description: 'Mantener anaqueles surtidos, ordenados y con precio', priority: 'medium', checklist: ['Identificar huecos', 'Resurtir de bodega', 'Verificar etiquetas de precio', 'Ordenar por categoria'] },
    { area: 'Materiales', title: 'Inventario de material a granel', description: 'Conteo de varilla, cemento, arena y material de construccion', priority: 'medium', checklist: ['Contar existencias fisicas', 'Comparar con sistema', 'Registrar diferencias', 'Revisar condiciones de almacenaje'] },
    { area: 'Caja', title: 'Corte de caja', description: 'Arqueo y cuadre del turno', priority: 'high', checklist: ['Contar efectivo', 'Verificar facturas del dia', 'Comparar con sistema', 'Registrar diferencias'] },
  ],
}

const RESTAURANTE: VerticalPack = {
  id: 'restaurante',
  label: 'Restaurante',
  icon: '🍽️',
  areas: ['Cocina', 'Salon', 'Barra', 'Almacen', 'Caja', 'Limpieza', 'General'],
  templates: [
    { area: 'Cocina', title: 'Mise en place', description: 'Preparacion previa al servicio: cortes, salsas, porciones', priority: 'high', checklist: ['Revisar menu del dia', 'Preparar cortes y porciones', 'Verificar frescura de insumos', 'Etiquetar con fecha', 'Surtir estaciones'] },
    { area: 'Cocina', title: 'Control de temperaturas', description: 'Registrar temperatura de refrigeradores y congeladores', priority: 'urgent', checklist: ['Medir cada equipo', 'Registrar en bitacora', 'Reportar fuera de rango'] },
    { area: 'Salon', title: 'Montaje de salon', description: 'Preparar mesas, cubiertos y ambiente antes de abrir', priority: 'high', checklist: ['Limpiar y montar mesas', 'Verificar cubiertos y servilletas', 'Revisar limpieza de pisos', 'Encender musica y clima'] },
    { area: 'Limpieza', title: 'Limpieza profunda de cocina', description: 'Limpieza de campanas, planchas y pisos al cierre', priority: 'high', checklist: ['Limpiar plancha y estufas', 'Desengrasar campana', 'Lavar pisos con jabon', 'Sacar basura', 'Verificar trampas de grasa'] },
    { area: 'Almacen', title: 'Revision de caducidades', description: 'Verificar fechas en camara fria y almacen seco', priority: 'high', checklist: ['Revisar camara fria', 'Revisar almacen seco', 'Retirar vencidos', 'Registrar merma', 'Aplicar FIFO'] },
  ],
}

const CLINICA_DENTAL: VerticalPack = {
  id: 'clinica-dental',
  label: 'Clinica dental',
  icon: '🦷',
  areas: ['Recepcion', 'Consultorios', 'Esterilizacion', 'Almacen', 'Limpieza', 'General'],
  templates: [
    { area: 'Esterilizacion', title: 'Ciclo de esterilizacion', description: 'Esterilizar instrumental segun protocolo', priority: 'urgent', checklist: ['Lavar y secar instrumental', 'Empaquetar y sellar', 'Correr ciclo de autoclave', 'Verificar indicadores', 'Registrar ciclo en bitacora'] },
    { area: 'Consultorios', title: 'Preparacion de unidad dental', description: 'Preparar y desinfectar unidad entre pacientes', priority: 'high', checklist: ['Desinfectar superficies', 'Cambiar barreras protectoras', 'Verificar instrumental esteril', 'Purgar lineas de agua', 'Preparar materiales del procedimiento'] },
    { area: 'Almacen', title: 'Inventario de insumos', description: 'Controlar existencias y vencimientos de materiales dentales', priority: 'medium', checklist: ['Contar insumos criticos', 'Revisar fechas de vencimiento', 'Registrar consumo', 'Generar pedido de faltantes'] },
    { area: 'Recepcion', title: 'Confirmacion de citas', description: 'Confirmar citas del dia siguiente', priority: 'medium', checklist: ['Revisar agenda de manana', 'Llamar o escribir a cada paciente', 'Reagendar cancelaciones', 'Actualizar sistema'] },
  ],
}

const GASOLINERA: VerticalPack = {
  id: 'gasolinera',
  label: 'Gasolinera',
  icon: '⛽',
  areas: ['Islas', 'Tienda', 'Almacen', 'Caja', 'Seguridad', 'General'],
  templates: [
    { area: 'Islas', title: 'Verificacion de bombas', description: 'Revisar funcionamiento y calibracion visual de dispensarios', priority: 'urgent', checklist: ['Verificar cada dispensario', 'Revisar mangueras y pistolas', 'Limpiar area de islas', 'Reportar fallas'] },
    { area: 'Seguridad', title: 'Revision de extintores y derrames', description: 'Protocolo de seguridad contra incendios y derrames', priority: 'urgent', checklist: ['Verificar extintores cargados', 'Revisar material absorbente disponible', 'Verificar senalizacion', 'Revisar paro de emergencia'] },
    { area: 'Caja', title: 'Corte de turno', description: 'Cuadre de efectivo y litros vendidos por turno', priority: 'high', checklist: ['Registrar lectura de bombas', 'Contar efectivo', 'Verificar vouchers', 'Cuadrar contra sistema', 'Entregar turno firmado'] },
    { area: 'Tienda', title: 'Surtido de tienda de conveniencia', description: 'Reponer producto y verificar fechas', priority: 'medium', checklist: ['Identificar faltantes', 'Resurtir refrigeradores', 'Verificar caducidades', 'Limpiar anaqueles'] },
  ],
}

const GENERICO: VerticalPack = {
  id: 'generico',
  label: 'Otro negocio',
  icon: '🏢',
  areas: ['Operaciones', 'Atencion al Cliente', 'Administracion', 'Limpieza', 'General'],
  templates: [
    { area: 'Operaciones', title: 'Apertura del dia', description: 'Protocolo de inicio de operaciones', priority: 'high', checklist: ['Abrir instalaciones', 'Encender equipos', 'Revisar pendientes del dia anterior', 'Asignar prioridades del dia'] },
    { area: 'Operaciones', title: 'Cierre del dia', description: 'Protocolo de cierre de operaciones', priority: 'high', checklist: ['Completar pendientes criticos', 'Apagar equipos', 'Asegurar instalaciones', 'Dejar notas para manana'] },
    { area: 'Administracion', title: 'Registro de ingresos y gastos', description: 'Capturar movimientos del dia', priority: 'medium', checklist: ['Reunir comprobantes', 'Registrar en sistema', 'Archivar documentos'] },
    { area: 'Limpieza', title: 'Limpieza general', description: 'Mantener las instalaciones limpias y presentables', priority: 'medium', checklist: ['Barrer y trapear', 'Limpiar banos', 'Sacar basura', 'Revisar insumos de limpieza'] },
  ],
}

export const VERTICAL_PACKS: VerticalPack[] = [
  SUPERMERCADO,
  FARMACIA,
  FERRETERIA,
  RESTAURANTE,
  CLINICA_DENTAL,
  GASOLINERA,
  GENERICO,
]

export function getPack(id: string): VerticalPack {
  return VERTICAL_PACKS.find((p) => p.id === id) ?? GENERICO
}
