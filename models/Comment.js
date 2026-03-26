const { supabase } = require('../config/db');

// Comment helper functions for Supabase
const Comment = {
  // Create a new comment
  async create(commentData) {
    const { ticket_id, user_id, text, parent_comment_id = null } = commentData;
    
    const { data, error } = await supabase
      .from('comments')
      .insert([
        {
          ticket_id,
          user_id,
          text,
          parent_comment_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select(`
        *,
        user:users!comments_user_id_fkey(id, name, email, avatar)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Find comment by ID
  async findById(id) {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:users!comments_user_id_fkey(id, name, email, avatar)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get all comments for a ticket
  async findByTicket(ticketId) {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:users!comments_user_id_fkey(id, name, email, avatar)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Update comment
  async update(id, updates) {
    const { data, error } = await supabase
      .from('comments')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        user:users!comments_user_id_fkey(id, name, email, avatar)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete comment
  async delete(id) {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // Count comments for a ticket
  async countByTicket(ticketId) {
    const { count, error } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('ticket_id', ticketId);
    
    if (error) throw error;
    return count || 0;
  }
};

module.exports = Comment;