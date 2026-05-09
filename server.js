// cms-api/server.js (updated with API key protection)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// ============ SECURITY: Get API Key from Environment ============
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'your-default-dev-key-change-this';

// ============ MIDDLEWARE ============
app.use(cors({
  origin: ['https://ayiapps.co.za', 'https://www.ayiapps.co.za', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// ============ AUTHENTICATION MIDDLEWARE ============
const requireAdmin = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'API key required. Please provide x-api-key header' 
    });
  }
  
  if (apiKey !== ADMIN_API_KEY) {
    return res.status(403).json({ 
      error: 'Invalid API key. Unauthorized access' 
    });
  }
  
  next();
};

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// ============ IN-MEMORY DATABASE ============
let inMemoryData = {
  pages: {},
  apps: [
    {
      appId: "app_001",
      name: "CV Generator",
      description: "Create professional CVs instantly with AI",
      category: "Productivity",
      isActive: true,
      order: 1,
      price: 1,
      features: ["AI Powered", "Multiple Templates", "PDF Export"],
      usageCount: 1250,
      createdAt: new Date().toISOString()
    },
    {
      appId: "app_002",
      name: "QR Code Generator",
      description: "Generate custom QR codes for your business",
      category: "Marketing",
      isActive: true,
      order: 2,
      price: 0,
      features: ["Custom Colors", "Logo Upload", "Bulk Generation"],
      usageCount: 890,
      createdAt: new Date().toISOString()
    },
    {
      appId: "app_003",
      name: "Social Media Scheduler",
      description: "Schedule posts across all social platforms",
      category: "Marketing",
      isActive: true,
      order: 3,
      price: 5,
      features: ["Multi-platform", "Analytics", "Team Collaboration"],
      usageCount: 450,
      createdAt: new Date().toISOString()
    }
  ],
  announcements: []
};

// ============ PUBLIC ENDPOINTS (No API key needed) ============

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'CMS API is running', 
    timestamp: new Date(),
    version: '1.0.0'
  });
});

// Get all active apps (public - main portal needs this)
app.get('/api/cms/apps', (req, res) => {
  const activeApps = inMemoryData.apps.filter(app => app.isActive === true);
  res.json(activeApps);
});

// Get single app by ID (public)
app.get('/api/cms/apps/:appId', (req, res) => {
  const app = inMemoryData.apps.find(a => a.appId === req.params.appId);
  if (!app) {
    return res.status(404).json({ error: 'App not found' });
  }
  res.json(app);
});

// Get announcements (public)
app.get('/api/cms/announcements', (req, res) => {
  const now = new Date();
  const activeAnnouncements = inMemoryData.announcements.filter(a => 
    a.isActive && new Date(a.startDate) <= now && new Date(a.endDate) >= now
  );
  res.json(activeAnnouncements);
});

// Track app usage (public - called when users launch apps)
app.post('/api/cms/apps/:appId/track', (req, res) => {
  const app = inMemoryData.apps.find(a => a.appId === req.params.appId);
  if (app) {
    app.usageCount = (app.usageCount || 0) + 1;
  }
  res.json({ success: true });
});

// ============ PROTECTED ENDPOINTS (API key required) ============

// Add new app (requires API key)
app.post('/api/cms/apps', requireAdmin, (req, res) => {
  const newApp = {
    appId: `app_${Date.now()}`,
    ...req.body,
    isActive: true,
    usageCount: 0,
    createdAt: new Date().toISOString()
  };
  
  inMemoryData.apps.push(newApp);
  res.json({ success: true, app: newApp });
});

// Update app (requires API key)
app.put('/api/cms/apps/:appId', requireAdmin, (req, res) => {
  const index = inMemoryData.apps.findIndex(a => a.appId === req.params.appId);
  if (index === -1) {
    return res.status(404).json({ error: 'App not found' });
  }
  
  inMemoryData.apps[index] = { ...inMemoryData.apps[index], ...req.body };
  res.json({ success: true, app: inMemoryData.apps[index] });
});

// Delete/Disable app (requires API key)
app.delete('/api/cms/apps/:appId', requireAdmin, (req, res) => {
  const index = inMemoryData.apps.findIndex(a => a.appId === req.params.appId);
  if (index === -1) {
    return res.status(404).json({ error: 'App not found' });
  }
  
  inMemoryData.apps[index].isActive = false;
  res.json({ success: true, message: 'App hidden from marketplace' });
});

// Update page content (requires API key)
app.post('/api/cms/page/:pageId', requireAdmin, (req, res) => {
  inMemoryData.pages[req.params.pageId] = {
    pageId: req.params.pageId,
    content: req.body,
    updatedAt: new Date()
  };
  res.json({ success: true });
});

// Add announcement (requires API key)
app.post('/api/cms/announcements', requireAdmin, (req, res) => {
  const newAnnouncement = {
    _id: String(Date.now()),
    ...req.body,
    createdAt: new Date()
  };
  inMemoryData.announcements.push(newAnnouncement);
  res.json({ success: true, announcement: newAnnouncement });
});

// Get all apps including inactive (admin only, requires API key)
app.get('/api/cms/admin/apps', requireAdmin, (req, res) => {
  res.json(inMemoryData.apps);
});

// Start server
const PORT = process.env.PORT || 3005;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ CMS API running on http://localhost:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 Apps endpoint: http://localhost:${PORT}/api/cms/apps`);
  console.log(`🔒 Protected endpoints require x-api-key header`);
});