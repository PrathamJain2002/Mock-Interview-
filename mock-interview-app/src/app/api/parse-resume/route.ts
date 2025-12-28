import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdf-parser';

export async function POST(request: NextRequest) {
  try {
    console.log('Resume parsing API called');
    
    // Get the form data (file upload)
    const formData = await request.formData();
    const file = formData.get('resume') as File;
    
    if (!file) {
      console.error('No file provided in request');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      console.error('Invalid file type:', file.type);
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    console.log('PDF file received:', file.name, 'Size:', file.size);

    // Convert file to buffer for pdf-parse
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    console.log('File converted to buffer, size:', buffer.length);

    // Extract text using our PDF parser wrapper
    console.log('Starting PDF text extraction...');
    const pdfText = await extractTextFromPDF(buffer);
    
    console.log('PDF text extracted successfully, length:', pdfText.length);
    console.log('First 200 characters:', pdfText.substring(0, 200));

    if (!pdfText || pdfText.trim().length === 0) {
      return NextResponse.json({ 
        error: 'No text could be extracted from the PDF. It might be image-based or encrypted.' 
      }, { status: 400 });
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

    return NextResponse.json({ 
      success: true,
      rawText: pdfText,
      parsedResume 
    });

  } catch (error) {
    console.error('Error parsing resume:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
    return NextResponse.json({ 
      error: `Failed to parse resume: ${errorMessage}` 
    }, { status: 500 });
  }
}

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

function parseResumeContent(text: string): ParsedResume {
  try {
    console.log('parseResumeContent called with text length:', text.length);
    
    if (!text || text.trim().length === 0) {
      throw new Error('Empty text provided for parsing');
    }

    // const sections = text.toLowerCase(); // Unused variable
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    console.log('Split into', lines.length, 'non-empty lines');
    
    const result: ParsedResume = {
      personalInfo: {},
      skills: [],
      experience: [],
      projects: [],
      education: [],
      certifications: [],
      languages: []
    };

    try {
      // Extract personal information
      console.log('Extracting personal info...');
      result.personalInfo = extractPersonalInfo(lines);
      
      // Extract skills
      console.log('Extracting skills...');
      result.skills = extractSkills(text, lines);
      
      // Extract experience
      console.log('Extracting experience...');
      result.experience = extractExperience(lines);
      
      // Extract projects
      console.log('Extracting projects...');
      result.projects = extractProjects(lines);
      
      // Extract education
      console.log('Extracting education...');
      result.education = extractEducation(lines);
      
      // Extract certifications
      console.log('Extracting certifications...');
      result.certifications = extractCertifications(lines);
      
      // Extract languages
      console.log('Extracting languages...');
      result.languages = extractLanguages(lines);

      console.log('Parsing completed successfully');
      return result;
    } catch (extractionError) {
      console.error('Error during content extraction:', extractionError);
      // Return partial results if some extraction failed
      return result;
    }
  } catch (error) {
    console.error('Error in parseResumeContent:', error);
    throw error;
  }
}

interface PersonalInfo {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
}

function extractPersonalInfo(lines: string[]): PersonalInfo {
  const personalInfo: PersonalInfo = {};
  
  // Look for email
  const emailPattern = /[\w\.-]+@[\w\.-]+\.\w+/;
  for (const line of lines) {
    const emailMatch = line.match(emailPattern);
    if (emailMatch) {
      personalInfo.email = emailMatch[0];
      break;
    }
  }
  
  // Look for phone
  const phonePattern = /[\+]?[\d\s\-\(\)]{10,}/;
  for (const line of lines) {
    const phoneMatch = line.match(phonePattern);
    if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 10) {
      personalInfo.phone = phoneMatch[0];
      break;
    }
  }
  
  // Extract name (usually first non-empty line that's not contact info)
  for (const line of lines) {
    if (line.length > 2 && 
        !emailPattern.test(line) && 
        !phonePattern.test(line) &&
        !line.toLowerCase().includes('resume') &&
        !line.toLowerCase().includes('cv') &&
        line.split(' ').length <= 4) {
      personalInfo.name = line;
      break;
    }
  }
  
  return personalInfo;
}

function extractSkills(text: string, lines: string[]): string[] {
  const skills: string[] = [];
  const skillKeywords = ['skills', 'technical skills', 'technologies', 'expertise', 'competencies'];
  
  // Common tech skills to look for
  const techSkills = [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust',
    'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring', 'laravel',
    'html', 'css', 'sass', 'scss', 'tailwind', 'bootstrap',
    'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
    'aws', 'azure', 'google cloud', 'docker', 'kubernetes', 'jenkins',
    'git', 'github', 'gitlab', 'svn',
    'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy',
    'figma', 'sketch', 'photoshop', 'illustrator'
  ];
  
  // Look for skills sections
  let inSkillsSection = false;
  let skillsSectionEnd = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    // Check if we're entering a skills section
    if (skillKeywords.some(keyword => line.includes(keyword))) {
      inSkillsSection = true;
      continue;
    }
    
    // Check if we're leaving skills section (next major section)
    if (inSkillsSection && (
      line.includes('experience') || 
      line.includes('education') || 
      line.includes('projects') ||
      line.includes('work history') ||
      line.includes('employment')
    )) {
      skillsSectionEnd = true;
    }
    
    if (inSkillsSection && !skillsSectionEnd) {
      // Extract skills from this line
      const lineSkills = extractSkillsFromLine(lines[i], techSkills);
      skills.push(...lineSkills);
    }
  }
  
  // Also scan entire text for tech skills
  const lowerText = text.toLowerCase();
  for (const skill of techSkills) {
    if (lowerText.includes(skill) && !skills.some(s => s.toLowerCase() === skill)) {
      skills.push(skill);
    }
  }
  
  return [...new Set(skills)]; // Remove duplicates
}

function extractSkillsFromLine(line: string, techSkills: string[]): string[] {
  const skills: string[] = [];
  // const lowerLine = line.toLowerCase(); // Unused variable
  
  // Split by common separators
  const words = line.split(/[,•·\-\|\n\t]+/).map(w => w.trim()).filter(w => w.length > 0);
  
  for (const word of words) {
    const lowerWord = word.toLowerCase();
    if (techSkills.includes(lowerWord)) {
      skills.push(word);
    }
  }
  
  return skills;
}

interface ExperienceEntry {
  title?: string;
  company?: string;
  duration?: string;
  description?: string;
}

function extractExperience(lines: string[]): Array<ExperienceEntry> {
  const experience: Array<ExperienceEntry> = [];
  const experienceKeywords = ['experience', 'work history', 'employment', 'professional experience'];
  
  let inExperienceSection = false;
  let currentJob: ExperienceEntry = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    if (experienceKeywords.some(keyword => line.includes(keyword))) {
      inExperienceSection = true;
      continue;
    }
    
    if (inExperienceSection) {
      // Check for end of experience section
      if (line.includes('education') || line.includes('projects') || line.includes('skills')) {
        if (Object.keys(currentJob).length > 0) {
          experience.push(currentJob);
        }
        break;
      }
      
      // Look for job titles and companies
      if (line.includes(' at ') || line.includes(' - ') || line.includes('|')) {
        if (Object.keys(currentJob).length > 0) {
          experience.push(currentJob);
        }
        currentJob = {};
        
        const parts = lines[i].split(/\s+at\s+|\s+-\s+|\|/);
        if (parts.length >= 2) {
          currentJob.title = parts[0].trim();
          currentJob.company = parts[1].trim();
        }
      } else if (lines[i].length > 10 && !currentJob.description) {
        currentJob.description = lines[i];
      }
    }
  }
  
  if (Object.keys(currentJob).length > 0) {
    experience.push(currentJob);
  }
  
  return experience;
}

