#!/usr/bin/env node

/**
 * Demo Data Preparation Script
 * 
 * This script prepares realistic demo data for the CMS Compliance Platform
 * to ensure a compelling and impactful demonstration.
 */

const fs = require('fs');
const path = require('path');

// Sample demo data
const demoData = {
  // High-value consulting payment (should trigger fraud detection)
  highValuePayment: {
    amount: 150000,
    description: "Consulting services for clinical trial design and regulatory strategy",
    providerName: "Dr. Sarah Johnson",
    date: "2024-08-15",
    status: "Valid",
    category: "Consulting Fee",
    natureOfPayment: "Consulting Fee",
    recipientType: "Physician",
    manufacturerName: "Gilead Sciences",
    specialty: "Cardiology",
    state: "CA",
    disputeStatus: "None",
    contextualInformation: "High-value consulting for Phase III trial design"
  },

  // Research payment (should correlate with ClinicalTrials.gov)
  researchPayment: {
    amount: 75000,
    description: "Research funding for Alzheimer's disease study",
    providerName: "Dr. Michael Chen",
    date: "2024-07-20",
    status: "Valid",
    category: "Research",
    natureOfPayment: "Research",
    recipientType: "Physician",
    manufacturerName: "Gilead Sciences",
    specialty: "Neurology",
    state: "NY",
    disputeStatus: "None",
    contextualInformation: "Principal Investigator for NCT04567890",
    nctId: "NCT04567890"
  },

  // Small payment (should be non-reportable)
  smallPayment: {
    amount: 8.50,
    description: "Educational materials and lunch",
    providerName: "Dr. Emily Rodriguez",
    date: "2024-08-10",
    status: "Valid",
    category: "Food and Beverage",
    natureOfPayment: "Food and Beverage",
    recipientType: "Physician",
    manufacturerName: "Gilead Sciences",
    specialty: "Oncology",
    state: "TX",
    disputeStatus: "None",
    contextualInformation: "Educational lunch meeting"
  },

  // Disputed payment (should show in dispute tracking)
  disputedPayment: {
    amount: 25000,
    description: "Speaking fees for medical education program",
    providerName: "Dr. James Wilson",
    date: "2024-06-15",
    status: "Disputed",
    category: "Speaking Fee",
    natureOfPayment: "Compensation for serving as faculty or as a speaker for medical education program",
    recipientType: "Physician",
    manufacturerName: "Gilead Sciences",
    specialty: "Internal Medicine",
    state: "FL",
    disputeStatus: "Under Review",
    contextualInformation: "Disputed by recipient - claims no speaking engagement occurred"
  },

  // Duplicate payment (should trigger fraud detection)
  duplicatePayment: {
    amount: 150000,
    description: "Consulting services for clinical trial design and regulatory strategy",
    providerName: "Dr. Sarah Johnson",
    date: "2024-08-15",
    status: "Anomaly",
    category: "Consulting Fee",
    natureOfPayment: "Consulting Fee",
    recipientType: "Physician",
    manufacturerName: "Gilead Sciences",
    specialty: "Cardiology",
    state: "CA",
    disputeStatus: "None",
    contextualInformation: "Potential duplicate of payment #001",
    fraudIndicators: ["Duplicate Payment", "Same Amount", "Same Date"]
  }
};

// Sample analysis results
const analysisResults = {
  fraudDetection: {
    suspiciousAmounts: 23,
    unusualTiming: 15,
    duplicatePatterns: 8,
    concentrationPatterns: 12,
    totalFraudIndicators: 58
  },
  
  riskAssessment: {
    lowRisk: 1247892,
    mediumRisk: 15623,
    highRisk: 2341,
    criticalRisk: 156,
    totalRecords: 1272012
  },
  
  complianceMetrics: {
    clearlyReportable: 89.2,
    clearlyNonReportable: 8.1,
    greyArea: 2.7,
    totalRecords: 1272012
  },
  
  statisticalAnalysis: {
    zScoreOutliers: 45,
    isolationForestAnomalies: 23,
    temporalAnomalies: 12,
    geographicAnomalies: 8
  }
};

