// navbar.js
document.addEventListener("DOMContentLoaded", async () => {
  const response = await fetch("/navbar/navbar.html");
  const html = await response.text();
  document.body.insertAdjacentHTML("afterbegin", html);

  // Set profile initials
  const user = sessionStorage.getItem("user");
  if (user) {
    const initials = user.split(" ").map(n => n[0]).join("").toUpperCase();
    const profileIcon = document.querySelector(".profile-icon");
    if (profileIcon) profileIcon.textContent = `${initials} ▼`;

    // Greeting (optional)
    const greetingEl = document.getElementById("greeting");
    if (greetingEl) {
      const hour = new Date().getHours();
      let timeOfDay = "Hello";
      if (hour < 12) timeOfDay = "Good morning";
      else if (hour < 18) timeOfDay = "Good afternoon";
      else timeOfDay = "Good evening";
      greetingEl.textContent = `${timeOfDay}, ${user}!`;
    }
  }

  // Dropdown logic
  window.toggleNotifications = () => {
    document.getElementById("notification-panel").classList.toggle("hidden");
    document.getElementById("profile-menu").classList.add("hidden");
  };

  window.toggleProfileMenu = () => {
    document.getElementById("profile-menu").classList.toggle("hidden");
    document.getElementById("notification-panel").classList.add("hidden");
  };

  window.logout = () => {
    sessionStorage.clear();
    window.location.href = "/login.html";
  };

  window.addEventListener("click", function (e) {
    if (!e.target.closest(".notification-wrapper")) {
      document.getElementById("notification-panel")?.classList.add("hidden");
    }
    if (!e.target.closest(".profile-wrapper")) {
      document.getElementById("profile-menu")?.classList.add("hidden");
    }
  });
});
