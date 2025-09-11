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
    'figma', 'sketch', 'photoshop', 'illustrator', 'mern', 'postgresql', 'redux', 'axios'
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
  
  // Also scan entire text for tech skills mentioned in experience/projects
  const lowerText = text.toLowerCase();
  for (const skill of techSkills) {
    if (lowerText.includes(skill) && !skills.some(s => s.toLowerCase() === skill)) {
      skills.push(skill);
    }
  }
  
  // Look for skills mentioned in bullet points
  const bulletPoints = text.match(/[•\-*]\s*[^•\n]*/g) || [];
  for (const bullet of bulletPoints) {
    const bulletSkills = extractSkillsFromLine(bullet, techSkills);
    skills.push(...bulletSkills);
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
  let jobDescription: string[] = [];
  let processedJobs = new Set(); // Track processed jobs to avoid duplicates
  
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lowerLine = line.toLowerCase();
    
    if (experienceKeywords.some(keyword => lowerLine.includes(keyword))) {
      inExperienceSection = true;
      continue;
    }
    
    if (inExperienceSection) {
      if (lowerLine.includes('education') || lowerLine.includes('projects') || lowerLine.includes('skills')) {
        if (Object.keys(currentJob).length > 0) {
          currentJob.description = jobDescription.join(' ');
          const jobKey = `${currentJob.title}-${currentJob.company}`;
          if (!processedJobs.has(jobKey)) {
            experience.push(currentJob);
            processedJobs.add(jobKey);
          }
        }
        break;
      }
      
      // Check if this is a company name (usually in caps or title case, followed by location)
      if (isCompanyName(line, lines[i + 1])) {
        console.log(`Found company: "${line}"`);
        if (Object.keys(currentJob).length > 0) {
          currentJob.description = jobDescription.join(' ');
          const jobKey = `${currentJob.title}-${currentJob.company}`;
          if (!processedJobs.has(jobKey)) {
            console.log(`Adding job: ${currentJob.title} at ${currentJob.company}`);
            experience.push(currentJob);
            processedJobs.add(jobKey);
          }
        }
        // Extract company name (before tab or location)
        const companyName = line.split('\t')[0].split(',')[0].trim();
        currentJob = { company: companyName };
        jobDescription = [];
        continue;
      }
      
      // Check if this is a job title (usually followed by dates)
      if (isJobTitle(line, lines[i + 1])) {
        // If we already have a title for this job, save the previous one first
        if (currentJob.title && currentJob.company) {
          currentJob.description = jobDescription.join(' ');
          const jobKey = `${currentJob.title}-${currentJob.company}`;
          if (!processedJobs.has(jobKey)) {
            experience.push(currentJob);
            processedJobs.add(jobKey);
          }
          jobDescription = [];
        }
        
        // Extract job title and duration from the same line if tab-separated
        const parts = line.split('\t');
        if (parts.length >= 2) {
          currentJob.title = parts[0].trim();
          currentJob.duration = parts[1].trim();
        } else {
          // Extract job title and duration from space-separated line
          const jobTitlePart = line.split(/\d{4}/)[0].trim();
          const cleanJobTitle = jobTitlePart.replace(/\s+/g, ' ').replace(/[^A-Za-z\s]/g, '').trim();
          currentJob.title = cleanJobTitle;
          
          // Extract duration from the same line
          const durationMatch = line.match(/\d{4}.*\d{4}|\d{4}.*Present/);
          if (durationMatch) {
            currentJob.duration = durationMatch[0].trim();
          }
        }
        continue;
      }
      
      
      // Check if this is a bullet point (starts with • or -)
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        jobDescription.push(line.replace(/^[•\-*]\s*/, ''));
      } else if (line.length > 20 && currentJob.company && !isCompanyName(line, lines[i + 1]) && !isJobTitle(line, lines[i + 1])) {
        // This might be additional description
        jobDescription.push(line);
      }
    }
  }
  
  if (Object.keys(currentJob).length > 0) {
    currentJob.description = jobDescription.join(' ');
    const jobKey = `${currentJob.title}-${currentJob.company}`;
    if (!processedJobs.has(jobKey)) {
      experience.push(currentJob);
    }
  }
  
  return experience;
}

