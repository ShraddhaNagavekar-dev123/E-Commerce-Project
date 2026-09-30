// =========================
// Imports
// =========================

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const db = require("./config/db");


// =========================
// Create Express App
// =========================

const app = express();


// =========================
// Middleware
// =========================

app.use(cors());
app.use(express.json());


// =========================
// Home API
// =========================

app.get("/", (req, res) => {
    res.send("E-Commerce Backend is running!");
});


// =========================
// Product API
// =========================

app.get("/api/products", (req, res) => {

    const sql = "SELECT * FROM products";

    db.query(sql, (err, results) => {

        if (err) {
            console.error("Product fetch error:", err);

            return res.status(500).json({
                message: "Failed to fetch products"
            });
        }

        res.json(results);
    });
});


// =========================
// Registration API
// =========================

app.post("/api/register", async (req, res) => {

    const { name, email, password } = req.body;

    // Check fields
    if (!name || !email || !password) {

        return res.status(400).json({
            message: "All fields are required"
        });
    }

    try {

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO users
            (name, email, password)
            VALUES (?, ?, ?)
        `;

        db.query(
            sql,
            [name, email, hashedPassword],
            (err, result) => {

                if (err) {

                    console.error(
                        "Registration error:",
                        err
                    );

                    // Duplicate email
                    if (err.code === "ER_DUP_ENTRY") {

                        return res.status(400).json({
                            message:
                                "Email already registered"
                        });
                    }

                    return res.status(500).json({
                        message: "Registration failed"
                    });
                }

                res.status(201).json({
                    message:
                        "User registered successfully"
                });
            }
        );

    } catch (error) {

        console.error(
            "Password hashing error:",
            error
        );

        res.status(500).json({
            message: "Server error"
        });
    }
});


// =========================
// Login API
// =========================

app.post("/api/login", async (req, res) => {

    const { email, password } = req.body;

    // Check fields
    if (!email || !password) {

        return res.status(400).json({
            message:
                "Email and password are required"
        });
    }

    const sql = `
        SELECT *
        FROM users
        WHERE email = ?
    `;

    db.query(
        sql,
        [email],
        async (err, results) => {

            if (err) {

                console.error(
                    "Login database error:",
                    err
                );

                return res.status(500).json({
                    message: "Login failed"
                });
            }

            // User not found
            if (results.length === 0) {

                return res.status(401).json({
                    message:
                        "Invalid email or password"
                });
            }

            const user = results[0];

            try {

                // Compare password
                const passwordMatch =
                    await bcrypt.compare(
                        password,
                        user.password
                    );

                if (!passwordMatch) {

                    return res.status(401).json({
                        message:
                            "Invalid email or password"
                    });
                }

                // Login successful
                res.json({

                    message:
                        "Login successful",

                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email
                    }
                });

            } catch (error) {

                console.error(
                    "Password comparison error:",
                    error
                );

                res.status(500).json({
                    message: "Login failed"
                });
            }
        }
    );
});


// =========================
// Place Order API
// =========================

app.post("/api/orders", async (req, res) => {

    const {
        user_id,
        total_amount,
        items
    } = req.body;


    // =========================
    // Validate Order
    // =========================

    if (
        !user_id ||
        !total_amount ||
        !Array.isArray(items) ||
        items.length === 0
    ) {

        return res.status(400).json({
            message: "Invalid order data"
        });
    }


    try {

        // =========================
        // Start Transaction
        // =========================

        await db.promise().beginTransaction();

        console.log("Transaction started");


        // =========================
        // Check Product Stock
        // =========================

        for (const item of items) {

            const [products] =
                await db.promise().query(
                    `
                    SELECT id, name, stock
                    FROM products
                    WHERE id = ?
                    FOR UPDATE
                    `,
                    [item.product_id]
                );


            // Product not found
            if (products.length === 0) {

                await db.promise().rollback();

                return res.status(400).json({
                    message:
                        `Product ID ${item.product_id} not found`
                });
            }


            const product = products[0];


            // Check stock
            if (product.stock < item.quantity) {

                await db.promise().rollback();

                return res.status(400).json({
                    message:
                        `Not enough stock for ${product.name}. Available stock: ${product.stock}`
                });
            }
        }


        // =========================
        // Create Order
        // =========================

        const [orderResult] =
            await db.promise().query(
                `
                INSERT INTO orders
                (user_id, total_amount)
                VALUES (?, ?)
                `,
                [
                    user_id,
                    total_amount
                ]
            );


        const orderId =
            orderResult.insertId;


        console.log(
            "Order created:",
            orderId
        );


        // =========================
        // Insert Order Items
        // =========================

        for (const item of items) {

            await db.promise().query(
                `
                INSERT INTO order_items
                (order_id, product_id, quantity, price)
                VALUES (?, ?, ?, ?)
                `,
                [
                    orderId,
                    item.product_id,
                    item.quantity,
                    item.price
                ]
            );
        }


        console.log(
            "Order items inserted"
        );


        // =========================
        // Decrease Product Stock
        // =========================

        for (const item of items) {

            const [updateResult] =
                await db.promise().query(
                    `
                    UPDATE products
                    SET stock = stock - ?
                    WHERE id = ?
                    `,
                    [
                        item.quantity,
                        item.product_id
                    ]
                );


            console.log(
                "Stock updated:",
                "Product ID =",
                item.product_id,
                "Quantity =",
                item.quantity,
                "Rows affected =",
                updateResult.affectedRows
            );
        }


        // =========================
        // Commit Transaction
        // =========================

        await db.promise().commit();


        console.log(
            "Transaction committed"
        );

        console.log(
            "Order placed successfully:",
            orderId
        );


        // =========================
        // Send Response
        // =========================

        res.status(201).json({

            message:
                "Order placed successfully",

            order_id:
                orderId
        });


    } catch (error) {


        // =========================
        // Rollback
        // =========================

        console.error(
            "Order error:",
            error
        );


        try {

            await db.promise().rollback();

            console.log(
                "Transaction rolled back"
            );

        } catch (rollbackError) {

            console.error(
                "Rollback error:",
                rollbackError
            );
        }


        // =========================
        // Error Response
        // =========================

        res.status(500).json({

            message:
                "Failed to place order",

            error:
                error.message
        });
    }
});


// =========================
// Start Server
// =========================

const PORT = 5000;

app.listen(PORT, () => {

    console.log(
        `Server running on http://localhost:${PORT}`
    );

});