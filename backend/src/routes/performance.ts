import express from 'express';
import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

// Read environment variables (will be available after dotenv.config() in index.ts)
const getEnvVars = () => ({
  GOOGLE_GENAI_API_KEY: process.env.GOOGLE_GENAI_API_KEY,
  OLLAMA_URL: process.env.OLLAMA_URL || 'http://localhost:11434',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'llama2'
});

// Helper function to create formatted Q&A section for the prompt
function createQASection(questions: any[], answers: any[]): string {
  let qaText = '';
  
  questions.forEach((question, index) => {
    qaText += `\nQuestion ${index + 1}: ${question.question}\n`;
    qaText += `Type: ${question.type || 'General'}\n`;
    
    // Find corresponding answer
    const answer = answers.find(ans => ans.questionIndex === index);
    if (answer) {
      qaText += `Answer: ${answer.answer}\n`;
      qaText += `Answer Length: ${answer.answer.split(' ').length} words\n`;
    } else {
      qaText += `Answer: [No answer provided]\n`;
    }
    qaText += `---\n`;
  });
  
  return qaText;
}

// POST /api/performance/analyze
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { questions, answers, jobDetails } = req.body;

    // Create detailed Q&A section for the prompt
    const qaSection = createQASection(questions, answers);
    
    const prompt = `Analyze interview performance for ${jobDetails.title} position at ${jobDetails.company}. 

Job Requirements: ${jobDetails.requirements}

Interview Questions and Answers:
${qaSection}

Questions answered: ${answers.length}/${questions.length}

You are an expert interviewer analyzing interview performance. CRITICALLY evaluate each answer for relevance, substance, and quality. Generate ONLY valid JSON with this exact structure:

{
  "overallScore": 75,
  "technicalScore": 80,
  "behavioralScore": 70,
  "communicationScore": 75,
  "strengths": ["Good technical knowledge", "Clear communication"],
  "weaknesses": ["Could provide more details", "Needs specific examples"],
  "suggestions": ["Practice technical questions", "Use STAR method"],
  "detailedFeedback": {
    "question1": "Good technical knowledge demonstrated",
    "question2": "Could provide more specific examples"
  }
}

STRICT SCORING RULES - BE HARSH WITH POOR ANSWERS:

FOR IRRELEVANT/NONSENSICAL ANSWERS (like "yup", "tyu", "cyu", "opo", "bji"):
- overallScore: 5-15 (NEVER above 20)
- technicalScore: 0-10 (NEVER above 15)
- behavioralScore: 0-10 (NEVER above 15)
- communicationScore: 5-15 (NEVER above 20)

FOR VERY SHORT/INSUFFICIENT ANSWERS (under 20 words, no substance):
- overallScore: 10-25 (NEVER above 30)
- technicalScore: 5-20 (NEVER above 25)
- behavioralScore: 5-20 (NEVER above 25)
- communicationScore: 10-25 (NEVER above 30)

FOR MEDIOCRE ANSWERS (some content but lacks depth):
- overallScore: 30-60
- technicalScore: 25-60
- behavioralScore: 25-60
- communicationScore: 30-60

FOR GOOD ANSWERS (relevant, detailed, specific):
- overallScore: 70-90
- technicalScore: 70-90
- behavioralScore: 70-90
- communicationScore: 70-90

FOR EXCELLENT ANSWERS (comprehensive, specific examples, clear structure):
- overallScore: 85-100
- technicalScore: 85-100
- behavioralScore: 85-100
- communicationScore: 85-100

MANDATORY PENALTIES:
- Single word answers: MAX 15 points total
- Nonsensical responses: MAX 20 points total
- Irrelevant responses: MAX 25 points total
- No technical content for technical questions: technicalScore MAX 20
- No examples for behavioral questions: behavioralScore MAX 25
- Unclear communication: communicationScore MAX 30

REQUIRED REWARDS:
- Specific technical examples: +20-30 points
- Detailed problem-solving scenarios: +20-30 points
- Clear, structured responses: +15-25 points
- Relevant work experience: +15-25 points
- STAR method usage: +10-20 points

CRITICAL: Return ONLY the JSON object. Be extremely strict - poor answers MUST get low scores!

Focus on:
1. Technical knowledge and skills demonstrated
2. Problem-solving approach and examples
3. Communication clarity and structure
4. Relevance to the job requirements
5. Specific strengths and areas for improvement`;

    const fullPrompt = `You are an expert HR interviewer and technical recruiter with 10+ years of experience. Analyze the interview performance and provide detailed, constructive feedback. ${prompt}`;

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
        const aiAnalysis = extractAnalysisFromGenAI(generatedText, questions, answers, jobDetails);
        
        if (aiAnalysis) {
          console.log('Using Google GenAI-generated analysis!');
          return res.json(aiAnalysis);
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
            num_predict: 1000
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Ollama API response:', data);
        const aiAnalysis = extractAnalysisFromAI(data, questions, answers, jobDetails);
        
        if (aiAnalysis) {
          console.log('Using Ollama-generated analysis!');
          return res.json(aiAnalysis);
        }
      } else {
        console.error('Ollama API error:', response.status, response.statusText);
      }
    } catch (ollamaError) {
      console.error('Error connecting to Ollama:', ollamaError);
    }

    // Fallback to smart analysis
    console.log('Using smart fallback analysis');
    const smartAnalysis = generateSmartAnalysis(questions, answers, jobDetails);
    return res.json(smartAnalysis);

  } catch (error) {
    console.error('Error analyzing performance:', error);
    
    // Return smart analysis as fallback
    const smartAnalysis = generateSmartAnalysis([], [], { title: '', company: '', requirements: '' });
    return res.json(smartAnalysis);
  }
});

