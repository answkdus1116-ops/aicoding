const axios = require('axios'); // axios 설치 필요 혹은 fetch 사용

exports.handler = async (event) => {
  // Netlify 설정에 저장한 실제 키를 여기서 꺼내 씁니다. (사용자에게 안 보임)
  const API_KEY = process.env.GEMINI_API_KEY; 
  const { imageContent } = JSON.parse(event.body);

  try {
    const response = await axios.post(`https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`, {
      requests: [{
        image: { content: imageContent },
        features: [{ type: 'OBJECT_LOCALIZATION' }]
      }]
    });
    return {
      statusCode: 200,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};
