export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          branding_prefix: string | null;
          theme: any | null;
          logo_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          branding_prefix?: string | null;
          theme?: any | null;
          logo_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          branding_prefix?: string | null;
          theme?: any | null;
          logo_url?: string | null;
          created_at?: string;
        };
      };
      org_members: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          role:
            | 'admin'
            | 'approver'
            | 'accountant'
            | 'data_entry'
            | 'analyst'
            | 'viewer';
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id: string;
          role?:
            | 'admin'
            | 'approver'
            | 'accountant'
            | 'data_entry'
            | 'analyst'
            | 'viewer';
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string;
          role?:
            | 'admin'
            | 'approver'
            | 'accountant'
            | 'data_entry'
            | 'analyst'
            | 'viewer';
          created_at?: string;
        };
      };
      vendors: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          account_number: string | null;
          contact: string | null;
          email: string | null;
          phone: string | null;
          notes: string | null;
          tags: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          account_number?: string | null;
          contact?: string | null;
          email?: string | null;
          phone?: string | null;
          notes?: string | null;
          tags?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          account_number?: string | null;
          contact?: string | null;
          email?: string | null;
          phone?: string | null;
          notes?: string | null;
          tags?: string[] | null;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          code: string | null;
          description: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          code?: string | null;
          description?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          code?: string | null;
          description?: string | null;
          status?: string;
          created_at?: string;
        };
      };
      bills: {
        Row: {
          id: string;
          org_id: string;
          project_id: string | null;
          vendor_id: string | null;
          title: string;
          description: string | null;
          amount_total: number;
          currency: string;
          due_date: string | null;
          recurring_rule: any | null;
          installments_total: number | null;
          status:
            | 'active'
            | 'pending_approval'
            | 'approved'
            | 'on_hold'
            | 'canceled';
          auto_approve: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          project_id?: string | null;
          vendor_id?: string | null;
          title: string;
          description?: string | null;
          amount_total: number;
          currency?: string;
          due_date?: string | null;
          recurring_rule?: any | null;
          installments_total?: number | null;
          status?:
            | 'active'
            | 'pending_approval'
            | 'approved'
            | 'on_hold'
            | 'canceled';
          auto_approve?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          project_id?: string | null;
          vendor_id?: string | null;
          title?: string;
          description?: string | null;
          amount_total?: number;
          currency?: string;
          due_date?: string | null;
          recurring_rule?: any | null;
          installments_total?: number | null;
          status?:
            | 'active'
            | 'pending_approval'
            | 'approved'
            | 'on_hold'
            | 'canceled';
          auto_approve?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      bill_occurrences: {
        Row: {
          id: string;
          org_id: string;
          bill_id: string;
          project_id: string | null;
          vendor_id: string | null;
          sequence: number;
          amount_due: number;
          due_date: string;
          suggested_submission_date: string | null;
          moved_from_date: string | null;
          state:
            | 'scheduled'
            | 'pending_approval'
            | 'approved'
            | 'on_hold'
            | 'paid'
            | 'failed'
            | 'canceled';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          bill_id: string;
          project_id?: string | null;
          vendor_id?: string | null;
          sequence: number;
          amount_due: number;
          due_date: string;
          suggested_submission_date?: string | null;
          moved_from_date?: string | null;
          state?:
            | 'scheduled'
            | 'pending_approval'
            | 'approved'
            | 'on_hold'
            | 'paid'
            | 'failed'
            | 'canceled';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          bill_id?: string;
          project_id?: string | null;
          vendor_id?: string | null;
          sequence?: number;
          amount_due?: number;
          due_date?: string;
          suggested_submission_date?: string | null;
          moved_from_date?: string | null;
          state?:
            | 'scheduled'
            | 'pending_approval'
            | 'approved'
            | 'on_hold'
            | 'paid'
            | 'failed'
            | 'canceled';
          created_at?: string;
          updated_at?: string;
        };
      };
      approvals: {
        Row: {
          id: string;
          org_id: string;
          bill_occurrence_id: string;
          approver_id: string;
          decision: 'approved' | 'hold' | 'rejected';
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          bill_occurrence_id: string;
          approver_id: string;
          decision: 'approved' | 'hold' | 'rejected';
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          bill_occurrence_id?: string;
          approver_id?: string;
          decision?: 'approved' | 'hold' | 'rejected';
          notes?: string | null;
          created_at?: string;
        };
      };
      feedback: {
        Row: {
          id: string;
          org_id: string | null;
          author_id: string | null;
          type: 'bug' | 'feature' | 'idea';
          title: string;
          body: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          author_id?: string | null;
          type: 'bug' | 'feature' | 'idea';
          title: string;
          body?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          author_id?: string | null;
          type?: 'bug' | 'feature' | 'idea';
          title?: string;
          body?: string | null;
          status?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      role:
        | 'admin'
        | 'approver'
        | 'accountant'
        | 'data_entry'
        | 'analyst'
        | 'viewer';
      occ_state:
        | 'scheduled'
        | 'pending_approval'
        | 'approved'
        | 'on_hold'
        | 'paid'
        | 'failed'
        | 'canceled';
    };
  };
}