function extractAnalysisFromGenAI(generatedText: string, questions: any[], answers: any[], jobDetails: any) {
  try {
    console.log('Extracting from Google GenAI data:', generatedText);
    
    // Try multiple JSON extraction methods
    let analysis = null;
    
    // Method 1: Look for complete JSON object (more specific pattern)
    const jsonMatch = generatedText.match(/\{\s*"overallScore"[\s\S]*?\}/);
    if (jsonMatch) {
      console.log('Found JSON match:', jsonMatch[0]);
      try {
        analysis = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.log('JSON parse failed, trying to fix common issues...');
        // Try to fix common JSON issues
        let fixedJson = jsonMatch[0]
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/([^\\])\\([^\\])/g, '$1\\\\$2') // Fix backslashes
          .replace(/(\w+):/g, '"$1":') // Quote unquoted keys
          .replace(/:(\w+)/g, ':"$1"') // Quote unquoted string values
          .replace(/:(\d+\.?\d*)/g, ':$1') // Keep numbers as numbers
          .replace(/:(\w+)/g, ':"$1"'); // Quote remaining unquoted values
        
        try {
          analysis = JSON.parse(fixedJson);
        } catch (secondError) {
          console.log('Fixed JSON still invalid, trying manual extraction...');
          analysis = extractAnalysisManually(generatedText);
        }
      }
    } else {
      // Try broader JSON pattern if specific one fails
      const broadJsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (broadJsonMatch) {
        console.log('Found broad JSON match:', broadJsonMatch[0]);
        try {
          analysis = JSON.parse(broadJsonMatch[0]);
        } catch (parseError) {
          console.log('Broad JSON parse failed, trying manual extraction...');
          analysis = extractAnalysisManually(generatedText);
        }
      }
    }
    
    // Method 2: Try to extract individual fields manually
    if (!analysis) {
      analysis = extractAnalysisManually(generatedText);
    }
    
    if (analysis) {
      // Validate required fields
      if (analysis.overallScore !== undefined && 
          analysis.technicalScore !== undefined && 
          analysis.behavioralScore !== undefined && 
          analysis.communicationScore !== undefined) {
        
        // Ensure arrays exist and have default values
        analysis.strengths = analysis.strengths || ['Good communication skills'];
        analysis.weaknesses = analysis.weaknesses || ['Could provide more detailed responses'];
        analysis.suggestions = analysis.suggestions || ['Practice more interview questions'];
        analysis.detailedFeedback = analysis.detailedFeedback || {};
        
        console.log('Extracted analysis:', analysis);
        return analysis;
      }
    }
    
    console.log('No valid analysis extracted from Google GenAI response');
  } catch (error) {
    console.error('Error extracting analysis from Google GenAI response:', error);
  }
  
  return null;
}

