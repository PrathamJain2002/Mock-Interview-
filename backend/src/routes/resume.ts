import express from 'express';
import multer from 'multer';
import { extractTextFromPDF, parseResumeContent } from '../utils/pdfParser';

const router = express.Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// POST /api/resume/parse - Parse uploaded PDF resume
router.post('/parse', upload.single('resume'), async (req, res) => {
  try {
    console.log('Resume parsing API called');
    
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file provided',
        success: false 
      });
    }

    console.log('PDF file received:', req.file.originalname, 'Size:', req.file.size);

    // Extract text using pdf-parse
    console.log('Starting PDF text extraction...');
    const pdfText = await extractTextFromPDF(req.file.buffer);
    
    console.log('PDF text extracted successfully, length:', pdfText.length);

    if (!pdfText || pdfText.trim().length === 0) {
      return res.status(400).json({ 
        error: 'No text could be extracted from the PDF. It might be image-based or encrypted.',
        success: false
      });
    }

    // Parse and structure the resume content
    console.log('Starting resume content parsing...');
    const parsedResume = parseResumeContent(pdfText);
    
    console.log('Resume parsing completed successfully');
    console.log('Parsed resume summary:', {
      skills: parsedResume.skills.length,
      experience: parsedResume.experience.length,
      projects: parsedResume.projects.length,
      education: parsedResume.education.length
    });

    return res.json({ 
      success: true,
      rawText: pdfText,
      parsedResume,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });

  } catch (error) {
    console.error('Error parsing resume:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
    
    return res.status(500).json({ 
      error: `Failed to parse resume: ${errorMessage}`,
      success: false
    });
  }
});

// POST /api/resume/manual - Handle manual resume data
router.post('/manual', async (req, res) => {
  try {
    const { skills, experience, projects, education, personalInfo } = req.body;
    
    const parsedResume = {
      personalInfo: personalInfo || {},
      skills: skills || [],
      experience: experience || [],
      projects: projects || [],
      education: education || [],
      certifications: [],
      languages: []
    };

    console.log('Manual resume data received:', {
      skills: parsedResume.skills.length,
      experience: parsedResume.experience.length,
      projects: parsedResume.projects.length,
      education: parsedResume.education.length
    });

    return res.json({
      success: true,
      parsedResume,
      source: 'manual'
    });

  } catch (error) {
    console.error('Error processing manual resume data:', error);
    return res.status(500).json({
      error: 'Failed to process manual resume data',
      success: false
    });
  }
});

export default router;
