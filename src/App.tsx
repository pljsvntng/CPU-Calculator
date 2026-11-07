import { Route, Routes, useNavigate } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { CalculatorPage } from './pages/CalculatorPage'
import { LearningPage } from './pages/LearningPage'
import { AboutPage, NotFoundPage } from './pages/SupportingPages'
import { AlgorithmComparison } from './pages/AlgorithmComparison'
import { MissionArchive } from './pages/MissionArchive'
import { useCalculator } from './hooks/useCalculator'
import { useLearningProgress } from './hooks/useLearningProgress'
import { usePracticeMission } from './hooks/usePracticeMission'
import { PracticeMissions } from './pages/PracticeMissions'
import { draftFromRequest } from './utils/calculator'
import type { OpenTrainingProblem } from './types/learning'

export default function App() {
  const calculator = useCalculator()
  const learning = useLearningProgress(), practice = usePracticeMission(learning.recordPractice), navigate = useNavigate()
  const openInCalculator: OpenTrainingProblem = (request, source) => {
    void calculator.calculate({ ...draftFromRequest(request, calculator.draft), source })
    navigate(`/calculator?algorithm=${request.config.algorithm}`)
  }
  return <Routes>
    <Route element={<AppLayout />}>
      <Route index element={<DashboardPage />} />
      <Route path="calculator" element={<CalculatorPage calculator={calculator} />} />
      <Route path="compare" element={<AlgorithmComparison calculator={calculator} />} />
      <Route path="learn" element={<LearningPage controller={learning} onOpen={openInCalculator} />} />
      <Route path="practice" element={<PracticeMissions controller={practice} learning={learning} onOpen={openInCalculator} />} />
      <Route path="saved" element={<MissionArchive onOpen={openInCalculator} />} />
      <Route path="about" element={<AboutPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
}
