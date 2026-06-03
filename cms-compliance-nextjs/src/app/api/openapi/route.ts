import { NextResponse } from 'next/server'

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'CMS Compliance Platform API',
    version: '1.0.0',
    description: 'OpenAPI specification for the Knowledge Nexus Framework compliance platform',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local development' }],
  paths: {
    '/api/health': { get: { summary: 'Health check' } },
    '/api/connectivity': { get: { summary: 'Full connectivity audit' } },
    '/api/upload': { post: { summary: 'Upload CMS CSV data' } },
    '/api/records': { get: { summary: 'List records with filters' } },
    '/api/records/bulk': { post: { summary: 'Bulk approve/reject records' } },
    '/api/records/{id}': {
      get: { summary: 'Get record' },
      put: { summary: 'Update record' },
      delete: { summary: 'Delete record' },
    },
    '/api/rules': { get: { summary: 'List company rules' }, post: { summary: 'Create rule' } },
    '/api/rules/{id}': {
      get: { summary: 'Get rule' },
      put: { summary: 'Update rule' },
      delete: { summary: 'Delete rule' },
    },
    '/api/audit': { get: { summary: 'Audit log (supports ?export=csv)' } },
    '/api/auth/login': { post: { summary: 'Authenticate user' } },
    '/api/auth/session': {
      get: { summary: 'Current session' },
      delete: { summary: 'Logout' },
    },
    '/api/reports/pdf': { get: { summary: 'Report data' }, post: { summary: 'Generate report' } },
    '/api/reports/pdf/download': { get: { summary: 'Download PDF report' } },
    '/api/glossary': { get: { summary: 'Glossary and international rules' } },
    '/api/ml/anomaly-detection': { post: { summary: 'Run anomaly detection' } },
    '/api/ml/evaluation': { get: { summary: 'ML model evaluation metrics' } },
    '/api/cms/fhir': { get: { summary: 'CMS FHIR integration' } },
    '/api/pubmed': { get: { summary: 'PubMed search' } },
    '/api/clinicaltrials': { get: { summary: 'ClinicalTrials.gov search' } },
  },
}

export async function GET() {
  return NextResponse.json(spec)
}
