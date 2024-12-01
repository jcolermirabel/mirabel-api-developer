const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function analyzeStoredProcedure(definition) {
  const operationType = {
    isSelect: /SELECT.*FROM/i.test(definition),
    isInsert: /INSERT\s+INTO/i.test(definition),
    isUpdate: /UPDATE.*SET/i.test(definition),
    isDelete: /DELETE\s+FROM/i.test(definition)
  };

  // Extract affected tables
  const tableMatches = definition.match(/(?:FROM|INTO|UPDATE)\s+([^\s,;]+)/gi) || [];
  const tables = tableMatches.map(match => 
    match.replace(/(?:FROM|INTO|UPDATE)/i, '').trim()
  );

  // Extract columns for different operations
  let columns = [];
  if (operationType.isSelect) {
    const selectMatches = definition.match(/SELECT(.*?)FROM/gi) || [];
    columns = selectMatches
      .map(match => match
        .replace(/SELECT/i, '')
        .replace(/FROM/i, '')
        .trim()
        .split(',')
        .map(col => col.trim().split(' ').pop())
      )
      .flat();
  } else if (operationType.isInsert) {
    const insertMatch = definition.match(/INSERT\s+INTO\s+\w+\s*\((.*?)\)/i);
    if (insertMatch) {
      columns = insertMatch[1].split(',').map(col => col.trim());
    }
  }

  // Extract error handling
  const errorHandling = {
    hasErrorHandling: /RAISERROR|THROW|TRY|CATCH/i.test(definition),
    errorCodes: (definition.match(/RAISERROR\s*\(.*?(\d+).*?\)/g) || [])
      .map(match => {
        const code = match.match(/\d+/);
        return code ? parseInt(code[0]) : null;
      })
      .filter(code => code !== null)
  };

  return {
    operationType,
    tables,
    columns,
    errorHandling
  };
}

function generateExampleResponse(analysis, procedureName) {
  const { operationType, tables, errorHandling } = analysis;
  
  const successResponse = {
    isSelect: {
      status: "success",
      resultSet: [{
        ...analysis.columns.reduce((acc, col) => ({
          ...acc,
          [col]: "sample value"
        }), {})
      }]
    },
    isInsert: {
      status: "success",
      affectedRows: 1,
      insertedId: 12345,
      message: `Successfully inserted record into ${tables[0]}`
    },
    isUpdate: {
      status: "success",
      affectedRows: 5,
      message: `Successfully updated ${tables[0]}`
    },
    isDelete: {
      status: "success",
      affectedRows: 3,
      message: `Successfully deleted records from ${tables[0]}`
    }
  };

  const errorResponse = {
    status: "error",
    errorCode: errorHandling.errorCodes[0] || 50000,
    message: "Sample error message",
    details: {
      procedure: procedureName,
      severity: 16,
      state: 1
    }
  };

  return {
    success: successResponse[Object.keys(operationType).find(key => operationType[key])] || {
      status: "success",
      message: `Successfully executed ${procedureName}`
    },
    error: errorResponse
  };
}

router.post('/generate-samples', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        message: 'OpenAI API key not configured',
        useDefault: true 
      });
    }

    const { procedureName, definition, parameters } = req.body;
    const analysis = analyzeStoredProcedure(definition);

    const systemPrompt = `You are a SQL stored procedure documentation assistant.
    Your task is to generate sample JSON responses for both success and error cases.
    ONLY respond with a JSON object containing 'success' and 'error' examples.
    DO NOT include any explanatory text or markdown - ONLY valid JSON.`;

    const userPrompt = `Generate sample success and error responses for this stored procedure:
    Name: ${procedureName}
    Operation: ${Object.keys(analysis.operationType).find(key => analysis.operationType[key])}
    Tables: ${analysis.tables.join(', ')}
    Columns: ${analysis.columns.join(', ')}
    Error Codes: ${analysis.errorHandling.errorCodes.join(', ') || 'Standard SQL Server errors'}

    Response must be a JSON object with this exact structure:
    {
      "success": { /* successful response */ },
      "error": { /* error response */ }
    }

    For success responses:
    - SELECT: Include resultSet array
    - INSERT: Include affectedRows and insertedId
    - UPDATE/DELETE: Include affectedRows
    - All: Include status and message

    For error responses:
    - Include errorCode, status="error", message
    - Include procedure name and SQL Server error details
    - Use actual error codes from the procedure if available`;

    console.log('Generating AI sample for:', procedureName);

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    let sampleData;
    try {
      sampleData = JSON.parse(completion.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      sampleData = generateExampleResponse(analysis, procedureName);
    }

    res.json({ 
      samples: sampleData,
      metadata: {
        operationType: Object.entries(analysis.operationType)
          .filter(([_, value]) => value)
          .map(([key]) => key)[0],
        affectedTables: analysis.tables,
        errorHandling: analysis.errorHandling
      }
    });
  } catch (error) {
    console.error('AI sample generation error:', error);
    res.status(500).json({ 
      message: 'Failed to generate samples',
      error: error.message,
      useDefault: true
    });
  }
});

module.exports = router; 