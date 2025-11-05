/*
  # Document Analysis and Report Generation System

  ## Overview
  This migration creates a comprehensive database schema for a document analysis and 
  report generation system integrated with n8n workflows.

  ## New Tables

  ### 1. `projects`
  Main organizational unit for document collections (blocks)
  - `id` (uuid, primary key)
  - `name` (text) - Project/block name
  - `description` (text) - User-provided context
  - `type` (text) - 'general', 'financial', 'legal'
  - `status` (text) - 'active', 'archived'
  - `created_by` (uuid) - References auth.users
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `documents`
  Stores uploaded document metadata and processing status
  - `id` (uuid, primary key)
  - `project_id` (uuid) - References projects
  - `filename` (text) - Original filename
  - `file_type` (text) - 'pdf', 'word', 'image'
  - `file_size` (bigint) - Size in bytes
  - `storage_path` (text) - Path in storage bucket
  - `description` (text) - User-provided document description
  - `processing_status` (text) - 'pending', 'processing', 'completed', 'failed'
  - `extracted_text` (text) - Extracted content
  - `metadata` (jsonb) - Additional metadata
  - `uploaded_by` (uuid) - References auth.users
  - `uploaded_at` (timestamptz)
  - `processed_at` (timestamptz)

  ### 3. `reports`
  Generated analysis reports
  - `id` (uuid, primary key)
  - `project_id` (uuid) - References projects
  - `title` (text) - Report title
  - `report_type` (text) - 'executive', 'technical', 'compliance', 'financial'
  - `status` (text) - 'draft', 'final', 'exported'
  - `executive_summary` (text)
  - `document_analysis` (jsonb) - Structured analysis with source refs
  - `key_findings` (jsonb) - Array of findings
  - `conclusions` (text)
  - `recommendations` (jsonb) - Array of recommendations
  - `generated_by` (uuid) - References auth.users
  - `generated_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. `document_references`
  Links between reports and source documents
  - `id` (uuid, primary key)
  - `report_id` (uuid) - References reports
  - `document_id` (uuid) - References documents
  - `page_number` (integer) - Specific page reference
  - `excerpt` (text) - Relevant text excerpt
  - `finding_id` (text) - Links to specific finding in report
  - `created_at` (timestamptz)

  ### 5. `n8n_workflows`
  Track automated workflow integrations
  - `id` (uuid, primary key)
  - `project_id` (uuid) - References projects
  - `workflow_name` (text)
  - `webhook_url` (text)
  - `automation_type` (text) - 'upload', 'analysis', 'distribution', 'export'
  - `configuration` (jsonb)
  - `is_active` (boolean)
  - `created_by` (uuid)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only access their own projects and related data
  - Authenticated access required for all operations
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  type text DEFAULT 'general' CHECK (type IN ('general', 'financial', 'legal')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  filename text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('pdf', 'word', 'image', 'other')),
  file_size bigint DEFAULT 0,
  storage_path text NOT NULL,
  description text DEFAULT '',
  processing_status text DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  extracted_text text DEFAULT '',
  metadata jsonb DEFAULT '{}',
  uploaded_by uuid REFERENCES auth.users(id) NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents in own projects"
  ON documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = documents.project_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can upload documents to own projects"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = documents.project_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update documents in own projects"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = documents.project_id
      AND projects.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = documents.project_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete documents in own projects"
  ON documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = documents.project_id
      AND projects.created_by = auth.uid()
    )
  );

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  report_type text DEFAULT 'executive' CHECK (report_type IN ('executive', 'technical', 'compliance', 'financial')),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'exported')),
  executive_summary text DEFAULT '',
  document_analysis jsonb DEFAULT '[]',
  key_findings jsonb DEFAULT '[]',
  conclusions text DEFAULT '',
  recommendations jsonb DEFAULT '[]',
  generated_by uuid REFERENCES auth.users(id) NOT NULL,
  generated_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reports in own projects"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = reports.project_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create reports in own projects"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = generated_by AND
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = reports.project_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update reports in own projects"
  ON reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = reports.project_id
      AND projects.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = reports.project_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete reports in own projects"
  ON reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = reports.project_id
      AND projects.created_by = auth.uid()
    )
  );

-- Create document_references table
CREATE TABLE IF NOT EXISTS document_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  page_number integer,
  excerpt text DEFAULT '',
  finding_id text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE document_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view document references in own reports"
  ON document_references FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reports
      JOIN projects ON projects.id = reports.project_id
      WHERE reports.id = document_references.report_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create document references in own reports"
  ON document_references FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reports
      JOIN projects ON projects.id = reports.project_id
      WHERE reports.id = document_references.report_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete document references in own reports"
  ON document_references FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reports
      JOIN projects ON projects.id = reports.project_id
      WHERE reports.id = document_references.report_id
      AND projects.created_by = auth.uid()
    )
  );

-- Create n8n_workflows table
CREATE TABLE IF NOT EXISTS n8n_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  workflow_name text NOT NULL,
  webhook_url text DEFAULT '',
  automation_type text NOT NULL CHECK (automation_type IN ('upload', 'analysis', 'distribution', 'export')),
  configuration jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE n8n_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workflows"
  ON n8n_workflows FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create workflows"
  ON n8n_workflows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own workflows"
  ON n8n_workflows FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own workflows"
  ON n8n_workflows FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_reports_project_id ON reports(project_id);
CREATE INDEX IF NOT EXISTS idx_document_references_report_id ON document_references(report_id);
CREATE INDEX IF NOT EXISTS idx_document_references_document_id ON document_references(document_id);
CREATE INDEX IF NOT EXISTS idx_n8n_workflows_project_id ON n8n_workflows(project_id);
