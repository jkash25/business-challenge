const express = require("express");
const app = express();
const port = 3000;
const { OpenAI } = require("openai");
const bcrypt = require("bcrypt");
require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const oracledb = require("oracledb");
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// In-memory cache
const cache = {};
const quizzes = {};

app.get(`/generate-content`, async (req, res) => {
  const topic = req.query.topic;
  const userId = req.query.userId;
  console.log("The topic is: " + topic);
  if (!topic) return res.status(400).json({ error: "Missing topic" });

  if (cache[topic]) {
    const quizId = Object.keys(quizzes).find(
      (id) => quizzes[id].topic === topic
    );
    return res.json({ content: cache[topic], quizId });
  }
  const userProfile = await pool.query(
    "SELECT role, experience, brand, learningstyle, shifttype, guestinteraction, techcomfort, certifications FROM users WHERE id = $1",
    [userId]
  );
  const {
    role,
    experience,
    brand,
    location,
    locationType,
    shiftType,
    learningStyle,
    guestInteraction,
    techComfort,
    certifications,
  } = userProfile.rows[0];

  try {
    const prompt = `Generate a training module for Marriott hotel staff on the topic: "${topic}". 
    The person is in the role of ${role} with ${experience} years of experience and is working at a ${brand} Marriott hotel. The hotel is located in ${location} and the hotel type is a/an ${locationType}.
    This associate has a ${shiftType} shift and prefers a ${learningStyle} learning Style. Their role has a ${guestInteraction} level of guest interaction. Their comfort with tech is ${techComfort} and they have the following certifications: ${certifications}.
    Ensure that the content is tailored to the user personally based on their information. Focus on preparing staff for
    unique, real, human interactions because right now most staff find the current training unhelpful in preparing them for authentic, guest-facing situations. 
    Include:
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
    //const prompt2 = "test prompt, return one sentence";
    console.log("Prompt: ", prompt);
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
      await pool.query("INSERT INTO quizzes (id, topic) VALUES ($1, $2)", [
        quizId,
        topic,
      ]);
      quizzes[quizId] = { quiz: quizJson.quiz, topic };
      res.json({ content, quizId });
    } else {
      return res
        .status(500)
        .json({ error: "Quiz not found in generated content" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate content" });
  }
});

app.get(`/quiz/:id`, (req, res) => {
  const quizEntry = quizzes[req.params.id];
  if (!quizEntry) {
    return res.status(404).json({ error: "Quiz not found" });
  }
  res.json({ quiz: quizEntry.quiz });
});

// Signup endpoint
app.use(express.json());
app.post("/api/signup", async (req, res) => {
  const { name, email, password } = req.body;
  console.log("user password is : ", password);
  try {
    const existing = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    await pool.query(
      "INSERT INTO users (id, name, email) VALUES ($1, $2, $3)",
      [id, name, email]
    );
    await pool.query(
      "INSERT INTO user_passwords (user_id, password_hash) VALUES ($1, $2)",
      [id, hashedPassword]
    );

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
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (user.rows.length === 0) {
      await pool.query(
        "INSERT INTO login_logs (id, email, success, attempted_time) VALUES ($1, $2, $3)",
        [logId, email, success]
      );
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const userId = user.rows[0].id;
    const pw = await pool.query(
      "SELECT password_hash FROM user_passwords WHERE user_id = $1",
      [userId]
    );
    const match = await bcrypt.compare(password, pw.rows[0].password_hash);

    if (!match) {
      await pool.query(
        "INSERT INTO login_logs (id, email, success) VALUES ($1, $2, $3)",
        [logId, email, success]
      );
      return res.status(401).json({ error: "Invalid credentials" });
    }
    success = true;

    await pool.query(
      "INSERT INTO login_logs (id, email, success) VALUES ($1, $2, $3)",
      [logId, email, success]
    );

    res.json({
      userId,
      name: user.rows[0].name,
      isAdmin: user.rows[0].is_admin,
    });
    console.log("Login successful for: ", email);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/submit-quiz", async (req, res) => {
  const { quizId, userId, score, total } = req.body;
  const logId = uuidv4();
  try {
    const userCheck = await pool.query(
      "SELECT is_admin FROM users WHERE id = $1",
      [userId]
    );
    const isAdmin = userCheck.rows[0]?.is_admin;
    if (!isAdmin) {
      const existing = await pool.query(
        "SELECT * FROM quiz_results WHERE user_id = $1 AND quiz_id = $2",
        [userId, quizId]
      );
      if (existing.rows.length > 0) {
        return res
          .status(400)
          .json({ message: "You have already submitted this quiz." });
      }
    }

    // Save to DB
    await pool.query(
      "INSERT INTO quiz_results (id, user_id, quiz_id, score, total_questions) VALUES ($1, $2, $3, $4, $5)",
      [logId, userId, quizId, score, total]
    );

    res.status(200).json({ message: "Result saved" });
  } catch (error) {
    console.error("Error saving quiz result:", error);
    res.status(500).json({ error: "Failed to save result" });
  }
});

app.get("/has-submitted", async (req, res) => {
  const { quizId, userId } = req.query;

  if (!quizId || !userId) {
    return res.status(400).json({ error: "Missing quizId or userId" });
  }

  try {
    const result = await pool.query(
      "SELECT 1 FROM quiz_results WHERE user_id = $1 AND quiz_id = $2",
      [userId, quizId]
    );

    res.json({ hasSubmitted: result.rows.length > 0 });
  } catch (error) {
    console.error("Error checking submission:", error);
    res.status(500).json({ error: "Failed to check submission" });
  }
});

app.post("/log-time", async (req, res) => {
  const { userId, quizId, type, durationSec } = req.body;
  const id = uuidv4();

  try {
    await pool.query(
      "INSERT INTO time_logs (id, user_id, quiz_id, type, duration_sec, logged_at) VALUES ($1, $2, $3, $4, $5, NOW())",
      [id, userId, quizId, type, durationSec]
    );
    res.status(200).json({ message: "Time logged" });
  } catch (err) {
    console.error("Error logging time:", err);
    res.status(500).json({ error: "Failed to log time" });
  }
});

app.get("/api/profile", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const result = await pool.query(
      `SELECT role, experience, brand, marshacode, location, locationtype,
              learningstyle, shifttype, guestinteraction, techcomfort, certifications
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.post("/api/profile", async (req, res) => {
  const {
    userId,
    role,
    experience,
    brand,
    marshaCode,
    location,
    locationType,
    learningStyle,
    shiftType,
    guestInteraction,
    techComfort,
    certifications,
  } = req.body;

  if (
    !userId ||
    !role ||
    !experience ||
    !brand ||
    !marshaCode ||
    !location ||
    !locationType
  ) {
    return res.status(400).json({ error: "Missing profile information" });
  }

  try {
    await pool.query(
      `UPDATE users SET
        role = $1, experience = $2, brand = $3, marshacode = $4, location = $5, locationtype = $6,
        learningstyle = $7, shifttype = $8, guestinteraction = $9, techcomfort = $10, certifications = $11
      WHERE id = $12`,
      [
        role,
        experience,
        brand,
        marshaCode,
        location,
        locationType,
        learningStyle,
        shiftType,
        guestInteraction,
        techComfort,
        certifications,
        userId,
      ]
    );
    res.status(200).json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

app.get("/api/hotels", async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING,
    });

    const result = await connection.execute(
      `SELECT marshacode, hotelname, location, locationtype FROM hotel`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching hotels:", err);
    res.status(500).json({ error: "Failed to fetch hotels" });
  } finally {
    if (connection) await connection.close();
  }
});

app.use(express.static("public"));
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

//test@1234!
