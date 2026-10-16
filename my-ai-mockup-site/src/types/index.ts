export interface Article {
  id: string;
  title: string;
  content: string;
  author: string;
  publishedDate: string;
}

export interface Message {
  id: string;
  text: string;
  trigger: 'hover' | 'click';
  duration?: number;
}