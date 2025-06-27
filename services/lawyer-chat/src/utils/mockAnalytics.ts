import type { AnalyticsData } from '@/types';

export const mockAnalyticsData: AnalyticsData = {
  summary: "Analysis of contract terms across 47 legal documents shows significant variations in liability clauses and indemnification provisions. The data reveals emerging trends in force majeure definitions post-2020.",
  
  statistics: {
    totalDocuments: 47,
    averageProcessingTime: "2.3 days",
    successRate: "94.2%"
  },
  
  trends: [
    { period: "2020-2024", value: 78, category: "Remote Work Clauses", change: 78 },
    { period: "2019-2024", value: 92, category: "Cybersecurity Provisions", change: 47 },
    { period: "2019-2024", value: 2.3, category: "Average Contract Pages", change: 15 },
    { period: "2020-2024", value: 89, category: "Pandemic Force Majeure", change: 89 }
  ],
  
  charts: [
    {
      type: "bar" as const,
      data: {
        labels: ["Service Agreements", "NDAs", "Employment", "Licensing"],
        datasets: [{
          label: "Contract Types Distribution",
          data: [38.3, 25.5, 19.1, 17.0],
          backgroundColor: ["#004A84", "#0066B8", "#0080E0", "#00A0FF"]
        }]
      }
    },
    {
      type: "line" as const,
      data: {
        labels: ["2019", "2020", "2021", "2022", "2023"],
        datasets: [
          {
            label: "Remote Work Clauses (%)",
            data: [12, 45, 78, 85, 89],
            borderColor: "#004A84"
          },
          {
            label: "Cybersecurity Provisions (%)",
            data: [45, 62, 81, 88, 92],
            borderColor: "#C7A562"
          },
          {
            label: "Data Protection Clauses (%)",
            data: [67, 78, 89, 92, 95],
            borderColor: "#0066B8"
          }
        ]
      }
    }
  ]
};