const Project = require('../models/Project');
const Ticket = require('../models/Ticket');

// @desc    Get all projects for user
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res, next) => {
  try {
    console.log('getProjects called user:', req.user?.id, req.user?.role);

    let projects;

    // Admin can see all projects
    if (req.user.role === 'admin') {
      projects = await Project.findAll();
    } else {
      // Regular users see projects they created or are team members of
      projects = await Project.findByUser(req.user.id);
    }

    // Get ticket counts for each project
    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        if (!project || !project.id) {
          return null;
        }

        try {
          const tickets = await Ticket.findByProject(project.id);
          const counts = {
            total: tickets?.length || 0,
            Todo: tickets?.filter((t) => t.status === 'Todo').length || 0,
            InProgress: tickets?.filter((t) => t.status === 'InProgress').length || 0,
            Done: tickets?.filter((t) => t.status === 'Done').length || 0,
          };

          return {
            ...project,
            ticketCounts: counts,
          };
        } catch (countError) {
          console.error(`Failed to count tickets for project ${project.id}:`, countError);
          return {
            ...project,
            ticketCounts: {
              total: 0,
              Todo: 0,
              InProgress: 0,
              Done: 0,
            },
          };
        }
      })
    );

    res.status(200).json({
      success: true,
      count: projectsWithCounts.filter(Boolean).length,
      projects: projectsWithCounts.filter(Boolean),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check access
    const hasAccess = await Project.hasAccess(project.id, req.user.id);
    if (!hasAccess && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this project',
      });
    }

    // Get ticket counts
    const tickets = await Ticket.findByProject(project.id);
    const counts = {
      total: tickets.length,
      Todo: tickets.filter(t => t.status === 'Todo').length,
      InProgress: tickets.filter(t => t.status === 'InProgress').length,
      Done: tickets.filter(t => t.status === 'Done').length,
    };

    res.status(200).json({
      success: true,
      project: {
        ...project,
        ticketCounts: counts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
exports.createProject = async (req, res, next) => {
  try {
    const project = await Project.create({
      title: req.body.title,
      description: req.body.description,
      created_by: req.user.id,
    });

    const populatedProject = await Project.findById(project.id);

    res.status(201).json({
      success: true,
      project: populatedProject,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
exports.updateProject = async (req, res, next) => {
  try {
    let project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check authorization
    const hasAccess = await Project.hasAccess(project.id, req.user.id);
    const isCreator = project.created_by === req.user.id;

    if (!isCreator && !hasAccess && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this project',
      });
    }

    project = await Project.update(req.params.id, req.body);

    res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check authorization - only creator or admin can delete
    const isCreator = project.created_by === req.user.id;

    if (!isCreator && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this project',
      });
    }

    await Project.delete(project.id);

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add team member to project
// @route   POST /api/projects/:id/members
// @access  Private
exports.addTeamMember = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check authorization
    const hasAccess = await Project.hasAccess(project.id, req.user.id);
    const isCreator = project.created_by === req.user.id;

    if (!isCreator && !hasAccess && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add members to this project',
      });
    }

    // Check if user is already a member
    const isAlreadyMember = await Project.hasAccess(project.id, req.body.userId);
    if (isAlreadyMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a team member',
      });
    }

    await Project.addMember(project.id, req.body.userId, req.body.role || 'developer');

    const updatedProject = await Project.findById(project.id);

    res.status(200).json({
      success: true,
      project: updatedProject,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove team member from project
// @route   DELETE /api/projects/:id/members/:userId
// @access  Private
exports.removeTeamMember = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check authorization
    const hasAccess = await Project.hasAccess(project.id, req.user.id);
    const isCreator = project.created_by === req.user.id;

    if (!isCreator && !hasAccess && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to remove members from this project',
      });
    }

    // Cannot remove the creator
    if (project.created_by === req.params.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the project creator',
      });
    }

    await Project.removeMember(project.id, req.params.userId);

    const updatedProject = await Project.findById(project.id);

    res.status(200).json({
      success: true,
      project: updatedProject,
    });
  } catch (error) {
    next(error);
  }
};