function isCompanyName(line: string, nextLine?: string): boolean {
  // Company names are usually in title case or all caps, and often followed by location
  if (!line || line.length < 3) return false;
  
  // Check if it's likely a company name
  const hasLocation = nextLine && (nextLine.includes(',') || nextLine.includes('India') || nextLine.includes('Mumbai'));
  const isTitleCase = /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(line);
  const isAllCaps = /^[A-Z\s]+$/.test(line);
  const hasCompanyKeywords = /corp|inc|ltd|pvt|company|technologies|solutions|systems/i.test(line);
  
  // More lenient detection for company names
  const isReasonableLength = line.length > 5 && line.length < 100;
  const isNotJobTitle = !/developer|engineer|analyst|manager|lead|architect|consultant|specialist|designer|programmer/i.test(line);
  const isNotBulletPoint = !line.startsWith('•') && !line.startsWith('-') && !line.startsWith('*');
  
  return (isTitleCase || isAllCaps || hasCompanyKeywords) && isReasonableLength && isNotJobTitle && isNotBulletPoint && (hasLocation || line.length > 10);
}

function isJobTitle(line: string, nextLine?: string): boolean {
  // Job titles are usually followed by dates or are short descriptive phrases
  if (!line || line.length < 5) return false;
  
  const hasDates = nextLine && /\d{4}/.test(nextLine);
  const hasDatesInLine = /\d{4}/.test(line); // Check if dates are in the same line
  const isShortPhrase = line.length < 50 && line.split(' ').length <= 5;
  const containsJobKeywords = /developer|engineer|analyst|manager|lead|architect|consultant|specialist|designer|programmer/i.test(line);
  
  // Additional checks to avoid false positives
  const isNotLocation = !line.includes('India') && !line.includes('Mumbai') && !line.includes('New York') && !line.includes('California');
  const isNotCompany = !isCompanyName(line, nextLine);
  const isNotBulletPoint = !line.startsWith('•') && !line.startsWith('-') && !line.startsWith('*');
  
  // Check if the line starts with a job title (before any dates)
  const jobTitlePart = line.split(/\d{4}/)[0].trim();
  // Clean up the job title part to remove extra spaces and non-letter characters
  const cleanJobTitle = jobTitlePart.replace(/\s+/g, ' ').replace(/[^A-Za-z\s]/g, '').trim();
  const startsWithJobTitle = /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(cleanJobTitle) && containsJobKeywords;
  
  return (hasDates || hasDatesInLine || isShortPhrase || startsWithJobTitle) && containsJobKeywords && isNotLocation && isNotCompany && isNotBulletPoint;
}

function extractProjects(lines: string[]): Array<any> {
  const projects: Array<any> = [];
  const projectKeywords = ['projects', 'personal projects', 'key projects', 'notable projects'];
  
  let inProjectsSection = false;
  let currentProject: any = {};
  let projectDescription: string[] = [];
  let processedProjects = new Set(); // Track processed projects to avoid duplicates
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lowerLine = line.toLowerCase();
    
    if (projectKeywords.some(keyword => lowerLine.includes(keyword))) {
      inProjectsSection = true;
      continue;
    }
    
    if (inProjectsSection) {
      if (lowerLine.includes('education') || lowerLine.includes('experience') || lowerLine.includes('skills')) {
        if (Object.keys(currentProject).length > 0) {
          currentProject.description = projectDescription.join(' ');
          if (!processedProjects.has(currentProject.name)) {
            projects.push(currentProject);
            processedProjects.add(currentProject.name);
          }
        }
        break;
      }
      
      // Check if this is a project name (usually contains colon and year)
      if (isProjectName(line)) {
        if (Object.keys(currentProject).length > 0) {
          currentProject.description = projectDescription.join(' ');
          if (!processedProjects.has(currentProject.name)) {
            projects.push(currentProject);
            processedProjects.add(currentProject.name);
          }
        }
        currentProject = { name: line };
        projectDescription = [];
        continue;
      }
      
      // Check if this is a bullet point description
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        projectDescription.push(line.replace(/^[•\-*]\s*/, ''));
      } else if (line.length > 10 && currentProject.name && !line.includes(':')) {
        // This might be additional description
        projectDescription.push(line);
      }
    }
  }
  
  if (Object.keys(currentProject).length > 0) {
    currentProject.description = projectDescription.join(' ');
    if (!processedProjects.has(currentProject.name)) {
      projects.push(currentProject);
    }
  }
  
  return projects;
}

