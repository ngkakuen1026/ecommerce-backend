import pool from "../db/db"
import { Request, Response } from 'express';

//Create new order
const createOrder = async (req: Request, res: Response) => {
  const userId = req.user!.id; // authenticated user
  const { items } = req.body; // expected: [{ product_id, quantity }]

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ message: 'Order must contain at least one item.' });
    return;
  }

  try {
    // Start SQL transaction, if any step fails, rollback to avoid inconsistency
    await pool.query('BEGIN');

    let totalAmount = 0;

    // Validate products, product stocks, and calculate total amount
    for (const item of items) {
      const current = await pool.query(
        "SELECT price, quantity FROM products WHERE id = $1",
        [item.product_id]
      );

      const product = current.rows[0];
      if (!product) {
        res.status(404).json({ message: "Product with ID" + item.product_id + "not found"});
        return;
      }

      if (product.quantity < item.quantity) {
        res.status(400).json({ message: `Insufficient stock for product ID ${item.product_id}`});
        return;
      }

      totalAmount += parseFloat(product.price) * item.quantity;

      await pool.query(
        `UPDATE products SET quantity = quantity - $1 WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }

    // Create order
    const orderResult = await pool.query(
      "INSERT INTO orders (user_id, total_amount, status) VALUES ($1, $2, 'pending') RETURNING id",
      [userId, totalAmount]
    );
    const orderId = orderResult.rows[0].id;

    // Insert order items
    for (const item of items) {
      const productRes = await pool.query(
        `SELECT price FROM products WHERE id = $1`,
        [item.product_id]
      );
      const unitPrice = productRes.rows[0].price;

      await pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)`,
        [orderId, item.product_id, item.quantity, unitPrice]
      );
    }

    // Commit transaction
    await pool.query('COMMIT');
    console.log(`Order ${orderId} created successfully for user ${userId}`);
    res.status(201).json({ message: 'Order created successfully', orderId });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Order creation failed:', error);
    res.status(400).json({ error: error });
  }
};

// Get current user's orders
const getMyOrders = async (req: Request, res: Response) => {
    const userId = req.user!.id;

    try {
        const result = await pool.query(
            "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
            [userId]
        );

        res.status(200).json({ userId, orders: result.rows });

    } catch (error) {
        console.error("Error fetching user orders:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// Get details of specific orders
const getOrderById = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const orderId = parseInt(req.params.orderId);

    try {
        const orderResult = await pool.query(
            "SELECT * FROM orders WHERE id = $1 AND user_id = $2",
            [orderId, userId]
        );

        if (orderResult.rows.length === 0) {
            res.status(404).json({ message: "Order not found" });
            return;
        }

        const itemsResult = await pool.query(
            `SELECT order_items.*, products.title, products.image_url
            FROM order_items
            JOIN products ON order_items.product_id = products.id
            WHERE order_items.order_id = $1`,
            [orderId]
        );

        res.status(200).json({
            order: orderResult.rows[0],
            items: itemsResult.rows
        });
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// Update order status (e.g., to 'shipped', 'delivered')
const updateOrderStatus = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const orderId = parseInt(req.params.orderId);
    const { status } = req.body;

}

export { getMyOrders, getOrderById, createOrder };