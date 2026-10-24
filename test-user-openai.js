import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function run() {
  try {
    console.log("Calling responses.create...");
    const response = await openai.responses.create({
      model: "gpt-5.4-mini",
      input: "write a haiku about ai",
      store: true,
    });
    console.log("Response:", response);
    console.log("Output text:", response.output_text);
  } catch (error) {
    console.error("Error status:", error.status);
    console.error("Error message:", error.message);
    console.error("Full error:", error);
  }
}

run();
