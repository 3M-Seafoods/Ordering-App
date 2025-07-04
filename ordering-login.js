function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const status = document.getElementById("status");

  if (!email || !password) {
    status.textContent = "⚠️ Please fill in both fields.";
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .then(cred => db.ref("users/" + cred.user.uid).once("value"))
    .then(snapshot => {
      const user = snapshot.val();
      if (!user || user.role !== "ordering") {
        status.textContent = "❌ Not authorized for Ordering App.";
        return auth.signOut();
      }
      location.href = "ordering-main.html";
    })
    .catch(err => {
      status.textContent = "❌ " + err.message;
    });
}
