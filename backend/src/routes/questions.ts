import express from 'express';
import { ParsedResume } from '../utils/pdfParser';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Read environment variables (will be available after dotenv.config() in index.ts)
const getEnvVars = () => ({
  GOOGLE_GENAI_API_KEY: process.env.GOOGLE_GENAI_API_KEY,
  OLLAMA_URL: process.env.OLLAMA_URL || 'http://localhost:11434',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'llama2'
});

const router = express.Router();

interface Question {
  id: number;
  text: string;
  category: string;
}

interface JobDetails {
  title: string;
  company: string;
  description: string;
  requirements: string;
}

// POST /api/questions/generate - Generate interview questions using AI
router.post('/generate', async (req, res) => {
  try {
    const { parsedResume, jobDetails }: { parsedResume: ParsedResume | null, jobDetails: JobDetails } = req.body;
    
    console.log('Question generation request received');
    console.log('Job details:', jobDetails);
    console.log('Resume data:', parsedResume ? 'Present' : 'Not provided');

    // Create a detailed prompt using parsed resume data
    const prompt = createInterviewPrompt(parsedResume, jobDetails);
    const fullPrompt = `You are an expert HR interviewer. Generate relevant interview questions based on job details. ${prompt}`;

    // Get environment variables (read fresh each time)
    const { GOOGLE_GENAI_API_KEY, OLLAMA_URL, OLLAMA_MODEL } = getEnvVars();

    // Try Google GenAI first
    console.log('Checking for Google GenAI API key...', GOOGLE_GENAI_API_KEY ? 'Key found' : 'Key not found');
    if (GOOGLE_GENAI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(GOOGLE_GENAI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
        
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const generatedText = response.text();
        
        console.log('Google GenAI API response received');
        const aiQuestions = extractQuestionsFromGenAI(generatedText, jobDetails);
        
        if (aiQuestions.length > 0) {
          console.log('Using Google GenAI-generated questions!', aiQuestions.length);
          return res.json({
            success: true,
            questions: aiQuestions,
            totalQuestions: aiQuestions.length,
            source: 'Google GenAI'
          });
        }
      } catch (genAIError) {
        console.error('Error connecting to Google GenAI:', genAIError);
        // Fall through to Ollama backup
      }
    }

    // Fallback to Ollama
    try {
      const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: fullPrompt,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 500
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Ollama API response received');
        const aiQuestions = extractQuestionsFromAI(data, jobDetails);
        
        if (aiQuestions.length > 0) {
          console.log('Using Ollama-generated questions!', aiQuestions.length);
          return res.json({
            success: true,
            questions: aiQuestions,
            totalQuestions: aiQuestions.length,
            source: 'Ollama'
          });
        }
      } else {
        console.error('Ollama API error:', response.status, response.statusText);
      }
    } catch (ollamaError) {
      console.error('Error connecting to Ollama:', ollamaError);
    }

    // Fallback to smart mock questions
    console.log('Using smart fallback questions');
    const smartQuestions = generateSmartQuestions(jobDetails, parsedResume);
    
    return res.json({
      success: true,
      questions: smartQuestions,
      totalQuestions: smartQuestions.length,
      source: 'Smart Algorithm'
    });

  } catch (error) {
    console.error('Error generating questions:', error);
    
    // Return basic fallback questions
    const fallbackQuestions = getBasicQuestions();
    
    return res.status(500).json({
      error: 'Failed to generate questions',
      success: false,
      questions: fallbackQuestions,
      source: 'Basic Fallback'
    });
  }
});

