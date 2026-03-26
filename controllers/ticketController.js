const Ticket = require('../models/Ticket');
const Project = require('../models/Project');
const Comment = require('../models/Comment');

// @desc    Get all tickets for a project
// @route   GET /api/tickets/project/:projectId
// @access  Private
exports.getTickets = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, priority, assignee, search } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (assignee) filters.assignee_id = assignee;
    if (search) filters.search = search;

    const tickets = await Ticket.findByProject(projectId, filters);

    // Get comment counts for each ticket
    const ticketsWithComments = await Promise.all(
      tickets.map(async (ticket) => {
        const commentCount = await Comment.countByTicket(ticket.id);
        return {
          ...ticket,
          commentCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: ticketsWithComments.length,
      tickets: ticketsWithComments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single ticket
// @route   GET /api/tickets/:id
// @access  Private
exports.getTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    // Get comment count
    const commentCount = await Comment.countByTicket(ticket.id);

    res.status(200).json({
      success: true,
      ticket: {
        ...ticket,
        commentCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new ticket
// @route   POST /api/tickets
// @access  Private
exports.createTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.create({
      ...req.body,
      created_by: req.user.id,
    });

    const populatedTicket = await Ticket.findById(ticket.id);

    res.status(201).json({
      success: true,
      ticket: populatedTicket,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update ticket
// @route   PUT /api/tickets/:id
// @access  Private
exports.updateTicket = async (req, res, next) => {
  try {
    let ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    // Check authorization
    const project = await Project.findById(ticket.project_id);
    const isCreator = ticket.created_by === req.user.id;
    const isAssignee = ticket.assignee_id === req.user.id;
    const hasAccess = await Project.hasAccess(project.id, req.user.id);

    if (!isCreator && !isAssignee && !hasAccess && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this ticket',
      });
    }

    ticket = await Ticket.update(req.params.id, req.body);

    res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete ticket
// @route   DELETE /api/tickets/:id
// @access  Private
exports.deleteTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    // Check authorization
    const project = await Project.findById(ticket.project_id);
    const isCreator = ticket.created_by === req.user.id;
    const hasAccess = await Project.hasAccess(project.id, req.user.id);

    if (!isCreator && !hasAccess && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this ticket',
      });
    }

    await Ticket.delete(ticket.id);

    res.status(200).json({
      success: true,
      message: 'Ticket deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update ticket status (for Kanban drag and drop)
// @route   PUT /api/tickets/:id/status
// @access  Private
exports.updateTicketStatus = async (req, res, next) => {
  try {
    const { status, order } = req.body;

    let ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    ticket = await Ticket.updateStatus(req.params.id, status, order);

    res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk update ticket orders (for Kanban reordering)
// @route   PUT /api/tickets/bulk-order
// @access  Private
exports.bulkUpdateOrder = async (req, res, next) => {
  try {
    const { tickets } = req.body;

    await Ticket.bulkUpdateOrder(tickets);

    res.status(200).json({
      success: true,
      message: 'Tickets updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload attachment to ticket
// @route   POST /api/tickets/:id/attachments
// @access  Private
exports.uploadAttachment = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file',
      });
    }

    // For now, just return success with file info
    // In a real app, you'd save this to the database
    res.status(200).json({
      success: true,
      attachment: {
        filename: req.file.originalname,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/tickets/stats/dashboard
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    const stats = await Ticket.getStats(req.user.id);

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    next(error);
  }
};