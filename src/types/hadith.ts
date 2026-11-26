export type HadithCategory = {
  id: string;
  name: string;
};

export type HadithRecord = {
  id: string;
  category_id: string;
  summary: string;
  full_text_bn: string;
  narrator: string;
  book: string;
  hadith_number: string;
  chapter: string;
};

export type HadithDataset = {
  categories: HadithCategory[];
  hadiths: HadithRecord[];
};
