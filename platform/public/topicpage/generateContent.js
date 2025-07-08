// js/generateContent.js
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const topic = params.get("topic");
  document.getElementById("topic-title").textContent = topic;

  const response = await fetch(`/api/generate?topic=${encodeURIComponent(topic)}`);
  const data = await response.json();
  document.getElementById("training-content").innerHTML = data.content;
});
