export interface HadithCategory {
  id: string;
  name: string;
}

export interface HadithRecord {
  id: string;
  category_id: string;
  summary: string;
  full_text_bn: string;
  narrator: string;
  book: string;
  hadith_number: string;
  chapter: string;
  source_edition?: string;
  grading?: string;
  reference_url?: string;
  translator?: string;
  arabic_text?: string;
}

export interface HadithDataset {
  categories: HadithCategory[];
  hadiths: HadithRecord[];
}