function generateSmartQuestions(jobDetails: JobDetails, resumeContent: ParsedResume | null): Question[] {
  const { title, company, description, requirements } = jobDetails;
  
  // Base questions that adapt to job details and resume
  const baseQuestions: Question[] = [
    {
      id: 1,
      text: resumeContent && resumeContent.skills.length > 0 
        ? `I see you have experience with ${resumeContent.skills.slice(0, 3).join(', ')}. Can you elaborate on how you've used these skills in your previous work?`
        : `Can you tell me about your experience with the technologies and skills required for the ${title} position?`,
      category: "Technical"
    },
    {
      id: 2,
      text: resumeContent && resumeContent.projects.length > 0
        ? `Tell me about ${resumeContent.projects[0].name || 'one of your projects'}. What challenges did you face and how did you overcome them?`
        : "What challenges have you faced in your previous projects and how did you overcome them?",
      category: "Behavioral"
    },
    {
      id: 3,
      text: `Why are you interested in joining ${company} and what excites you about this ${title} role?`,
      category: "Motivation"
    },
    {
      id: 4,
      text: resumeContent && resumeContent.experience.length > 0
        ? `In your role as ${resumeContent.experience[0].title || 'your previous position'}, describe a situation where you had to work with a difficult team member or resolve a conflict.`
        : "Describe a situation where you had to work with a difficult team member or resolve a conflict.",
      category: "Behavioral"
    },
    {
      id: 5,
      text: "What are your career goals for the next 3-5 years and how does this position align with them?",
      category: "Career"
    }
  ];

  // Add role-specific questions based on job title and resume
  const roleSpecificQuestions = getRoleSpecificQuestions(title, requirements, resumeContent);
  
  return [...baseQuestions, ...roleSpecificQuestions].slice(0, 5); // Return max 5 questions
}

function getRoleSpecificQuestions(title: string, requirements: string, resumeContent: ParsedResume | null): Question[] {
  const titleLower = title.toLowerCase();
  const questions: Question[] = [];

  // Software Engineer / Developer questions
  if (titleLower.includes('software') || titleLower.includes('developer') || titleLower.includes('programmer')) {
    if (resumeContent && resumeContent.projects.length > 0) {
      questions.push({
        id: 6,
        text: `I noticed you worked on ${resumeContent.projects[0].name || 'a software project'}. Can you walk me through the technical challenges you faced and how you solved them?`,
        category: "Technical"
      });
    } else {
      questions.push({
        id: 6,
        text: "Can you walk me through a complex coding problem you solved recently?",
        category: "Technical"
      });
    }
    
    if (resumeContent && resumeContent.skills.some(skill => 
      ['javascript', 'python', 'java', 'react', 'node.js', 'typescript'].includes(skill.toLowerCase())
    )) {
      const techSkills = resumeContent.skills.filter(skill => 
        ['javascript', 'python', 'java', 'react', 'node.js', 'typescript'].includes(skill.toLowerCase())
      );
      questions.push({
        id: 7,
        text: `You mention experience with ${techSkills.slice(0, 2).join(' and ')}. How do you stay updated with these technologies and what recent changes have excited you?`,
        category: "Technical"
      });
    } else {
      questions.push({
        id: 7,
        text: "How do you stay updated with the latest technologies and programming languages?",
        category: "Technical"
      });
    }
  }

  // Data Science / Analytics questions
  if (titleLower.includes('data') || titleLower.includes('analyst') || titleLower.includes('scientist')) {
    if (resumeContent && resumeContent.projects.some(proj => 
      proj.description && (proj.description.toLowerCase().includes('data') || proj.description.toLowerCase().includes('analysis'))
    )) {
      const dataProject = resumeContent.projects.find(proj => 
        proj.description && (proj.description.toLowerCase().includes('data') || proj.description.toLowerCase().includes('analysis'))
      );
      questions.push({
        id: 8,
        text: `Tell me about ${dataProject?.name || 'your data project'} and the insights you discovered during your analysis.`,
        category: "Technical"
      });
    } else {
      questions.push({
        id: 8,
        text: "Describe a data analysis project you worked on and the insights you discovered.",
        category: "Technical"
      });
    }
    
    questions.push({
      id: 9,
      text: "How do you handle large datasets and ensure data quality?",
      category: "Technical"
    });
  }

  // Management / Leadership questions
  if (titleLower.includes('manager') || titleLower.includes('lead') || titleLower.includes('director')) {
    if (resumeContent && resumeContent.experience.some(exp => 
      exp.title && (exp.title.toLowerCase().includes('lead') || exp.title.toLowerCase().includes('manager'))
    )) {
      const leadershipRole = resumeContent.experience.find(exp => 
        exp.title && (exp.title.toLowerCase().includes('lead') || exp.title.toLowerCase().includes('manager'))
      );
      questions.push({
        id: 10,
        text: `In your role as ${leadershipRole?.title || 'a team lead'}, tell me about a time when you had to lead your team through a difficult project.`,
        category: "Leadership"
      });
    } else {
      questions.push({
        id: 10,
        text: "Tell me about a time when you had to lead a team through a difficult project.",
        category: "Leadership"
      });
    }
    
    questions.push({
      id: 11,
      text: "How do you motivate team members and handle underperforming employees?",
      category: "Leadership"
    });
  }

  return questions;
}

