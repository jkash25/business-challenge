
// document.addEventListener("DOMContentLoaded", () => {
//   const params = new URLSearchParams(window.location.search);
//   const topic = params.get("topic");

//   const titleEl = document.getElementById("topic-title");
//   const contentEl = document.getElementById("topic-content");
//   const loadingEl = document.getElementById("loading");

//   if (!topic || !titleEl || !contentEl || !loadingEl) {
//     console.error("Missing required DOM elements or topic parameter.");
//     return;
//   }

//   titleEl.textContent = topic;
//   loadingEl.style.display = "block";

//   fetch(`/generate-content?topic=${encodeURIComponent(topic)}`)
//     .then((res) => {
//       if (!res.ok) throw new Error("Failed to fetch content");
//       return res.json();
//     })
//     .then((data) => {
//       loadingEl.style.display = "none";
//       contentEl.textContent = data.content;
//     })
//     .catch((err) => {
//       loadingEl.style.display = "none";
//       contentEl.textContent = "❌ Failed to load content. Please try again later.";
//       console.error(err);
//     });
// });

document.addEventListener("DOMContentLoaded", () => {
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
      const response = await fetch(`/generate-content?topic=${encodeURIComponent(topic)}`);
      const data = await response.json();
      if (data.content) {
        contentEl.innerHTML = marked.parse(data.content);
        contentEl.style.display = "block";
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
});
