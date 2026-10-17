const dashboardData = {
  articles: [
    {
      id: 1,
      title: "Understanding AI Operations",
      content: "A deep dive into how AI operations work and their impact on business.",
      route: "ai-operations",
      diagnostics: [
        { id: 1, message: "AI system operational at 98% efficiency." },
        { id: 2, message: "No critical errors detected." }
      ]
    },
    {
      id: 2,
      title: "The Future of AI",
      content: "Exploring the potential advancements in AI technology.",
      route: "future-of-ai",
      diagnostics: [
        { id: 3, message: "Predicted growth in AI capabilities." },
        { id: 4, message: "Minor latency issues observed." }
      ]
    },
    {
      id: 3,
      title: "AI Ethics and Responsibility",
      content: "Discussing the ethical implications of AI in society.",
      route: "ai-ethics",
      diagnostics: [
        { id: 5, message: "Ethical guidelines are being followed." },
        { id: 6, message: "Public sentiment is cautiously optimistic." }
      ]
    }
  ],
  diagnostics: [
    { id: 1, message: "System check: All systems operational." },
    { id: 2, message: "Warning: High memory usage detected." },
    { id: 3, message: "Alert: Network latency above normal." }
  ]
};

export default dashboardData;