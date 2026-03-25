import type { Database } from 'sql.js'

interface TemplateRow {
  area: string
  title: string
  description: string
  default_priority: string
  default_checklist: string
}

const TEMPLATES: TemplateRow[] = [
  // === CAJAS (4) ===
  {
    area: 'Cajas',
    title: 'Arqueo de caja',
    description: 'Contar efectivo, verificar corte de caja y cuadrar con sistema POS',
    default_priority: 'high',
    default_checklist: JSON.stringify([
      'Contar billetes por denominacion',
      'Contar monedas',
      'Verificar vouchers de tarjeta',
      'Comparar con reporte POS',
      'Registrar diferencias'
    ])
  },
  {
    area: 'Cajas',
    title: 'Limpieza de banda transportadora',
    description: 'Limpiar y desinfectar banda transportadora de cada caja',
    default_priority: 'medium',
    default_checklist: JSON.stringify([
      'Apagar banda',
      'Limpiar con desengrasante',
      'Desinfectar superficie',
      'Secar completamente',
      'Encender y verificar funcionamiento'
    ])
  },
  {
    area: 'Cajas',
    title: 'Cambio de rollo de ticket',
    description: 'Reemplazar rollos de papel en impresoras de ticket',
    default_priority: 'low',
    default_checklist: JSON.stringify([
      'Verificar nivel de papel en cada caja',
      'Reemplazar rollos bajos',
      'Hacer impresion de prueba'
    ])
  },
  {
    area: 'Cajas',
    title: 'Verificar terminales de pago',
    description: 'Comprobar que todas las terminales bancarias funcionen correctamente',
    default_priority: 'high',
    default_checklist: JSON.stringify([
      'Encender cada terminal',
      'Verificar conexion a red',
      'Hacer transaccion de prueba',
      'Verificar impresion de voucher'
    ])
  },

  // === ALMACEN (4) ===
  {
    area: 'Almacen',
    title: 'Recepcion de mercancia',
    description: 'Recibir, verificar y registrar mercancia entrante del proveedor',
    default_priority: 'high',
    default_checklist: JSON.stringify([
      'Verificar orden de compra',
      'Contar bultos recibidos',
      'Revisar estado del empaque',
      'Verificar fechas de caducidad',
      'Firmar recibo de conformidad',
      'Acomodar en ubicacion asignada'
    ])
  },
  {
    area: 'Almacen',
    title: 'Verificar FIFO',
    description: 'Asegurar que el producto mas antiguo este al frente (First In, First Out)',
    default_priority: 'medium',
    default_checklist: JSON.stringify([
      'Revisar fechas en primera fila',
      'Rotar producto si es necesario',
      'Retirar producto vencido',
      'Documentar merma'
    ])
  },
  {
    area: 'Almacen',
    title: 'Inventario parcial',
    description: 'Conteo fisico de una seccion del almacen para cuadrar existencias',
    default_priority: 'medium',
    default_checklist: JSON.stringify([
      'Seleccionar seccion a contar',
      'Realizar conteo fisico',
      'Comparar con sistema',
      'Registrar diferencias',
      'Investigar faltantes'
    ])
  },
  {
    area: 'Almacen',
    title: 'Limpieza de almacen',
    description: 'Limpieza general del area de almacenamiento',
    default_priority: 'low',
    default_checklist: JSON.stringify([
      'Barrer pisos',
      'Limpiar estanterias',
      'Verificar trampas de plagas',
      'Revisar iluminacion'
    ])
  },

  // === PISO DE VENTAS (4) ===
  {
    area: 'Piso de Ventas',
    title: 'Reposicion de anaqueles',
    description: 'Llenar anaqueles vacios con producto del almacen',
    default_priority: 'high',
    default_checklist: JSON.stringify([
      'Identificar anaqueles vacios',
      'Traer producto del almacen',
      'Acomodar respetando FIFO',
      'Verificar etiquetas de precio',
      'Reportar faltantes'
    ])
  },
  {
    area: 'Piso de Ventas',
    title: 'Verificar precios',
    description: 'Confirmar que los precios en anaquel coincidan con el sistema',
    default_priority: 'medium',
    default_checklist: JSON.stringify([
      'Escanear productos al azar',
      'Comparar precio fisico vs sistema',
      'Corregir etiquetas erroneas',
      'Reportar discrepancias'
    ])
  },
  {
    area: 'Piso de Ventas',
    title: 'Limpieza de pasillo',
    description: 'Mantener pasillos limpios y libres de obstrucciones',
    default_priority: 'medium',
    default_checklist: JSON.stringify([
      'Barrer el pasillo',
      'Trapear manchas',
      'Retirar cajas vacias',
      'Verificar que no haya producto en el piso'
    ])
  },
  {
    area: 'Piso de Ventas',
    title: 'Rotacion de producto',
    description: 'Mover producto proximo a vencer al frente y aplicar descuentos si aplica',
    default_priority: 'high',
    default_checklist: JSON.stringify([
      'Revisar fechas de caducidad',
      'Mover producto proximo a vencer al frente',
      'Etiquetar con descuento si aplica',
      'Retirar producto vencido'
    ])
  },

  // === PERECEDEROS (4) ===
  {
    area: 'Perecederos',
    title: 'Control de temperatura',
    description: 'Registrar temperaturas de refrigeradores y congeladores',
    default_priority: 'urgent',
    default_checklist: JSON.stringify([
      'Medir temperatura de cada refrigerador',
      'Medir temperatura de congeladores',
      'Registrar en bitacora',
      'Reportar equipos fuera de rango',
      'Verificar sellos de puertas'
    ])
  },
  {
    area: 'Perecederos',
    title: 'Verificar fechas de caducidad',
    description: 'Revisar fechas de caducidad en toda la seccion de perecederos',
    default_priority: 'high',
    default_checklist: JSON.stringify([
      'Revisar lacteos',
      'Revisar carnes frias',
      'Revisar frutas y verduras',
      'Retirar producto vencido',
      'Registrar merma'
    ])
  },
  {
    area: 'Perecederos',
    title: 'Limpieza de vitrinas',
    description: 'Limpiar y desinfectar vitrinas refrigeradas de exhibicion',
    default_priority: 'medium',
    default_checklist: JSON.stringify([
      'Retirar producto temporalmente',
      'Limpiar cristales',
      'Desinfectar superficies internas',
      'Reacomodar producto',
      'Verificar temperatura post-limpieza'
    ])
  },
  {
    area: 'Perecederos',
    title: 'Merma de perecederos',
    description: 'Documentar y procesar producto que no se puede vender',
    default_priority: 'medium',
    default_checklist: JSON.stringify([
      'Recolectar producto no apto',
      'Pesar y registrar cada articulo',
      'Clasificar causa de merma',
      'Disponer segun protocolo'
    ])
  },

  // === PANADERIA (4) ===
  {
    area: 'Panaderia',
    title: 'Produccion del dia',
    description: 'Preparar y hornear la produccion programada del dia',
    default_priority: 'high',
    default_checklist: JSON.stringify([
      'Revisar orden de produccion',
      'Verificar insumos disponibles',
      'Preparar masas y mezclas',
      'Hornear segun programa',
      'Dejar enfriar y empacar',
      'Etiquetar con fecha'
    ])
  },
  {
    area: 'Panaderia',
    title: 'Limpieza de horno',
    description: 'Limpieza profunda de hornos al final del turno',
    default_priority: 'medium',
    default_checklist: JSON.stringify([
      'Apagar y dejar enfriar horno',
      'Retirar residuos solidos',
      'Aplicar limpiador industrial',
      'Enjuagar y secar',
      'Verificar funcionamiento'
    ])
  },
  {
    area: 'Panaderia',
    title: 'Inventario de insumos',
    description: 'Contar insumos de panaderia y solicitar reabastecimiento',
    default_priority: 'medium',
    default_checklist: JSON.stringify([
      'Contar harina',
      'Contar azucar y mantequilla',
      'Contar levadura y mejorantes',
      'Verificar empaques disponibles',
      'Generar pedido de faltantes'
    ])
  },
  {
    area: 'Panaderia',
    title: 'Exhibicion de producto',
    description: 'Acomodar pan fresco en area de autoservicio',
    default_priority: 'medium',
    default_checklist: JSON.stringify([
      'Retirar producto del dia anterior',
      'Limpiar charolas de exhibicion',
      'Colocar producto fresco',
      'Verificar pinzas y bolsas disponibles',
      'Actualizar precios si es necesario'
    ])
  },

  // === GENERAL (4) ===
  {
    area: 'General',
    title: 'Apertura de tienda',
    description: 'Protocolo completo de apertura de la tienda',
    default_priority: 'urgent',
    default_checklist: JSON.stringify([
      'Desactivar alarma',
      'Encender luces y clima',
      'Verificar cajas registradoras',
      'Revisar limpieza general',
      'Verificar entrada de proveedores pendientes',
      'Abrir puertas al publico'
    ])
  },
  {
    area: 'General',
    title: 'Cierre de tienda',
    description: 'Protocolo completo de cierre de la tienda',
    default_priority: 'urgent',
    default_checklist: JSON.stringify([
      'Verificar que no haya clientes',
      'Cerrar cajas y hacer corte',
      'Apagar equipos no esenciales',
      'Revisar puertas y ventanas',
      'Activar alarma',
      'Cerrar con llave'
    ])
  },
  {
    area: 'General',
    title: 'Revision de seguridad',
    description: 'Ronda de seguridad verificando areas criticas',
    default_priority: 'high',
    default_checklist: JSON.stringify([
      'Verificar camaras de seguridad',
      'Revisar extintores',
      'Verificar salidas de emergencia',
      'Revisar area de cajas fuertes',
      'Reportar anomalias'
    ])
  },
  {
    area: 'General',
    title: 'Reporte de incidencia',
    description: 'Documentar cualquier incidencia ocurrida durante el turno',
    default_priority: 'high',
    default_checklist: JSON.stringify([
      'Describir la incidencia',
      'Registrar hora y lugar',
      'Identificar personas involucradas',
      'Tomar evidencia fotografica',
      'Notificar al supervisor'
    ])
  }
]

export function runSeed(db: Database): void {
  // Check if already seeded
  const result = db.exec('SELECT COUNT(*) as count FROM users')
  const userCount = result[0].values[0][0] as number
  if (userCount > 0) return

  // Admin de prueba (password: Admin123!)
  // Hash pre-computed with bcryptjs.hashSync('Admin123!', 10)
  const adminHash = '$2a$10$zyMDeImzyzGxNL57hGDMhuu5.tMASSK7ahM1IKDQWV63nwjveGv2y'
  db.run(
    `INSERT INTO users (role, name, email, pin, password_hash, active) VALUES (?, ?, ?, ?, ?, ?)`,
    ['admin', 'Administrador', 'admin@mydelega.com', '1234', adminHash, 1]
  )

  // 24 plantillas de tareas
  const stmt = db.prepare(
    `INSERT INTO task_templates (area, title, description, default_priority, default_checklist) VALUES (?, ?, ?, ?, ?)`
  )

  for (const t of TEMPLATES) {
    stmt.run([t.area, t.title, t.description, t.default_priority, t.default_checklist])
  }

  stmt.free()
}
