// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  ENDPOINTS: {
    RESUME: {
      PARSE: '/api/resume/parse',
      MANUAL: '/api/resume/manual'
    },
    QUESTIONS: {
      GENERATE: '/api/questions/generate'
    },
    PERFORMANCE: {
      ANALYZE: '/api/performance/analyze'
    },
    USERS: {
      SAVE_INTERVIEW: '/api/users/save-interview',
      GET_INTERVIEWS: '/api/users/interviews',
      GET_INTERVIEW: '/api/users/interview',
      GET_STATS: '/api/users/stats'
    },
    HEALTH: '/api/health'
  }
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// API utility functions
export const apiUtils = {
  parseResume: (formData: FormData) => 
    fetch(buildApiUrl(API_CONFIG.ENDPOINTS.RESUME.PARSE), {
      method: 'POST',
      body: formData
    }),
    
  generateQuestions: (data: { parsedResume: any; jobDetails: any }) =>
    fetch(buildApiUrl(API_CONFIG.ENDPOINTS.QUESTIONS.GENERATE), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    }),
    
  analyzePerformance: (data: { questions: any[]; answers: any[]; jobDetails: any }) =>
    fetch(buildApiUrl(API_CONFIG.ENDPOINTS.PERFORMANCE.ANALYZE), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    }),
    
  saveInterviewResults: (data: any) =>
    fetch(buildApiUrl(API_CONFIG.ENDPOINTS.USERS.SAVE_INTERVIEW), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    }),
    
  getUserInterviews: (mobileNumber: string) =>
    fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.USERS.GET_INTERVIEWS}/${mobileNumber}`)),
    
  getInterviewById: (id: string) =>
    fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.USERS.GET_INTERVIEW}/${id}`)),
    
  getStats: () =>
    fetch(buildApiUrl(API_CONFIG.ENDPOINTS.USERS.GET_STATS)),
    
  healthCheck: () =>
    fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HEALTH))
};
