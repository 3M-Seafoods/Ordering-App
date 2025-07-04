let username = "";

auth.onAuthStateChanged(user => {
  if (!user) return location.href = "ordering-login.html";

  db.ref("users/" + user.uid).once("value").then(snapshot => {
    const userData = snapshot.val();
    if (!userData || userData.role !== "ordering") return auth.signOut();

    username = userData.displayName || user.email;
    document.getElementById("logged-user").textContent = "Logged in as: " + username;
  });
});

function loadHistory() {
  const selectedDate = document.getElementById("date-picker").value;
  if (!selectedDate) return;

  const historyDiv = document.getElementById("history-results");

  db.ref("orders").orderByChild("username").equalTo(username).once("value").then(snapshot => {
    const orders = snapshot.val();
    if (!orders) {
      historyDiv.innerHTML = "<p>❌ No order history found.</p>";
      return;
    }

    let found = false;
    let html = "";

    for (let orderId in orders) {
      const order = orders[orderId];
      if (order.date !== selectedDate) continue;

      found = true;
      const items = order.items || [];
      const adjusted = order.supplierAdjustedItems || {};
      let total = 0;

      let block = `
        <div style="border:1px solid #ccc; padding:10px; margin:10px;">
          <strong>Date:</strong> ${order.date}<br>
          <strong>Status:</strong> ${order.status}<br>
          <ul style="padding-left: 18px;">
      `;

      items.forEach(item => {
        const itemName = item.item;
        const unitPrice = parseFloat(item.unitPrice || item.price || 0);
        const orderedQty = parseFloat(item.qty) || 0;
        const deliveredQty = adjusted[itemName] ?? orderedQty;
        const totalItem = deliveredQty * unitPrice;
        total += totalItem;

        block += `
          <li>
            ${itemName}: ${deliveredQty} kg × ₱${unitPrice.toFixed(2)} = 
            <strong>₱${totalItem.toFixed(2)}</strong>
          </li>`;
      });

      block += `
          </ul>
          <strong>Total: ₱${total.toFixed(2)}</strong>
        </div>
      `;

      html += block;
    }

    historyDiv.innerHTML = found ? html : "<p>📭 No orders found for the selected date.</p>";
  });
}

function logout() {
  auth.signOut().then(() => location.href = "ordering-login.html");
}