interface ProjectEntry {
  name?: string;
  description?: string;
  technologies?: string[];
}

function extractProjects(lines: string[]): Array<ProjectEntry> {
  const projects: Array<ProjectEntry> = [];
  const projectKeywords = ['projects', 'personal projects', 'key projects', 'notable projects'];
  
  let inProjectsSection = false;
  let currentProject: ProjectEntry = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    if (projectKeywords.some(keyword => line.includes(keyword))) {
      inProjectsSection = true;
      continue;
    }
    
    if (inProjectsSection) {
      if (line.includes('education') || line.includes('experience') || line.includes('skills')) {
        if (Object.keys(currentProject).length > 0) {
          projects.push(currentProject);
        }
        break;
      }
      
      // Look for project names (usually shorter lines or lines with special formatting)
      if (lines[i].length > 0 && lines[i].length < 50 && !currentProject.name) {
        if (Object.keys(currentProject).length > 0) {
          projects.push(currentProject);
        }
        currentProject = { name: lines[i] };
      } else if (lines[i].length > 10 && currentProject.name && !currentProject.description) {
        currentProject.description = lines[i];
      }
    }
  }
  
  if (Object.keys(currentProject).length > 0) {
    projects.push(currentProject);
  }
  
  return projects;
}

interface EducationEntry {
  degree?: string;
  institution?: string;
  year?: string;
}

