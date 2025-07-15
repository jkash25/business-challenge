const express = require("express");
const app = express();
const port = 3000;
const { OpenAI } = require("openai");
const bcrypt = require("bcrypt");
require("dotenv").config();
const {v4: uuidv4} = require('uuid');
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});


// In-memory cache
const cache = {};
const quizzes = {};

app.get(`/generate-content`, async (req, res) => {
  const topic = req.query.topic;
  console.log("The topic is: " + topic)
  if (!topic) return res.status(400).json({ error: "Missing topic" });

  if (cache[topic]) {
    const quizId = Object.keys(quizzes).find(id => quizzes[id].topic === topic);
    return res.json({ content: cache[topic], quizId });
  }

  try {
    const prompt = `Generate a training module for Mariott hotel staff on the topic: "${topic}". Include:
    - An introduction
    - key learning points
    - A quiz with 5 semi-difficult multiple-choice questions in the following JSON format:
    {
      "quiz": [
        {
          "question": "Question text?",
          "options": ["A", "B", "C", "D"],
          "answer": "B"
        },
      ]
    }
    Only the quiz should be in json. the rest should be formatted in markdown. Know that the content you generate goes directly to the website, so do not add messages like "Certainly!" or "Let me know if you need anything else"`;
    const prompt2 = 'test prompt, return one sentence';
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const content = response.output_text;
    cache[topic] = content;

    const quizMatch = content.match(/\{[\s\S]*"quiz"[\s\S]*\}/);
    if (quizMatch) {
      const quizJson = JSON.parse(quizMatch[0]);
      const quizId = uuidv4();
      quizzes[quizId] = {quiz: quizJson.quiz, topic };
      res.json({ content, quizId });
    } else {
      return res.status(500).json({ error: "Quiz not found in generated content" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate content" });
  }
});

app.get(`/quiz/:id`, (req, res) =>  {
  const quizEntry = quizzes[req.params.id];
  if (!quizEntry) {
    return res.status(404).json({error: "Quiz not found"});
  }
  res.json({quiz: quizEntry.quiz});
});

// Signup endpoint
app.use(express.json());
app.post("/api/signup", async (req, res) => {
  const { name, email, password } = req.body;
  console.log("user password is : ", password);
  try {
    const existing = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    await pool.query("INSERT INTO users (id, name, email) VALUES ($1, $2, $3)", [id, name, email]);
    await pool.query("INSERT INTO user_passwords (user_id, password_hash) VALUES ($1, $2)", [id, hashedPassword]);

    res.status(201).json({ userId: id, name });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});


// Login endpoint
app.use(express.json());
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const logId = uuidv4();
  let success = false;
  try {
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (user.rows.length === 0) {
      await pool.query("INSERT INTO login_logs (id, email, success, attempted_time) VALUES ($1, $2, $3)", [logId, email, success])
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const userId = user.rows[0].id;
    const pw = await pool.query("SELECT password_hash FROM user_passwords WHERE user_id = $1", [userId]);
    const match = await bcrypt.compare(password, pw.rows[0].password_hash);
    

    if (!match) {
      await pool.query("INSERT INTO login_logs (id, email, success) VALUES ($1, $2, $3)", [logId, email, success])
      return res.status(401).json({ error: "Invalid credentials" });
    }
    success = true;

    await pool.query("INSERT INTO login_logs (id, email, success) VALUES ($1, $2, $3)",[logId, email, success]);
    
    res.json({ userId, name: user.rows[0].name });
    console.log("Login successful for: ", email)
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

app.use(express.static('public'));
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

//test@1234!