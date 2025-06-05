import pool from "../db/db"
import { Request, Response } from 'express';
import stripe from '../utils/stripe';

const createPaymentIntent = async (req: Request, res: Response) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ message: 'Cart is empty.' });
    return ;
  }

  try {
    let totalAmount = 0;

    for (const item of items) {
      const result = await pool.query(
        'SELECT price FROM products WHERE id = $1',
        [item.product_id]
      );

      const product = result.rows[0];
      if (!product) {
        res.status(404).json({ message: `Product ${item.product_id} not found.` });
        return;
      }

      totalAmount += parseFloat(product.price) * item.quantity;
    }

    const totalInCents = Math.round(totalAmount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalInCents,
      currency: 'usd',
      payment_method_types: ['card'],
    });

    console.log(`PaymentIntent created: ${paymentIntent.id} for $${totalAmount}`);
    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      amount: totalAmount,
      amountInCents: totalInCents,
    });
  } catch (error) {
    console.error('Payment intent error:', error);
    res.status(500).json({ message: 'Failed to create payment intent' });
  }
};

export { createPaymentIntent };