import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import axios from 'axios';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_PLANNER_MODEL = process.env.OLLAMA_PLANNER_MODEL || 'rebooted-planner';
const OLLAMA_OCR_MODEL = process.env.OLLAMA_OCR_MODEL || 'rebooted-ocr';

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calls Ollama API with a prompt
 */
async function callOllama(model, prompt, image = null) {
  const payload = {
    model,
    prompt,
    stream: false
  };

  if (image) {
    payload.images = [image];
  }

  try {
    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 2 minutes timeout
      }
    );

    return response.data.response;
  } catch (error) {
    if (error.response) {
      throw new Error(`Ollama API error: ${error.response.status} - ${error.response.data?.error || 'Unknown error'}`);
    }
    throw new Error(`Failed to call Ollama: ${error.message}`);
  }
}

/**
 * Validates planner output structure
 */
function validatePlannerOutput(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Output must be an object' };
  }

  if (!data.project_title || typeof data.project_title !== 'string') {
    return { valid: false, error: 'Missing or invalid project_title' };
  }

  if (!Array.isArray(data.tasks)) {
    return { valid: false, error: 'tasks must be an array' };
  }

  for (const task of data.tasks) {
    if (!task.task_title || typeof task.task_title !== 'string') {
      return { valid: false, error: 'Each task must have a task_title string' };
    }
    if (task.subtasks_text === undefined || typeof task.subtasks_text !== 'string') {
      return { valid: false, error: 'Each task must have a subtasks_text string' };
    }
  }

  return { valid: true };
}

/**
 * Parses JSON from Ollama response, handling markdown code blocks
 */
function parseJSONResponse(text) {
  // Remove markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error(`Invalid JSON response: ${error.message}`);
  }
}

/**
 * Converts image buffer to base64
 */
function imageToBase64(buffer) {
  return buffer.toString('base64');
}

// ============================================================================
// Endpoints
// ============================================================================

/**
 * POST /plan
 * AI Task Planner from text
 */
