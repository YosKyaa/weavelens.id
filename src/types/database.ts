/**
 * Tipe database Supabase. Formatnya sama dengan `supabase gen types typescript`.
 * Setelah project terhubung, perbarui dengan: npm run db:types
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      activity_log: {
        Row: {
          id: string;
          project_id: string | null;
          actor_id: string | null;
          action: string;
          meta: Json;
          created_at: string;
          actor_name: string | null;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          actor_id?: string | null;
          action: string;
          meta?: Json;
          created_at?: string;
          actor_name?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          actor_id?: string | null;
          action?: string;
          meta?: Json;
          created_at?: string;
          actor_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "activity_log_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      analytics_events: {
        Row: {
          id: number;
          created_at: string;
          type: string;
          path: string;
          source: string;
          referrer_host: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          device: string | null;
          country: string | null;
          city: string | null;
          visitor_hash: string;
          section: string | null;
          admin_id: string | null;
        };
        Insert: {
          id?: number;
          created_at?: string;
          type: string;
          path: string;
          source?: string;
          referrer_host?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          device?: string | null;
          country?: string | null;
          city?: string | null;
          visitor_hash: string;
          section?: string | null;
          admin_id?: string | null;
        };
        Update: {
          id?: number;
          created_at?: string;
          type?: string;
          path?: string;
          source?: string;
          referrer_host?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          device?: string | null;
          country?: string | null;
          city?: string | null;
          visitor_hash?: string;
          section?: string | null;
          admin_id?: string | null;
        };
        Relationships: [];
      };
      brands: {
        Row: {
          id: string;
          client_id: string;
          name: string;
          color: string;
          instagram: string | null;
          sort: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          name: string;
          color?: string;
          instagram?: string | null;
          sort?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          name?: string;
          color?: string;
          instagram?: string | null;
          sort?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "brands_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          id: string;
          name: string;
          contact_name: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          drive_folder_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          drive_folder_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          drive_folder_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      cms_admins: {
        Row: {
          email: string;
        };
        Insert: {
          email: string;
        };
        Update: {
          email?: string;
        };
        Relationships: [];
      };
      company_settings: {
        Row: {
          id: number;
          company_name: string;
          phone: string;
          website: string;
          address: string;
          payment_methods: string;
          signer_name: string;
          signer_role: string;
          updated_at: string;
          email: string | null;
          bank_details: string | null;
        };
        Insert: {
          id?: number;
          company_name: string;
          phone: string;
          website: string;
          address: string;
          payment_methods: string;
          signer_name: string;
          signer_role: string;
          updated_at?: string;
          email?: string | null;
          bank_details?: string | null;
        };
        Update: {
          id?: number;
          company_name?: string;
          phone?: string;
          website?: string;
          address?: string;
          payment_methods?: string;
          signer_name?: string;
          signer_role?: string;
          updated_at?: string;
          email?: string | null;
          bank_details?: string | null;
        };
        Relationships: [];
      };
      design_assets: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          created_at: string;
          brand_id: string | null;
          format: string;
          stage: string;
          brief: string | null;
          caption: string | null;
          due_date: string | null;
          publish_date: string | null;
          sort: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          created_at?: string;
          brand_id?: string | null;
          format?: string;
          stage?: string;
          brief?: string | null;
          caption?: string | null;
          due_date?: string | null;
          publish_date?: string | null;
          sort?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          created_at?: string;
          brand_id?: string | null;
          format?: string;
          stage?: string;
          brief?: string | null;
          caption?: string | null;
          due_date?: string | null;
          publish_date?: string | null;
          sort?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "design_assets_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "design_assets_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
        ];
      };
      design_comments: {
        Row: {
          id: string;
          version_id: string;
          author_id: string | null;
          body: string;
          x: number | null;
          y: number | null;
          resolved: boolean;
          created_at: string;
          guest_name: string | null;
          share_link_id: string | null;
          slide: number;
        };
        Insert: {
          id?: string;
          version_id: string;
          author_id?: string | null;
          body: string;
          x?: number | null;
          y?: number | null;
          resolved?: boolean;
          created_at?: string;
          guest_name?: string | null;
          share_link_id?: string | null;
          slide?: number;
        };
        Update: {
          id?: string;
          version_id?: string;
          author_id?: string | null;
          body?: string;
          x?: number | null;
          y?: number | null;
          resolved?: boolean;
          created_at?: string;
          guest_name?: string | null;
          share_link_id?: string | null;
          slide?: number;
        };
        Relationships: [
          {
            foreignKeyName: "design_comments_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "design_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "design_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "design_comments_share_link_id_fkey";
            columns: ["share_link_id"];
            isOneToOne: false;
            referencedRelation: "share_links";
            referencedColumns: ["id"];
          },
        ];
      };
      design_versions: {
        Row: {
          id: string;
          asset_id: string;
          version_no: number;
          file_path: string | null;
          note: string | null;
          uploaded_by: string | null;
          status: string;
          created_at: string;
          files: Json;
          external_url: string | null;
          decided_by: string | null;
          decided_at: string | null;
        };
        Insert: {
          id?: string;
          asset_id: string;
          version_no: number;
          file_path?: string | null;
          note?: string | null;
          uploaded_by?: string | null;
          status?: string;
          created_at?: string;
          files?: Json;
          external_url?: string | null;
          decided_by?: string | null;
          decided_at?: string | null;
        };
        Update: {
          id?: string;
          asset_id?: string;
          version_no?: number;
          file_path?: string | null;
          note?: string | null;
          uploaded_by?: string | null;
          status?: string;
          created_at?: string;
          files?: Json;
          external_url?: string | null;
          decided_by?: string | null;
          decided_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "design_versions_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "design_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "design_versions_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      faqs: {
        Row: {
          id: string;
          question: string;
          answer: string;
          sort: number;
          visible: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          question: string;
          answer: string;
          sort?: number;
          visible?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          question?: string;
          answer?: string;
          sort?: number;
          visible?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      invoice_counters: {
        Row: {
          year: number;
          last_value: number;
        };
        Insert: {
          year: number;
          last_value?: number;
        };
        Update: {
          year?: number;
          last_value?: number;
        };
        Relationships: [];
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          order: number;
          description: string;
          unit_price: number;
          qty: number;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          order?: number;
          description: string;
          unit_price: number;
          qty?: number;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          order?: number;
          description?: string;
          unit_price?: number;
          qty?: number;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          id: string;
          client_id: string | null;
          project_id: string | null;
          number: string;
          issue_date: string;
          due_date: string;
          status: string;
          tax_rate: number;
          notes: string | null;
          payment_methods: string | null;
          signer_name: string | null;
          signer_role: string | null;
          pdf_path: string | null;
          paid_at: string | null;
          created_at: string;
          bill_to_name: string | null;
          bill_to_company: string | null;
          bill_to_contact: string | null;
          bill_to_address: string | null;
          discount: number;
          payment_details: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          project_id?: string | null;
          number: string;
          issue_date?: string;
          due_date: string;
          status?: string;
          tax_rate?: number;
          notes?: string | null;
          payment_methods?: string | null;
          signer_name?: string | null;
          signer_role?: string | null;
          pdf_path?: string | null;
          paid_at?: string | null;
          created_at?: string;
          bill_to_name?: string | null;
          bill_to_company?: string | null;
          bill_to_contact?: string | null;
          bill_to_address?: string | null;
          discount?: number;
          payment_details?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string | null;
          project_id?: string | null;
          number?: string;
          issue_date?: string;
          due_date?: string;
          status?: string;
          tax_rate?: number;
          notes?: string | null;
          payment_methods?: string | null;
          signer_name?: string | null;
          signer_role?: string | null;
          pdf_path?: string | null;
          paid_at?: string | null;
          created_at?: string;
          bill_to_name?: string | null;
          bill_to_company?: string | null;
          bill_to_contact?: string | null;
          bill_to_address?: string | null;
          discount?: number;
          payment_details?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      partners: {
        Row: {
          id: string;
          name: string;
          logo: string | null;
          sort: number;
          visible: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          logo?: string | null;
          sort?: number;
          visible?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          logo?: string | null;
          sort?: number;
          visible?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      photo_selections: {
        Row: {
          id: string;
          set_id: string;
          photo_id: string;
          selected_by: string | null;
          note: string | null;
          created_at: string;
          guest_name: string | null;
        };
        Insert: {
          id?: string;
          set_id: string;
          photo_id: string;
          selected_by?: string | null;
          note?: string | null;
          created_at?: string;
          guest_name?: string | null;
        };
        Update: {
          id?: string;
          set_id?: string;
          photo_id?: string;
          selected_by?: string | null;
          note?: string | null;
          created_at?: string;
          guest_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "photo_selections_set_id_fkey";
            columns: ["set_id"];
            isOneToOne: false;
            referencedRelation: "photo_sets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photo_selections_photo_id_fkey";
            columns: ["photo_id"];
            isOneToOne: false;
            referencedRelation: "photos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photo_selections_selected_by_fkey";
            columns: ["selected_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      photo_sets: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          drive_folder_id: string | null;
          status: string;
          max_selection: number | null;
          deadline: string | null;
          sync_locked_at: string | null;
          edited_share_url: string | null;
          created_at: string;
          edited_folder_id: string | null;
          submitted_at: string | null;
          submitted_by: string | null;
          synced_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          drive_folder_id?: string | null;
          status?: string;
          max_selection?: number | null;
          deadline?: string | null;
          sync_locked_at?: string | null;
          edited_share_url?: string | null;
          created_at?: string;
          edited_folder_id?: string | null;
          submitted_at?: string | null;
          submitted_by?: string | null;
          synced_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          drive_folder_id?: string | null;
          status?: string;
          max_selection?: number | null;
          deadline?: string | null;
          sync_locked_at?: string | null;
          edited_share_url?: string | null;
          created_at?: string;
          edited_folder_id?: string | null;
          submitted_at?: string | null;
          submitted_by?: string | null;
          synced_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "photo_sets_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      photos: {
        Row: {
          id: string;
          set_id: string;
          drive_file_id: string;
          filename: string;
          thumb_path: string | null;
          width: number | null;
          height: number | null;
          sort_order: number;
          mime_type: string | null;
          kind: string;
          size_bytes: number | null;
        };
        Insert: {
          id?: string;
          set_id: string;
          drive_file_id: string;
          filename: string;
          thumb_path?: string | null;
          width?: number | null;
          height?: number | null;
          sort_order?: number;
          mime_type?: string | null;
          kind?: string;
          size_bytes?: number | null;
        };
        Update: {
          id?: string;
          set_id?: string;
          drive_file_id?: string;
          filename?: string;
          thumb_path?: string | null;
          width?: number | null;
          height?: number | null;
          sort_order?: number;
          mime_type?: string | null;
          kind?: string;
          size_bytes?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "photos_set_id_fkey";
            columns: ["set_id"];
            isOneToOne: false;
            referencedRelation: "photo_sets";
            referencedColumns: ["id"];
          },
        ];
      };
      plan_items: {
        Row: {
          id: string;
          project_id: string;
          order: number;
          title: string;
          description: string | null;
          due_date: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          order?: number;
          title: string;
          description?: string | null;
          due_date?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          order?: number;
          title?: string;
          description?: string | null;
          due_date?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plan_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      portfolio_images: {
        Row: {
          id: string;
          src: string;
          alt: string;
          category: string;
          client: string | null;
          year: string | null;
          width: number;
          height: number;
          sort: number;
          visible: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          src: string;
          alt: string;
          category: string;
          client?: string | null;
          year?: string | null;
          width: number;
          height: number;
          sort?: number;
          visible?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          src?: string;
          alt?: string;
          category?: string;
          client?: string | null;
          year?: string | null;
          width?: number;
          height?: number;
          sort?: number;
          visible?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      pricing_plans: {
        Row: {
          id: string;
          name: string;
          price: string;
          features: string[];
          cta_label: string;
          wa_message: string;
          sort: number;
          visible: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price: string;
          features?: string[];
          cta_label: string;
          wa_message?: string;
          sort?: number;
          visible?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price?: string;
          features?: string[];
          cta_label?: string;
          wa_message?: string;
          sort?: number;
          visible?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: string;
          client_id: string | null;
          phone: string | null;
          created_at: string;
          active: boolean;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: string;
          client_id?: string | null;
          phone?: string | null;
          created_at?: string;
          active?: boolean;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: string;
          client_id?: string | null;
          phone?: string | null;
          created_at?: string;
          active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      project_members: {
        Row: {
          project_id: string;
          profile_id: string;
          created_at: string;
        };
        Insert: {
          project_id: string;
          profile_id: string;
          created_at?: string;
        };
        Update: {
          project_id?: string;
          profile_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_members_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          client_id: string;
          type: string;
          title: string;
          event_date: string | null;
          status: string;
          drive_folder_id: string | null;
          created_at: string;
          description: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          type: string;
          title: string;
          event_date?: string | null;
          status?: string;
          drive_folder_id?: string | null;
          created_at?: string;
          description?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          type?: string;
          title?: string;
          event_date?: string | null;
          status?: string;
          drive_folder_id?: string | null;
          created_at?: string;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          id: string;
          title: string;
          tagline: string;
          description: string;
          status: string;
          cta_label: string | null;
          wa_message: string | null;
          image_src: string | null;
          image_alt: string | null;
          image_width: number | null;
          image_height: number | null;
          sort: number;
          visible: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          tagline?: string;
          description?: string;
          status?: string;
          cta_label?: string | null;
          wa_message?: string | null;
          image_src?: string | null;
          image_alt?: string | null;
          image_width?: number | null;
          image_height?: number | null;
          sort?: number;
          visible?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          tagline?: string;
          description?: string;
          status?: string;
          cta_label?: string | null;
          wa_message?: string | null;
          image_src?: string | null;
          image_alt?: string | null;
          image_width?: number | null;
          image_height?: number | null;
          sort?: number;
          visible?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      share_links: {
        Row: {
          id: string;
          token: string;
          project_id: string;
          brand_id: string | null;
          label: string;
          can_review: boolean;
          expires_at: string | null;
          revoked_at: string | null;
          last_opened_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          token: string;
          project_id: string;
          brand_id?: string | null;
          label: string;
          can_review?: boolean;
          expires_at?: string | null;
          revoked_at?: string | null;
          last_opened_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          token?: string;
          project_id?: string;
          brand_id?: string | null;
          label?: string;
          can_review?: boolean;
          expires_at?: string | null;
          revoked_at?: string | null;
          last_opened_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "share_links_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "share_links_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
        ];
      };
      site_contact: {
        Row: {
          id: number;
          instagram_handle: string;
          instagram_url: string;
          email: string;
          address: string;
          area: string;
          response_hours: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          instagram_handle: string;
          instagram_url: string;
          email: string;
          address: string;
          area: string;
          response_hours: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          instagram_handle?: string;
          instagram_url?: string;
          email?: string;
          address?: string;
          area?: string;
          response_hours?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      testimonials: {
        Row: {
          id: string;
          quote: string;
          name: string;
          role: string | null;
          client: string | null;
          service: string | null;
          sort: number;
          visible: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quote: string;
          name: string;
          role?: string | null;
          client?: string | null;
          service?: string | null;
          sort?: number;
          visible?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          quote?: string;
          name?: string;
          role?: string | null;
          client?: string | null;
          service?: string | null;
          sort?: number;
          visible?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      wa_admins: {
        Row: {
          id: string;
          number: string;
          display: string;
          sort: number;
          visible: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          number: string;
          display: string;
          sort?: number;
          visible?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          number?: string;
          display?: string;
          sort?: number;
          visible?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_cms_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      my_client_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      can_view_project: {
        Args: { pid: string };
        Returns: boolean;
      };
      can_work_on_project: {
        Args: { pid: string };
        Returns: boolean;
      };
      is_team: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      next_invoice_number: {
        Args: { issue?: string };
        Returns: string;
      };
      analytics_overview: {
        Args: { p_from: string; p_to: string };
        Returns: { visitors: number; pageviews: number; cta_clicks: number; cta_visitors: number }[];
      };
      analytics_daily: {
        Args: { p_from: string; p_to: string };
        Returns: { day: string; visitors: number; pageviews: number; cta_clicks: number }[];
      };
      analytics_breakdown: {
        Args: { p_from: string; p_to: string; p_dimension: string; p_limit?: number };
        Returns: { label: string; visitors: number; pageviews: number; cta_clicks: number }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