// Sample glossary terms for demo
const glossaryTerms = [
  {
    id: "consulting_fee",
    term: "Consulting Fee",
    definition: "A payment that a company makes to a physician for advice and expertise about a medical product or treatment. Consulting fees are typically arranged with a written agreement between a company and physician based on the company's particular business needs.",
    category: "payment_type",
    reportability: "reportable",
    conditions: ["Written agreement required", "Business need justification"],
    examples: ["Clinical trial design", "Regulatory strategy", "Product development"],
    regulatoryBasis: "42 CFR 403.904(e)(2)",
    lastUpdated: new Date().toISOString(),
    version: "1.0"
  },
  {
    id: "physician",
    term: "Physician",
    definition: "For the purposes of Open Payments, a 'physician' is any of the following types of professionals that are legally authorized by the state to practice: Doctors of Medicine or Osteopathic Medicine, Doctors of Dental Medicine or Dental Surgery, Doctors of Podiatric Medicine, Doctors of Optometry, Chiropractors.",
    category: "recipient_type",
    reportability: "reportable",
    conditions: ["Legally authorized by state", "Not a medical resident", "Not a bona fide employee"],
    examples: ["MD", "DO", "DDS", "DMD", "DPM", "OD", "DC"],
    regulatoryBasis: "42 CFR 403.902",
    lastUpdated: new Date().toISOString(),
    version: "1.0"
  }
];

// Sample company profile for demo
const companyProfile = {
  name: "Gilead Sciences",
  totalPayments: 45200000,
  paymentTypes: {
    "Research": 25000000,
    "Consulting Fee": 12000000,
    "Education": 5000000,
    "Food and Beverage": 2000000,
    "Travel and Lodging": 1200000
  },
  topRecipients: [
    { name: "Dr. Sarah Johnson", amount: 150000, type: "Consulting Fee" },
    { name: "Dr. Michael Chen", amount: 75000, type: "Research" },
    { name: "Dr. Emily Rodriguez", amount: 45000, type: "Education" }
  ],
  geographicDistribution: {
    "CA": 35.2,
    "NY": 18.7,
    "TX": 12.3,
    "FL": 8.9,
    "Other": 24.9
  },
  yearOverYearTrend: {
    "2021": 38000000,
    "2022": 41000000,
    "2023": 43500000,
    "2024": 45200000
  }
};

// Sample physician profile for demo
const physicianProfile = {
  name: "Dr. Sarah Johnson",
  specialty: "Cardiology",
  totalPayments: 125000,
  paymentSources: [
    { manufacturer: "Gilead Sciences", amount: 150000, type: "Consulting Fee" },
    { manufacturer: "Pfizer", amount: 25000, type: "Research" },
    { manufacturer: "Merck", amount: 15000, type: "Education" }
  ],
  paymentHistory: [
    { year: "2021", amount: 45000 },
    { year: "2022", amount: 52000 },
    { year: "2023", amount: 68000 },
    { year: "2024", amount: 125000 }
  ],
  riskLevel: "Medium",
  fraudIndicators: [],
  complianceStatus: "Compliant"
};

// Function to create demo data files
function createDemoDataFiles() {
  console.log('🚀 Preparing demo data for CMS Compliance Platform...\n');

  // Create demo data directory
  const demoDir = path.join(__dirname, '..', 'demo-data');
  if (!fs.existsSync(demoDir)) {
    fs.mkdirSync(demoDir, { recursive: true });
  }

  // Create sample payment records
  const paymentRecords = [
    demoData.highValuePayment,
    demoData.researchPayment,
    demoData.smallPayment,
    demoData.disputedPayment,
    demoData.duplicatePayment
  ];

  fs.writeFileSync(
    path.join(demoDir, 'sample-payments.json'),
    JSON.stringify(paymentRecords, null, 2)
  );

  // Create analysis results
  fs.writeFileSync(
    path.join(demoDir, 'analysis-results.json'),
    JSON.stringify(analysisResults, null, 2)
  );

  // Create glossary terms
  fs.writeFileSync(
    path.join(demoDir, 'glossary-terms.json'),
    JSON.stringify(glossaryTerms, null, 2)
  );

  // Create company profile
  fs.writeFileSync(
    path.join(demoDir, 'company-profile.json'),
    JSON.stringify(companyProfile, null, 2)
  );

  // Create physician profile
  fs.writeFileSync(
    path.join(demoDir, 'physician-profile.json'),
    JSON.stringify(physicianProfile, null, 2)
  );

  // Create demo metrics
  const demoMetrics = {
    totalRecords: 1272012,
    complianceRate: 98.7,
    anomaliesDetected: 23,
    processingVolume: 15432,
    fraudDetectionAccuracy: 94.2,
    manualReviewReduction: 67,
    systemUptime: 99.9,
    averageProcessingTime: 2.3,
    lastUpdated: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(demoDir, 'demo-metrics.json'),
    JSON.stringify(demoMetrics, null, 2)
  );

  console.log('✅ Demo data files created successfully!');
  console.log(`📁 Demo data directory: ${demoDir}`);
  console.log('\n📋 Created files:');
  console.log('  - sample-payments.json');
  console.log('  - analysis-results.json');
  console.log('  - glossary-terms.json');
  console.log('  - company-profile.json');
  console.log('  - physician-profile.json');
  console.log('  - demo-metrics.json');
}

