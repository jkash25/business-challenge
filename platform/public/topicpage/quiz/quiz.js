let quizStartTime;

document.addEventListener("DOMContentLoaded", async () => {
  quizStartTime = Date.now();
  const quizId = sessionStorage.getItem("quizId");
  const userId = sessionStorage.getItem("userId");
  if (!quizId || !userId) {
    document.body.innerHTML = "<p>Missing quiz or user information.</p>";
    return;
  }
  const check = await fetch(`/has-submitted?quizId=${quizId}&userId=${userId}`);
  const { hasSubmitted } = await check.json();

  if (hasSubmitted) {
    document.body.innerHTML = "<p> You have already submitted this quiz. </p>";
    return;
  }

  const response = await fetch(`/quiz/${quizId}`);
  const data = await response.json();
  const quiz = data.quiz;
  console.log(typeof quiz[0]);
  console.log("quiz data: ", quiz);

  const container = document.getElementById("quiz-container");
  quiz.forEach((q, index) => {
    const qDiv = document.createElement("div");
    qDiv.className = "card";
    qDiv.style.animationDelay = `${index * 0.2}s`;

    const question = document.createElement("p");
    question.innerHTML = `<strong>${index + 1}. ${q.question}</strong>`;
    qDiv.appendChild(question);

    q.options.forEach((opt) => {
      const label = document.createElement("label");
      label.style.display = "block";
      label.style.margin = "8px 0";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = `q${index}`;
      input.value = opt;

      label.appendChild(input);
      label.appendChild(document.createTextNode(" " + opt));
      qDiv.appendChild(label);
    });

    container.appendChild(qDiv);
  });

  window.quizData = quiz;
});

async function submitQuiz() {
  const durationSec = Math.round((Date.now() - quizStartTime) / 1000);
  let score = 0;
  window.quizData.forEach((q, index) => {
    const selected = document.querySelector(`input[name="q${index}"]:checked`);
    if (selected && selected.value === q.answer) {
      console.log("Selected:", selected.value, "Answer:", q.answer);
      score++;
    }
  });

  const result = {
    quizId: sessionStorage.getItem("quizId"),
    userId: sessionStorage.getItem("userId"), // assuming you store this on login
    score,
    total: window.quizData.length,
  };

  const response = await fetch("/submit-quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result),
  });

  const message = await response.json();
  if (response.ok) {
    document.getElementById(
      "result"
    ).innerText = `✅ You scored ${score} out of ${window.quizData.length}`;
    document.querySelector("button").disabled = true;
    setTimeout(() => {
      window.location.href = "quizconfirmation.html";
    }, 3000); // 3 seconds delay
  } else {
    document.getElementById(("result".innerText = `${message.message}`));
  }

  await fetch("/log-time", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: sessionStorage.getItem("userId"),
      quizId: sessionStorage.getItem("quizId"),
      type: "quiz",
      durationSec,
    }),
  });
}