function extractEducation(lines: string[]): Array<EducationEntry> {
  const education: Array<EducationEntry> = [];
  const educationKeywords = ['education', 'academic background', 'qualifications'];
  
  let inEducationSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    if (educationKeywords.some(keyword => line.includes(keyword))) {
      inEducationSection = true;
      continue;
    }
    
    if (inEducationSection) {
      if (line.includes('experience') || line.includes('projects') || line.includes('skills')) {
        break;
      }
      
      if (lines[i].length > 5) {
        const eduEntry: EducationEntry = {};
        
        // Look for degree patterns
        if (line.includes('bachelor') || line.includes('master') || line.includes('phd') || 
            line.includes('b.s') || line.includes('m.s') || line.includes('b.a') || line.includes('m.a')) {
          eduEntry.degree = lines[i];
        } else if (lines[i].includes('university') || lines[i].includes('college') || lines[i].includes('institute')) {
          eduEntry.institution = lines[i];
        }
        
        if (Object.keys(eduEntry).length > 0) {
          education.push(eduEntry);
        }
      }
    }
  }
  
  return education;
}

function extractCertifications(lines: string[]): string[] {
  const certifications: string[] = [];
  const certKeywords = ['certifications', 'certificates', 'certified'];
  
  let inCertSection = false;
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    if (certKeywords.some(keyword => lowerLine.includes(keyword))) {
      inCertSection = true;
      continue;
    }
    
    if (inCertSection) {
      if (lowerLine.includes('education') || lowerLine.includes('experience') || lowerLine.includes('skills')) {
        break;
      }
      
      if (line.length > 5) {
        certifications.push(line);
      }
    }
  }
  
  return certifications;
}

function extractLanguages(lines: string[]): string[] {
  const languages: string[] = [];
  const languageKeywords = ['languages', 'language skills'];
  
  const commonLanguages = ['english', 'spanish', 'french', 'german', 'chinese', 'japanese', 'korean', 'hindi', 'arabic'];
  
  let inLanguageSection = false;
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    if (languageKeywords.some(keyword => lowerLine.includes(keyword))) {
      inLanguageSection = true;
      continue;
    }
    
    if (inLanguageSection) {
      if (lowerLine.includes('education') || lowerLine.includes('experience') || lowerLine.includes('skills')) {
        break;
      }
      
      for (const lang of commonLanguages) {
        if (lowerLine.includes(lang)) {
          languages.push(lang);
        }
      }
    }
  }
  
  return [...new Set(languages)];
}