function getBasicQuestions(): Question[] {
  return [
    {
      id: 1,
      text: "Tell me about yourself and your professional background.",
      category: "General"
    },
    {
      id: 2,
      text: "What are your greatest strengths and how do they apply to this role?",
      category: "Behavioral"
    },
    {
      id: 3,
      text: "Describe a challenging situation you faced at work and how you handled it.",
      category: "Behavioral"
    },
    {
      id: 4,
      text: "Why are you interested in this position and our company?",
      category: "Motivation"
    },
    {
      id: 5,
      text: "Where do you see yourself in 5 years?",
      category: "Career"
    }
  ];
}

// AI Helper Functions
function createInterviewPrompt(resumeContent: ParsedResume | null, jobDetails: JobDetails): string {
  let prompt = `Generate 5 interview questions for a ${jobDetails.title} position at ${jobDetails.company}.`;
  
  if (jobDetails.description) {
    prompt += ` Job description: ${jobDetails.description}.`;
  }
  
  if (jobDetails.requirements) {
    prompt += ` Job requirements: ${jobDetails.requirements}.`;
  }
  
  if (resumeContent) {
    prompt += ` Based on the candidate's resume information:`;
    
    if (resumeContent.skills.length > 0) {
      prompt += ` Skills: ${resumeContent.skills.join(', ')}.`;
    }
    
    if (resumeContent.experience.length > 0) {
      const experienceText = resumeContent.experience
        .filter(exp => exp.title || exp.company)
        .map(exp => `${exp.title || 'Role'} at ${exp.company || 'Company'}`)
        .join(', ');
      prompt += ` Experience: ${experienceText}.`;
    }
    
    if (resumeContent.projects.length > 0) {
      const projectsText = resumeContent.projects
        .filter(proj => proj.name)
        .map(proj => proj.name)
        .join(', ');
      prompt += ` Projects: ${projectsText}.`;
    }
    
    if (resumeContent.education.length > 0) {
      const educationText = resumeContent.education
        .filter(edu => edu.degree || edu.institution)
        .map(edu => `${edu.degree || 'Degree'} from ${edu.institution || 'Institution'}`)
        .join(', ');
      prompt += ` Education: ${educationText}.`;
    }
  }
  
  prompt += ` Questions should cover: 1. Technical skills (especially those mentioned in resume) 2. Behavioral situations 3. Motivation 4. Problem solving 5. Experience-based scenarios. Tailor questions to the candidate's background. Format as JSON array with id, text, and category fields.`;
  
  return prompt;
}

