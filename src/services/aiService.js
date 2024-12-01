import axios from 'axios';

export const generateSampleData = async (procedureInfo) => {
  try {
    const response = await axios.post('/api/ai/generate-samples', {
      procedureName: procedureInfo.procedure_name,
      definition: procedureInfo.procedure_definition,
      parameters: procedureInfo.parameters
    });
    
    return response.data.samples;
  } catch (error) {
    console.error('Failed to generate samples:', error);
    return null;
  }
}; 