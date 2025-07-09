const express = require("express");
const app = express();
const port = 3000;
const { OpenAI } = require("openai");
require("dotenv").config();
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
// In-memory cache (optional)
const cache = {};

app.get(`/generate-content`, async (req, res) => {
  const topic = req.query.topic;
  console.log("The topic is: " + topic)
  if (!topic) return res.status(400).json({ error: "Missing topic" });

  if (cache[topic]) {
    return res.json({ content: cache[topic] });
  }

  try {
    const prompt = `Generate a training module for hotel staff on the topic: "${topic}". Include:
- A short introduction
- 3 key learning points
- A short quiz with 3 questions.
  Know that the content you generate goes directly to the website, so do not add messages like "Certainly!" or "Let me know if you need anything else"`;
  //const prompt = `this is a test prompt, return one sentence`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const content = response.output_text;
    cache[topic] = content;

    res.json({ content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate content" });
  }
});
app.use(express.static('public'));
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