function extractAnalysisFromAI(data: any, questions: any[], answers: any[], jobDetails: any) {
  try {
    console.log('Extracting from Ollama data:', JSON.stringify(data, null, 2));
    const generatedText = data.response || '';
    console.log('Generated text:', generatedText);
    
    // Try multiple JSON extraction methods
    let analysis = null;
    
    // Method 1: Look for complete JSON object (more specific pattern)
    const jsonMatch = generatedText.match(/\{\s*"overallScore"[\s\S]*?\}/);
    if (jsonMatch) {
      console.log('Found JSON match:', jsonMatch[0]);
      try {
        analysis = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.log('JSON parse failed, trying to fix common issues...');
        // Try to fix common JSON issues
        let fixedJson = jsonMatch[0]
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/([^\\])\\([^\\])/g, '$1\\\\$2') // Fix backslashes
          .replace(/(\w+):/g, '"$1":') // Quote unquoted keys
          .replace(/:(\w+)/g, ':"$1"') // Quote unquoted string values
          .replace(/:(\d+\.?\d*)/g, ':$1') // Keep numbers as numbers
          .replace(/:(\w+)/g, ':"$1"'); // Quote remaining unquoted values
        
        try {
          analysis = JSON.parse(fixedJson);
        } catch (secondError) {
          console.log('Fixed JSON still invalid, trying manual extraction...');
          analysis = extractAnalysisManually(generatedText);
        }
      }
    } else {
      // Try broader JSON pattern if specific one fails
      const broadJsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (broadJsonMatch) {
        console.log('Found broad JSON match:', broadJsonMatch[0]);
        try {
          analysis = JSON.parse(broadJsonMatch[0]);
        } catch (parseError) {
          console.log('Broad JSON parse failed, trying manual extraction...');
          analysis = extractAnalysisManually(generatedText);
        }
      }
    }
    
    // Method 2: Try to extract individual fields manually
    if (!analysis) {
      analysis = extractAnalysisManually(generatedText);
    }
    
    if (analysis) {
      // Validate required fields
      if (analysis.overallScore !== undefined && 
          analysis.technicalScore !== undefined && 
          analysis.behavioralScore !== undefined && 
          analysis.communicationScore !== undefined) {
        
        // Ensure arrays exist and have default values
        analysis.strengths = analysis.strengths || ['Good communication skills'];
        analysis.weaknesses = analysis.weaknesses || ['Could provide more detailed responses'];
        analysis.suggestions = analysis.suggestions || ['Practice more interview questions'];
        analysis.detailedFeedback = analysis.detailedFeedback || {};
        
        console.log('Extracted analysis:', analysis);
        return analysis;
      }
    }
    
    console.log('No valid analysis extracted from AI response');
  } catch (error) {
    console.error('Error extracting analysis from AI response:', error);
  }
  
  return null;
}

