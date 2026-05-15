// get-fish-data.js (수정 버전)
exports.handler = async (event) => {
  const API_KEY = process.env.GEMINI_API_KEY; 
  const { imageContent } = JSON.parse(event.body);

  try {
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          image: { content: imageContent },
          features: [{ type: 'OBJECT_LOCALIZATION' }]
        }]
      })
    });

    const data = await response.json();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};
