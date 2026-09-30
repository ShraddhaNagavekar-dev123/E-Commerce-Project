// =========================
// Cart Elements
// =========================

const cartItems = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");
const checkoutBtn = document.getElementById("checkout-btn");


// =========================
// Get Cart From LocalStorage
// =========================

let cart = JSON.parse(localStorage.getItem("cart")) || [];


// =========================
// Load Products
// =========================

async function loadCart() {

    try {

        const response = await fetch(
            "http://localhost:5000/api/products"
        );

        if (!response.ok) {
            throw new Error("Failed to fetch products");
        }

        const products = await response.json();

        displayCart(products);

    } catch (error) {

        console.error(
            "Error loading cart:",
            error
        );

        cartItems.innerHTML =
            "<p>Unable to load cart.</p>";
    }
}


// =========================
// Display Cart
// =========================

function displayCart(products) {

    cartItems.innerHTML = "";

    let total = 0;


    // Empty cart
    if (cart.length === 0) {

        cartItems.innerHTML =
            "<p>Your cart is empty.</p>";

        cartTotal.textContent =
            "Total: ₹0";

        return;
    }


    cart.forEach(cartProduct => {

        const product = products.find(
            item => item.id === cartProduct.id
        );


        // Product not found
        if (!product) {
            return;
        }


        const itemTotal =
            Number(product.price) *
            cartProduct.quantity;


        total += itemTotal;


        const cartItem =
            document.createElement("div");


        cartItem.classList.add(
            "cart-item"
        );


        cartItem.innerHTML = `

            <h3>${product.name}</h3>

            <p>
                Price: ₹${product.price}
            </p>

            <p>
                Available Stock: ${product.stock}
            </p>

            <button
                onclick="decreaseQuantity(${product.id})">
                −
            </button>

            <span>
                ${cartProduct.quantity}
            </span>

            <button
                onclick="increaseQuantity(${product.id})">
                +
            </button>

            <p>
                Item Total: ₹${itemTotal}
            </p>

            <button
                onclick="removeFromCart(${product.id})">
                Remove
            </button>

        `;


        cartItems.appendChild(
            cartItem
        );

    });


    cartTotal.textContent =
        `Total: ₹${total}`;
}


// =========================
// Increase Quantity
// =========================

function increaseQuantity(productId) {

    const product = cart.find(
        item => item.id === productId
    );


    if (product) {

        product.quantity++;

    }


    localStorage.setItem(
        "cart",
        JSON.stringify(cart)
    );


    loadCart();
}


// =========================
// Decrease Quantity
// =========================

function decreaseQuantity(productId) {

    const product = cart.find(
        item => item.id === productId
    );


    if (product) {

        product.quantity--;


        if (product.quantity <= 0) {

            cart = cart.filter(
                item => item.id !== productId
            );

        }

    }


    localStorage.setItem(
        "cart",
        JSON.stringify(cart)
    );


    loadCart();
}


// =========================
// Remove Product
// =========================

function removeFromCart(productId) {

    cart = cart.filter(
        item => item.id !== productId
    );


    localStorage.setItem(
        "cart",
        JSON.stringify(cart)
    );


    loadCart();
}


// =========================
// Place Order
// =========================

checkoutBtn.addEventListener(
    "click",
    async function () {

        // Check cart
        if (cart.length === 0) {

            alert(
                "Your cart is empty!"
            );

            return;
        }


        // Check login
        const user =
            JSON.parse(
                localStorage.getItem("user")
            );


        if (!user) {

            alert(
                "Please login before placing an order."
            );

            window.location.href =
                "login.html";

            return;
        }


        try {

            // =========================
            // Get Latest Products
            // =========================

            const response =
                await fetch(
                    "http://localhost:5000/api/products"
                );


            if (!response.ok) {

                throw new Error(
                    "Unable to fetch products"
                );

            }


            const products =
                await response.json();


            // =========================
            // Prepare Order
            // =========================

            let total = 0;

            const items = [];


            for (const cartProduct of cart) {

                const product =
                    products.find(
                        item =>
                            item.id ===
                            cartProduct.id
                    );


                if (!product) {

                    alert(
                        "Product not found."
                    );

                    return;
                }


                // Check stock before ordering
                if (
                    cartProduct.quantity >
                    product.stock
                ) {

                    alert(
                        `Not enough stock for ${product.name}. Available stock: ${product.stock}`
                    );

                    return;
                }


                const itemTotal =
                    Number(product.price) *
                    cartProduct.quantity;


                total += itemTotal;


                items.push({

                    product_id:
                        product.id,

                    quantity:
                        cartProduct.quantity,

                    price:
                        Number(product.price)

                });

            }


            // =========================
            // Send Order To Backend
            // =========================

            console.log(
                "Sending order:",
                {
                    user_id: user.id,
                    total_amount: total,
                    items: items
                }
            );


            const orderResponse =
                await fetch(
                    "http://localhost:5000/api/orders",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            user_id:
                                user.id,

                            total_amount:
                                total,

                            items:
                                items

                        })
                    }
                );


            const data =
                await orderResponse.json();


            console.log(
                "Order response:",
                data
            );


            // =========================
            // Order Successful
            // =========================

            if (orderResponse.ok) {

                alert(
                    "Order placed successfully!"
                );


                // Clear cart
                localStorage.removeItem(
                    "cart"
                );


                // Go to products page
                window.location.href =
                    "products.html";

            } else {

                alert(
                    data.message ||
                    "Failed to place order."
                );

            }


        } catch (error) {

            console.error(
                "Order error:",
                error
            );


            alert(
                "Unable to place order. Check whether the backend server is running."
            );

        }

    }
);


// =========================
// Start
// =========================

loadCart();