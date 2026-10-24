import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function run() {
  try {
    // Let's test what properties responses.create takes
    const response = await openai.responses.create({
      model: "gpt-5.4-mini",
      input: [
        { role: "system", content: "You are a helpful assistant. Always respond in French." },
        { role: "user", content: "Hello, how are you?" }
      ],
      store: true,
    });
    console.log("SUCCESS WITH MESSAGES ARRAY!");
    console.log("Output text:", response.output_text);
  } catch (error) {
    console.error("Failed with messages array.");
    console.error("Error status:", error.status);
    console.error("Error message:", error.message);
  }

  try {
    // Let's test if it takes instructions and input as string
    const response2 = await openai.responses.create({
      model: "gpt-5.4-mini",
      instructions: "You are a helpful assistant. Always respond in French.",
      input: "Hello, how are you?",
      store: true,
    });
    console.log("SUCCESS WITH INSTRUCTIONS + INPUT STRING!");
    console.log("Output text:", response2.output_text);
  } catch (error) {
    console.error("Failed with instructions + input string.");
    console.error("Error status:", error.status);
    console.error("Error message:", error.message);
  }
}

run();
