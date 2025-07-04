let currentUser = null;
let prices = {};
let basePrices = {};

auth.onAuthStateChanged(user => {
  if (!user) return location.href = "ordering-login.html";

  db.ref("users/" + user.uid).once("value").then(snap => {
    const data = snap.val();
    if (!data || data.role !== "ordering") {
      alert("Unauthorized");
      return auth.signOut();
    }

    currentUser = data.displayName || user.email;
    document.getElementById("logged-user").textContent = "Logged in as: " + currentUser;
    loadPrices();
  });
});

function logout() {
  auth.signOut().then(() => location.href = "ordering-login.html");
}

function loadPrices() {
  db.ref("finalPrices").once("value").then(snap => {
    prices = snap.val() || {};
    prices.shrimp200g = prices.shrimp200g || prices.shrimp200 || 0;

    document.getElementById("price-tanigue").textContent = prices.tanigue || "0.00";
    document.getElementById("price-shrimp40g").textContent = prices.shrimp40g || "0.00";
    document.getElementById("price-shrimp200g").textContent = prices.shrimp200g || "0.00";
    document.getElementById("price-squidM").textContent = prices.squidM || "0.00";
    document.getElementById("price-squidCalamari").textContent = prices.squidCalamari || "0.00";
  });

  db.ref("basePrices").once("value").then(snap => {
    basePrices = snap.val() || {};
    basePrices.shrimp200g = basePrices.shrimp200 || basePrices.shrimp200g || 0;
  });
}

function submitOrder() {
  const uid = auth.currentUser.uid;
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000); // UTC+8
  const today = now.toISOString().split("T")[0];
  const timestamp = Date.now();

  const qty = {
    tanigue: parseFloat(document.getElementById("qty-tanigue").value) || 0,
    shrimp40g: parseFloat(document.getElementById("qty-shrimp40g").value) || 0,
    shrimp200g: parseFloat(document.getElementById("qty-shrimp200g").value) || 0,
    squidM: parseFloat(document.getElementById("qty-squidM").value) || 0,
    squidCalamari: parseFloat(document.getElementById("qty-squidCalamari").value) || 0
  };

  const items = [];
  let hasOrder = false;

  Object.entries(qty).forEach(([key, val]) => {
    if (val >= 1) {
      hasOrder = true;

      const unitPrice = parseFloat(prices[key]) || 0;
      const basePrice = parseFloat(basePrices[key]) || 0;

      items.push({
        item: key,
        qty: val,
        unitPrice: unitPrice.toFixed(2),    // Final (selling) price at time of order
        basePrice: basePrice.toFixed(2),    // Base price at time of order
        total: (unitPrice * val).toFixed(2) // Final total at time of order
      });
    }
  });

  if (!hasOrder) {
    document.getElementById("status").textContent = "❌ Minimum 1 kg per item required.";
    return;
  }

  const orderId = db.ref().child("orders").push().key;

  const orderData = {
    orderId,
    userId: uid,
    username: currentUser,
    date: today,
    timestamp,
    items,
    status: "pending"
  };

  db.ref("orders/" + orderId).set(orderData).then(() => {
    document.getElementById("status").textContent = "✅ Order submitted successfully!";
    document.getElementById("submitBtn").disabled = true;
  }).catch(err => {
    document.getElementById("status").textContent = "❌ Error: " + err.message;
  });
}