// Function to create demo CSV files
function createDemoCSVFiles() {
  console.log('\n📊 Creating demo CSV files...');

  const demoDir = path.join(__dirname, '..', 'demo-data');

  // Create sample CMS Open Payments CSV
  const csvHeader = [
    'Record_ID',
    'Program_Year',
    'Payment_Publication_Date',
    'Payment_Date',
    'Covered_Recipient_Type',
    'Teaching_Hospital_CCN',
    'Teaching_Hospital_ID',
    'Teaching_Hospital_Name',
    'Physician_Profile_ID',
    'Physician_First_Name',
    'Physician_Middle_Name',
    'Physician_Last_Name',
    'Physician_Name_Suffix',
    'Recipient_Primary_Business_Street_Address_Line1',
    'Recipient_City',
    'Recipient_State',
    'Recipient_Zip_Code',
    'Recipient_Country',
    'Recipient_Province',
    'Recipient_Postal_Code',
    'Physician_Primary_Type',
    'Physician_Specialty',
    'Physician_License_State_code1',
    'Physician_License_State_code2',
    'Physician_License_State_code3',
    'Physician_License_State_code4',
    'Physician_License_State_code5',
    'Physician_License_Number1',
    'Physician_License_Number2',
    'Physician_License_Number3',
    'Physician_License_Number4',
    'Physician_License_Number5',
    'Applicable_Manufacturer_or_Applicable_GPO_Making_Payment_ID',
    'Applicable_Manufacturer_or_Applicable_GPO_Making_Payment_Name',
    'Applicable_Manufacturer_or_Applicable_GPO_Making_Payment_State',
    'Applicable_Manufacturer_or_Applicable_GPO_Making_Payment_Country',
    'Total_Amount_of_Payment_USDollars',
    'Date_of_Payment',
    'Number_of_Payments_Included_in_Total_Amount',
    'Form_of_Payment_or_Transfer_of_Value',
    'Nature_of_Payment_or_Transfer_of_Value',
    'City_of_Travel',
    'State_of_Travel',
    'Country_of_Travel',
    'Physician_Ownership_Indicator',
    'Third_Party_Payment_Recipient_Indicator',
    'Name_of_Third_Party_Entity_Receiving_Payment_or_Transfer_of_Value',
    'Charity_Indicator',
    'Third_Party_Equals_Covered_Recipient_Indicator',
    'Contextual_Information',
    'Delay_in_Publication_Indicator',
    'Record_ID_2',
    'Dispute_Status_for_Publication',
    'Product_Indicator',
    'Name_of_Associated_Covered_Drug_or_Biological1',
    'Name_of_Associated_Covered_Drug_or_Biological2',
    'Name_of_Associated_Covered_Drug_or_Biological3',
    'Name_of_Associated_Covered_Drug_or_Biological4',
    'Name_of_Associated_Covered_Drug_or_Biological5',
    'NDC_of_Associated_Covered_Drug_or_Biological1',
    'NDC_of_Associated_Covered_Drug_or_Biological2',
    'NDC_of_Associated_Covered_Drug_or_Biological3',
    'NDC_of_Associated_Covered_Drug_or_Biological4',
    'NDC_of_Associated_Covered_Drug_or_Biological5',
    'Name_of_Associated_Covered_Device_or_Medical_Supply1',
    'Name_of_Associated_Covered_Device_or_Medical_Supply2',
    'Name_of_Associated_Covered_Device_or_Medical_Supply3',
    'Name_of_Associated_Covered_Device_or_Medical_Supply4',
    'Name_of_Associated_Covered_Device_or_Medical_Supply5'
  ];

  const csvData = [
    [
      '1',
      '2024',
      '2024-09-07',
      '2024-08-15',
      'Covered Recipient Physician',
      '',
      '',
      '',
      '123456789',
      'Sarah',
      'A',
      'Johnson',
      '',
      '123 Main St',
      'San Francisco',
      'CA',
      '94102',
      'United States',
      '',
      '',
      'MD',
      'Cardiology',
      'CA',
      '',
      '',
      '',
      '',
      'A12345',
      '',
      '',
      '',
      '',
      '987654321',
      'Gilead Sciences',
      'CA',
      'United States',
      '150000.00',
      '2024-08-15',
      '1',
      'Cash or cash equivalent',
      'Consulting fee',
      '',
      '',
      '',
      'No',
      'No',
      '',
      'No',
      'No',
      'High-value consulting for Phase III trial design',
      'No',
      '1',
      'No',
      'Yes',
      'Truvada',
      '',
      '',
      '',
      '',
      '00069-1010-01',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ],
    [
      '2',
      '2024',
      '2024-09-07',
      '2024-07-20',
      'Covered Recipient Physician',
      '',
      '',
      '',
      '987654321',
      'Michael',
      'B',
      'Chen',
      '',
      '456 Oak Ave',
      'New York',
      'NY',
      '10001',
      'United States',
      '',
      '',
      'MD',
      'Neurology',
      'NY',
      '',
      '',
      '',
      '',
      'B67890',
      '',
      '',
      '',
      '',
      '987654321',
      'Gilead Sciences',
      'CA',
      'United States',
      '75000.00',
      '2024-07-20',
      '1',
      'Cash or cash equivalent',
      'Research',
      '',
      '',
      '',
      'No',
      'No',
      '',
      'No',
      'No',
      'Principal Investigator for NCT04567890',
      'No',
      '2',
      'No',
      'Yes',
      'Viread',
      '',
      '',
      '',
      '',
      '00069-1010-02',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ]
  ];

  const csvContent = [csvHeader, ...csvData]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  fs.writeFileSync(
    path.join(demoDir, 'sample-open-payments.csv'),
    csvContent
  );

  console.log('✅ Demo CSV files created successfully!');
  console.log('  - sample-open-payments.csv');
}

