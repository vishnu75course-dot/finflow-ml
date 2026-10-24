import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function callAI(messages, systemPrompt) {
  try {
    const inputMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];
    const response = await openai.responses.create({
      model: "gpt-5.4-mini",
      input: inputMessages,
      store: true
    });
    return response.output_text || "";
  } catch (error) {
    console.error('OpenAI error:', error.message);
    throw error;
  }
}

async function test() {
  const systemPrompt = "You are a finance assistant. Generate 3 short, actionable financial insights as JSON array: [{\"type\": \"tip\" | \"warning\", \"message\": \"string\", \"category\": \"string\"}]. Be specific.";
  const messages = [
    { role: "user", content: "Transactions: [{\"type\": \"expense\", \"amount\": 1000, \"category\": \"Food\"}]" }
  ];
  const reply = await callAI(messages, systemPrompt);
  console.log("REPLY:", reply);
}

test();
