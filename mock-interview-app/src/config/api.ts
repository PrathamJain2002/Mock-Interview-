// Type definitions
interface ParsedResume {
  personalInfo: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  skills: string[];
  experience: Array<{
    title?: string;
    company?: string;
    duration?: string;
    description?: string;
  }>;
  projects: Array<{
    name?: string;
    description?: string;
    technologies?: string[];
  }>;
  education: Array<{
    degree?: string;
    institution?: string;
    year?: string;
  }>;
  certifications: string[];
  languages: string[];
}

interface JobDetails {
  title: string;
  company: string;
  description?: string;
  requirements?: string;
}

interface Question {
  id: number;
  text: string;
  category: string;
}

interface Answer {
  questionId: number;
  answer: string;
  timestamp: Date;
}

// interface InterviewData {
//   questions: Question[];
//   answers: Answer[];
//   jobDetails: JobDetails;
//   parsedResume: ParsedResume;
//   userInfo: {
//     name: string;
//     mobileNumber: string;
//     email: string;
//   };
// }

interface SaveInterviewData {
  name: string;
  mobileNumber: string;
  email: string;
  overallScore: number;
  technicalScore: number;
  behavioralScore: number;
  communicationScore: number;
  jobTitle: string;
  company: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  questions: Question[];
  answers: Answer[];
}

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
    
  generateQuestions: (data: { parsedResume: ParsedResume; jobDetails: JobDetails }) =>
    fetch(buildApiUrl(API_CONFIG.ENDPOINTS.QUESTIONS.GENERATE), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    }),
    
  analyzePerformance: (data: { questions: Question[]; answers: Answer[]; jobDetails: JobDetails }) =>
    fetch(buildApiUrl(API_CONFIG.ENDPOINTS.PERFORMANCE.ANALYZE), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    }),
    
  saveInterviewResults: (data: SaveInterviewData) =>
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
