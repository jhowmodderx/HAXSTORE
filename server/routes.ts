import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertProductSchema, insertPaymentSchema, insertAdminRequestSchema, insertActivityLogSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
    }
  }
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware to get client IP
  const getClientIP = (req: any) => {
    return req.headers['x-forwarded-for'] || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
           '127.0.0.1';
  };

  // Middleware for activity logging
  const logActivity = async (userId: number | null, action: string, details: any, req: any) => {
    try {
      await storage.createActivityLog({
        userId,
        action,
        details,
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'] || null,
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  };

  // Initialize default admin users and settings
  app.post('/api/init', async (req, res) => {
    try {
      // Create owner user
      const ownerExists = await storage.getUserByUsername('123');
      if (!ownerExists) {
        const hashedPassword = await bcrypt.hash('jhow', 10);
        await storage.createUser({
          username: '123',
          password: hashedPassword,
          role: 'owner',
        });
      }

      // Create admin user
      const adminExists = await storage.getUserByUsername('jhow');
      if (!adminExists) {
        const hashedPassword = await bcrypt.hash('jhow123', 10);
        await storage.createUser({
          username: 'jhow',
          password: hashedPassword,
          role: 'admin',
        });
      }

      // Set default PIX key
      const pixSetting = await storage.getSetting('pixKey');
      if (!pixSetting) {
        const owner = await storage.getUserByUsername('123');
        if (owner) {
          await storage.setSetting('pixKey', 'chave-pix-default@email.com', owner.id);
        }
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to initialize system' });
    }
  });

  // Authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const user = await storage.getUserByUsername(username.toLowerCase());
      if (!user || !user.isActive) {
        await logActivity(null, 'LOGIN_FAILED', { username, reason: 'User not found' }, req);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        await logActivity(user.id, 'LOGIN_FAILED', { reason: 'Invalid password' }, req);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      await storage.updateUser(user.id, {
        lastLoginAt: new Date(),
        ipAddress: getClientIP(req),
      });

      await logActivity(user.id, 'LOGIN_SUCCESS', {}, req);

      // Don't send password in response
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(validatedData.username.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      // Reserved usernames
      if (['123', 'jhow'].includes(validatedData.username.toLowerCase())) {
        return res.status(400).json({ error: 'This username is reserved' });
      }

      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      const user = await storage.createUser({
        ...validatedData,
        username: validatedData.username.toLowerCase(),
        password: hashedPassword,
      });

      await logActivity(user.id, 'USER_REGISTERED', {}, req);

      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin request route
  app.post('/api/auth/request-admin', async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.role !== 'user') {
        return res.status(400).json({ error: 'User already has elevated privileges' });
      }

      // Check if there's already a pending request
      const pendingRequests = await storage.getPendingAdminRequests();
      const existingRequest = pendingRequests.find(req => req.userId === userId);
      
      if (existingRequest) {
        return res.status(400).json({ error: 'Admin request already pending' });
      }

      const adminRequest = await storage.createAdminRequest({
        userId,
        requestedRole: 'admin',
      });

      await logActivity(userId, 'ADMIN_REQUEST_CREATED', { requestId: adminRequest.id }, req);

      res.status(201).json({ request: adminRequest });
    } catch (error) {
      console.error('Admin request error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Products routes
  app.get('/api/products', async (req, res) => {
    try {
      const products = await storage.getActiveProducts();
      res.json({ products });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  app.post('/api/products', async (req, res) => {
    try {
      const validatedData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(validatedData);
      
      await logActivity(req.body.userId, 'PRODUCT_CREATED', { productId: product.id, name: product.name }, req);
      
      res.status(201).json({ product });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  });

  app.put('/api/products/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const product = await storage.updateProduct(id, updates);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      await logActivity(req.body.userId, 'PRODUCT_UPDATED', { productId: id, name: product.name }, req);
      
      res.json({ product });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  });

  app.delete('/api/products/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      const success = await storage.deleteProduct(id);
      if (!success) {
        return res.status(500).json({ error: 'Failed to delete product' });
      }
      
      await logActivity(req.body.userId, 'PRODUCT_DELETED', { productId: id, name: product.name }, req);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  });

  // Payments routes
  app.post('/api/payments', async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validatedData);
      
      await logActivity(validatedData.userId, 'PAYMENT_CREATED', { 
        paymentId: payment.id, 
        productId: validatedData.productId,
        amount: validatedData.amount 
      }, req);
      
      res.status(201).json({ payment });
    } catch (error) {
      console.error('Create payment error:', error);
      res.status(500).json({ error: 'Failed to create payment' });
    }
  });

  app.post('/api/payments/:id/upload-proof', upload.single('proof'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const payment = await storage.getPayment(id);
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      // In a real app, you'd upload to cloud storage and get a URL
      const proofImageUrl = `/uploads/${file.filename}`;
      
      const updatedPayment = await storage.updatePaymentStatus(id, payment.status, payment.approvedBy || undefined, payment.rejectionReason || undefined);
      
      await logActivity(payment.userId, 'PAYMENT_PROOF_UPLOADED', { 
        paymentId: id,
        filename: file.originalname 
      }, req);
      
      res.json({ payment: updatedPayment, proofImageUrl });
    } catch (error) {
      console.error('Upload proof error:', error);
      res.status(500).json({ error: 'Failed to upload proof' });
    }
  });

  app.get('/api/admin/payments/pending', async (req, res) => {
    try {
      const payments = await storage.getPendingPayments();
      res.json({ payments });
    } catch (error) {
      console.error('Get pending payments error:', error);
      res.status(500).json({ error: 'Failed to fetch pending payments' });
    }
  });

  app.get('/api/admin/payments/history', async (req, res) => {
    try {
      const payments = await storage.getPaymentHistory();
      res.json({ payments });
    } catch (error) {
      console.error('Get payment history error:', error);
      res.status(500).json({ error: 'Failed to fetch payment history' });
    }
  });

  app.put('/api/admin/payments/:id/approve', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { approvedBy } = req.body;
      
      const payment = await storage.updatePaymentStatus(id, 'approved', approvedBy);
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }
      
      await logActivity(approvedBy, 'PAYMENT_APPROVED', { paymentId: id }, req);
      
      res.json({ payment });
    } catch (error) {
      console.error('Approve payment error:', error);
      res.status(500).json({ error: 'Failed to approve payment' });
    }
  });

  app.put('/api/admin/payments/:id/reject', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { approvedBy, rejectionReason } = req.body;
      
      const payment = await storage.updatePaymentStatus(id, 'rejected', approvedBy, rejectionReason);
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }
      
      await logActivity(approvedBy, 'PAYMENT_REJECTED', { 
        paymentId: id, 
        reason: rejectionReason 
      }, req);
      
      res.json({ payment });
    } catch (error) {
      console.error('Reject payment error:', error);
      res.status(500).json({ error: 'Failed to reject payment' });
    }
  });

  // Admin routes
  app.get('/api/admin/requests', async (req, res) => {
    try {
      const requests = await storage.getPendingAdminRequests();
      res.json({ requests });
    } catch (error) {
      console.error('Get admin requests error:', error);
      res.status(500).json({ error: 'Failed to fetch admin requests' });
    }
  });

  app.put('/api/admin/requests/:id/approve', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { approvedBy } = req.body;
      
      const request = await storage.updateAdminRequestStatus(id, 'approved', approvedBy);
      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }
      
      // Update user role
      await storage.updateUser(request.userId, { role: 'admin' });
      
      await logActivity(approvedBy, 'ADMIN_REQUEST_APPROVED', { 
        requestId: id,
        newAdminUserId: request.userId 
      }, req);
      
      res.json({ request });
    } catch (error) {
      console.error('Approve admin request error:', error);
      res.status(500).json({ error: 'Failed to approve admin request' });
    }
  });

  app.put('/api/admin/requests/:id/reject', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { approvedBy } = req.body;
      
      const request = await storage.updateAdminRequestStatus(id, 'rejected', approvedBy);
      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }
      
      await logActivity(approvedBy, 'ADMIN_REQUEST_REJECTED', { requestId: id }, req);
      
      res.json({ request });
    } catch (error) {
      console.error('Reject admin request error:', error);
      res.status(500).json({ error: 'Failed to reject admin request' });
    }
  });

  app.get('/api/admin/users', async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json({ users: safeUsers });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.get('/api/admin/logs', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getActivityLogs(limit);
      res.json({ logs });
    } catch (error) {
      console.error('Get logs error:', error);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  });

  // Settings routes
  app.get('/api/settings/:key', async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      res.json({ setting });
    } catch (error) {
      console.error('Get setting error:', error);
      res.status(500).json({ error: 'Failed to fetch setting' });
    }
  });

  app.post('/api/settings', async (req, res) => {
    try {
      const { key, value, updatedBy } = req.body;
      const setting = await storage.setSetting(key, value, updatedBy);
      
      await logActivity(updatedBy, 'SETTING_UPDATED', { key, value }, req);
      
      res.json({ setting });
    } catch (error) {
      console.error('Set setting error:', error);
      res.status(500).json({ error: 'Failed to update setting' });
    }
  });

  // Warnings routes
  app.get('/api/warnings', async (req, res) => {
    try {
      const warnings = await storage.getActiveWarnings();
      res.json({ warnings });
    } catch (error) {
      console.error('Get warnings error:', error);
      res.status(500).json({ error: 'Failed to fetch warnings' });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  const httpServer = createServer(app);
  return httpServer;
}
