
let topicStartTime;

document.addEventListener("DOMContentLoaded", () => {
  topicStartTime = Date.now();
  const params = new URLSearchParams(window.location.search);
  const topic = params.get("topic");

  const titleEl = document.getElementById("topic-title");
  const contentEl = document.getElementById("topic-content");
  const loadingEl = document.getElementById("loading");

  if (topic) {
    titleEl.textContent = topic;
    fetchContent(topic);
  } else {
    titleEl.textContent = "No topic provided.";
    loadingEl.style.display = "none";
  }

  async function fetchContent(topic) {
    try {
      const userId = sessionStorage.getItem("userId")
      const response = await fetch(
        `/generate-content?topic=${encodeURIComponent(topic)}&userId=${encodeURIComponent(userId)}`
      );
      const data = await response.json();
      if (data.content) {
        const quizStart = data.content.indexOf('{');
        const displayContent = quizStart !== -1 ? data.content.slice(0, quizStart).trim() : data.content;
        contentEl.innerHTML = marked.parse(displayContent);
        contentEl.style.display = "block";
        if (data.quizId) {
          sessionStorage.setItem("quizId", data.quizId);
          document.getElementById("take-quiz-btn").style.display =
            "inline-block";
        } else {
          console.log("no quiz id")
        }
      } else {
        contentEl.textContent = "No content received.";
        contentEl.style.display = "block";
      }
    } catch (error) {
      contentEl.textContent = "Error loading content.";
      contentEl.style.display = "block";
    } finally {
      loadingEl.style.display = "none";
    }
  }
  document.getElementById("take-quiz-btn").addEventListener("click", async () => {
    const durationSec = Math.round((Date.now() - topicStartTime) / 1000);
    await fetch("/log-time", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        userId: sessionStorage.getItem("userId"),
        quizId: sessionStorage.getItem("quizId"),
        type: "topic",
        durationSec
      })
    });
    window.location.href = "quiz/quiz.html";
  });
});
