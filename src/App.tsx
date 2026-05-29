import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useTheme } from '@/lib/hooks/useTheme'
import { useAuth } from '@/lib/hooks/useAuth'
import HomePage from '@/pages/Home'
import OnboardingPage from '@/pages/Onboarding'
import DmPage from '@/pages/Dm'
import LoginPage from '@/pages/Login'
import RegisterPage from '@/pages/Register'
import PrivacyPolicyPage from '@/pages/PrivacyPolicy'
import TermsPage from '@/pages/Terms'

function AppContent() {
  useTheme()
  useAuth()

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/dm/:dmId" element={<DmPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
