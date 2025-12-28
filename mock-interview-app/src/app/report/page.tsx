'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  TrendingUp, 
  Clock, 
  Star,
  Download,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { apiUtils } from '@/config/api';

interface InterviewResults {
  userInfo: {
    name: string;
    mobileNumber: string;
    email?: string;
  };
  questions: {
    id: number;
    text: string;
    category: string;
  }[];
  answers: {
    questionId: number;
    answer: string;
    timestamp: Date;
  }[];
  jobDetails: {
    title: string;
    company: string;
    description: string;
    requirements: string;
  };
}

interface PerformanceMetrics {
  overallScore: number;
  technicalScore: number;
  behavioralScore: number;
  communicationScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export default function ReportPage() {
  const [interviewResults, setInterviewResults] = useState<InterviewResults | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load interview results from localStorage
    const results = localStorage.getItem('interviewResults');
    if (results) {
      const parsedResults = JSON.parse(results);
      setInterviewResults(parsedResults);
      
      // Generate performance metrics using OpenAI API
      generatePerformanceMetrics(parsedResults);
    } else {
      // Redirect to home if no results
      window.location.href = '/';
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const generatePerformanceMetrics = async (results: InterviewResults) => {
    setIsLoading(true);
    try {
      // Call the Express backend for performance analysis
      const response = await apiUtils.analyzePerformance({
        questions: results.questions,
        answers: results.answers,
        jobDetails: results.jobDetails
      });

      if (!response.ok) {
        throw new Error('Failed to analyze performance');
      }

      const analysis = await response.json();
      setPerformanceMetrics(analysis);
      
      // Save interview results to MongoDB
      await saveInterviewResults(results, analysis);
    } catch (error) {
      console.error('Error analyzing performance:', error);
      
      // Fallback to mock analysis if API fails
      const mockAnalysis = generateMockAnalysis(results.questions, results.answers);
      setPerformanceMetrics(mockAnalysis);
      
      // Still try to save to MongoDB with mock analysis
      try {
        await saveInterviewResults(results, mockAnalysis);
      } catch (saveError) {
        console.error('Error saving to MongoDB:', saveError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveInterviewResults = async (results: InterviewResults, analysis: PerformanceMetrics) => {
    try {
      const response = await apiUtils.saveInterviewResults({
        name: results.userInfo.name,
        mobileNumber: results.userInfo.mobileNumber,
        email: results.userInfo.email || '',
        overallScore: analysis.overallScore,
        technicalScore: analysis.technicalScore,
        behavioralScore: analysis.behavioralScore,
        communicationScore: analysis.communicationScore,
        jobTitle: results.jobDetails.title,
        company: results.jobDetails.company,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        suggestions: analysis.suggestions,
        questions: results.questions,
        answers: results.answers
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Interview results saved to MongoDB:', data);
      } else {
        console.error('❌ Failed to save interview results to MongoDB');
      }
    } catch (error) {
      console.error('❌ Error saving interview results to MongoDB:', error);
    }
  };

  const generateMockAnalysis = (questions: { id: number; text: string; category: string }[], answers: { questionId: number; answer: string; timestamp: Date }[]): PerformanceMetrics => {
    // Mock performance analysis (in a real app, this would use AI analysis)
    const totalQuestions = questions.length;
    const answeredQuestions = answers.length;
    const completionRate = (answeredQuestions / totalQuestions) * 100;
    
    // Calculate scores based on answer length and content
    const scores = answers.map(answer => {
      // const question = questions.find(q => q.id === answer.questionId); // Unused variable
      let score = 0;
      
      // Basic scoring logic
      if (answer.answer.length > 50) score += 30; // Good length
      if (answer.answer.length > 100) score += 20; // Detailed answer
      if (answer.answer.includes('experience') || answer.answer.includes('worked')) score += 25; // Relevant content
      if (answer.answer.includes('challenge') || answer.answer.includes('problem')) score += 25; // Problem-solving
      
      return Math.min(score, 100);
    });
    
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    
    return {
      overallScore: Math.round((averageScore + completionRate) / 2),
      technicalScore: Math.round(averageScore * 0.9),
      behavioralScore: Math.round(averageScore * 0.95),
      communicationScore: Math.round(averageScore * 0.85),
      strengths: [
        'Good communication skills',
        'Demonstrated relevant experience',
        'Provided specific examples'
      ],
      weaknesses: [
        'Could provide more detailed technical explanations',
        'Consider using more specific metrics in answers',
        'Practice STAR method for behavioral questions'
      ],
      suggestions: [
        'Practice common interview questions regularly',
        'Prepare specific examples for your experience',
        'Use the STAR method (Situation, Task, Action, Result)',
        'Research the company and role thoroughly',
        'Practice speaking clearly and confidently'
      ]
    };
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 60) return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  const downloadReport = () => {
    if (!interviewResults || !performanceMetrics) return;
    
    const reportContent = `
AI Mock Interview Report
======================

Position: ${interviewResults.jobDetails.title}
Company: ${interviewResults.jobDetails.company}
Date: ${new Date().toLocaleDateString()}

PERFORMANCE SUMMARY
------------------
Overall Score: ${performanceMetrics.overallScore}%
Technical Score: ${performanceMetrics.technicalScore}%
Behavioral Score: ${performanceMetrics.behavioralScore}%
Communication Score: ${performanceMetrics.communicationScore}%

STRENGTHS
---------
${performanceMetrics.strengths.map(s => `• ${s}`).join('\n')}

AREAS FOR IMPROVEMENT
--------------------
${performanceMetrics.weaknesses.map(w => `• ${w}`).join('\n')}

SUGGESTIONS
-----------
${performanceMetrics.suggestions.map(s => `• ${s}`).join('\n')}

QUESTION DETAILS
---------------
${interviewResults.questions.map((q, index) => {
  const answer = interviewResults.answers.find(a => a.questionId === q.id);
  return `${index + 1}. ${q.text} (${q.category})
   Answer: ${answer ? answer.answer : 'No answer provided'}
   `;
}).join('\n')}
    `;
    
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'interview-report.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900">Generating Report...</h1>
        </div>
      </div>
    );
  }

  if (!interviewResults || !performanceMetrics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Interview Results Found</h1>
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Interview Report</h1>
                <p className="text-gray-600">
                  {interviewResults.jobDetails.title} at {interviewResults.jobDetails.company}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={downloadReport}
                  className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </button>
                <Link
                  href="/"
                  className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  New Interview
                </Link>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Performance Overview */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Performance Overview</h2>
                
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {performanceMetrics.overallScore}%
                    </div>
                    <div className="text-lg text-gray-600">Overall Score</div>
                    {getScoreIcon(performanceMetrics.overallScore)}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Technical</span>
                      <span className={`font-semibold ${getScoreColor(performanceMetrics.technicalScore)}`}>
                        {performanceMetrics.technicalScore}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Behavioral</span>
                      <span className={`font-semibold ${getScoreColor(performanceMetrics.behavioralScore)}`}>
                        {performanceMetrics.behavioralScore}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Communication</span>
                      <span className={`font-semibold ${getScoreColor(performanceMetrics.communicationScore)}`}>
                        {performanceMetrics.communicationScore}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                      Strengths
                    </h3>
                    <ul className="space-y-2">
                      {performanceMetrics.strengths.map((strength, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                      Areas for Improvement
                    </h3>
                    <ul className="space-y-2">
                      {performanceMetrics.weaknesses.map((weakness, index) => (
                        <li key={index} className="flex items-start">
                          <AlertCircle className="w-4 h-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{weakness}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Question Details */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Question Details</h2>
                
                <div className="space-y-6">
                  {interviewResults.questions.map((question, index) => {
                    const answer = interviewResults.answers.find(a => a.questionId === question.id);
                    return (
                      <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Question {index + 1}
                          </h3>
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            {question.category}
                          </span>
                        </div>
                        
                        <p className="text-gray-700 mb-3">{question.text}</p>
                        
                        <div className="bg-gray-50 rounded-lg p-3">
                          <h4 className="font-medium text-gray-900 mb-2">Your Answer:</h4>
                          <p className="text-gray-700">
                            {answer ? answer.answer : (
                              <span className="text-gray-500 italic">No answer provided</span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Suggestions */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
                  Improvement Suggestions
                </h3>
                <ul className="space-y-3">
                  {performanceMetrics.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start">
                      <Star className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 text-sm">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Interview Stats */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Clock className="w-5 h-5 text-green-600 mr-2" />
                  Interview Statistics
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Questions</span>
                    <span className="font-semibold">{interviewResults.questions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Questions Answered</span>
                    <span className="font-semibold">{interviewResults.answers.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completion Rate</span>
                    <span className="font-semibold">
                      {Math.round((interviewResults.answers.length / interviewResults.questions.length) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link
                    href="/"
                    className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Start New Interview
                  </Link>
                  <button
                    onClick={downloadReport}
                    className="block w-full text-center bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Download Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 