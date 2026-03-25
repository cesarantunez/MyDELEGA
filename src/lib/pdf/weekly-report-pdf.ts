import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { WeeklyReportData } from '../repositories/checklist.repository'

// Colores corporativos
const AMARILLO: [number, number, number] = [255, 224, 0]
const OSCURO: [number, number, number] = [45, 45, 45]
const ROSA: [number, number, number] = [255, 31, 142]
const AZUL: [number, number, number] = [27, 79, 216]
const ROJO: [number, number, number] = [227, 30, 36]
const BLANCO: [number, number, number] = [255, 255, 255]

const STATUS_COLORS: Record<string, [number, number, number]> = {
  a_tiempo: AZUL,
  tarde: ROJO,
  pendiente: [156, 163, 175], // gray
}

const STATUS_LABELS: Record<string, string> = {
  a_tiempo: 'A tiempo',
  tarde: 'Tarde',
  pendiente: 'Pendiente',
}

export function generateWeeklyReportPDF(report: WeeklyReportData): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // ── Header ──────────────────────────────────────────────
  doc.setFillColor(...OSCURO)
  doc.rect(0, 0, pageWidth, 28, 'F')

  doc.setTextColor(...BLANCO)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('MyDELEGA', 14, 14)

  doc.setTextColor(...AMARILLO)
  doc.setFontSize(10)
  doc.text('Checklist Semanal', 14, 21)

  doc.setTextColor(...BLANCO)
  doc.setFontSize(9)
  doc.text(`Semana: ${report.week_start} al ${report.week_end}`, pageWidth - 14, 14, { align: 'right' })
  doc.text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, pageWidth - 14, 21, { align: 'right' })

  // ── Summary boxes ───────────────────────────────────────
  let y = 36
  const boxW = 50
  const boxH = 16
  const gap = 8
  const startX = (pageWidth - (boxW * 4 + gap * 3)) / 2

  const summaryBoxes = [
    { label: 'Total', value: report.summary.total, color: OSCURO },
    { label: 'A tiempo', value: report.summary.a_tiempo, color: AZUL },
    { label: 'Tarde', value: report.summary.tarde, color: ROJO },
    { label: 'Pendiente', value: report.summary.pendiente, color: [156, 163, 175] as [number, number, number] },
  ]

  for (let i = 0; i < summaryBoxes.length; i++) {
    const box = summaryBoxes[i]
    const x = startX + i * (boxW + gap)
    doc.setFillColor(...box.color)
    doc.roundedRect(x, y, boxW, boxH, 2, 2, 'F')
    doc.setTextColor(...BLANCO)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(String(box.value), x + boxW / 2, y + 7, { align: 'center' })
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(box.label, x + boxW / 2, y + 13, { align: 'center' })
  }

  y += boxH + 8

  // ── Table: By employee ──────────────────────────────────
  doc.setTextColor(...OSCURO)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Cumplimiento por Empleado', 14, y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [['Empleado', 'Total', 'A tiempo', 'Tarde', 'Pendiente', 'Cumpl. %']],
    body: report.by_employee.map((e) => [
      e.employee_name,
      String(e.total),
      String(e.a_tiempo),
      String(e.tarde),
      String(e.pendiente),
      `${e.percentage}%`,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: OSCURO,
      textColor: AMARILLO,
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 50 },
      5: { fontStyle: 'bold', halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8

  // ── Table: By area ──────────────────────────────────────
  doc.setTextColor(...OSCURO)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Cumplimiento por Area', 14, y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [['Area', 'Total', 'A tiempo', 'Tarde', 'Pendiente', 'Cumpl. %']],
    body: report.by_area.map((a) => [
      a.area,
      String(a.total),
      String(a.a_tiempo),
      String(a.tarde),
      String(a.pendiente),
      `${a.percentage}%`,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: OSCURO,
      textColor: ROSA,
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 50 },
      5: { fontStyle: 'bold', halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8

  // ── Detailed task list ──────────────────────────────────
  // Check if we need a new page
  if (y > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage()
    y = 20
  }

  doc.setTextColor(...OSCURO)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Detalle de Tareas', 14, y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [['Tarea', 'Area', 'Empleado', 'Prioridad', 'Fecha limite', 'Estado']],
    body: report.tasks.map((t) => [
      t.title,
      t.area,
      t.employee_name,
      t.priority,
      t.due_date ? new Date(t.due_date).toLocaleDateString('es-MX') : '-',
      STATUS_LABELS[t.completion_status],
    ]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: {
      fillColor: OSCURO,
      textColor: BLANCO,
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 60 },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 5) {
        const status = report.tasks[data.row.index]?.completion_status
        if (status && STATUS_COLORS[status]) {
          data.cell.styles.textColor = STATUS_COLORS[status]
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
    margin: { left: 14, right: 14 },
  })

  // ── Footer ──────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const h = doc.internal.pageSize.getHeight()
    doc.setFillColor(...OSCURO)
    doc.rect(0, h - 10, pageWidth, 10, 'F')
    doc.setTextColor(...BLANCO)
    doc.setFontSize(7)
    doc.text('MyDELEGA - Sistema de Gestion Operativa', 14, h - 4)
    doc.text(`Pagina ${i} de ${pageCount}`, pageWidth - 14, h - 4, { align: 'right' })
  }

  // Save
  doc.save(`MyDELEGA_Checklist_${report.week_start}_${report.week_end}.pdf`)
}
