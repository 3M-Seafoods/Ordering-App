let currentUser = null;

auth.onAuthStateChanged(user => {
  if (!user) return location.href = "ordering-login.html";

  db.ref("users/" + user.uid).once("value").then(snap => {
    const data = snap.val();
    if (!data || data.role !== "ordering") {
      alert("Unauthorized");
      return auth.signOut();
    }

    currentUser = data.displayName || user.email;
    document.getElementById("logged-user").textContent = `Logged in as: ${currentUser}`;
    loadOrders();
  });
});

function logout() {
  auth.signOut().then(() => location.href = "ordering-login.html");
}

function getTodayPH() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

function loadOrders() {
  const today = getTodayPH();
  const container = document.getElementById("order-summary");
  container.innerHTML = "";

  db.ref("orders").orderByChild("date").equalTo(today).once("value").then(snapshot => {
    const orders = snapshot.val() || {};
    const userOrders = Object.entries(orders).filter(([id, order]) => order.username === currentUser);

    if (userOrders.length === 0) {
      container.innerHTML = "<p>📭 No orders found for today.</p>";
      return;
    }

    userOrders.forEach(([orderId, order]) => {
      const section = document.createElement("div");
      section.className = "order-block";
      section.id = `print-section-${orderId}`;

      const list = document.createElement("ul");
      let total = 0;

      order.items.forEach(item => {
        const name = item.item;
        const orderedQty = parseFloat(item.qty) || 0;
        const unitPrice = parseFloat(item.unitPrice || 0);
        const deliveredQty = order.status !== "pending"
          ? parseFloat(order.supplierAdjustedItems?.[name]) || orderedQty
          : null;

        const finalQty = deliveredQty ?? orderedQty;
        const subtotal = finalQty * unitPrice;
        total += subtotal;

        const li = document.createElement("li");
        li.innerHTML = `
          <strong>${name}</strong><br>
          Unit Price: ₱${unitPrice.toFixed(2)}<br>
          Ordered: ${orderedQty} kg<br>
          ${deliveredQty !== null ? `Delivered: ${deliveredQty} kg<br>` : ""}
          Subtotal: ₱${subtotal.toFixed(2)}
        `;
        list.appendChild(li);
      });

      const timeString = order.timestamp
        ? new Date(order.timestamp).toLocaleTimeString("en-PH", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZone: "Asia/Manila"
          })
        : "";

      section.innerHTML += `
        <p><strong>Status:</strong> ${order.status} ${timeString ? `(${timeString})` : ""}</p>
      `;
      section.appendChild(list);
      section.innerHTML += `<p><strong>Total: ₱${total.toFixed(2)}</strong></p>`;

      const actionDiv = document.createElement("div");
      actionDiv.id = `action-${orderId}`;
      if (order.status === "delivered") {
        actionDiv.innerHTML = `<button onclick="markAsReceived('${orderId}')">✅ Mark as Received</button>`;
      } else if (order.status === "received") {
        actionDiv.innerHTML = `<button onclick="downloadPDF('${orderId}')">📄 Generate Receipt</button>`;
      }

      section.appendChild(actionDiv);
      container.appendChild(section);
    });
  });
}

function markAsReceived(orderId) {
  db.ref(`orders/${orderId}`).update({ status: "received" }).then(() => {
    loadOrders();
  }).catch(err => alert("Error: " + err.message));
}

function downloadPDF(orderId) {
  const section = document.getElementById(`print-section-${orderId}`);
  if (!section) return alert("Nothing to print.");

  const today = getTodayPH();
  const wrapper = document.createElement("div");
  wrapper.id = "pdf-wrapper";
  wrapper.style.cssText = `
    width: 100%;
    max-width: 280px;
    background: #fff;
    padding: 10px;
    margin: 20px auto;
    color: #000;
    font-family: Courier, monospace;
    font-size: 9px;
    text-align: center;
  `;

  const logo = document.createElement("img");
  logo.src = "images/logo.png";
  logo.style.cssText = "max-width:60px; margin-bottom:5px;";

  const title = document.createElement("h2");
  title.textContent = "3M SEAFOOD STORE";
  title.style.cssText = "margin:5px 0;font-size:11px;";

  const subtitle = document.createElement("p");
  subtitle.textContent = "Your Trusted Seafood Partner";
  subtitle.style.cssText = "margin:0 0 10px;font-size:9px;";

  const dateEl = document.createElement("p");
  dateEl.textContent = `Date: ${today}`;
  const orderIdEl = document.createElement("p");
  orderIdEl.textContent = `Order No: ${orderId}`;

  const hr = document.createElement("hr");
  const cloned = section.cloneNode(true);
  cloned.style.cssText = "text-align: left; margin-top: 10px;";

  const thankYou = document.createElement("p");
  thankYou.textContent = "Thank you for your order!";
  thankYou.style.cssText = "margin-top:12px;font-size:9px;";

  wrapper.append(logo, title, subtitle, dateEl, orderIdEl, hr, cloned, thankYou);
  document.body.appendChild(wrapper);

  html2canvas(wrapper, { scale: 3, useCORS: true, windowWidth: wrapper.scrollWidth }).then(canvas => {
    const imgData = canvas.toDataURL("image/jpeg", 1.0);
    const pxToMm = px => px * 0.264583;
    const pdfWidth = pxToMm(canvas.width);
    const pdfHeight = pxToMm(canvas.height);

    const pdf = new jsPDF({
      unit: "mm",
      format: [pdfWidth, pdfHeight],
      orientation: "portrait"
    });

    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${today}_${orderId}_Receipt.pdf`);
    wrapper.remove();
  });
}
