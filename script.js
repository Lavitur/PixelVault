// ========================
// SESSION MANAGEMENT
// ========================
const SESSION_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

function setSession(user) {
  user.expiry = Date.now() + SESSION_DURATION;
  localStorage.setItem("currentUser", JSON.stringify(user));
}

function getSession() {
  const userStr = localStorage.getItem("currentUser");
  if (!userStr) return null;
  const user = JSON.parse(userStr);
  if (Date.now() > user.expiry) {
    localStorage.removeItem("currentUser");
    return null;
  }
  return user;
}

function requireLogin() {
  if (!getSession()) {
    window.location.href = "Login.html";
  }
}

function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "Login.html";
}

// ========================
// DOMContentLoaded Setup
// ========================
document.addEventListener("DOMContentLoaded", function() {
  // Pages where login is not required: Login.html and Register.html.
  const page = window.location.pathname.split("/").pop();
  if (page !== "Login.html" && page !== "Register.html") {
    requireLogin();
  } else {
    // On the Login page, clear any existing session.
    if (page === "Login.html") {
      localStorage.removeItem("currentUser");
    }
  }
  
  // If navigation exists, add admin panel link if current user is admin.
  const currentUser = getSession();
  const nav = document.getElementById("mainNav");
  if (currentUser && currentUser.admin && nav) {
    if (!document.getElementById("adminPanelLink")) {
      const adminLink = document.createElement("a");
      adminLink.href = "Admin.html";
      adminLink.id = "adminPanelLink";
      adminLink.textContent = "Admin Panel";
      nav.appendChild(adminLink);
    }
  }
  
  // For pages that require dynamic content, call the corresponding loader functions:
  if (document.getElementById("productGrid")) loadProducts();
  if (document.getElementById("cartTable")) loadCart();
  if (document.getElementById("invoiceDetails")) loadInvoice();
  if (document.getElementById("genderChart")) {
    renderCharts();
    renderInvoices();
  }
  if (document.getElementById("adminProductList")) renderAdminProducts();
});

// ========================
// LOGIN HANDLING (Login.html)
// ========================
if (document.getElementById("loginForm")) {
  document.getElementById("loginForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const trn = document.getElementById("trn").value.trim();
    const password = document.getElementById("password").value;
    
    // Check for admin credentials first
    if (trn === "352-576-920" && password === "AdminLog1n") {
      setSession({ trn, admin: true });
      alert("Admin login successful!");
      window.location.href = "Products.html";
      return;
    }
    
    // Otherwise, check standard user registration data
    let users = JSON.parse(localStorage.getItem("RegistrationData")) || [];
    const user = users.find(u => u.trn === trn && u.password === password);
    if (user) {
      setSession({ trn, admin: false });
      alert("Login successful!");
      window.location.href = "Products.html";
    } else {
      let attempts = parseInt(sessionStorage.getItem("loginAttempts") || "0", 10);
      attempts++;
      sessionStorage.setItem("loginAttempts", attempts);
      if (attempts >= 3) {
        alert("Account locked due to multiple failed attempts.");
        window.location.href = "Login.html"; // You can change this to an error page if needed.
      } else {
        document.getElementById("errorMsg").textContent = "Incorrect credentials. Attempts left: " + (3 - attempts);
      }
    }
  });
}

function resetLogin() {
  if (document.getElementById("loginForm")) {
    document.getElementById("loginForm").reset();
    document.getElementById("errorMsg").textContent = "";
  }
}

// ========================
// REGISTRATION HANDLING (Register.html)
// ========================
if (document.getElementById("registrationForm")) {
  document.getElementById("registrationForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const dob = document.getElementById("dob").value;
    const gender = document.getElementById("gender").value;
    const phone = document.getElementById("phone").value.trim();
    const email = document.getElementById("email").value.trim();
    const trn = document.getElementById("trn").value.trim();
    const password = document.getElementById("password").value;
    
    if (password.length < 8) {
      document.getElementById("regMsg").textContent = "Password must be at least 8 characters.";
      return;
    }
    const birthDate = new Date(dob);
    const ageDifMs = Date.now() - birthDate.getTime();
    const age = new Date(ageDifMs).getUTCFullYear() - 1970;
    if (age < 18) {
      document.getElementById("regMsg").textContent = "You must be over 18 to register.";
      return;
    }
    const trnRegex = /^\d{3}-\d{3}-\d{3}$/;
    if (!trnRegex.test(trn)) {
      document.getElementById("regMsg").textContent = "TRN must be in the format 000-000-000.";
      return;
    }
    let users = JSON.parse(localStorage.getItem("RegistrationData")) || [];
    if (users.find(u => u.trn === trn)) {
      document.getElementById("regMsg").textContent = "TRN already registered.";
      return;
    }
    const newUser = {
      firstName,
      lastName,
      dob,
      gender,
      phone,
      email,
      trn,
      password,
      dateOfRegistration: new Date().toISOString(),
      cart: [],
      invoices: []
    };
    users.push(newUser);
    localStorage.setItem("RegistrationData", JSON.stringify(users));
    alert("Registration successful! Please log in.");
    window.location.href = "Login.html";
  });
}

