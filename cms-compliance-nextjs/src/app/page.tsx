import { Metadata } from 'next'
import Dashboard from '@/components/Dashboard'

export const metadata: Metadata = {
  title: 'Knowledge Nexus Framework™ - CMS Compliance Platform',
  description: 'Transforming Life Sciences Spend Management through Strategic Insourcing',
}

export default function Home() {
  return <Dashboard />
}