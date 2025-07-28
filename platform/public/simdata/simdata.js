const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const BASE_URL = "http://localhost:3000";

// Utility functions
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomCertifications = () => {
  const certs = ["CPR", "Safety Training", "Hospitality Basics", "Fire Safety", "None"];
  return certs.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 1).join(", ");
};

// Profile options
const roles = ["Front Desk Agent", "Housekeeper", "Concierge", "Manager", "Server"];
const brands = ["Marriott", "Ritz-Carlton", "Sheraton", "Westin", "Courtyard"];
const locations = ["Bethesda, MD", "New York, NY", "Miami, FL", "Chicago, IL", "Seattle, WA"];
const locationTypes = ["Urban", "Suburban", "Resort", "Airport"];
const learningStyles = ["Visual", "Auditory", "Kinesthetic"];
const shiftTypes = ["Morning", "Evening", "Night"];
const guestInteractions = ["High", "Medium", "Low"];
const techComfortLevels = ["High", "Medium", "Low"];
const topics = [
  "Handling Guest Complaints",
  "Upselling Techniques",
  "Check-in Process",
  "Room Service Etiquette",
  "Emergency Procedures",
  "Using Hotel Software",
];

async function simulateUser(index) {
  const email = `simuser_${uuidv4().slice(0, 8)}@example.com`;
  const password = "Test@1234!";
  const name = `SimUser${index}`;

  try {
    // 1. Sign up
    const signupRes = await axios.post(`${BASE_URL}/api/signup`, { name, email, password });
    const userId = signupRes.data.userId;

    // 2. Log in
    await axios.post(`${BASE_URL}/api/login`, { email, password });

    // 3. Create randomized profile
    const profile = {
      userId,
      role: getRandom(roles),
      experience: Math.floor(Math.random() * 11),
      brand: getRandom(brands),
      location: getRandom(locations),
      locationType: getRandom(locationTypes),
      learningStyle: getRandom(learningStyles),
      shiftType: getRandom(shiftTypes),
      guestInteraction: getRandom(guestInteractions),
      techComfort: getRandom(techComfortLevels),
      certifications: getRandomCertifications(),
    };
    await axios.post(`${BASE_URL}/api/profile`, profile);

    // 4. Simulate topic interaction
    const selectedTopics = topics.sort(() => 0.5 - Math.random()).slice(0, 2 + Math.floor(Math.random() * 2));

    for (const topic of selectedTopics) {
      const contentRes = await axios.get(`${BASE_URL}/generate-content`, {
        params: { topic, userId },
      });
      const { quizId } = contentRes.data;

      // Log time on content
      const contentTime = 100 + Math.floor(Math.random() * 100);
      await axios.post(`${BASE_URL}/log-time`, {
        userId,
        quizId,
        type: "content",
        durationSec: contentTime,
      });

      // Simulate delay before starting quiz
      const delayBeforeQuiz = 2000 + Math.floor(Math.random() * 3000); // 2–5 seconds
      await sleep(delayBeforeQuiz);

      const quizRes = await axios.get(`${BASE_URL}/quiz/${quizId}`);
      const total = quizRes.data.quiz.length;
      const score = Math.floor(Math.random() * (total + 1));

      // Simulate time spent on quiz
      const quizTime = 60 + Math.floor(Math.random() * 120); // 1–3 minutes
      await sleep(quizTime * 1000);

      await axios.post(`${BASE_URL}/submit-quiz`, {
        userId,
        quizId,
        score,
        total,
      });

      await axios.post(`${BASE_URL}/log-time`, {
        userId,
        quizId,
        type: "quiz",
        durationSec: quizTime,
      });
    }

    console.log(`✅ Simulated user ${index + 1}`);
  } catch (err) {
    console.error(`❌ Error for user ${index + 1}:`, err.response?.data || err.message);
  }
}

async function simulateManyUsers(count = 10) {
  for (let i = 0; i < count; i++) {
    await simulateUser(i);
  }
}

simulateManyUsers(1); // Change this number to simulate more users