function resetRegistration() {
  if (document.getElementById("registrationForm")) {
    document.getElementById("registrationForm").reset();
    document.getElementById("regMsg").textContent = "";
  }
}

// ========================
// PRODUCT MANAGEMENT & CART (Products.html and Cart.html)
// ========================

// Initialize default products (only if not already set)
let defaultProducts = [
  { id: 1, name: "Retro Console", price: 199.99, description: "Classic gaming console with vintage charm.", image: "images/console1.png", stock: 10 },
  { id: 2, name: "Arcade Machine", price: 299.99, description: "Mini arcade machine for nostalgic fun.", image: "images/arcade.png", stock: 5 },
  { id: 3, name: "Pixelated Controller", price: 49.99, description: "Stylish controller with pixelated design.", image: "images/controller.png", stock: 15 },
  { id: 4, name: "Retro Game Cartridge", price: 19.99, description: "Old school game cartridge for ultimate nostalgia.", image: "images/cartridge.png", stock: 20 },
  { id: 5, name: "Vintage Headset", price: 39.99, description: "Experience retro sound with this vintage headset.", image: "images/headset.png", stock: 8 },
  { id: 6, name: "Classic Joystick", price: 29.99, description: "Retro joystick that makes gaming fun.", image: "images/joystick.png", stock: 12 },
  { id: 7, name: "Pixel Art Poster", price: 9.99, description: "Decorative poster with pixel art style.", image: "images/poster.png", stock: 25 },
  { id: 8, name: "Retro T-shirt", price: 24.99, description: "Soft t-shirt featuring retro pixel design.", image: "images/tshirt.png", stock: 30 },
  { id: 9, name: "Vintage Puzzle", price: 14.99, description: "A fun, old-school puzzle game.", image: "images/puzzle.png", stock: 18 }
];
if (!localStorage.getItem("AllProducts")) {
  localStorage.setItem("AllProducts", JSON.stringify(defaultProducts));
}

// Load products into Products.html
function loadProducts() {
  const products = JSON.parse(localStorage.getItem("AllProducts"));
  const productGrid = document.getElementById("productGrid");
  products.forEach(product => {
    let stockInfo = (product.stock > 0) ? `In Stock: ${product.stock}` : `<span class="error">Out of Stock</span>`;
    let productCard = document.createElement("div");
    productCard.className = "product";
    productCard.innerHTML = `
      <img src="${product.image}" alt="${product.name}">
      <h3>${product.name}</h3>
      <p>${product.description}</p>
      <p>Price: $${product.price.toFixed(2)}</p>
      <p>${stockInfo}</p>
      <button onclick="addToCart(${product.id})" ${product.stock <= 0 ? "disabled" : ""}>Add to Cart</button>
    `;
    productGrid.appendChild(productCard);
  });
}

// addToCart() function (does not update stock immediately)
function addToCart(productId) {
  let products = JSON.parse(localStorage.getItem("AllProducts")) || [];
  const product = products.find(p => p.id === productId);
  if (!product) {
    alert("Product not found!");
    return;
  }
  if (product.stock <= 0) {
    alert("This item is out of stock!");
    return;
  }
  
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const cartItem = cart.find(item => item.id === productId);
  const cartQty = cartItem ? cartItem.quantity : 0;
  
  if (cartQty + 1 > product.stock) {
    alert("You've added the maximum available stock of this item.");
    return;
  }
  
  if (cartItem) {
    cartItem.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description,
      image: product.image,
      quantity: 1
    });
  }
  localStorage.setItem("cart", JSON.stringify(cart));
  alert(`${product.name} added to cart!`);
}

