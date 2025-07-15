document.addEventListener("DOMContentLoaded", async () => {
  const quizId = sessionStorage.getItem("quizId");
  if (!quizId) {
    document.body.innerHTML = "<p> No quiz found for this topic.</p>";
    return;
  }

  const response = await fetch(`/quiz/${quizId}`);
  const data = await response.json();
  const quiz = data.quiz;
  console.log(typeof(quiz[0]))
  console.log("quiz data: ", quiz)

  const container = document.getElementById("quiz-container");
  quiz.forEach((q, index) => {
  const qDiv = document.createElement("div");
  qDiv.className = "card";
  qDiv.style.animationDelay = `${index * 0.2}s`;

  const question = document.createElement("p");
  question.innerHTML = `<strong>${index + 1}. ${q.question}</strong>`;
  qDiv.appendChild(question);

  q.options.forEach(opt => {
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

// function submitQuiz() {
//   let score = 0;
//   window.quizData.forEach((q, index) => {
//     const selected = document.querySelector(`input[name="q${index}"]:checked`);
//     if (selected && selected.value === q.answer) {
//       score++;
//     }
//   });
//   document.getElementById("result").innerText = `You scored ${score} out of ${window.quizData.length}`;
// }
function submitQuiz() {
  let score = 0;
  window.quizData.forEach((q, index) => {
    const selected = document.querySelector(`input[name="q${index}"]:checked`);
    if (selected && selected.value === q.answer) {
      score++;
    }
  });

  const result = {
    quizId: sessionStorage.getItem("quizId"),
    userId: sessionStorage.getItem("userId"), // assuming you store this on login
    score,
    total: window.quizData.length,
  };

  fetch("/submit-quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result),
  });

  document.getElementById("result").innerText = `✅ You scored ${score} out of ${window.quizData.length}`;
}
