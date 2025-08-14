'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Play, Pause, SkipForward, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';
import { apiUtils } from '@/config/api';

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

interface InterviewData {
  userInfo: {
    name: string;
    mobileNumber: string;
    email?: string;
  };
  jobDetails: {
    title: string;
    company: string;
    description: string;
    requirements: string;
  };
  resumeName: string;
  parsedResume?: ParsedResume;
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

export default function InterviewPage() {
  const [interviewData, setInterviewData] = useState<InterviewData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Load interview data from localStorage
    const data = localStorage.getItem('interviewData');
    if (data) {
      setInterviewData(JSON.parse(data));
    } else {
      // Redirect to home if no data
      window.location.href = '/';
    }

    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
          setCurrentAnswer(prev => prev + ' ' + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }

    // Initialize speech synthesis
    synthesisRef.current = window.speechSynthesis;
  }, []);

  const generateQuestions = async () => {
    setIsLoading(true);
    
    try {
      // Call the Express API to generate questions with parsed resume data
      const response = await apiUtils.generateQuestions({
        parsedResume: interviewData?.parsedResume || null,
        jobDetails: interviewData?.jobDetails
      });

      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }

      const data = await response.json();
      const generatedQuestions = data.questions;

      setQuestions(generatedQuestions);
      setCurrentQuestion(generatedQuestions[0]);
      setIsInterviewStarted(true);
    } catch (error) {
      console.error('Error generating questions:', error);
      
      // Fallback to mock questions if API fails
      const mockQuestions: Question[] = [
        {
          id: 1,
          text: "Can you tell me about your experience with the technologies mentioned in this role?",
          category: "Technical"
        },
        {
          id: 2,
          text: "What challenges have you faced in your previous projects and how did you overcome them?",
          category: "Behavioral"
        },
        {
          id: 3,
          text: "Why are you interested in joining our company?",
          category: "Motivation"
        },
        {
          id: 4,
          text: "Describe a situation where you had to work with a difficult team member.",
          category: "Behavioral"
        },
        {
          id: 5,
          text: "What are your career goals for the next 3-5 years?",
          category: "Career"
        }
      ];

      setQuestions(mockQuestions);
      setCurrentQuestion(mockQuestions[0]);
      setIsInterviewStarted(true);
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speakQuestion = (question: string) => {
    if (synthesisRef.current && !isMuted) {
      const utterance = new SpeechSynthesisUtterance(question);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      synthesisRef.current.speak(utterance);
      setIsSpeaking(true);
      
      utterance.onend = () => {
        setIsSpeaking(false);
      };
    }
  };

  const nextQuestion = () => {
    if (currentAnswer.trim()) {
      // Save current answer
      const answer: Answer = {
        questionId: currentQuestion!.id,
        answer: currentAnswer,
        timestamp: new Date()
      };
      setAnswers(prev => [...prev, answer]);
    }

    const nextIndex = questionIndex + 1;
    if (nextIndex < questions.length) {
      setQuestionIndex(nextIndex);
      setCurrentQuestion(questions[nextIndex]);
      setCurrentAnswer('');
      setTranscript('');
      speakQuestion(questions[nextIndex].text);
    } else {
      // Interview completed
      finishInterview();
    }
  };

  const finishInterview = () => {
    if (currentAnswer.trim()) {
      const answer: Answer = {
        questionId: currentQuestion!.id,
        answer: currentAnswer,
        timestamp: new Date()
      };
      setAnswers(prev => [...prev, answer]);
    }
    
    // Save interview results
    localStorage.setItem('interviewResults', JSON.stringify({
      userInfo: interviewData?.userInfo,
      questions,
      answers: [...answers, ...(currentAnswer.trim() ? [{
        questionId: currentQuestion!.id,
        answer: currentAnswer,
        timestamp: new Date()
      }] : [])],
      jobDetails: interviewData?.jobDetails
    }));
    
    window.location.href = '/report';
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
    }
  };

  if (!interviewData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  if (!isInterviewStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Ready for Your Interview?</h1>
            
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Interview Details</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p><strong>Candidate:</strong> {interviewData.userInfo.name}</p>
                  <p><strong>Mobile:</strong> {interviewData.userInfo.mobileNumber}</p>
                  {interviewData.userInfo.email && <p><strong>Email:</strong> {interviewData.userInfo.email}</p>}
                </div>
                <div className="space-y-2">
                  <p><strong>Position:</strong> {interviewData.jobDetails.title}</p>
                  <p><strong>Company:</strong> {interviewData.jobDetails.company}</p>
                  <p><strong>Resume:</strong> {interviewData.resumeName}</p>
                </div>
              </div>
            </div>

            <button
              onClick={generateQuestions}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-8 rounded-lg text-lg flex items-center justify-center mx-auto transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Preparing Questions...
                </div>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Start Interview
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Mock Interview</h1>
                <p className="text-gray-600">
                  Question {questionIndex + 1} of {questions.length} • {interviewData.jobDetails.title} at {interviewData.jobDetails.company}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <Link
                  href="/"
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Exit Interview
                </Link>
              </div>
            </div>
          </div>

          {/* Question Display */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Current Question</h2>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {currentQuestion?.category}
              </span>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <p className="text-lg text-gray-900">{currentQuestion?.text}</p>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => speakQuestion(currentQuestion?.text || '')}
                disabled={isSpeaking}
                className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {isSpeaking ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {isSpeaking ? 'Speaking...' : 'Repeat Question'}
              </button>
            </div>
          </div>

          {/* Answer Section */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Your Answer</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    isListening 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                  {isListening ? 'Stop Recording' : 'Start Recording'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Type your answer here or use voice recording..."
                className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              
              {transcript && (
                <div className="bg-yellow-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Live transcript: {transcript}</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back to Home
            </button>
            
            <button
              onClick={nextQuestion}
              className="flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {questionIndex + 1 === questions.length ? 'Finish Interview' : 'Next Question'}
              <SkipForward className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 