// ========================
// CART MANAGEMENT (Cart.html)
// ========================
function loadCart() {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const tbody = document.querySelector("#cartTable tbody");
  tbody.innerHTML = "";
  let total = 0;
  cart.forEach((item, index) => {
    const subtotal = item.price * item.quantity;
    total += subtotal;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.name}</td>
      <td>$${item.price.toFixed(2)}</td>
      <td>
        <input type="number" value="${item.quantity}" min="1" onchange="updateQuantity(${index}, this.value)">
      </td>
      <td>$${subtotal.toFixed(2)}</td>
      <td><button onclick="removeItem(${index})">Remove</button></td>
    `;
    tbody.appendChild(row);
  });
  document.getElementById("totalCost").textContent = "Total: $" + total.toFixed(2);
}

function updateQuantity(index, qty) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  let products = JSON.parse(localStorage.getItem("AllProducts")) || [];
  const diff = qty - cart[index].quantity;
  const product = products.find(p => p.id === cart[index].id);
  if(diff > product.stock) {
    alert("Insufficient stock available!");
    return;
  }
  cart[index].quantity = parseInt(qty);
  product.stock -= diff;
  localStorage.setItem("cart", JSON.stringify(cart));
  localStorage.setItem("AllProducts", JSON.stringify(products));
  loadCart();
}

function removeItem(index) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  let products = JSON.parse(localStorage.getItem("AllProducts")) || [];
  const product = products.find(p => p.id === cart[index].id);
  product.stock += cart[index].quantity;
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  localStorage.setItem("AllProducts", JSON.stringify(products));
  loadCart();
}

function clearCart() {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  let products = JSON.parse(localStorage.getItem("AllProducts")) || [];
  cart.forEach(item => {
    const product = products.find(p => p.id === item.id);
    product.stock += item.quantity;
  });
  localStorage.removeItem("cart");
  localStorage.setItem("AllProducts", JSON.stringify(products));
  loadCart();
}

// ========================
// CHECKOUT & INVOICE (Checkout.html and Invoice.html)
// ========================
if (document.getElementById("checkoutForm")) {
  document.getElementById("checkoutForm").addEventListener("submit", function(e) {
    e.preventDefault();
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    if(cart.length === 0) {
      alert("Cart is empty!");
      return;
    }
    let total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let tax = total * 0.07; // 7% tax
    let discount = (total >= 200) ? total * 0.05 : 0;
    let finalTotal = total + tax - discount;
    
    const invoice = {
      invoiceNumber: 'INV-' + Date.now(),
      date: new Date().toLocaleString(),
      items: cart,
      subtotal: total.toFixed(2),
      tax: tax.toFixed(2),
      discount: discount.toFixed(2),
      total: finalTotal.toFixed(2),
      shipping: {
        name: document.getElementById("shipName").value,
        address: document.getElementById("shipAddress").value,
        email: document.getElementById("shipEmail").value
      }
    };
    
    // Update stock in AllProducts after checkout
    let products = JSON.parse(localStorage.getItem("AllProducts")) || [];
    cart.forEach(item => {
      let product = products.find(p => p.id === item.id);
      if(product) {
        product.stock = Math.max(0, product.stock - item.quantity);
      }
    });
    localStorage.setItem("AllProducts", JSON.stringify(products));
    
    let allInvoices = JSON.parse(localStorage.getItem("AllInvoices")) || [];
    allInvoices.push(invoice);
    localStorage.setItem("AllInvoices", JSON.stringify(allInvoices));
    localStorage.removeItem("cart");
    alert("Checkout successful! Invoice generated.");
    window.location.href = "Invoice.html?inv=" + invoice.invoiceNumber;
  });
}

function loadInvoice() {
  function getInvoiceByNumber(invNumber) {
    let invoices = JSON.parse(localStorage.getItem("AllInvoices")) || [];
    return invoices.find(inv => inv.invoiceNumber === invNumber);
  }
  
  const params = new URLSearchParams(window.location.search);
  const invNumber = params.get("inv");
  const invoice = getInvoiceByNumber(invNumber);
  const invDiv = document.getElementById("invoiceDetails");
  if(invoice) {
    invDiv.innerHTML = `
      <h2>Invoice #: ${invoice.invoiceNumber}</h2>
      <p>Date: ${invoice.date}</p>
      <p>Shipping: ${invoice.shipping.name}, ${invoice.shipping.address}, ${invoice.shipping.email}</p>
      <h3>Items Purchased:</h3>
      <table>
        <thead>
          <tr>
            <th>Product</th><th>Price</th><th>Qty</th><th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>$${item.price.toFixed(2)}</td>
              <td>${item.quantity}</td>
              <td>$${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p>Subtotal: $${invoice.subtotal}</p>
      <p>Tax: $${invoice.tax}</p>
      <p>Discount: $${invoice.discount}</p>
      <h2>Total: $${invoice.total}</h2>
    `;
  } else {
    invDiv.innerHTML = "<p>Invoice not found.</p>";
  }
}

// ========================
// DASHBOARD (Dashboard.html)
// ========================
function renderCharts() {
  const users = JSON.parse(localStorage.getItem("RegistrationData")) || [];
  let genders = { Male: 0, Female: 0, Other: 0 };
  let ages = { "18-25": 0, "26-35": 0, "36-50": 0, "50+": 0 };
  
  users.forEach(user => {
    genders[user.gender] = (genders[user.gender] || 0) + 1;
    let age = getAge(user.dob);
    if(age >= 18 && age <= 25) ages["18-25"]++;
    else if(age >= 26 && age <= 35) ages["26-35"]++;
    else if(age >= 36 && age <= 50) ages["36-50"]++;
    else if(age > 50) ages["50+"]++;
  });
  
  const genderDiv = document.getElementById("genderChart");
  for (let key in genders) {
    genderDiv.innerHTML += `<p>${key}: ${genders[key]} <div style="height:${genders[key]*20}px;"></div></p>`;
  }
  
  const ageDiv = document.getElementById("ageChart");
  for (let key in ages) {
    ageDiv.innerHTML += `<p>${key}: ${ages[key]} <div style="height:${ages[key]*20}px;"></div></p>`;
  }
}

function getAge(dob) {
  const birthDate = new Date(dob);
  const ageDifMs = Date.now() - birthDate.getTime();
  return Math.abs(new Date(ageDifMs).getUTCFullYear() - 1970);
}

function renderInvoices() {
  const invoices = JSON.parse(localStorage.getItem("AllInvoices")) || [];
  const invDiv = document.getElementById("invoiceList");
  if (invoices.length === 0) {
    invDiv.innerHTML = "<p>No invoices found.</p>";
    return;
  }
  let html = `<table>
    <thead>
      <tr>
        <th>Invoice Number</th><th>Date</th><th>Total</th><th>Action</th>
      </tr>
    </thead>
    <tbody>`;
  invoices.forEach(inv => {
    html += `<tr>
      <td>${inv.invoiceNumber}</td>
      <td>${inv.date}</td>
      <td>$${inv.total}</td>
      <td><button onclick="viewInvoice('${inv.invoiceNumber}')">View</button></td>
    </tr>`;
  });
  html += `</tbody></table>`;
  invDiv.innerHTML = html;
}

function viewInvoice(invNumber) {
  window.location.href = "Invoice.html?inv=" + invNumber;
}

// ========================
// ADMIN PANEL (Admin.html)
// ========================
if (document.getElementById("addProductForm")) {
  document.getElementById("addProductForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const pName = document.getElementById("pName").value.trim();
    const pPrice = parseFloat(document.getElementById("pPrice").value);
    const pStock = parseInt(document.getElementById("pStock").value, 10);
    const pDesc = document.getElementById("pDesc").value.trim();
    const pImage = document.getElementById("pImage").value.trim();
    
    let products = JSON.parse(localStorage.getItem("AllProducts")) || [];
    const newProduct = {
      id: products.length ? Math.max(...products.map(p => p.id)) + 1 : 1,
      name: pName,
      price: pPrice,
      description: pDesc,
      image: pImage,
      stock: pStock
    };
    products.push(newProduct);
    localStorage.setItem("AllProducts", JSON.stringify(products));
    alert("Product added successfully!");
    renderAdminProducts();
    document.getElementById("addProductForm").reset();
  });
}

function renderAdminProducts() {
  let products = JSON.parse(localStorage.getItem("AllProducts")) || [];
  const adminProductList = document.getElementById("adminProductList");
  if (!adminProductList) return;
  adminProductList.innerHTML = "";
  products.forEach(product => {
    adminProductList.innerHTML += `
      <div class="product">
        <h3>${product.name}</h3>
        <p>Price: $${product.price.toFixed(2)} | Stock: ${product.stock}</p>
        <p>${product.description}</p>
        <button onclick="deleteProduct(${product.id})">Delete</button>
        <button onclick="editProduct(${product.id})">Edit</button>
      </div>
    `;
  });
}

function deleteProduct(id) {
  let products = JSON.parse(localStorage.getItem("AllProducts")) || [];
  products = products.filter(p => p.id !== id);
  localStorage.setItem("AllProducts", JSON.stringify(products));
  alert("Product deleted.");
  renderAdminProducts();
}

function editProduct(id) {
  let products = JSON.parse(localStorage.getItem("AllProducts")) || [];
  const product = products.find(p => p.id === id);
  let newPrice = prompt("Enter new price:", product.price);
  let newStock = prompt("Enter new stock quantity:", product.stock);
  if(newPrice !== null && newStock !== null) {
    product.price = parseFloat(newPrice);
    product.stock = parseInt(newStock, 10);
    localStorage.setItem("AllProducts", JSON.stringify(products));
    alert("Product updated.");
    renderAdminProducts();
  }
}
