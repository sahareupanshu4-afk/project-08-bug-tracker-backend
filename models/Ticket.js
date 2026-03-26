const { supabase } = require('../config/db');

// Ticket helper functions for Supabase
const Ticket = {
  // Create a new ticket
  async create(ticketData) {
    const { title, description, priority = 'Medium', status = 'Todo', assignee_id, project_id, created_by } = ticketData;
    
    // Get the highest order number for the status
    const { data: lastTicket } = await supabase
      .from('tickets')
      .select('order')
      .eq('project_id', project_id)
      .eq('status', status)
      .order('order', { ascending: false })
      .limit(1)
      .single();
    
    const order = lastTicket ? lastTicket.order + 1 : 0;
    
    const { data, error } = await supabase
      .from('tickets')
      .insert([
        {
          title,
          description,
          priority,
          status,
          assignee_id,
          project_id,
          created_by,
          order,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select(`
        *,
        assignee:users!tickets_assignee_id_fkey(id, name, email, avatar),
        created_by_user:users!tickets_created_by_fkey(id, name, email, avatar),
        project:projects(id, title)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Find ticket by ID
  async findById(id) {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        assignee:users!tickets_assignee_id_fkey(id, name, email, avatar),
        created_by_user:users!tickets_created_by_fkey(id, name, email, avatar),
        project:projects(id, title)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get all tickets for a project
  async findByProject(projectId, filters = {}) {
    let query = supabase
      .from('tickets')
      .select(`
        *,
        assignee:users!tickets_assignee_id_fkey(id, name, email, avatar),
        created_by_user:users!tickets_created_by_fkey(id, name, email, avatar)
      `)
      .eq('project_id', projectId);
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }
    
    if (filters.assignee_id) {
      query = query.eq('assignee_id', filters.assignee_id);
    }
    
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
    
    const { data, error } = await query
      .order('order', { ascending: true })
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Update ticket
  async update(id, updates) {
    const { data, error } = await supabase
      .from('tickets')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        assignee:users!tickets_assignee_id_fkey(id, name, email, avatar),
        created_by_user:users!tickets_created_by_fkey(id, name, email, avatar)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update ticket status (for Kanban)
  async updateStatus(id, status, order) {
    const { data, error } = await supabase
      .from('tickets')
      .update({
        status,
        order,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        assignee:users!tickets_assignee_id_fkey(id, name, email, avatar),
        created_by_user:users!tickets_created_by_fkey(id, name, email, avatar)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Bulk update ticket orders
  async bulkUpdateOrder(tickets) {
    const updates = tickets.map(ticket => 
      supabase
        .from('tickets')
        .update({
          order: ticket.order,
          status: ticket.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticket.id)
    );
    
    await Promise.all(updates);
    return true;
  },

  // Delete ticket
  async delete(id) {
    // Delete related comments first
    await supabase.from('comments').delete().eq('ticket_id', id);
    
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // Get dashboard statistics
  async getStats(userId) {
    // Get user's projects
    const { data: projects } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId);
    
    const projectIds = projects?.map(p => p.project_id) || [];
    
    if (projectIds.length === 0) {
      return {
        totalProjects: 0,
        totalTickets: 0,
        ticketsByStatus: { Todo: 0, InProgress: 0, Done: 0 },
        ticketsByPriority: { Low: 0, Medium: 0, High: 0, Critical: 0 },
        recentTickets: []
      };
    }
    
    // Get ticket counts by status
    const { data: statusCounts } = await supabase
      .from('tickets')
      .select('status')
      .in('project_id', projectIds);
    
    const ticketsByStatus = { Todo: 0, InProgress: 0, Done: 0 };
    statusCounts?.forEach(ticket => {
      if (ticketsByStatus[ticket.status] !== undefined) {
        ticketsByStatus[ticket.status]++;
      }
    });
    
    // Get ticket counts by priority
    const { data: priorityCounts } = await supabase
      .from('tickets')
      .select('priority')
      .in('project_id', projectIds);
    
    const ticketsByPriority = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    priorityCounts?.forEach(ticket => {
      if (ticketsByPriority[ticket.priority] !== undefined) {
        ticketsByPriority[ticket.priority]++;
      }
    });
    
    // Get recent tickets
    const { data: recentTickets } = await supabase
      .from('tickets')
      .select(`
        *,
        assignee:users!tickets_assignee_id_fkey(id, name, email, avatar),
        project:projects(id, title)
      `)
      .in('project_id', projectIds)
      .order('updated_at', { ascending: false })
      .limit(5);
    
    return {
      totalProjects: projectIds.length,
      totalTickets: statusCounts?.length || 0,
      ticketsByStatus,
      ticketsByPriority,
      recentTickets: recentTickets || []
    };
  }
};

module.exports = Ticket;