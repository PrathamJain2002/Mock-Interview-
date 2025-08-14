import express from 'express';
import { Request, Response } from 'express';

const router = express.Router();

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama2';

// POST /api/performance/analyze
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { questions, answers, jobDetails } = req.body;

    const prompt = `Analyze interview performance for ${jobDetails.title} position at ${jobDetails.company}. Job requirements: ${jobDetails.requirements}. Questions answered: ${answers.length}/${questions.length}. Provide scores and feedback in JSON format with overallScore, technicalScore, behavioralScore, communicationScore, strengths array, weaknesses array, and suggestions array.`;

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: `You are an expert HR interviewer analyzing interview performance. Provide detailed feedback and scores. ${prompt}`,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 600
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Ollama API response:', data);
      const aiAnalysis = extractAnalysisFromAI(data, questions, answers, jobDetails);
      
      if (aiAnalysis) {
        console.log('Using AI-generated analysis!');
        return res.json(aiAnalysis);
      }
    } else {
      console.error('Ollama API error:', response.status, response.statusText);
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

function extractAnalysisFromAI(data: any, questions: any[], answers: any[], jobDetails: any) {
  try {
    console.log('Extracting from Ollama data:', JSON.stringify(data, null, 2));
    const generatedText = data.response || '';
    console.log('Generated text:', generatedText);
    
    // Look for JSON object in the response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      console.log('Found JSON match:', jsonMatch[0]);
      const analysis = JSON.parse(jsonMatch[0]);
      if (analysis.overallScore !== undefined) {
        console.log('Extracted analysis:', analysis);
        return analysis;
      }
    }
    
    console.log('No analysis extracted from AI response');
  } catch (error) {
    console.error('Error extracting analysis from AI response:', error);
  }
  
  return null;
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
  
  return {
    overallScore: Math.round(scores.overall),
    technicalScore: Math.round(scores.technical),
    behavioralScore: Math.round(scores.behavioral),
    communicationScore: Math.round(scores.communication),
    strengths: feedback.strengths,
    weaknesses: feedback.weaknesses,
    suggestions: feedback.suggestions
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
    communicationQuality: 0
  };

  answers.forEach(answer => {
    const text = answer.answer.toLowerCase();
    const wordCount = text.split(' ').length;
    
    analysis.totalWords += wordCount;
    analysis.averageLength += wordCount;
    
    // Count technical terms
    if (text.includes('technology') || text.includes('software') || text.includes('system') || 
        text.includes('development') || text.includes('coding') || text.includes('programming')) {
      analysis.technicalTerms++;
    }
    
    // Count experience mentions
    if (text.includes('experience') || text.includes('worked') || text.includes('project') || 
        text.includes('developed') || text.includes('implemented')) {
      analysis.experienceMentions++;
    }
    
    // Count problem-solving mentions
    if (text.includes('challenge') || text.includes('problem') || text.includes('solved') || 
        text.includes('overcame') || text.includes('difficult')) {
      analysis.problemSolving++;
    }
    
    // Count specific examples
    if (text.includes('example') || text.includes('specific') || text.includes('instance') || 
        text.includes('case') || text.includes('situation')) {
      analysis.specificExamples++;
    }
    
    // Assess communication quality
    if (wordCount > 50 && wordCount < 200) {
      analysis.communicationQuality++;
    }
  });

  analysis.averageLength = analysis.averageLength / answers.length;
  
  return analysis;
}

function calculateScores(answers: any[], analysis: any, jobDetails: any) {
  let overall = 0;
  let technical = 0;
  let behavioral = 0;
  let communication = 0;
  
  // Base score from completion rate
  const completionRate = (answers.length / 5) * 100;
  overall += completionRate * 0.3;
  
  // Technical score based on technical content
  technical += analysis.technicalTerms * 15;
  technical += analysis.experienceMentions * 10;
  technical = Math.min(technical, 100);
  
  // Behavioral score based on problem-solving and examples
  behavioral += analysis.problemSolving * 20;
  behavioral += analysis.specificExamples * 15;
  behavioral += analysis.experienceMentions * 10;
  behavioral = Math.min(behavioral, 100);
  
  // Communication score based on answer quality
  communication += analysis.communicationQuality * 20;
  communication += (analysis.averageLength > 50 ? 30 : 0);
  communication += (analysis.averageLength > 100 ? 20 : 0);
  communication = Math.min(communication, 100);
  
  // Overall score
  overall += (technical + behavioral + communication) / 3 * 0.7;
  overall = Math.min(overall, 100);
  
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

export default router;
