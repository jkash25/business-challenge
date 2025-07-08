const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Configuration, OpenAIApi } = require('openai');

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());1

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// In-memory cache (optional)
const cache = {};

app.get('/api/generate', async (req, res) => {
  const topic = req.query.topic;
  if (!topic) return res.status(400).json({ error: 'Missing topic' });

  if (cache[topic]) {
    return res.json({ content: cache[topic] });
  }

  try {
    const prompt = `Generate a training module for hotel staff on the topic: "${topic}". Include:
- A short introduction
- 3 key learning points
- A short quiz with 3 questions`;

    const completion = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
    });

    const content = completion.data.choices[0].message.content;
    cache[topic] = content;

    res.json({ content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate content' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});