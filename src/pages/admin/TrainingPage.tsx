import { useEffect, useState } from 'react'
import { GraduationCap, Award, FolderOpen } from 'lucide-react'
import ModulesTab from '../../components/admin/ModulesTab'
import SkillsTab from '../../components/admin/SkillsTab'
import DocumentsTab from '../../components/admin/DocumentsTab'
import { getAllAreas } from '../../lib/repositories/task.repository'

type Tab = 'modules' | 'skills' | 'documents'

const TABS: { key: Tab; label: string; icon: typeof GraduationCap }[] = [
  { key: 'modules', label: 'Modulos', icon: GraduationCap },
  { key: 'skills', label: 'Conocimiento', icon: Award },
  { key: 'documents', label: 'Archivos', icon: FolderOpen },
]

export default function TrainingPage() {
  const [tab, setTab] = useState<Tab>('modules')
  const [areas, setAreas] = useState<string[]>([])

  useEffect(() => {
    getAllAreas().then(setAreas).catch(console.error)
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-blanco">Capacitacion</h2>
        <p className="text-blanco/50 text-sm">Material, conocimiento verificado y archivos por area</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-blanco/5 rounded-xl p-1 gap-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              tab === key ? 'bg-amarillo text-oscuro' : 'text-blanco/50 hover:text-blanco'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'modules' && <ModulesTab areas={areas} />}
      {tab === 'skills' && <SkillsTab areas={areas} />}
      {tab === 'documents' && <DocumentsTab areas={areas} />}
    </div>
  )
}