// Function to create demo environment setup
function createDemoEnvironmentSetup() {
  console.log('\n🔧 Creating demo environment setup...');

  const demoDir = path.join(__dirname, '..', 'demo-data');

  const envSetup = {
    demoMode: true,
    demoDataPath: './demo-data',
    sampleDataLoaded: true,
    apiEndpoints: {
      health: 'http://localhost:3000/api/health',
      metrics: 'http://localhost:3000/api/metrics',
      dataAnalysis: 'http://localhost:3000/api/data-analysis',
      glossary: 'http://localhost:3000/api/glossary',
      openPayments: 'http://localhost:3000/api/open-payments'
    },
    demoFeatures: {
      fraudDetection: true,
      patternAnalysis: true,
      riskAssessment: true,
      glossaryEngine: true,
      externalAPIs: true,
      openPayments: true
    }
  };

  fs.writeFileSync(
    path.join(demoDir, 'demo-environment.json'),
    JSON.stringify(envSetup, null, 2)
  );

  console.log('✅ Demo environment setup created!');
  console.log('  - demo-environment.json');
}

// Main execution
function main() {
  try {
    createDemoDataFiles();
    createDemoCSVFiles();
    createDemoEnvironmentSetup();
    
    console.log('\n🎉 Demo data preparation completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('  1. Start the development server: npm run dev');
    console.log('  2. Load the demo data into your application');
    console.log('  3. Review the demo script: DEMO_SCRIPT.md');
    console.log('  4. Use the quick reference: DEMO_QUICK_REFERENCE.md');
    console.log('\n🚀 Ready for an impactful demo!');
    
  } catch (error) {
    console.error('❌ Error preparing demo data:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  demoData,
  analysisResults,
  glossaryTerms,
  companyProfile,
  physicianProfile,
  createDemoDataFiles,
  createDemoCSVFiles,
  createDemoEnvironmentSetup
};
