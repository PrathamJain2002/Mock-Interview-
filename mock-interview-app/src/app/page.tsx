'use client';

import { useState } from 'react';
import { Upload, FileText, Briefcase, Play, Mic } from 'lucide-react';
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

export default function Home() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [userInfo, setUserInfo] = useState({
    name: '',
    mobileNumber: '',
    email: ''
  });
  const [jobDetails, setJobDetails] = useState({
    title: '',
    company: '',
    description: '',
    requirements: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setResumeFile(file);
      setIsParsing(true);
      
      try {
        // Send PDF file directly to server for parsing
        console.log('Sending PDF file to server for parsing...');
        const formData = new FormData();
        formData.append('resume', file);
        
        const response = await apiUtils.parseResume(formData);
        
        if (response.ok) {
          const data = await response.json();
          setParsedResume(data.parsedResume);
          console.log('Resume parsed successfully:', data.parsedResume);
          
          // Show success message with some extracted info
          const skillsCount = data.parsedResume.skills?.length || 0;
          const experienceCount = data.parsedResume.experience?.length || 0;
          alert(`Resume parsed successfully! Found ${skillsCount} skills and ${experienceCount} work experiences.`);
        } else {
          const errorData = await response.json();
          console.error('Server parsing failed:', errorData);
          alert(`Failed to parse resume on server: ${errorData.error || 'Unknown error'}. You can still proceed with the interview.`);
        }
      } catch (error) {
        console.error('Error during resume processing:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        if (errorMessage.includes('No text could be extracted')) {
          alert('Could not extract text from PDF. This might be an image-based PDF or encrypted file. Please use the manual input form below to enter your resume information.');
        } else if (errorMessage.includes('image-based or encrypted')) {
          alert('This PDF appears to be image-based or encrypted. Please use the manual input form below to enter your resume information.');
        } else {
          alert(`Error processing resume: ${errorMessage}. Please use the manual input form below to enter your resume information.`);
        }
      } finally {
        setIsParsing(false);
      }
    } else {
      alert('Please upload a PDF file');
    }
  };



  const updateManualResume = (field: string, value: string) => {
    if (!value.trim()) return;
    
    const currentResume = parsedResume || {
      personalInfo: {},
      skills: [],
      experience: [],
      projects: [],
      education: [],
      certifications: [],
      languages: []
    };
    
    switch (field) {
      case 'skills':
        const skills = value.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
        currentResume.skills = skills;
        break;
        
      case 'experience':
        const experiences = value.split(',').map(exp => {
          const trimmed = exp.trim();
          const parts = trimmed.split(' at ');
          return {
            title: parts[0] || trimmed,
            company: parts[1] || '',
            duration: '',
            description: trimmed
          };
        }).filter(exp => exp.title.length > 0);
        currentResume.experience = experiences;
        break;
        
      case 'projects':
        const projects = value.split(',').map(proj => ({
          name: proj.trim(),
          description: proj.trim(),
          technologies: []
        })).filter(proj => proj.name.length > 0);
        currentResume.projects = projects;
        break;
        
      case 'education':
        if (value.trim()) {
          currentResume.education = [{
            degree: value.trim(),
            institution: '',
            year: ''
          }];
        }
        break;
    }
    
    setParsedResume(currentResume);
    console.log('Manual resume updated:', currentResume);
  };

  const handleUserInfoChange = (field: string, value: string) => {
    setUserInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleJobDetailsChange = (field: string, value: string) => {
    setJobDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStartInterview = () => {
    if (!resumeFile) {
      alert('Please upload your resume');
      return;
    }
    if (!userInfo.name || !userInfo.mobileNumber) {
      alert('Please fill in your name and mobile number');
      return;
    }
    if (!jobDetails.title || !jobDetails.company) {
      alert('Please fill in job title and company');
      return;
    }
    if (isParsing) {
      alert('Please wait for resume parsing to complete');
      return;
    }
    
    setIsLoading(true);
    
    // Navigate to interview page with data including parsed resume and user info
    localStorage.setItem('interviewData', JSON.stringify({
      userInfo: userInfo,
      jobDetails: jobDetails,
      resumeName: resumeFile.name,
      parsedResume: parsedResume
    }));
    window.location.href = '/interview';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              AI Mock Interview
            </h1>
            <p className="text-xl text-gray-600">
              Upload your resume, provide job details, and practice with our AI-powered interview system
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* User Information Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-purple-600 font-semibold text-sm">👤</span>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900">Your Information</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={userInfo.name}
                    onChange={(e) => handleUserInfoChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., John Doe"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    value={userInfo.mobileNumber}
                    onChange={(e) => handleUserInfoChange('mobileNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., +91 98765 43210"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={userInfo.email}
                    onChange={(e) => handleUserInfoChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., john.doe@email.com"
                  />
                </div>
              </div>
            </div>

            {/* Resume Upload Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center mb-4">
                <Upload className="w-6 h-6 text-blue-600 mr-2" />
                <h2 className="text-2xl font-semibold text-gray-900">Upload Resume</h2>
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="resume-upload"
                />
                <label htmlFor="resume-upload" className="cursor-pointer">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">
                    {resumeFile ? resumeFile.name : 'Click to upload your resume (PDF)'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {isParsing ? 'Extracting resume content...' : 
                     resumeFile ? (parsedResume ? 'File uploaded and parsed successfully!' : 'File uploaded, parsing failed') : 
                     'Only PDF files are accepted'}
                  </p>
                  {isParsing && (
                    <div className="flex items-center justify-center mt-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </label>
              </div>
              
              {/* Manual text input fallback */}
              {resumeFile && !parsedResume && !isParsing && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    📝 Manual Resume Information
                  </h3>
                  <p className="text-sm text-blue-800 mb-4">
                    PDF parsing failed or no text could be extracted. Please enter key information from your resume below to get personalized interview questions:
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">
                        Technical Skills (comma-separated)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., JavaScript, React, Python, AWS, Docker, MongoDB"
                        className="w-full p-2 border border-blue-300 rounded text-sm"
                        onChange={(e) => updateManualResume('skills', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">
                        Work Experience (brief descriptions)
                      </label>
                      <textarea
                        placeholder="e.g., Software Engineer at Google (2 years), Frontend Developer at Startup (1 year)"
                        className="w-full p-2 border border-blue-300 rounded text-sm"
                        rows={2}
                        onChange={(e) => updateManualResume('experience', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">
                        Key Projects
                      </label>
                      <textarea
                        placeholder="e.g., E-commerce website with React and Node.js, Mobile app with React Native"
                        className="w-full p-2 border border-blue-300 rounded text-sm"
                        rows={2}
                        onChange={(e) => updateManualResume('projects', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">
                        Education
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Bachelor's in Computer Science from MIT"
                        className="w-full p-2 border border-blue-300 rounded text-sm"
                        onChange={(e) => updateManualResume('education', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Job Details Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center mb-4">
                <Briefcase className="w-6 h-6 text-green-600 mr-2" />
                <h2 className="text-2xl font-semibold text-gray-900">Job Details</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    value={jobDetails.title}
                    onChange={(e) => handleJobDetailsChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Software Engineer"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company *
                  </label>
                  <input
                    type="text"
                    value={jobDetails.company}
                    onChange={(e) => handleJobDetailsChange('company', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Google"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Description
                  </label>
                  <textarea
                    value={jobDetails.description}
                    onChange={(e) => handleJobDetailsChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Paste the job description here..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Key Requirements
                  </label>
                  <textarea
                    value={jobDetails.requirements}
                    onChange={(e) => handleJobDetailsChange('requirements', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="List key requirements or skills..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Resume Summary Section */}
          {parsedResume && (
            <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Resume Summary</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {parsedResume.skills.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {parsedResume.skills.slice(0, 10).map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm">
                          {skill}
                        </span>
                      ))}
                      {parsedResume.skills.length > 10 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-sm">
                          +{parsedResume.skills.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {parsedResume.experience.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Recent Experience</h3>
                    {parsedResume.experience.slice(0, 2).map((exp, index) => (
                      <div key={index} className="mb-2">
                        <p className="font-medium text-gray-900">{exp.title}</p>
                        {exp.company && <p className="text-gray-600 text-sm">{exp.company}</p>}
                      </div>
                    ))}
                  </div>
                )}
                
                {parsedResume.projects.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Projects</h3>
                    {parsedResume.projects.slice(0, 2).map((project, index) => (
                      <div key={index} className="mb-2">
                        <p className="font-medium text-gray-900">{project.name}</p>
                        {project.description && (
                          <p className="text-gray-600 text-sm line-clamp-2">{project.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {parsedResume.education.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Education</h3>
                    {parsedResume.education.slice(0, 2).map((edu, index) => (
                      <div key={index} className="mb-2">
                        {edu.degree && <p className="font-medium text-gray-900">{edu.degree}</p>}
                        {edu.institution && <p className="text-gray-600 text-sm">{edu.institution}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Start Interview Button */}
          <div className="text-center mt-8">
            <button
              onClick={handleStartInterview}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-8 rounded-lg text-lg flex items-center justify-center mx-auto transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Preparing Interview...
                </div>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Start Mock Interview
                </>
              )}
            </button>
          </div>

          {/* Features */}
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mic className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Voice Interaction</h3>
              <p className="text-gray-600">Speak naturally and get real-time feedback</p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI-Powered Questions</h3>
              <p className="text-gray-600">Questions tailored to your resume and job requirements</p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Detailed Report</h3>
              <p className="text-gray-600">Get comprehensive feedback and improvement suggestions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
