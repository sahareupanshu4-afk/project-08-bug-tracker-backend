const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  getTickets,
  getTicket,
  createTicket,
  updateTicket,
  deleteTicket,
  updateTicketStatus,
  bulkUpdateOrder,
  uploadAttachment,
  getDashboardStats,
} = require('../controllers/ticketController');
const { protect, checkProjectAccess } = require('../middleware/auth');

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Allow images and common file types
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter,
});

// Dashboard stats route (must be before /:id routes)
router.get('/stats/dashboard', protect, getDashboardStats);

// Bulk update route
router.put('/bulk-order', protect, bulkUpdateOrder);

// Project tickets route
router.get('/project/:projectId', protect, checkProjectAccess, getTickets);

router
  .route('/')
  .post(protect, createTicket);

router
  .route('/:id')
  .get(protect, getTicket)
  .put(protect, updateTicket)
  .delete(protect, deleteTicket);

router
  .route('/:id/status')
  .put(protect, updateTicketStatus);

router
  .route('/:id/attachments')
  .post(protect, upload.single('file'), uploadAttachment);

module.exports = router;