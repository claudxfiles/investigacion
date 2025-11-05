export interface Project {
  id: string;
  name: string;
  description: string;
  type: 'general' | 'financial' | 'legal';
  status: 'active' | 'archived';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  project_id: string;
  filename: string;
  file_type: 'pdf' | 'word' | 'image' | 'other';
  file_size: number;
  storage_path: string;
  description: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  extracted_text: string;
  metadata: Record<string, unknown>;
  uploaded_by: string;
  uploaded_at: string;
  processed_at?: string;
}

export interface Report {
  id: string;
  project_id: string;
  title: string;
  report_type: 'executive' | 'technical' | 'compliance' | 'financial';
  status: 'draft' | 'final' | 'exported';
  executive_summary: string;
  document_analysis: AnalysisSection[];
  key_findings: Finding[];
  conclusions: string;
  recommendations: Recommendation[];
  generated_by: string;
  generated_at: string;
  updated_at: string;
}

export interface AnalysisSection {
  id: string;
  title: string;
  content: string;
  document_references: string[];
}

export interface Finding {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  document_references: string[];
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  actionable_steps: string[];
}

export interface DocumentReference {
  id: string;
  report_id: string;
  document_id: string;
  page_number?: number;
  excerpt: string;
  finding_id: string;
  created_at: string;
}

export interface N8NWorkflow {
  id: string;
  project_id?: string;
  workflow_name: string;
  webhook_url: string;
  automation_type: 'upload' | 'analysis' | 'distribution' | 'export';
  configuration: Record<string, unknown>;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface DocumentEmbedding {
  id: string;
  document_id: string;
  project_id: string;
  chunk_text: string;
  chunk_index: number;
  embedding: number[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  id: string;
  document_id: string;
  chunk_text: string;
  chunk_index: number;
  similarity: number;
  metadata: Record<string, unknown>;
  document?: Document;
}