function isProjectName(line: string): boolean {
  // Project names usually contain a colon and often have a year
  if (!line || line.length < 5) return false;
  
  const hasColon = line.includes(':');
  const hasYear = /\d{4}/.test(line);
  const isReasonableLength = line.length < 100 && line.length > 10;
  
  return hasColon && isReasonableLength;
}

function extractEducation(lines: string[]): Array<any> {
  const education: Array<any> = [];
  const educationKeywords = ['education', 'academic background', 'qualifications'];
  
  let inEducationSection = false;
  let currentEducation: any = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lowerLine = line.toLowerCase();
    
    if (educationKeywords.some(keyword => lowerLine.includes(keyword))) {
      inEducationSection = true;
      continue;
    }
    
    if (inEducationSection) {
      if (lowerLine.includes('experience') || lowerLine.includes('projects') || lowerLine.includes('skills') || lowerLine.includes('certifications')) {
        // Save current education entry if it has content
        if (Object.keys(currentEducation).length > 0) {
          education.push(currentEducation);
          currentEducation = {};
        }
        break;
      }
      
      if (line.length > 5) {
        // Check if this is an institution name (contains college, university, institute, school)
        if (line.includes('College') || line.includes('University') || line.includes('Institute') || 
            line.includes('School') || line.includes('Academy') || line.includes('Foundation')) {
          // Save previous education entry if it exists
          if (Object.keys(currentEducation).length > 0) {
            education.push(currentEducation);
          }
          currentEducation = { institution: line };
        }
        // Check if this is a degree (contains B.Tech, B.E, M.Tech, HSC, SSC, etc.)
        else if (line.includes('B.Tech') || line.includes('B.E') || line.includes('M.Tech') || 
                 line.includes('M.E') || line.includes('HSC') || line.includes('SSC') || 
                 line.includes('Bachelor') || line.includes('Master') || line.includes('Diploma') ||
                 line.includes('GPA') || line.includes('%') || /\d{4}/.test(line)) {
          if (currentEducation.degree) {
            // If we already have a degree, save current entry and start new one
            education.push(currentEducation);
            currentEducation = { degree: line };
          } else {
            currentEducation.degree = line;
          }
        }
        // Check if this is a year or location
        else if (/\d{4}/.test(line) || line.includes('Mumbai') || line.includes('India') || 
                 line.includes('GPA') || line.includes('%')) {
          if (currentEducation.year) {
            currentEducation.year += ` ${line}`;
          } else {
            currentEducation.year = line;
          }
        }
        // If we have an institution but no degree yet, this might be additional info
        else if (currentEducation.institution && !currentEducation.degree) {
          currentEducation.degree = line;
        }
      }
    }
  }
  
  // Save the last education entry
  if (Object.keys(currentEducation).length > 0) {
    education.push(currentEducation);
  }
  
  return education;
}

function extractCertifications(lines: string[]): string[] {
  const certifications: string[] = [];
  const certKeywords = ['certifications', 'certificates', 'certified', 'achievements'];
  
  let inCertSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lowerLine = line.toLowerCase();
    
    if (certKeywords.some(keyword => lowerLine.includes(keyword)) && !line.startsWith('•') && !line.startsWith('-') && !line.startsWith('*')) {
      inCertSection = true;
      continue;
    }
    
    if (inCertSection) {
      if (lowerLine.includes('education') || lowerLine.includes('experience') || lowerLine.includes('skills') || 
          lowerLine.includes('projects') || lowerLine.includes('languages')) {
        break;
      }
      
      if (line.length > 5) {
        // Handle bullet points (•, -, *)
        if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
          const cleanCert = line.replace(/^[•\-*]\s*/, '').trim();
          if (cleanCert.length > 0) {
            certifications.push(cleanCert);
          }
        }
        // Handle regular lines that might be certifications
        else if (line.includes('Certified') || line.includes('Certificate') || 
                 line.includes('Google') || line.includes('AWS') || line.includes('Microsoft') ||
                 line.includes('Coursera') || line.includes('Udemy') || line.includes('Coding') ||
                 line.includes('Full Stack') || line.includes('UI/UX') || line.includes('Web Development')) {
          certifications.push(line);
        }
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