function extractQuestionsFromGenAI(generatedText: string, jobDetails: JobDetails): Question[] {
  try {
    console.log('Extracting from Google GenAI data:', generatedText);
    
    // First, try to find a complete JSON array
    const jsonArrayMatch = generatedText.match(/\[[\s\S]*\]/);
    if (jsonArrayMatch) {
      console.log('Found JSON array match:', jsonArrayMatch[0]);
      const questions = JSON.parse(jsonArrayMatch[0]);
      if (Array.isArray(questions) && questions.length > 0) {
        console.log('Extracted questions from JSON array:', questions);
        return questions.map((q: any, index: number) => ({
          id: q.id || index + 1,
          text: q.text || q.question || '',
          category: q.category || getCategoryFromQuestion(q.text || q.question || '')
        }));
      }
    }
    
    // If no JSON array, try to extract individual question objects
    const questionObjectMatches = generatedText.match(/\{[^}]+\}/g);
    if (questionObjectMatches && questionObjectMatches.length > 0) {
      console.log('Found question object matches:', questionObjectMatches);
      const questions = questionObjectMatches.slice(0, 5).map((match: string, index: number) => {
        try {
          const questionObj = JSON.parse(match);
          return {
            id: questionObj.id || index + 1,
            text: questionObj.text || questionObj.question || '',
            category: questionObj.category || getCategoryFromQuestion(questionObj.text || questionObj.question || '')
          };
        } catch (e) {
          return {
            id: index + 1,
            text: match,
            category: getCategoryFromQuestion(match)
          };
        }
      }).filter((q: any) => q.text && q.text.length > 10); // Filter out invalid questions
      
      if (questions.length > 0) {
        console.log('Extracted questions from individual objects:', questions);
        return questions;
      }
    }
    
    // If no structured JSON found, try to extract questions from text
    const questionMatches = generatedText.match(/\d+\.\s*([^?]+\?)/g);
    if (questionMatches && questionMatches.length > 0) {
      console.log('Found question matches:', questionMatches);
      return questionMatches.slice(0, 5).map((match: string, index: number) => ({
        id: index + 1,
        text: match.replace(/^\d+\.\s*/, ''),
        category: getCategoryFromQuestion(match)
      }));
    }
    
    console.log('No questions extracted from Google GenAI response');
  } catch (error) {
    console.error('Error extracting questions from Google GenAI response:', error);
  }
  
  return [];
}

function extractQuestionsFromAI(data: any, jobDetails: JobDetails): Question[] {
  try {
    console.log('Extracting from Ollama data:', JSON.stringify(data, null, 2));
    const generatedText = data.response || '';
    console.log('Generated text:', generatedText);
    
    // First, try to find a complete JSON array
    const jsonArrayMatch = generatedText.match(/\[[\s\S]*\]/);
    if (jsonArrayMatch) {
      console.log('Found JSON array match:', jsonArrayMatch[0]);
      const questions = JSON.parse(jsonArrayMatch[0]);
      if (Array.isArray(questions) && questions.length > 0) {
        console.log('Extracted questions from JSON array:', questions);
        return questions.map((q: any, index: number) => ({
          id: q.id || index + 1,
          text: q.text || '',
          category: q.category || getCategoryFromQuestion(q.text || '')
        }));
      }
    }
    
    // If no JSON array, try to extract individual question objects
    const questionObjectMatches = generatedText.match(/\{[^}]+\}/g);
    if (questionObjectMatches && questionObjectMatches.length > 0) {
      console.log('Found question object matches:', questionObjectMatches);
      const questions = questionObjectMatches.slice(0, 5).map((match: string, index: number) => {
        try {
          const questionObj = JSON.parse(match);
          return {
            id: questionObj.id || index + 1,
            text: questionObj.text || '',
            category: questionObj.category || getCategoryFromQuestion(questionObj.text || '')
          };
        } catch (e) {
          return {
            id: index + 1,
            text: match,
            category: getCategoryFromQuestion(match)
          };
        }
      }).filter((q: any) => q.text && q.text.length > 10); // Filter out invalid questions
      
      if (questions.length > 0) {
        console.log('Extracted questions from individual objects:', questions);
        return questions;
      }
    }
    
    // If no structured JSON found, try to extract questions from text
    const questionMatches = generatedText.match(/\d+\.\s*([^?]+\?)/g);
    if (questionMatches && questionMatches.length > 0) {
      console.log('Found question matches:', questionMatches);
      return questionMatches.slice(0, 5).map((match: string, index: number) => ({
        id: index + 1,
        text: match.replace(/^\d+\.\s*/, ''),
        category: getCategoryFromQuestion(match)
      }));
    }
    
    console.log('No questions extracted from AI response');
  } catch (error) {
    console.error('Error extracting questions from AI response:', error);
  }
  
  return [];
}

function getCategoryFromQuestion(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('technical') || q.includes('technology') || q.includes('coding') || q.includes('programming')) {
    return 'Technical';
  } else if (q.includes('behavior') || q.includes('situation') || q.includes('challenge') || q.includes('conflict')) {
    return 'Behavioral';
  } else if (q.includes('motivation') || q.includes('interest') || q.includes('why')) {
    return 'Motivation';
  } else if (q.includes('team') || q.includes('collaboration') || q.includes('work with')) {
    return 'Teamwork';
  } else {
    return 'General';
  }
}

export default router;
