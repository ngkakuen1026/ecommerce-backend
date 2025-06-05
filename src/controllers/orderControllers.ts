import pool from "../db/db"
import { Request, Response } from 'express';
import stripe from '../utils/stripe';

const createOrder = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { items, payment_intent_id } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ message: 'Order must contain at least one item.' });
    return;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      res.status(400).json({ message: 'Payment not successful.' });
      return;
    }

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
        res.status(404).json({ message: "Product with ID" + item.product_id + "not found" });
        return;
      }

      if (product.quantity < item.quantity) {
        res.status(400).json({ message: `Insufficient stock for product ID ${item.product_id}` });
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

// Get user's list of orders (buyer)
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

// Get user's list of orders (seller)
const getOrdersAsSeller = async (req: Request, res: Response) => {
  const sellerId = req.user!.id;

  try {
    const result = await pool.query(`
      SELECT DISTINCT orders.*
      FROM orders
      JOIN order_items ON orders.id = order_items.order_id
      JOIN products ON order_items.product_id = products.id
      WHERE products.user_id = $1
      ORDER BY orders.created_at DESC
    `, [sellerId]);

    res.status(200).json({ sellerId, orders: result.rows });
  } catch (error) {
    console.error("Error fetching seller orders:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get details of specific orders (buyer)
const getOrderDetailById = async (req: Request, res: Response) => {
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
      `SELECT order_items.*, products.title, pi.image_url
        FROM order_items
        JOIN products ON order_items.product_id = products.id
        LEFT JOIN LATERAL (
            SELECT image_url
            FROM product_images
            WHERE product_id = products.id
            ORDER BY id ASC
            LIMIT 1
        ) pi ON true
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

// Get details of specific orders (seller)
const getSellerOrderDetails = async (req: Request, res: Response) => {
  const sellerId = req.user!.id;
  const orderId = parseInt(req.params.orderId);

  try {
    const itemsResult = await pool.query(`
      SELECT order_items.*, products.title, pi.image_url
      FROM order_items
      JOIN products ON order_items.product_id = products.id
            LEFT JOIN LATERAL (
            SELECT image_url
            FROM product_images
            WHERE product_id = products.id
            ORDER BY id ASC
            LIMIT 1
        ) pi ON true
      WHERE order_items.order_id = $1
        AND products.user_id = $2
    `, [orderId, sellerId]);

    if (itemsResult.rows.length === 0) {
      res.status(403).json({ message: "You do not have any products in this order." });
      return;
    }

    const orderResult = await pool.query(`
      SELECT * FROM orders WHERE id = $1
    `, [orderId]);

    res.status(200).json({
      order: orderResult.rows[0],
      sellerItems: itemsResult.rows
    });
  } catch (error) {
    console.error("Error fetching seller-specific order details:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Update order status (e.g., to 'shipped', 'delivered')
const updateOrderStatus = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const orderId = parseInt(req.params.orderId);
  const { status } = req.body;

  try {
    // Check if the order belongs to the seller
    const current = await pool.query(
      `SELECT order_items.*
        FROM order_items
        JOIN products ON order_items.product_id = products.id
        WHERE order_items.order_id = $1 AND products.user_id = $2`,
      [orderId, userId]
    );

    if (current.rows.length === 0) {
      res.status(403).json({ message: "You do not have permission to update this order" });
      return;
    };

    // Update the order status
    const result = await pool.query(
      "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
      [status, orderId]
    )
    res.status(200).json({
      message: "Order status updated successfully",
      order: result.rows[0]
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }

}

export { getMyOrders, getOrderDetailById, getOrdersAsSeller, getSellerOrderDetails, createOrder, updateOrderStatus };