function extractAnalysisManually(text: string) {
  const analysis: any = {};
  
  try {
    // Extract scores using more flexible regex patterns
    const overallMatch = text.match(/overallScore["\s]*:[\s]*(\d+)/i) || text.match(/overall["\s]*:[\s]*(\d+)/i);
    if (overallMatch) analysis.overallScore = parseInt(overallMatch[1]);
    
    const technicalMatch = text.match(/technicalScore["\s]*:[\s]*(\d+)/i) || text.match(/technical["\s]*:[\s]*(\d+)/i);
    if (technicalMatch) analysis.technicalScore = parseInt(technicalMatch[1]);
    
    const behavioralMatch = text.match(/behavioralScore["\s]*:[\s]*(\d+)/i) || text.match(/behavioral["\s]*:[\s]*(\d+)/i);
    if (behavioralMatch) analysis.behavioralScore = parseInt(behavioralMatch[1]);
    
    const communicationMatch = text.match(/communicationScore["\s]*:[\s]*(\d+)/i) || text.match(/communication["\s]*:[\s]*(\d+)/i);
    if (communicationMatch) analysis.communicationScore = parseInt(communicationMatch[1]);
    
    // Extract arrays with more flexible patterns
    const strengthsMatch = text.match(/strengths["\s]*:[\s]*\[(.*?)\]/is) || text.match(/strengths["\s]*:[\s]*"(.*?)"/is);
    if (strengthsMatch) {
      analysis.strengths = extractArrayFromText(strengthsMatch[1]);
    }
    
    const weaknessesMatch = text.match(/weaknesses["\s]*:[\s]*\[(.*?)\]/is) || text.match(/weaknesses["\s]*:[\s]*"(.*?)"/is);
    if (weaknessesMatch) {
      analysis.weaknesses = extractArrayFromText(weaknessesMatch[1]);
    }
    
    const suggestionsMatch = text.match(/suggestions["\s]*:[\s]*\[(.*?)\]/is) || text.match(/suggestions["\s]*:[\s]*"(.*?)"/is);
    if (suggestionsMatch) {
      analysis.suggestions = extractArrayFromText(suggestionsMatch[1]);
    }
    
    // Extract detailed feedback
    const detailedFeedbackMatch = text.match(/detailedFeedback["\s]*:[\s]*\{(.*?)\}/is);
    if (detailedFeedbackMatch) {
      analysis.detailedFeedback = extractDetailedFeedbackFromText(detailedFeedbackMatch[1]);
    }
    
    // If we have at least the scores, return the analysis
    if (analysis.overallScore !== undefined || analysis.technicalScore !== undefined) {
      // Set default values for missing fields
      analysis.strengths = analysis.strengths || ['Good communication skills'];
      analysis.weaknesses = analysis.weaknesses || ['Could provide more detailed responses'];
      analysis.suggestions = analysis.suggestions || ['Practice more interview questions'];
      analysis.detailedFeedback = analysis.detailedFeedback || {};
      
      return analysis;
    }
  } catch (error) {
    console.error('Error in manual extraction:', error);
  }
  
  return null;
}

function extractDetailedFeedbackFromText(feedbackText: string): { [key: string]: string } {
  const feedback: { [key: string]: string } = {};
  
  try {
    // Look for question patterns like "question1": "feedback"
    const questionMatches = feedbackText.match(/"question(\d+)"["\s]*:[\s]*"(.*?)"/g);
    if (questionMatches) {
      questionMatches.forEach(match => {
        const questionMatch = match.match(/"question(\d+)"["\s]*:[\s]*"(.*?)"/);
        if (questionMatch) {
          feedback[`question${questionMatch[1]}`] = questionMatch[2];
        }
      });
    }
  } catch (error) {
    console.error('Error extracting detailed feedback:', error);
  }
  
  return feedback;
}

function extractArrayFromText(arrayText: string): string[] {
  const items: string[] = [];
  const lines = arrayText.split(/[,\n]/);
  
  for (const line of lines) {
    const cleanItem = line.replace(/["\[\]]/g, '').trim();
    if (cleanItem.length > 0) {
      items.push(cleanItem);
    }
  }
  
  return items;
}

function generateSmartAnalysis(questions: any[], answers: any[], jobDetails: any) {
  const totalQuestions = questions.length;
  const answeredQuestions = answers.length;
  const completionRate = (answeredQuestions / totalQuestions) * 100;
  
  // Analyze answer content and patterns
  const answerAnalysis = analyzeAnswers(answers);
  
  // Calculate scores based on multiple factors
  const scores = calculateScores(answers, answerAnalysis, jobDetails);
  
  // Generate personalized feedback
  const feedback = generateFeedback(answers, answerAnalysis, jobDetails);
  
  // Generate detailed feedback for each question
  const detailedFeedback = generateDetailedFeedback(questions, answers, jobDetails);

  return {
    overallScore: Math.round(scores.overall),
    technicalScore: Math.round(scores.technical),
    behavioralScore: Math.round(scores.behavioral),
    communicationScore: Math.round(scores.communication),
    strengths: feedback.strengths,
    weaknesses: feedback.weaknesses,
    suggestions: feedback.suggestions,
    detailedFeedback: detailedFeedback
  };
}

function analyzeAnswers(answers: any[]) {
  const analysis = {
    totalWords: 0,
    averageLength: 0,
    technicalTerms: 0,
    experienceMentions: 0,
    problemSolving: 0,
    specificExamples: 0,
    communicationQuality: 0,
    nonsensicalAnswers: 0,
    poorQualityAnswers: 0,
    meaningfulAnswers: 0
  };

  answers.forEach(answer => {
    const text = answer.answer.toLowerCase().trim();
    const wordCount = text.split(/\s+/).filter((word: string) => word.length > 0).length;
    
    analysis.totalWords += wordCount;
    analysis.averageLength += wordCount;
    
    // Check for nonsensical answers (like "yup", "tyu", "cyu", "opo", "bji")
    if (isNonsensicalAnswer(text, wordCount)) {
      analysis.nonsensicalAnswers++;
      return; // Skip further analysis for nonsensical answers
    }
    
    // Check for poor quality answers
    if (isPoorQualityAnswer(text, wordCount)) {
      analysis.poorQualityAnswers++;
    } else {
      analysis.meaningfulAnswers++;
    }
    
    // Count technical terms
    if (text.includes('technology') || text.includes('software') || text.includes('system') || 
        text.includes('development') || text.includes('coding') || text.includes('programming') ||
        text.includes('api') || text.includes('database') || text.includes('framework') ||
        text.includes('react') || text.includes('node') || text.includes('javascript')) {
      analysis.technicalTerms++;
    }
    
    // Count experience mentions
    if (text.includes('experience') || text.includes('worked') || text.includes('project') || 
        text.includes('developed') || text.includes('implemented') || text.includes('built') ||
        text.includes('created') || text.includes('managed') || text.includes('led')) {
      analysis.experienceMentions++;
    }
    
    // Count problem-solving mentions
    if (text.includes('challenge') || text.includes('problem') || text.includes('solved') || 
        text.includes('overcame') || text.includes('difficult') || text.includes('troubleshoot') ||
        text.includes('debug') || text.includes('fix') || text.includes('issue')) {
      analysis.problemSolving++;
    }
    
    // Count specific examples
    if (text.includes('example') || text.includes('specific') || text.includes('instance') || 
        text.includes('case') || text.includes('situation') || text.includes('time when') ||
        text.includes('once') || text.includes('when i')) {
      analysis.specificExamples++;
    }
    
    // Assess communication quality (much stricter)
    if (wordCount >= 20 && wordCount <= 200 && text.split(/[.!?]+/).length > 1) {
      analysis.communicationQuality++;
    }
  });

  analysis.averageLength = analysis.averageLength / answers.length;
  
  return analysis;
}

function isNonsensicalAnswer(text: string, wordCount: number): boolean {
  // Single word answers
  if (wordCount <= 1) return true;
  
  // Very short nonsensical patterns
  if (wordCount <= 4) {
    const nonsensicalPatterns = [
      /^[a-z]{1,4}$/i, // 1-4 letter words only
      /^[^a-zA-Z0-9\s]*$/g, // Only special characters
      /^[0-9\s]*$/g, // Only numbers
      /(.)\1{2,}/g, // Repeated characters like "aaa"
      /^[bcdfghjklmnpqrstvwxyz]{1,4}$/i // Only consonants
    ];
    
    for (const pattern of nonsensicalPatterns) {
      if (pattern.test(text)) {
        return true;
      }
    }
  }
  
  return false;
}

function isPoorQualityAnswer(text: string, wordCount: number): boolean {
  // Very short answers
  if (wordCount < 10) return true;
  
  // Short answers without meaningful content
  if (wordCount < 20) {
    const meaningfulWords = [
      'worked', 'developed', 'created', 'built', 'implemented', 'designed',
      'managed', 'led', 'collaborated', 'solved', 'challenge', 'problem',
      'experience', 'project', 'team', 'result', 'outcome', 'success',
      'learned', 'improved', 'optimized', 'enhanced', 'achieved'
    ];
    
    const hasMeaningfulContent = meaningfulWords.some(word => text.includes(word));
    return !hasMeaningfulContent;
  }
  
  return false;
}

function calculateScores(answers: any[], analysis: any, jobDetails: any) {
  let overall = 0;
  let technical = 0;
  let behavioral = 0;
  let communication = 0;
  
  // EXTREME penalties for nonsensical answers
  if (analysis.nonsensicalAnswers > 0) {
    // If any nonsensical answers, cap all scores very low
    overall = Math.min(15, analysis.nonsensicalAnswers * 5);
    technical = Math.min(10, analysis.nonsensicalAnswers * 3);
    behavioral = Math.min(10, analysis.nonsensicalAnswers * 3);
    communication = Math.min(15, analysis.nonsensicalAnswers * 4);
    
    return { overall, technical, behavioral, communication };
  }
  
  // Heavy penalties for poor quality answers
  if (analysis.poorQualityAnswers > 0) {
    const poorQualityPenalty = analysis.poorQualityAnswers * 20;
    
    // Technical score - very strict
    if (analysis.technicalTerms > 0) {
      technical = Math.min(analysis.technicalTerms * 15, 100);
    } else {
      technical = 0;
    }
    technical = Math.max(0, technical - poorQualityPenalty);
    
    // Behavioral score - very strict
    if (analysis.problemSolving > 0 || analysis.specificExamples > 0) {
      behavioral = Math.min((analysis.problemSolving + analysis.specificExamples) * 12, 100);
    } else {
      behavioral = 0;
    }
    behavioral = Math.max(0, behavioral - poorQualityPenalty);
    
    // Communication score - very strict
    if (analysis.communicationQuality > 0) {
      communication = Math.min(analysis.communicationQuality * 20, 100);
    } else {
      communication = 0;
    }
    communication = Math.max(0, communication - poorQualityPenalty);
    
    // Overall score - heavily penalized
    overall = Math.max(0, (technical + behavioral + communication) / 3 - poorQualityPenalty);
    
    return { overall, technical, behavioral, communication };
  }
  
  // Normal scoring for meaningful answers
  if (analysis.meaningfulAnswers > 0) {
    // Technical score
    if (analysis.technicalTerms > 0) {
      technical = Math.min(analysis.technicalTerms * 20, 100);
    } else {
      technical = 0;
    }
    
    // Behavioral score
    if (analysis.problemSolving > 0 || analysis.specificExamples > 0) {
      behavioral = Math.min((analysis.problemSolving + analysis.specificExamples) * 15, 100);
    } else {
      behavioral = 0;
    }
    
    // Communication score
    if (analysis.communicationQuality > 0) {
      communication = Math.min(analysis.communicationQuality * 25, 100);
    } else {
      communication = 0;
    }
    
    // Overall score
    overall = (technical + behavioral + communication) / 3;
  }
  
  // Ensure scores are within bounds
  overall = Math.max(0, Math.min(100, overall));
  technical = Math.max(0, Math.min(100, technical));
  behavioral = Math.max(0, Math.min(100, behavioral));
  communication = Math.max(0, Math.min(100, communication));
  
  return { overall, technical, behavioral, communication };
}

function generateFeedback(answers: any[], analysis: any, jobDetails: any) {
  const strengths = [];
  const weaknesses = [];
  const suggestions = [];
  
  // Analyze strengths
  if (analysis.experienceMentions > 0) {
    strengths.push('Demonstrated relevant experience and background');
  }
  if (analysis.problemSolving > 0) {
    strengths.push('Showed problem-solving abilities and critical thinking');
  }
  if (analysis.specificExamples > 0) {
    strengths.push('Provided specific examples and concrete situations');
  }
  if (analysis.communicationQuality > 0) {
    strengths.push('Good communication skills and clarity in responses');
  }
  if (analysis.technicalTerms > 0) {
    strengths.push('Demonstrated technical knowledge and expertise');
  }
  
  // Default strengths if none detected
  if (strengths.length === 0) {
    strengths.push('Good communication skills');
    strengths.push('Demonstrated relevant experience');
    strengths.push('Provided specific examples');
  }
  
  // Analyze weaknesses
  if (analysis.averageLength < 50) {
    weaknesses.push('Could provide more detailed and comprehensive answers');
  }
  if (analysis.specificExamples === 0) {
    weaknesses.push('Consider using more specific examples and concrete situations');
  }
  if (analysis.problemSolving === 0) {
    weaknesses.push('Could demonstrate more problem-solving scenarios');
  }
  if (analysis.technicalTerms === 0 && jobDetails.title.toLowerCase().includes('technical')) {
    weaknesses.push('Could elaborate more on technical skills and knowledge');
  }
  
  // Default weaknesses if none detected
  if (weaknesses.length === 0) {
    weaknesses.push('Could provide more detailed technical explanations');
    weaknesses.push('Consider using more specific metrics in answers');
    weaknesses.push('Practice STAR method for behavioral questions');
  }
  
  // Generate suggestions
  suggestions.push('Practice common interview questions regularly');
  suggestions.push('Prepare specific examples for your experience');
  suggestions.push('Use the STAR method (Situation, Task, Action, Result)');
  suggestions.push('Research the company and role thoroughly');
  suggestions.push('Practice speaking clearly and confidently');
  
  if (analysis.averageLength < 50) {
    suggestions.push('Practice giving more detailed responses');
  }
  if (analysis.specificExamples === 0) {
    suggestions.push('Prepare specific examples for common interview questions');
  }
  
  return { strengths, weaknesses, suggestions };
}

function generateDetailedFeedback(questions: any[], answers: any[], jobDetails: any) {
  const detailedFeedback: { [key: string]: string } = {};
  
  questions.forEach((question, index) => {
    const answer = answers.find(ans => ans.questionIndex === index);
    const questionKey = `question${index + 1}`;
    
    if (!answer) {
      detailedFeedback[questionKey] = "No answer provided. Consider preparing responses for common interview questions.";
      return;
    }
    
    const answerText = answer.answer.toLowerCase();
    const wordCount = answer.answer.split(' ').length;
    const questionType = question.type || 'General';
    
    let feedback = '';
    
    // Analyze answer quality based on question type
    if (questionType.toLowerCase().includes('technical')) {
      if (answerText.includes('experience') || answerText.includes('worked') || answerText.includes('developed')) {
        feedback += "Good use of specific experience and examples. ";
      } else {
        feedback += "Consider providing more specific technical examples from your experience. ";
      }
      
      if (wordCount < 30) {
        feedback += "Could elaborate more on technical details and implementation. ";
      }
    } else if (questionType.toLowerCase().includes('behavioral')) {
      if (answerText.includes('situation') || answerText.includes('task') || answerText.includes('action') || answerText.includes('result')) {
        feedback += "Excellent use of STAR method for behavioral questions. ";
      } else {
        feedback += "Consider using the STAR method (Situation, Task, Action, Result) for better structure. ";
      }
      
      if (wordCount < 40) {
        feedback += "Could provide more detailed examples and context. ";
      }
    } else {
      // General questions
      if (wordCount < 20) {
        feedback += "Consider providing more comprehensive answers with specific examples. ";
      } else if (wordCount > 100) {
        feedback += "Good detailed response, but ensure you stay focused on the key points. ";
      } else {
        feedback += "Well-structured response with good detail. ";
      }
    }
    
    // Communication quality
    if (wordCount >= 30 && wordCount <= 80) {
      feedback += "Good communication skills demonstrated. ";
    } else if (wordCount < 30) {
      feedback += "Consider expanding your answer for better clarity. ";
    }
    
    // Relevance to job
    if (answerText.includes(jobDetails.title.toLowerCase()) || 
        answerText.includes(jobDetails.company.toLowerCase()) ||
        answerText.includes('relevant') || answerText.includes('applicable')) {
      feedback += "Good relevance to the position and company. ";
    }
    
    // Default feedback if none generated
    if (!feedback.trim()) {
      feedback = "Good response. Consider adding more specific examples to strengthen your answer.";
    }
    
    detailedFeedback[questionKey] = feedback.trim();
  });
  
  return detailedFeedback;
}

export default router;
