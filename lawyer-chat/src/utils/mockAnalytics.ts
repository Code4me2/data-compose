export const mockAnalyticsData = {
  summary: "Analysis of contract terms across 47 legal documents shows significant variations in liability clauses and indemnification provisions. The data reveals emerging trends in force majeure definitions post-2020.",
  
  statistics: {
    totalDocuments: 47,
    averageClauseCount: 23.5,
    contractTypes: {
      "Service Agreements": 18,
      "NDAs": 12,
      "Employment Contracts": 9,
      "Licensing Agreements": 8
    },
    dateRange: "2019-2024",
    jurisdictions: ["California", "New York", "Delaware", "Texas"]
  },
  
  trends: [
    "78% increase in remote work clauses since 2020",
    "Cybersecurity provisions now appear in 92% of contracts (up from 45% in 2019)",
    "Average contract length increased by 2.3 pages due to expanded data protection clauses",
    "Force majeure clauses explicitly mention pandemics in 89% of post-2020 contracts"
  ],
  
  charts: [
    {
      type: "bar",
      title: "Contract Types Distribution",
      data: [
        { label: "Service Agreements", value: 38.3 },
        { label: "NDAs", value: 25.5 },
        { label: "Employment", value: 19.1 },
        { label: "Licensing", value: 17.0 }
      ]
    },
    {
      type: "line",
      title: "Clause Evolution Over Time",
      data: [
        { year: 2019, remoteWork: 12, cybersecurity: 45, dataProtection: 67 },
        { year: 2020, remoteWork: 45, cybersecurity: 62, dataProtection: 78 },
        { year: 2021, remoteWork: 78, cybersecurity: 81, dataProtection: 89 },
        { year: 2022, remoteWork: 85, cybersecurity: 88, dataProtection: 92 },
        { year: 2023, remoteWork: 89, cybersecurity: 92, dataProtection: 95 }
      ]
    }
  ]
};