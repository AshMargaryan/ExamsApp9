import { apiClient } from "./client";
import type { DiagnosticInfo } from "../lib/helpDiagnostics";

export type ArticleSection = "guide" | "feature" | "troubleshooting";
export type TicketCategory = "account" | "ai" | "payment" | "bug" | "study_feature" | "other";
export type TicketStatus = "open" | "waiting_for_you" | "in_progress" | "resolved" | "closed";
export type FeedbackReason = "not_solved" | "outdated" | "too_complicated" | "wrong_info" | "other";

export interface Category {
  id: number;
  key: string;
  name: string;
  icon: string;
  description: string;
  order: number;
  article_count: number;
}

export interface ArticleSummary {
  id: number;
  slug: string;
  title: string;
  summary: string;
  section: ArticleSection;
  tags: string[];
  view_count: number;
  helpful_count: number;
  unhelpful_count: number;
}

export interface ArticleDetail extends ArticleSummary {
  content: string;
  category: Category;
  updated_at: string;
}

export interface TicketAttachment {
  id: number;
  original_filename: string;
  mime_type: string;
  size: number;
  download_url: string;
  created_at: string;
}

export interface TicketMessage {
  id: number;
  text: string;
  is_staff: boolean;
  attachments: TicketAttachment[];
  created_at: string;
}

export interface Ticket {
  id: number;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
}

export interface TicketDetail extends Ticket {
  description: string;
  source_article_slugs: string[];
  attachments: TicketAttachment[];
  messages: TicketMessage[];
}

export interface NewTicketInput {
  category: TicketCategory;
  description: string;
  diagnosticInfo?: DiagnosticInfo;
  sourceArticleSlugs?: string[];
  aiContext?: string;
  files?: File[];
}

export async function listCategories(): Promise<Category[]> {
  const { data } = await apiClient.get("/help/categories/");
  return data;
}

export async function getCategory(key: string): Promise<{ category: Category; articles: ArticleSummary[] }> {
  const { data } = await apiClient.get(`/help/categories/${key}/`);
  return data;
}

export async function listPopularArticles(limit = 6): Promise<ArticleSummary[]> {
  const { data } = await apiClient.get("/help/articles/popular/", { params: { limit } });
  return data;
}

export async function getArticle(slug: string): Promise<ArticleDetail> {
  const { data } = await apiClient.get(`/help/articles/${slug}/`);
  return data;
}

export async function searchArticles(query: string): Promise<ArticleSummary[]> {
  const { data } = await apiClient.get("/help/search/", { params: { q: query } });
  return data;
}

export async function submitArticleFeedback(
  slug: string, isHelpful: boolean, reason?: FeedbackReason, comment?: string,
): Promise<void> {
  await apiClient.post(`/help/articles/${slug}/feedback/`, {
    is_helpful: isHelpful, reason: reason ?? "", comment: comment ?? "",
  });
}

export async function listTickets(): Promise<Ticket[]> {
  const { data } = await apiClient.get("/help/tickets/");
  return data;
}

export async function getTicket(id: number): Promise<TicketDetail> {
  const { data } = await apiClient.get(`/help/tickets/${id}/`);
  return data;
}

export async function createTicket(input: NewTicketInput): Promise<TicketDetail> {
  const form = new FormData();
  form.append("category", input.category);
  form.append("description", input.description);
  if (input.diagnosticInfo) form.append("diagnostic_info", JSON.stringify(input.diagnosticInfo));
  for (const slug of input.sourceArticleSlugs ?? []) form.append("source_article_slugs", slug);
  if (input.aiContext) form.append("ai_context", input.aiContext);
  for (const file of input.files ?? []) form.append("files", file);

  const { data } = await apiClient.post("/help/tickets/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function replyToTicket(id: number, text: string, files: File[] = []): Promise<TicketMessage> {
  const form = new FormData();
  form.append("text", text);
  for (const file of files) form.append("files", file);

  const { data } = await apiClient.post(`/help/tickets/${id}/messages/`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
