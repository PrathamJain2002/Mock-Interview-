// Using require to avoid TypeScript module resolution issues
const pdfParse = require('pdf-parse');

export interface ParsedResume {
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

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    console.log('Starting PDF text extraction...');
    const data = await pdfParse(buffer);
    
    if (!data || !data.text) {
      throw new Error('No text extracted from PDF');
    }
    
    console.log('PDF parsed successfully, text length:', data.text.length);
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid PDF')) {
        throw new Error('Invalid PDF file format');
      } else if (error.message.includes('Encrypted')) {
        throw new Error('PDF is encrypted and cannot be parsed');
      } else {
        throw new Error(`PDF parsing failed: ${error.message}`);
      }
    }
    
    throw new Error('Unknown PDF parsing error');
  }
}

export function parseResumeContent(text: string): ParsedResume {
  try {
    console.log('parseResumeContent called with text length:', text.length);
    
    if (!text || text.trim().length === 0) {
      throw new Error('Empty text provided for parsing');
    }

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
      result.personalInfo = extractPersonalInfo(lines);
      
      // Extract skills
      result.skills = extractSkills(text, lines);
      
      // Extract experience
      result.experience = extractExperience(lines);
      
      // Extract projects
      result.projects = extractProjects(lines);
      
      // Extract education
      result.education = extractEducation(lines);
      
      // Extract certifications
      result.certifications = extractCertifications(lines);
      
      // Extract languages
      result.languages = extractLanguages(lines);

      console.log('Parsing completed successfully');
      return result;
    } catch (extractionError) {
      console.error('Error during content extraction:', extractionError);
      return result; // Return partial results
    }
  } catch (error) {
    console.error('Error in parseResumeContent:', error);
    throw error;
  }
}

function extractPersonalInfo(lines: string[]) {
  const personalInfo: any = {};
  
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
    
    // Check if we're leaving skills section
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
  const lowerLine = line.toLowerCase();
  
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

function extractExperience(lines: string[]): Array<any> {
  const experience: Array<any> = [];
  const experienceKeywords = ['experience', 'work history', 'employment', 'professional experience'];
  
  let inExperienceSection = false;
  let currentJob: any = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    if (experienceKeywords.some(keyword => line.includes(keyword))) {
      inExperienceSection = true;
      continue;
    }
    
    if (inExperienceSection) {
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

function extractProjects(lines: string[]): Array<any> {
  const projects: Array<any> = [];
  const projectKeywords = ['projects', 'personal projects', 'key projects', 'notable projects'];
  
  let inProjectsSection = false;
  let currentProject: any = {};
  
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

function extractEducation(lines: string[]): Array<any> {
  const education: Array<any> = [];
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
        const eduEntry: any = {};
        
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
