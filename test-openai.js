import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

console.log('API Key exists:', !!process.env.OPENAI_API_KEY);
console.log('API Key prefix:', process.env.OPENAI_API_KEY?.substring(0, 20) + '...');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function test() {
  try {
    console.log('\nCalling OpenAI gpt-4o-mini...');
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: "Say hello in one sentence." }
      ],     
      max_tokens: 50
    });
    
    console.log('SUCCESS!');
    console.log('Reply:', response.choices[0]?.message?.content);
  } catch (error) {
    console.error('\nFAILED!');
    console.error('Status:', error.status);
    console.error('Code:', error.code);
    console.error('Type:', error.type);
    console.error('Message:', error.message);
    if (error.error) {
      console.error('Details:', JSON.stringify(error.error, null, 2));
    }
  }
}

test();