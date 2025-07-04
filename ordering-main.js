auth.onAuthStateChanged(user => {
  if (!user) return location.href = "ordering-login.html";
  db.ref("users/" + user.uid).once("value").then(snap => {
    const data = snap.val();
    if (!data || data.role !== "ordering") {
      alert("Unauthorized access");
      return auth.signOut();
    }
    document.getElementById("logged-user").textContent = `Logged in as: ${data.displayName || user.email}`;
  });
});

function logout() {
  auth.signOut().then(() => location.href = "ordering-login.html");
}

function navigate(page) {
  window.location.href = page;
}
