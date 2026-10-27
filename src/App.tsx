import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AccountTokenPage } from './pages/AccountTokenPage'
import { AdminPage } from './pages/AdminPage'
import { ChatPage } from './pages/ChatPage'
import { DashboardPage } from './pages/DashboardPage'
import { FriendliesPage } from './pages/FriendliesPage'
import { ResultsPage } from './pages/ResultsPage'
import { PlayerPage } from './pages/PlayerPage'
import { TeamPage } from './pages/TeamPage'
import { TeamDashboardPage } from './pages/TeamDashboardPage'
import { TournamentsPage } from './pages/TournamentsPage'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/matches" element={<Navigate to="/" replace />} />
        <Route path="/friendlies" element={<FriendliesPage />} />
        <Route path="/team-dashboard" element={<TeamDashboardPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/player" element={<PlayerPage />} />
        <Route path="/tournaments" element={<TournamentsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/reset-password" element={<AccountTokenPage mode="reset" />} />
        <Route path="/verify-email" element={<AccountTokenPage mode="verify" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
