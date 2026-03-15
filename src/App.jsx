import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import HomePage from './pages/Home'
import AdminPanel from './pages/AdminPanel'
import Candidates from './pages/Candidates'
import CandidateDetails from './pages/CandidateDetails'
import Owners from './pages/Owners'
import Vessels from './pages/Vessels'
import SignOnSignOffReport from './pages/SignOnSignOffReport'
import AdminLayout from './layouts/AdminLayout'
import Navigation from './components/Navigation'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <>
            {/* <Navigation /> */}
            <HomePage />
          </>
        } />
        
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminPanel />} />
          <Route path="candidates" element={<Candidates />} />
          <Route path="add-candidate" element={<Candidates />} />
          <Route path="candidates/:id" element={<CandidateDetails />} />
          <Route path="owner" element={<Owners />} />
          <Route path="vessel" element={<Vessels />} />
          <Route path="report" element={<SignOnSignOffReport />} />
          <Route path="documents" element={<AdminPanel />} />
          <Route path="settings" element={<AdminPanel />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
