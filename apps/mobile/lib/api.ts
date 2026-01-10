import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

export interface PlanRequest {
  raw_text: string;
}

export interface PlanResponse {
  language: string;
  project_title: string;
  tasks: Array<{
    task_title: string;
    subtasks_text: string;
  }>;
}

export interface OCRResponse {
  language_guess: string;
  extracted_text: string;
  confidence: number;
}

export interface PlanFromOCRResponse extends PlanResponse, OCRResponse {}

export async function planFromText(rawText: string): Promise<PlanResponse> {
  const response = await api.post<PlanResponse>('/plan', { raw_text: rawText });
  return response.data;
}

export async function ocrFromImage(imageUri: string): Promise<OCRResponse> {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'image.jpg',
  } as any);

  const response = await api.post<OCRResponse>('/ocr', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export async function planFromOCR(imageUri: string): Promise<PlanFromOCRResponse> {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'image.jpg',
  } as any);

  const response = await api.post<PlanFromOCRResponse>('/plan_from_ocr', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export async function planFromFile(fileUri: string, fileName: string): Promise<PlanResponse> {
  console.log('Plan from file:', { fileUri, fileName, apiUrl: API_BASE_URL });
  
  const formData = new FormData();
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  const mimeType = fileExtension === 'pdf' 
    ? 'application/pdf' 
    : fileExtension === 'docx'
    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : 'application/msword';
  
  // Use the same pattern as image upload
  formData.append('file', {
    uri: fileUri,
    type: mimeType,
    name: fileName,
  } as any);

  try {
    console.log('Sending request to:', `${API_BASE_URL}/plan_from_file`);
    const response = await api.post<PlanResponse>('/plan_from_file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Plan from file error:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url,
    });
    
    if (error.response) {
      // Server responded with error
      const errorMsg = error.response.data?.error || `Server error: ${error.response.status}`;
      throw new Error(errorMsg);
    } else if (error.request) {
      // Request made but no response (server not running or network issue)
      throw new Error(`Cannot connect to API server at ${API_BASE_URL}/plan_from_file. Make sure the server is running.`);
    } else {
      throw new Error(error.message || 'Failed to plan from file');
    }
  }
}

