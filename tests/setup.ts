// Set env so modules that instantiate Stripe at load time (e.g. orders.repository) don't throw in tests.
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_fake';
