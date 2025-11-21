// Vercel Function: classify-asset.js (Node.js)
// Esta función se ejecuta en el servidor y oculta la API Key.

// La clave es inyectada por Vercel desde la Variable de Entorno
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";

module.exports = async (req, res) => {
    // Solo aceptar peticiones POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Verificar si la clave de API está definida (medida de seguridad)
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en las variables de entorno de Vercel.' });
    }

    try {
        // Extraer los datos enviados desde el frontend
        const { prompt, systemInstruction } = req.body;

        if (!prompt || !systemInstruction) {
            return res.status(400).json({ error: "Missing required 'prompt' or 'systemInstruction' in request body." });
        }

        // Configuración del Payload para Gemini (incluyendo el esquema JSON)
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        "clasificacion": { 
                            "type": "STRING", 
                            "enum": ["PÚBLICA", "INTERNA", "CONFIDENCIAL", "RESTRINGIDA"] 
                        },
                        "justificacion": { "type": "STRING" }
                    },
                    "propertyOrdering": ["clasificacion", "justificacion"]
                }
            }
        };

        // Realizar la llamada a la API de Gemini (aquí es donde se usa la clave secreta)
        const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const geminiResult = await geminiResponse.json();

        if (!geminiResponse.ok || !geminiResult.candidates) {
             const errorDetail = geminiResult.error?.message || 'Error desconocido al contactar a Gemini.';
             console.error("Gemini Error:", errorDetail);
             return res.status(500).json({ error: 'Fallo en la API de clasificación. ' + errorDetail });
        }
        
        // Extraer y parsear el JSON generado por Gemini
        const jsonString = geminiResult.candidates[0].content.parts[0].text;
        const finalResult = JSON.parse(jsonString);

        // Devolver el resultado de clasificación directamente al frontend
        res.status(200).json(finalResult);

    } catch (error) {
        console.error('Serverless Function Error:', error);
        // Devolver un error genérico al cliente por seguridad
        res.status(500).json({ error: 'Error interno del servidor. Consulte el log de Vercel.' });
    }
};