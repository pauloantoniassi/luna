import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE_URL,
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/pauloantoniassi/luna',
    'X-Title': 'Luna',
  },
});

export default openai;