app.post('/plan', async (req, res) => {
  try {
    const { raw_text } = req.body;

    if (!raw_text || typeof raw_text !== 'string') {
      return res.status(400).json({ error: 'raw_text is required and must be a string' });
    }

    const prompt = `You are a task planning assistant. Analyze the following text and extract a project with tasks and subtasks.

Text:
${raw_text}

Output a JSON object with this exact structure:
{
  "language": "en",
  "project_title": "string",
  "tasks": [
    {
      "task_title": "string",
      "subtasks_text": "- subtask 1\\n- subtask 2\\n- subtask 3"
    }
  ]
}

Rules:
- project_title: A concise title for the project
- tasks: Array of tasks, each with task_title and subtasks_text
- subtasks_text: A string with newline-separated bullet points starting with "- "
- Do NOT include time estimates, dependencies, or phases
- Output ONLY valid JSON, no markdown, no explanations`;

    let responseText = await callOllama(OLLAMA_PLANNER_MODEL, prompt);
    let parsed = parseJSONResponse(responseText);
    let validation = validatePlannerOutput(parsed);

    // Retry once if invalid
    if (!validation.valid) {
      const retryPrompt = `${prompt}

Previous invalid output:
${JSON.stringify(parsed, null, 2)}

Error: ${validation.error}

Please correct the output to match the required structure exactly.`;
      
      responseText = await callOllama(OLLAMA_PLANNER_MODEL, retryPrompt);
      parsed = parseJSONResponse(responseText);
      validation = validatePlannerOutput(parsed);
    }

    if (!validation.valid) {
      return res.status(500).json({ 
        error: `Invalid planner output after retry: ${validation.error}` 
      });
    }

    // Ensure language field
    if (!parsed.language) {
      parsed.language = 'en';
    }

    res.json(parsed);
  } catch (error) {
    console.error('Plan endpoint error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /ocr
 * OCR for image input
 */
app.post('/ocr', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'image file is required' });
    }

    const imageBase64 = imageToBase64(req.file.buffer);
    const prompt = `Extract all text from this image. Output a JSON object with this exact structure:
{
  "language_guess": "en",
  "extracted_text": "all text from the image",
  "confidence": 0.95
}

Rules:
- extracted_text: All visible text from the image, preserve line breaks
- language_guess: ISO language code (e.g., "en", "es", "fr")
- confidence: A number between 0.0 and 1.0
- Do NOT add any text that is not visible in the image
- Output ONLY valid JSON, no markdown, no explanations`;

    const responseText = await callOllama(OLLAMA_OCR_MODEL, prompt, imageBase64);
    const parsed = parseJSONResponse(responseText);

    // Validate OCR output
    if (!parsed.extracted_text || typeof parsed.extracted_text !== 'string') {
      return res.status(500).json({ error: 'Invalid OCR output: missing extracted_text' });
    }

    // Ensure required fields with defaults
    if (!parsed.language_guess) {
      parsed.language_guess = 'en';
    }
    if (typeof parsed.confidence !== 'number') {
      parsed.confidence = 0.0;
    }

    res.json(parsed);
  } catch (error) {
    console.error('OCR endpoint error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /plan_from_ocr
 * Chained OCR -> Planner
 */
app.post('/plan_from_ocr', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'image file is required' });
    }

    // Step 1: OCR
    const imageBase64 = imageToBase64(req.file.buffer);
    const ocrPrompt = `Extract all text from this image. Output a JSON object with this exact structure:
{
  "language_guess": "en",
  "extracted_text": "all text from the image",
  "confidence": 0.95
}

Rules:
- extracted_text: All visible text from the image, preserve line breaks
- language_guess: ISO language code (e.g., "en", "es", "fr")
- confidence: A number between 0.0 and 1.0
- Do NOT add any text that is not visible in the image
- Output ONLY valid JSON, no markdown, no explanations`;

    const ocrResponseText = await callOllama(OLLAMA_OCR_MODEL, ocrPrompt, imageBase64);
    const ocrParsed = parseJSONResponse(ocrResponseText);

    if (!ocrParsed.extracted_text || typeof ocrParsed.extracted_text !== 'string') {
      return res.status(500).json({ error: 'OCR failed: missing extracted_text' });
    }

    // Step 2: Planner
    const plannerPrompt = `You are a task planning assistant. Analyze the following text and extract a project with tasks and subtasks.

Text:
${ocrParsed.extracted_text}

Output a JSON object with this exact structure:
{
  "language": "en",
  "project_title": "string",
  "tasks": [
    {
      "task_title": "string",
      "subtasks_text": "- subtask 1\\n- subtask 2\\n- subtask 3"
    }
  ]
}

Rules:
- project_title: A concise title for the project
- tasks: Array of tasks, each with task_title and subtasks_text
- subtasks_text: A string with newline-separated bullet points starting with "- "
- Do NOT include time estimates, dependencies, or phases
- Output ONLY valid JSON, no markdown, no explanations`;

    let plannerResponseText = await callOllama(OLLAMA_PLANNER_MODEL, plannerPrompt);
    let plannerParsed = parseJSONResponse(plannerResponseText);
    let validation = validatePlannerOutput(plannerParsed);

    // Retry once if invalid
    if (!validation.valid) {
      const retryPrompt = `${plannerPrompt}

Previous invalid output:
${JSON.stringify(plannerParsed, null, 2)}

Error: ${validation.error}

Please correct the output to match the required structure exactly.`;
      
      plannerResponseText = await callOllama(OLLAMA_PLANNER_MODEL, retryPrompt);
      plannerParsed = parseJSONResponse(plannerResponseText);
      validation = validatePlannerOutput(plannerParsed);
    }

    if (!validation.valid) {
      return res.status(500).json({ 
        error: `Invalid planner output after retry: ${validation.error}` 
      });
    }

    // Ensure language field
    if (!plannerParsed.language) {
      plannerParsed.language = ocrParsed.language_guess || 'en';
    }

    // Combine results
    res.json({
      language_guess: ocrParsed.language_guess || 'en',
      extracted_text: ocrParsed.extracted_text,
      confidence: ocrParsed.confidence || 0.0,
      language: plannerParsed.language,
      project_title: plannerParsed.project_title,
      tasks: plannerParsed.tasks
    });
  } catch (error) {
    console.error('Plan from OCR endpoint error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /plan_from_file
 * Extract text from PDF/Word file and plan tasks (same process as image)
 */
app.post('/plan_from_file', upload.single('file'), async (req, res) => {
  console.log('POST /plan_from_file - File received:', req.file ? {
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
  } : 'No file');
  
  try {
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'file is required' });
    }

    let extractedText = '';

    // Extract text based on file type
    const fileName = req.file.originalname || req.file.filename || 'document';
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    
    if (fileExtension === 'pdf') {
      try {
        const pdfData = await pdfParse(req.file.buffer);
        extractedText = pdfData.text;
      } catch (error) {
        return res.status(500).json({ error: `Failed to parse PDF: ${error.message}` });
      }
    } else if (fileExtension === 'docx' || fileExtension === 'doc') {
      try {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        extractedText = result.value;
      } catch (error) {
        return res.status(500).json({ error: `Failed to parse Word document: ${error.message}` });
      }
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Please upload PDF or Word document.' });
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ error: 'No text could be extracted from the file' });
    }

    // Use the same planner process as /plan endpoint
    const prompt = `You are a task planning assistant. Analyze the following text and extract a project with tasks and subtasks.

Text:
${extractedText}

Output a JSON object with this exact structure:
{
  "language": "en",
  "project_title": "string",
  "tasks": [
    {
      "task_title": "string",
      "subtasks_text": "- subtask 1\\n- subtask 2\\n- subtask 3"
    }
  ]
}

Rules:
- project_title: A concise title for the project
- tasks: Array of tasks, each with task_title and subtasks_text
- subtasks_text: A string with newline-separated bullet points starting with "- "
- Do NOT include time estimates, dependencies, or phases
- Output ONLY valid JSON, no markdown, no explanations`;

    let responseText = await callOllama(OLLAMA_PLANNER_MODEL, prompt);
    let parsed = parseJSONResponse(responseText);
    let validation = validatePlannerOutput(parsed);

    // Retry once if invalid
    if (!validation.valid) {
      const retryPrompt = `${prompt}

Previous invalid output:
${JSON.stringify(parsed, null, 2)}

Error: ${validation.error}

Please correct the output to match the required structure exactly.`;
      
      responseText = await callOllama(OLLAMA_PLANNER_MODEL, retryPrompt);
      parsed = parseJSONResponse(responseText);
      validation = validatePlannerOutput(parsed);
    }

    if (!validation.valid) {
      return res.status(500).json({ 
        error: `Invalid planner output after retry: ${validation.error}` 
      });
    }

    // Ensure language field
    if (!parsed.language) {
      parsed.language = 'en';
    }

    // Return same format as /plan endpoint
    res.json(parsed);
  } catch (error) {
    console.error('Plan from file endpoint error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler for unregistered routes (must be after all routes)
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: `Route not found: ${req.method} ${req.path}`,
    availableRoutes: [
      'POST /plan',
      'POST /ocr',
      'POST /plan_from_ocr',
      'POST /plan_from_file',
      'GET /health'
    ]
  });
});

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Rebooted API server running on port ${PORT}`);
  console.log(`Ollama base URL: ${OLLAMA_BASE_URL}`);
  console.log('Available endpoints:');
  console.log('  POST /plan');
  console.log('  POST /ocr');
  console.log('  POST /plan_from_ocr');
  console.log('  POST /plan_from_file');
  console.log('  GET /health');
});

