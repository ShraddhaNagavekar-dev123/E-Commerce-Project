const productsContainer = document.getElementById("products-container");

fetch("http://localhost:5000/api/products")
    .then(response => response.json())
    .then(products => {
        productsContainer.innerHTML = "";

        products.forEach(product => {

            const productCard = document.createElement("div");
            productCard.classList.add("product-card");

            productCard.innerHTML = `
                <img 
                    src="images/${product.image}" 
                    alt="${product.name}"
                    class="product-image"
                >

                <h2>${product.name}</h2>

                <p>${product.description}</p>

                <h3>₹${product.price}</h3>

                <p>Category: ${product.category}</p>

                <p>Stock: ${product.stock}</p>

                <button onclick="addToCart(${product.id})">
                    Add to Cart
                </button>
            `;

            productsContainer.appendChild(productCard);
        });
    })
    .catch(error => {
        console.error("Error fetching products:", error);

        productsContainer.innerHTML =
            "<p>Unable to load products.</p>";
    });


// Add Product to Cart
function addToCart(productId) {

    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    const existingProduct = cart.find(
        item => item.id === productId
    );

    if (existingProduct) {
        existingProduct.quantity++;
    } else {
        cart.push({
            id: productId,
            quantity: 1
        });
    }

    localStorage.setItem("cart", JSON.stringify(cart));

    alert("Product added to cart!");
}
