import { Metadata } from 'next'
import AppShell from './components/AppShell'

export const metadata: Metadata = {
  title: 'BoardOfAI - Multi-LLM Board of Directors',
  description: 'Get advice from multiple AI models in parallel',
}

export default function Home() {
  return <AppShell />
}
